#!/usr/bin/env python3
"""Generate generic Korean friend clips with an already downloaded Supertonic 3.

Requires Python 3.9+, supertonic==1.3.1, and macOS afconvert. The game itself
does not need Python, the model, a speech service, or these authoring packages.
Only the static dialogue constants are parsed; game JavaScript is not executed.
"""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import unicodedata

MODEL_REPO = 'Supertone/supertonic-3'
MODEL_REVISION = '724fb5abbf5502583fb520898d45929e62f02c0b'
SDK_VERSION = '1.3.1'
SPEAKERS = {
    'turtle': 'M1', 'penguin': 'F1', 'fox': 'F2', 'brownBear': 'M2',
    'lion': 'M3', 'leopardCat': 'F3', 'squid': 'F4', 'duck': 'M4',
    'tiger': 'M5', 'sunBear': 'F5', 'chick': 'F3', 'cat': 'F2',
}


def read_js_object(source, name):
    """Read the deliberately simple static object syntax used by the game."""
    found = re.search(r'\bconst\s+' + re.escape(name) + r'\s*=\s*(\{.*?\n  \});',
                      source, flags=re.S)
    if not found:
        raise ValueError('Cannot find static object: ' + name)
    # Recognize string tokens separately so keys/booleans inside text stay intact.
    tokens = re.compile(r"'(?:[^'\\]|\\.)*'|\b[A-Za-z_$][\w$]*\b")
    body = found.group(1)

    def convert(match):
        token = match.group()
        if token.startswith("'"):
            return token
        after = body[match.end():].lstrip()
        if after.startswith(':'):
            return repr(token)
        if token == 'true':
            return 'True'
        if token == 'false':
            return 'False'
        if token == 'null':
            return 'None'
        raise ValueError('Unsupported value in ' + name + ': ' + token)

    value = ast.literal_eval(tokens.sub(convert, body))
    if not isinstance(value, dict):
        raise ValueError('Expected an object: ' + name)
    return value


def dialogue_jobs(repo, name_hash=None):
    source = (repo / 'game.js').read_text(encoding='utf-8')
    base = read_js_object(source, 'FRIEND_DIALOGUE')
    context = read_js_object(source, 'FRIEND_CONTEXT_DIALOGUE')
    profiles = read_js_object(source, 'FRIEND_VOICE_PROFILES')
    if set(base) != set(SPEAKERS) or set(context) != set(SPEAKERS):
        raise ValueError('Dialogue animals must match the explicit voice mapping.')
    jobs = []
    for animal, speaker in SPEAKERS.items():
        if len(base[animal]) != 12 or set(context[animal]) != {'carrot', 'cucumber', 'moon'}:
            raise ValueError('Expected 12 base and 3 context lines per friend.')
        lines = [(f'base-{index + 1:02d}', line) for index, line in enumerate(base[animal])]
        lines += [(key, context[animal][key]) for key in ('carrot', 'cucumber', 'moon')]
        for clip_id, line in lines:
            if not isinstance(line['text'], str) or not line['text'].strip():
                raise ValueError('Empty dialogue line.')
            address = bool(line.get('address', False))
            jobs.append({
                'key': animal + ':' + clip_id,
                'animal': animal,
                'id': clip_id,
                'file': animal + '/' + clip_id + '.m4a',
                'text': line['text'],
                'address': address,
                'variant': 'full',
                'spokenText': ('친구야, ' if address else '') + line['text'],
                'speaker': speaker,
                'rate': profiles[animal]['rate'],
            })
    bodies = [dict(job, key=job['key'] + '-body', id=job['id'] + '-body',
                   file=job['file'].replace('.m4a', '-body.m4a'),
                   variant='body', spokenText=job['text'])
              for job in jobs if job['address']]
    featured = [dict(job, key=job['key'] + '-featured', id=job['id'] + '-featured',
                     file=job['file'].replace('.m4a', '-featured.m4a'),
                     variant='featured', spokenText='<preset>, ' + job['text'],
                     nameHash=name_hash)
                for job in jobs if job['address']] if name_hash else []
    return jobs + bodies + featured


def preserve_clips(output, jobs, generated_variant):
    """Reuse unselected clips only after matching their recipe and bytes."""
    existing = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
    if (existing['model']['revision'] != MODEL_REVISION or
            existing['model']['sdkVersion'] != SDK_VERSION):
        raise ValueError('Existing clips were made with a different model or SDK.')
    clips = {clip['key']: clip for clip in existing['clips']}
    preserved = []
    for job in jobs:
        if job['variant'] == generated_variant:
            continue
        clip = dict(clips[job['key']])
        # Original full clips predate the explicit variant field.
        clip.setdefault('variant', 'full')
        if any(clip.get(key) != value for key, value in job.items()):
            raise ValueError('Existing clip no longer matches the dialogue: ' + job['key'])
        asset = output / job['file']
        if hashlib.sha256(asset.read_bytes()).hexdigest() != clip['sha256']:
            raise ValueError('Existing clip checksum mismatch: ' + job['key'])
        preserved.append(clip)
    return preserved


def read_preset_name(path, repo):
    """Read an explicitly supplied private input; never return it as metadata."""
    value = unicodedata.normalize('NFC', path.read_text(encoding='utf-8'))
    value = ''.join(char for char in value if unicodedata.category(char)[0] in 'LM'
                    or char.isspace() or char in "'-")
    value = re.sub(r'\s+', ' ', value).strip()[:12].strip()
    if not value:
        raise ValueError('The preset-name input is empty after normalization.')
    digest = hashlib.sha256(value.encode('utf-8')).hexdigest()
    source = (repo / 'game.js').read_text(encoding='utf-8')
    expected = re.search(r"\bconst PRESET_NAME_SHA256 = '([a-f0-9]{64})';", source)
    if not expected or digest != expected.group(1):
        raise ValueError('The preset-name input does not match the configured lookup hash.')
    last = ord(value[-1])
    call_name = value + ('아' if (last - 0xac00) % 28 else '야') if 0xac00 <= last <= 0xd7a3 else value
    return call_name, digest


def audio_stats(samples, sample_rate, np):
    samples = np.asarray(samples).reshape(-1)
    if not len(samples):
        raise ValueError('Generated an empty waveform.')
    frame_size = round(sample_rate * 0.020)
    frames = samples[:len(samples) // frame_size * frame_size].reshape(-1, frame_size)
    frame_rms = np.sqrt(np.mean(frames.astype(np.float64) ** 2, axis=1))
    active = np.flatnonzero(frame_rms > 10 ** (-50 / 20))
    return {
        'duration': len(samples) / sample_rate,
        'peak': float(np.max(np.abs(samples))),
        'rms': float(np.sqrt(np.mean(samples.astype(np.float64) ** 2))),
        'finite': bool(np.isfinite(samples).all()),
        'clippedSamples': int(np.count_nonzero(np.abs(samples) >= 1)),
        'quietFrameFraction': float(np.mean(frame_rms <= 10 ** (-50 / 20))),
        'leadingQuiet': float(active[0] * 0.020) if len(active) else len(samples) / sample_rate,
        'trailingQuiet': float((len(frame_rms) - active[-1] - 1) * 0.020) if len(active) else len(samples) / sample_rate,
    }


def validate_audio(stats, label):
    if (not stats['finite'] or not 0.25 <= stats['duration'] <= 15 or
            stats['rms'] < 0.0001 or stats['quietFrameFraction'] > 0.95 or
            stats['clippedSamples']):
        raise ValueError('Invalid or suspicious waveform for ' + label + ': ' + json.dumps(stats))


def trim_and_normalize(samples, sample_rate, np):
    frame_size = round(sample_rate * 0.020)
    frames = samples[:len(samples) // frame_size * frame_size].reshape(-1, frame_size)
    rms = np.sqrt(np.mean(frames.astype(np.float64) ** 2, axis=1))
    active = np.flatnonzero(rms > 10 ** (-50 / 20))
    if not len(active):
        raise ValueError('No audible speech frames.')
    padding = round(sample_rate * 0.100)
    first = max(0, int(active[0] * frame_size) - padding)
    last = min(len(samples), int((active[-1] + 1) * frame_size) + padding)
    result = samples[first:last].copy()
    gain = min(2.0, 0.7 / float(np.max(np.abs(result))))
    result *= gain
    return result, {'removedStart': first / sample_rate,
                    'removedEnd': (len(samples) - last) / sample_rate,
                    'gain': gain}


def convert_audio(afconvert, input_path, output_path, encode):
    options = ['-f', 'm4af', '-d', 'aac', '-b', '64000', '-c', '1', '-q', '127'] if encode else [
        '-f', 'WAVE', '-d', 'LEF32', '-c', '1']
    subprocess.run([afconvert, str(input_path), str(output_path), *options],
                   check=True, capture_output=True, text=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--model', type=Path, required=True, help='Existing Supertonic 3 model directory')
    parser.add_argument('--output', type=Path, help='Defaults to REPO/assets/voices')
    parser.add_argument('--work-dir', type=Path, help='Temporary WAVs and verification report directory')
    parser.add_argument('--cache-dir', type=Path, help='Authoring cache directory; never included in manifest')
    parser.add_argument('--preset-name-file', type=Path,
                        help='Private UTF-8 name input; adds publicly served featured audio, never name text metadata')
    variants = parser.add_mutually_exclusive_group()
    variants.add_argument('--only-body', action='store_true',
                        help='Generate only address-free bodies, preserving verified existing full clips')
    variants.add_argument('--only-featured', action='store_true',
                          help='Generate only preset-name full sentences, preserving verified generic clips')
    args = parser.parse_args()
    if args.only_featured and not args.preset_name_file:
        parser.error('--only-featured requires --preset-name-file')
    repo = args.repo.resolve()
    output = (args.output or repo / 'assets' / 'voices').resolve()
    work = (args.work_dir or Path(tempfile.mkdtemp(prefix='friend-voices-'))).resolve()
    work.mkdir(parents=True, exist_ok=True)
    cache = (args.cache_dir or work / 'cache').resolve()
    os.environ['HF_HOME'] = str(cache / 'huggingface')
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    os.environ['SUPERTONIC_CACHE_DIR'] = str(args.model.resolve())
    os.environ['XDG_CACHE_HOME'] = str(cache)
    afconvert = shutil.which('afconvert')
    if not afconvert:
        raise RuntimeError('macOS afconvert is required for AAC encoding and decode verification.')

    import numpy as np
    import soundfile as sf
    import supertonic
    from supertonic import TTS

    if supertonic.__version__ != SDK_VERSION:
        raise ValueError('Use supertonic==' + SDK_VERSION + ' for this asset recipe.')
    preset_call, name_hash = read_preset_name(args.preset_name_file, repo) if args.preset_name_file else (None, None)
    if not name_hash and any(output.rglob('*-featured.m4a')):
        raise ValueError('Featured audio exists: provide its private name input or use a separate output directory.')
    jobs = dialogue_jobs(repo, name_hash)
    generated_variant = 'featured' if args.only_featured else 'body' if args.only_body else None
    preserved = preserve_clips(output, jobs, generated_variant) if generated_variant else []
    selected = [job for job in jobs if job['variant'] == generated_variant] if generated_variant else jobs
    print(f'Loading offline model for {len(selected)} clips; preserving {len(preserved)} clips.', flush=True)
    tts = TTS(model='supertonic-3', model_dir=args.model.resolve(), auto_download=False,
              intra_op_num_threads=4, inter_op_num_threads=1)
    styles = {name: tts.get_voice_style(name) for name in set(SPEAKERS.values())}
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        'schemaVersion': 1,
        'model': {'repository': MODEL_REPO, 'revision': MODEL_REVISION, 'sdkVersion': SDK_VERSION,
                  'source': 'https://huggingface.co/' + MODEL_REPO,
                  'license': 'OpenRAIL-M'},
        'generation': {'language': 'ko', 'steps': 10, 'provider': 'CPUExecutionProvider',
                       'threads': 4, 'sampleRate': tts.sample_rate, 'codec': 'AAC-LC',
                       'container': 'M4A', 'bitrate': 64000, 'channels': 1,
                       'trimFrameMs': 20, 'trimThresholdDb': -50, 'trimPaddingMs': 100,
                       'targetPeak': 0.7, 'maximumGain': 2,
                       'seedMethod': 'First 8 SHA-256 hex digits of clip key',
                       'personalNames': bool(name_hash),
                       'personalNameScope': 'featured audio only' if name_hash else 'none',
                       'listeningVerified': False},
        'voices': SPEAKERS,
        'clips': preserved,
    }
    if name_hash:
        manifest['nameHash'] = name_hash
        manifest['nameHashPurpose'] = 'Preset lookup only; not a privacy or anonymization boundary. Featured audio is public.'
    started = time.perf_counter()
    for index, job in enumerate(selected):
        np.random.seed(int(hashlib.sha256(job['key'].encode()).hexdigest()[:8], 16))
        synthesis_text = preset_call + ', ' + job['text'] if job['variant'] == 'featured' else job['spokenText']
        waveform, predicted_duration = tts.synthesize(
            synthesis_text, voice_style=styles[job['speaker']], lang='ko',
            total_steps=10, speed=job['rate'])
        if waveform.ndim != 2 or waveform.shape[0] != 1:
            raise ValueError('Unexpected model waveform shape: ' + repr(waveform.shape))
        samples = waveform[0]
        raw_stats = audio_stats(samples, tts.sample_rate, np)
        validate_audio(raw_stats, job['key'])
        stem = job['key'].replace(':', '-')
        raw_path = work / (stem + '-raw.wav')
        sf.write(raw_path, samples, tts.sample_rate, subtype='FLOAT')
        edited, edit = trim_and_normalize(samples, tts.sample_rate, np)
        wav_path = work / (stem + '.wav')
        sf.write(wav_path, edited, tts.sample_rate, subtype='PCM_16')
        asset_path = output / job['file']
        asset_path.parent.mkdir(parents=True, exist_ok=True)
        convert_audio(afconvert, wav_path, asset_path, encode=True)
        decoded_path = work / (stem + '-decoded.wav')
        convert_audio(afconvert, asset_path, decoded_path, encode=False)
        decoded, decoded_rate = sf.read(decoded_path)
        if decoded.ndim != 1 or decoded_rate != tts.sample_rate:
            raise ValueError('Unexpected decoded audio format: ' + job['key'])
        metrics = audio_stats(decoded, decoded_rate, np)
        validate_audio(metrics, job['key'] + ' decoded AAC')
        if abs(metrics['duration'] - len(edited) / tts.sample_rate) > 0.12:
            raise ValueError('AAC duration mismatch: ' + job['key'])
        entry = dict(job, sha256=hashlib.sha256(asset_path.read_bytes()).hexdigest(),
                     duration=metrics['duration'], peak=metrics['peak'], sizeBytes=asset_path.stat().st_size,
                     modelRevision=MODEL_REVISION, sdkVersion=SDK_VERSION,
                     processing=edit, verification=metrics,
                     rawDuration=raw_stats['duration'], modelDuration=float(np.asarray(predicted_duration).reshape(-1)[0]))
        manifest['clips'].append(entry)
        (work / 'build-progress.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        if (index + 1) % 15 == 0:
            print(f'{index + 1}/{len(selected)}: {job["animal"]}, {time.perf_counter() - started:.1f}s', flush=True)
    files = {path.relative_to(output).as_posix() for path in output.rglob('*.m4a')}
    if files != {job['file'] for job in jobs}:
        raise ValueError('Output contains missing or unexpected M4A files; check the output directory.')
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    summary = {'clips': len(jobs), 'generatedClips': len(selected), 'preservedClips': len(jobs) - len(selected),
               'elapsedSeconds': time.perf_counter() - started,
               'totalBytes': sum(row['sizeBytes'] for row in manifest['clips']),
               'minimumDuration': min(row['duration'] for row in manifest['clips']),
               'maximumDuration': max(row['duration'] for row in manifest['clips']),
               'maximumPeak': max(row['peak'] for row in manifest['clips']),
               'clippedSamples': sum(row['verification']['clippedSamples'] for row in manifest['clips']),
               'listeningVerified': False}
    (work / 'build-summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
