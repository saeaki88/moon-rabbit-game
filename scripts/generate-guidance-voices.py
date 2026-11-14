#!/usr/bin/env python3
"""Generate the rabbit's fixed Korean guidance with an offline Supertonic 3 model.

Requires the same authoring dependencies as generate-friend-voices.py. No model,
Python package, personal input, or speech API is needed by the shipped game.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import time


def shared_helpers():
    sys.dont_write_bytecode = True
    path = Path(__file__).with_name('generate-friend-voices.py')
    spec = importlib.util.spec_from_file_location('friend_voice_authoring', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def guidance_jobs(repo, helpers):
    source = (repo / 'game.js').read_text(encoding='utf-8')
    lines = helpers.read_js_object(source, 'GUIDANCE_AUDIO')
    expected = {f'{kind}-{vegetable}-{count}'
                for kind in ('request', 'find', 'more')
                for vegetable in ('carrot', 'cucumber')
                for count in (1, 2, 3)}
    expected.update({'count-1', 'count-2', 'count-3', 'thanks'})
    if set(lines) != expected or len(set(lines.values())) != 22:
        raise ValueError('Expected exactly 22 distinct guidance lines and their fixed IDs.')
    if any(not isinstance(text, str) or not text.strip() for text in lines.values()):
        raise ValueError('Empty guidance line.')
    return [{'key': key, 'file': key + '.m4a', 'text': text, 'spokenText': text,
             'speaker': 'F3', 'rate': 0.96}
            for key, text in lines.items()]


def validate_audio(stats, label):
    # A single Korean counting word can be shorter than a full dialogue sentence.
    if (not stats['finite'] or not 0.15 <= stats['duration'] <= 15 or
            stats['rms'] < 0.0001 or stats['quietFrameFraction'] > 0.95 or
            stats['clippedSamples']):
        raise ValueError('Invalid or suspicious guidance waveform for ' + label + ': ' + json.dumps(stats))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--model', type=Path, required=True, help='Existing Supertonic 3 model directory')
    parser.add_argument('--output', type=Path, help='Defaults to REPO/assets/guidance')
    parser.add_argument('--work-dir', type=Path, help='Temporary WAVs and decode verification directory')
    parser.add_argument('--cache-dir', type=Path, help='Authoring cache; never included in the manifest')
    args = parser.parse_args()
    helpers = shared_helpers()
    repo = args.repo.resolve()
    output = (args.output or repo / 'assets' / 'guidance').resolve()
    work = (args.work_dir or Path(tempfile.mkdtemp(prefix='guidance-voices-'))).resolve()
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
        raise RuntimeError('macOS afconvert is required for encoding and decode verification.')

    import numpy as np
    import soundfile as sf
    import supertonic
    from supertonic import TTS

    if supertonic.__version__ != helpers.SDK_VERSION:
        raise ValueError('Use supertonic==' + helpers.SDK_VERSION + ' for this recipe.')
    jobs = guidance_jobs(repo, helpers)
    print(f'Loading offline model for {len(jobs)} rabbit guidance clips.', flush=True)
    tts = TTS(model='supertonic-3', model_dir=args.model.resolve(), auto_download=False,
              intra_op_num_threads=4, inter_op_num_threads=1)
    style = tts.get_voice_style('F3')
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        'schemaVersion': 1,
        'source': {'file': 'game.js', 'constant': 'GUIDANCE_AUDIO'},
        'model': {'repository': helpers.MODEL_REPO, 'revision': helpers.MODEL_REVISION,
                  'sdkVersion': helpers.SDK_VERSION,
                  'source': 'https://huggingface.co/' + helpers.MODEL_REPO,
                  'license': 'OpenRAIL-M',
                  'licenseUrl': 'https://huggingface.co/' + helpers.MODEL_REPO + '/blob/' +
                                helpers.MODEL_REVISION + '/LICENSE'},
        'generation': {'language': 'ko', 'speaker': 'F3', 'rate': 0.96, 'steps': 10,
                       'provider': 'CPUExecutionProvider', 'threads': 4,
                       'sampleRate': tts.sample_rate, 'codec': 'AAC-LC', 'container': 'M4A',
                       'bitrate': 64000, 'channels': 1, 'trimFrameMs': 20,
                       'trimThresholdDb': -50, 'trimPaddingMs': 100,
                       'targetPeak': 0.7, 'maximumGain': 2,
                       'seedMethod': 'First 8 SHA-256 hex digits of clip key',
                       'minimumAcceptedDuration': 0.15, 'personalNames': False,
                       'listeningVerified': False},
        'clips': [],
    }
    started = time.perf_counter()
    for index, job in enumerate(jobs):
        np.random.seed(int(hashlib.sha256(job['key'].encode()).hexdigest()[:8], 16))
        waveform, predicted_duration = tts.synthesize(
            job['spokenText'], voice_style=style, lang='ko', total_steps=10, speed=job['rate'])
        if waveform.ndim != 2 or waveform.shape[0] != 1:
            raise ValueError('Unexpected model waveform shape: ' + repr(waveform.shape))
        samples = waveform[0]
        raw_stats = helpers.audio_stats(samples, tts.sample_rate, np)
        validate_audio(raw_stats, job['key'])
        sf.write(work / (job['key'] + '-raw.wav'), samples, tts.sample_rate, subtype='FLOAT')
        edited, processing = helpers.trim_and_normalize(samples, tts.sample_rate, np)
        wav_path = work / (job['key'] + '.wav')
        sf.write(wav_path, edited, tts.sample_rate, subtype='PCM_16')
        asset_path = output / job['file']
        helpers.convert_audio(afconvert, wav_path, asset_path, encode=True)
        decoded_path = work / (job['key'] + '-decoded.wav')
        helpers.convert_audio(afconvert, asset_path, decoded_path, encode=False)
        decoded, decoded_rate = sf.read(decoded_path)
        if decoded.ndim != 1 or decoded_rate != tts.sample_rate:
            raise ValueError('Unexpected decoded audio format: ' + job['key'])
        metrics = helpers.audio_stats(decoded, decoded_rate, np)
        validate_audio(metrics, job['key'] + ' decoded AAC')
        if abs(metrics['duration'] - len(edited) / tts.sample_rate) > 0.12:
            raise ValueError('AAC duration mismatch: ' + job['key'])
        entry = dict(job, sha256=hashlib.sha256(asset_path.read_bytes()).hexdigest(),
                     duration=metrics['duration'], peak=metrics['peak'], sizeBytes=asset_path.stat().st_size,
                     modelRevision=helpers.MODEL_REVISION, sdkVersion=helpers.SDK_VERSION,
                     processing=processing, verification=metrics,
                     rawDuration=raw_stats['duration'],
                     modelDuration=float(np.asarray(predicted_duration).reshape(-1)[0]))
        manifest['clips'].append(entry)
        (work / 'build-progress.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{index + 1}/{len(jobs)}: {job["key"]}, {metrics["duration"]:.2f}s', flush=True)
    files = {path.relative_to(output).as_posix() for path in output.rglob('*.m4a')}
    if files != {job['file'] for job in jobs}:
        raise ValueError('Output has missing or unexpected M4A files.')
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    summary = {'clips': len(jobs), 'elapsedSeconds': time.perf_counter() - started,
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
