'use strict';

// Run from the repository root with node or the macOS JavaScriptCore CLI.
const source = typeof readFile === 'function'
  ? readFile('game.js')
  : require('node:fs').readFileSync('game.js', 'utf8');
const log = typeof print === 'function' ? print : console.log;
const requests = [
  { type: 'carrot', count: 1 }, { type: 'cucumber', count: 2 },
  { type: 'carrot', count: 3 }, { type: 'cucumber', count: 2 },
  { type: 'carrot', count: 3 }, { type: 'cucumber', count: 3 },
];
const requestTotals = [1, 3, 6, 8, 11, 14];
const friends = ['turtle', 'penguin', 'fox', 'brownBear', 'lion', 'leopardCat', 'squid', 'duck', 'tiger', 'sunBear', 'chick', 'cat'];
new Function(source);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createGame(width, height, seed = 20261013, withAudio = true, options = {}) {
  let now = 0;
  let frame;
  let saveDepth = 0;
  const events = {};
  const windowEvents = {};
  const documentEvents = {};
  const contexts = [];
  const storage = options.storage || {};
  const gains = [];
  const destinations = [];
  const drawnText = [];
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function numeric(...args) {
    assert(args.every(value => typeof value !== 'number' || Number.isFinite(value)), 'Non-finite Canvas/Audio argument');
  }
  const ctx = {};
  ['beginPath', 'closePath', 'ellipse', 'arc', 'fill', 'stroke', 'fillRect', 'fillText',
    'translate', 'scale', 'rotate', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'setTransform']
    .forEach(name => { ctx[name] = numeric; });
  ctx.fillText = (...args) => { numeric(...args); drawnText.push(String(args[0])); };
  ctx.save = () => { saveDepth++; };
  ctx.restore = () => { assert(--saveDepth >= 0, 'Unbalanced Canvas restore'); };
  ctx.createLinearGradient = (...args) => { numeric(...args); return { addColorStop: numeric }; };
  const canvas = { width: 0, height: 0, getContext: () => ctx,
    addEventListener: (name, fn) => { events[name] = fn; } };
  const elements = {};
  function element(id) {
    if (!elements[id]) elements[id] = { textContent: '', value: '', attributes: {}, hidden: false,
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, fn) { this[name] = fn; },
      focus() { this.focused = true; },
      blur() { this.focused = false; } };
    return elements[id];
  }
  const sound = element('sound-toggle');
  function audioParam() {
    return { value: 1,
      setValueAtTime(value, time) { numeric(value, time); this.value = value; },
      exponentialRampToValueAtTime: numeric, linearRampToValueAtTime: numeric };
  }
  class AudioContext {
    constructor() {
      this.state = 'running'; this.destination = {}; this.resumes = 0; contexts.push(this);
      if (options.recordings) {
        this.decodeAudioData = (data, success, failure) => {
          const decoding = options.recordings.decode(data);
          if (success || failure) decoding.then(success, failure);
          return decoding;
        };
        this.createBufferSource = () => options.recordings.createSource();
      }
    }
    get currentTime() { return now / 1000; }
    resume() {
      this.resumes++;
      const recordings = options.recordings;
      if (recordings && (recordings.holdResume || recordings.failResume || recordings.resumeWithoutRunning)) {
        const pending = deferred();
        recordings.resumptions.push({ context: this, ...pending });
        if (recordings.failResume) pending.reject(Error('Audio resume denied'));
        else if (recordings.resumeWithoutRunning) pending.resolve();
        return pending.promise;
      }
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { if (!options.pendingSuspend) this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createOscillator() { return { frequency: audioParam(), connect() {}, start: numeric, stop: numeric }; }
    createGain() {
      const node = { gain: audioParam(), connect(destination) { destinations.push(destination); }, disconnect() { this.disconnected = true; } };
      gains.push(node);
      return node;
    }
  }
  const media = { matches: !!options.reducedMotion, addEventListener(name, fn) { this[name] = fn; } };
  globalThis.window = { innerWidth: width, innerHeight: height, devicePixelRatio: options.dpr || 1,
    matchMedia: () => media,
    localStorage: {
      getItem(key) { if (options.blockStorage) throw Error('Storage unavailable'); return storage[key] || null; },
      setItem(key, value) { if (options.blockStorage) throw Error('Storage unavailable'); storage[key] = value; },
      removeItem(key) { if (options.blockStorage || options.blockStorageRemoval) throw Error('Storage unavailable'); delete storage[key]; }
    },
    addEventListener(name, fn) { (windowEvents[name] ||= []).push(fn); } };
  if (options.speech) {
    window.speechSynthesis = options.speech;
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        if (options.speech.failConstruct) throw Error('Speech construction unavailable');
        this.text = text;
      }
    };
  }
  if (options.recordings) {
    const recordings = options.recordings;
    window.fetch = globalThis.fetch = recordings.fetch.bind(recordings);
    window.AbortController = globalThis.AbortController = class {
      constructor() { this.signal = { aborted: false }; }
      abort() { this.signal.aborted = true; }
    };
    window.setTimeout = globalThis.setTimeout = (fn, delay) => recordings.setTimer(fn, delay);
    window.clearTimeout = globalThis.clearTimeout = id => recordings.timers.delete(id);
  }
  if (options.crypto) {
    window.crypto = options.crypto.noSubtle ? {} : { subtle: { digest: options.crypto.digest.bind(options.crypto) } };
    if (!options.crypto.noEncoder) window.TextEncoder = class {
      encode(value) { options.crypto.encoded.push(value); return new Uint8Array([1, 2, 3]); }
    };
  }
  if (withAudio) window.AudioContext = AudioContext;
  globalThis.document = { hidden: false, getElementById: id => id === 'game' ? canvas : element(id),
    addEventListener(name, fn) { documentEvents[name] = fn; } };
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = fn => { frame = fn; };
  const marker = '  requestAnimationFrame(loop);\n})();';
  assert(source.includes(marker), 'Test cannot inspect the game IIFE');
  // Expose state only in this temporary evaluation, never in the shipped game.
  new Function(source.replace(marker, '  globalThis.__smokeState = G; globalThis.__smokeApi = {scheduleBGM, updateParticles, spawnParticles, draw, drawFlyingCarrots, flightPos, currentRequest, requestLabel, FRIEND_DIALOGUE, FRIEND_CONTEXT_DIALOGUE, PRESET_NAME_SHA256};\n' + marker))();
  const G = globalThis.__smokeState;
  function step(ms = 50) {
    now += ms;
    assert(typeof frame === 'function', 'Animation loop stopped');
    frame(now);
    assert(saveDepth === 0, 'Canvas state leaked across frames');
  }
  function advance(ms) { for (let elapsed = 0; elapsed < ms; elapsed += 50) step(); }
  function tap(x, y) { events.pointerdown({ clientX: x, clientY: y, preventDefault() {} }); }
  function resize(w, h) {
    window.innerWidth = w;
    window.innerHeight = h;
    windowEvents.resize.forEach(fn => fn());
    step();
    assert(canvas.width === Math.round(w * Math.min(2, options.dpr || 1)) && canvas.height === Math.round(h * Math.min(2, options.dpr || 1)), 'Canvas did not resize');
  }
  const start = () => element('start-button').click();
  const click = id => element(id).click();
  const submit = id => {
    let prevented = false;
    element(id).submit({ preventDefault() { prevented = true; } });
    assert(prevented, 'Form submission did not prevent navigation');
  };
  const visibility = hidden => { document.hidden = hidden; documentEvents.visibilitychange(); };
  return { G, step, advance, tap, resize, sound, gains, destinations, canvas, elements, contexts,
    start, click, submit, visibility, storage, media, drawnText, api: globalThis.__smokeApi };

}

function runEnding(width, height, ending, seed) {
  const game = createGame(width, height, seed);
  const { G, step, advance, tap, sound, gains } = game;
  assert(G.characterOrder.length === 12 && new Set(G.characterOrder).size === 12, 'Friends missing or duplicated');
  sound.click();
  assert(!G.soundEnabled && !G.started && sound.attributes['aria-pressed'] === 'true', 'Mute button started the game or missed accessibility state');
  step();
  tap(width / 2, height / 2);
  assert(!G.started, 'Canvas tap accidentally started the game');
  game.start();
  assert(G.started && G.carrots.length === 1 && gains[0].gain.value === 0, 'Muted first tap failed');
  sound.click();
  assert(G.soundEnabled && gains[0].gain.value === 1, 'Unmute did not restore the master gain');
  tap(G.moonX, G.moonY);
  assert(G.dimming === 0.3, 'Moon touch did not dim the screen');
  advance(200);
  assert(G.dimming < 0.3, 'Dimming did not fade');

  const vegetableTypes = new Set();
  const thresholds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (let score = 1; score <= 14; score++) {
    const expectedIndex = requestTotals.findIndex(total => score <= total);
    const expected = requests[expectedIndex];
    for (let attempts = 0; !G.carrots.some(c => c.type === expected.type) && attempts < 80; attempts++) step();
    assert(G.requestIndex === expectedIndex, 'Request order skipped or failed to advance');
    assert(game.api.currentRequest().type === expected.type && game.api.currentRequest().count === expected.count, 'Request goal changed');
    assert(G.carrots.some(c => c.type === expected.type), 'No reachable requested vegetable spawned');
    assert(G.carrots.length <= 2, 'Too many choices shown');
    if (G.carrots.length === 2) {
      const [one, two] = G.carrots;
      assert(one.type !== two.type, 'Matching task offered duplicate choices');
      const separation = Math.max(28, one.size * 1.55) + Math.max(28, two.size * 1.55) + 8;
      assert(Math.hypot(one.x - two.x, one.y - two.y) > separation, 'Choice touch areas overlap');
    }
    advance(150);
    const item = G.carrots.find(c => c.type === expected.type);
    vegetableTypes.add(item.type);
    // Exercise the enlarged hit area, outside the old 1.3x radius.
    tap(item.x + item.size * 1.4, item.y);
    assert(G.flyingCarrots.some(f => f.type === item.type), 'Vegetable pickup failed or lost its type');
    advance(400);
    assert(G.score === score, 'Score did not advance exactly once');
    const expectedCount = score - (requestTotals[expectedIndex - 1] || 0);
    assert(G.requestItems.length === expectedCount && G.requestItems.every(type => type === expected.type), 'Request lost quantity or accepted the wrong vegetable');
    if (expectedCount === expected.count && score < 14) {
      assert(G.requestReadyAt > G.clock && G.carrots.length === 0, 'Completed request did not leave time to inspect the quantity');
    } else assert(!G.requestReadyAt, 'Incomplete or final request scheduled a new request');
    assert(friends.filter(name => G[name].visible).length === thresholds.filter(n => n <= score).length, 'Incorrect friend progression');
  }
  assert(vegetableTypes.size === 2, 'Both vegetable types were not exercised');
  assert(G.brownBear.visible && G.leopardCat.visible && friends.every(name => G[name].visible), 'A new or existing friend missed the ending');
  assert(G.endingPending && G.carrots.length === 0 && G.spawnTimes.length === 0, 'Goal did not stop spawning');
  assert(['arc', 'spiral', 'bounce', 'float'].includes(G.endingType), 'Invalid random ending selection');
  G.endingType = ending;
  // A late arrival must join the flight from its destination, fully visible.
  G.lion.x = -G.lion.size * 2;
  G.lion.enter = 0.1;
  G.sunBear.x = -G.sunBear.size * 2;
  G.sunBear.enter = 0.1;
  G.brownBear.x = -G.brownBear.size * 2;
  G.brownBear.enter = 0.1;
  G.leopardCat.x = width + G.leopardCat.size * 2;
  G.leopardCat.enter = 0.1;
  tap(width / 2, height / 2);
  assert(G.score === 14, 'Pending ending accepted another pickup');
  sound.click();
  assert(gains[0].gain.value === 0, 'Mute missed already queued sounds');
  advance(1200);
  assert(G.ending && G.endingPhase === 'flying' && G.lion.enter === 1, 'Late friend did not join the ending');
  assert(G.flightLion.startX === G.lion.targetX, 'Late friend flight started off screen');
  assert(G.sunBear.enter === 1 && G.flightSunBear.startX === G.sunBear.targetX, 'Late sun bear did not join the ending fully visible');
  assert(G.brownBear.enter === 1 && G.flightBrownBear.startX === G.brownBear.targetX, 'Late brown bear did not join the ending');
  assert(G.leopardCat.enter === 1 && G.flightLeopardCat.startX === G.leopardCat.targetX, 'Late leopard cat did not join the ending');

  let celebrated = false;
  for (let frames = 0; G.endingPhase !== 'done' && frames < 250; frames++) {
    step();
    if (G.endingPhase === 'celebrating') celebrated = true;
    for (const name of ['rabbit', ...friends]) {
      const f = G['flight' + name[0].toUpperCase() + name.slice(1)];
      const size = G[name].size * G.endingLayout.scale;
      const side = size * (name === 'cat' ? 0.95 : 0.75);
      const top = size * (name === 'rabbit' ? 1.85 : 0.95);
      assert(f.x >= side + 7.99 && f.x <= width - side - 7.99 && f.y >= top + 7.99, 'Character outline left the viewport: ' + name);
      assert(G.particles.length <= 48, 'Ending particle limit exceeded');
    }
  }
  assert(celebrated && G.endingPhase === 'done' && G.score === 14, 'Ending did not finish cleanly');
  for (const name of ['rabbit', ...friends]) {
    const f = G['flight' + name[0].toUpperCase() + name.slice(1)];
    const target = G.endingLayout.targets[name];
    assert(Math.hypot(f.x - target.x, f.y - target.y) < 0.001, 'Ending stopped short of the landing spot: ' + name);
  }
  game.resize(height, width);
  for (const name of ['rabbit', ...friends]) {
    const f = G['flight' + name[0].toUpperCase() + name.slice(1)];
    assert(f.x >= 0 && f.x <= height && f.y >= 0 && f.y <= width, 'Completed ending did not adapt to rotation');
  }
  tap(height / 2, width / 2);
  assert(G.score === 14 && G.ending, 'Canvas tap accidentally replayed');
  game.click('replay-button');
  assert(G.score === 0 && !G.ending && !G.endingPending && G.started, 'Replay did not reset the game');
  assert(friends.every(name => !G[name].visible && G[name].react === 0), 'Replay did not reset all friends');
  assert(G.spawnTimes.length === 0 && G.dimming === 0 && !G.soundEnabled, 'Replay leaked delayed spawns or reset mute');
  assert(G.carrots.length === 1 && new Set(G.characterOrder).size === 12, 'Replay did not restart correctly');
  assert(G.requestIndex === 0 && G.requestItems.length === 0 && !G.requestReadyAt && G.hintUntil > G.clock, 'Replay did not reset the learning request and first-tap guide');
  assert(game.destinations.slice(1).every(destination => destination === gains[0]), 'A sound bypassed the mute gain');
  log('PASS ' + width + 'x' + height + ' ' + ending);
}

const sizes = [[390, 844], [844, 390], [320, 568], [568, 320], [390, 390], [320, 320], [480, 480]];
['arc', 'spiral', 'bounce', 'float'].forEach((ending, type) => {
  sizes.forEach(([width, height], index) => runEnding(width, height, ending, 20261013 + type * 100 + index));
});

// Fast repeated taps accept only one delivery, and the last request stops at its goal.
{
  const game = createGame(390, 844);
  const { G, tap, advance, start } = game;
  start();
  G.score = 12;
  G.requestIndex = 5;
  G.requestItems = ['cucumber'];
  G.carrots = [
    { x: 80, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 },
    { x: 195, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 },
    { x: 310, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 },
  ];
  tap(80, 300); tap(195, 300); tap(310, 300); tap(80, 300);
  assert(G.flyingCarrots.length === 1 && G.carrots.length === 0, 'Rapid tapping accepted multiple deliveries');
  advance(400);
  assert(G.score === 13 && G.requestItems.length === 2 && !G.endingPending, 'One delivery changed the count more than once');
  advance(1200);
  const last = G.carrots.find(c => c.type === 'cucumber');
  assert(last, 'Last requested vegetable did not return');
  tap(last.x, last.y); tap(last.x, last.y);
  G.spawnTimes.push(G.clock + 100);
  advance(400);
  assert(G.score === 14 && G.requestItems.length === 3 && G.endingPending && G.spawnTimes.length === 0, 'Final request overflowed or kept delayed spawning');
}

// A different choice gives a quiet hint without consuming progress or replacing the goal.
{
  const game = createGame(390, 844);
  const { G, tap, advance, start, api, gains, drawnText } = game;
  start(); advance(200);
  const first = G.carrots[0];
  tap(first.x, first.y); advance(400); advance(1800); advance(150);
  assert(G.requestIndex === 1 && G.requestItems.length === 0, 'Tutorial did not advance to the matching request');
  const wrong = G.carrots.find(c => c.type === 'carrot');
  const correct = G.carrots.find(c => c.type === 'cucumber');
  assert(wrong && correct, 'The spacious screen did not offer two different choices');
  const label = api.requestLabel(), particles = JSON.stringify(G.particles), soundNodes = gains.length;
  tap(wrong.x, wrong.y); tap(wrong.x, wrong.y);
  assert(G.score === 1 && G.requestItems.length === 0 && G.flyingCarrots.length === 0, 'Wrong choice changed progress');
  assert(G.carrots.includes(wrong) && G.carrots.includes(correct), 'Wrong choice consumed a choice');
  assert(JSON.stringify(G.particles) === particles && gains.length === soundNodes, 'Wrong choice played a reward or punishment effect');
  assert(G.hintUntil > G.clock && api.requestLabel() === label, 'Hint lost the requested goal');
  drawnText.length = 0; api.draw();
  assert(drawnText.includes(label) && drawnText.includes(G.feedback), 'Hint replaced the persistent request display');
  tap(G.rabbit.x, G.rabbit.y);
  drawnText.length = 0; api.draw();
  assert(api.requestLabel() === label && drawnText.includes(label), 'Character feedback replaced the request');
  tap(correct.x, correct.y); advance(400);
  assert(G.score === 2 && G.requestItems.length === 1 && !G.hintUntil, 'Correct choice after a hint did not count once');
  advance(1200);
  assert(G.carrots.some(c => c.type === 'cucumber'), 'Leftover wrong choice blocked the next correct item');
}

// Completed requests wait through a pause before the next named goal appears.
{
  const game = createGame(390, 844);
  const { G, tap, advance, start, click, api } = game;
  start(); advance(200);
  const first = G.carrots[0];
  tap(first.x, first.y); advance(400);
  const deadline = G.requestReadyAt, label = api.requestLabel();
  assert(deadline > G.clock && G.requestItems.length === 1, 'Completed first request was not retained');
  click('pause-toggle'); advance(5000); click('resume-button');
  assert(G.requestReadyAt === deadline && G.requestIndex === 0 && api.requestLabel() === label, 'Pause consumed the request transition');
  advance(1000);
  assert(G.requestIndex === 0 && G.requestItems.length === 1, 'Completed request disappeared too early');
  advance(800);
  assert(G.requestIndex === 1 && G.requestItems.length === 0 && !G.requestReadyAt, 'Next request did not reset just its own count');
  assert(api.requestLabel() !== label && G.carrots.some(c => c.type === 'cucumber'), 'Next request did not announce and offer its item');
}

// Rotation must not strand only the distractor after the requested item is removed.
{
  const game = createGame(844, 390);
  const { G, start, resize, advance } = game;
  start();
  G.requestIndex = 1;
  G.score = 1;
  const leftover = { x: 100, y: 210, size: 20, scale: 1, type: 'carrot', wobble: 0 };
  G.carrots = [leftover, { x: 700, y: 150, size: 20, scale: 1, type: 'cucumber', wobble: 0 }];
  resize(390, 844);
  assert(!G.carrots.includes(leftover), 'Rotation retained a distractor without the requested item');
  advance(1200);
  assert(G.carrots.some(c => c.type === 'cucumber'), 'Rotation did not restore a reachable requested item');
}

// Friend touches trigger different feedback without adding score.
{
  const { G, tap, advance, start } = createGame(390, 844);
  start();
  G.carrots = [];
  for (const name of ['lion', 'tiger', 'fox', 'sunBear', 'brownBear', 'leopardCat']) {
    const ch = G[name];
    ch.visible = true; ch.enter = 1; ch.x = ch.targetX; ch.y = ch.targetY;
    tap(ch.x, ch.y);
    assert(ch.react === 1 && G.score === 0, 'Friend touch failed: ' + name);
    assert(G.particles.slice(-7).every(p => p.type === (name === 'tiger' || name === 'leopardCat' ? 'star' : 'heart')), 'Wrong touch particles');
    advance(200);
    assert(ch.react < 1, 'Touch reaction did not settle');
  }
}

// Audio support must not be necessary for starting and collecting.
{
  const { G, tap, advance, start } = createGame(390, 844, 42, false);
  start();
  advance(200);
  const item = G.carrots[0];
  tap(item.x, item.y);
  advance(400);
  assert(G.started && G.score === 1, 'Missing AudioContext broke gameplay');
}


// Pausing preserves an in-flight pickup, timers and visible feedback.
{
  const game = createGame(390, 844);
  const { G, advance, tap, start, click, visibility } = game;
  start(); advance(200);
  const item = G.carrots[0];
  tap(item.x, item.y); advance(100);
  click('pause-toggle');
  const before = JSON.stringify([G.clock, G.time, G.flyingCarrots, G.particles]);
  advance(5000); tap(item.x, item.y);
  assert(G.paused && JSON.stringify([G.clock, G.time, G.flyingCarrots, G.particles]) === before, 'Pause advanced the scene');
  click('resume-button'); advance(300);
  assert(G.score === 1 && !G.paused, 'Resume lost a pending pickup');
  visibility(true); advance(1000); visibility(false);
  assert(G.paused && !game.elements['pause-panel'].hidden, 'Hidden tab resumed automatically');
  click('resume-button');
  G.score = 13; G.requestIndex = 5; G.requestItems = ['cucumber', 'cucumber']; G.requestReadyAt = 0;
  G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 }];
  tap(100, 300); advance(400);
  assert(G.endingPending, 'Goal was not pending');
  click('pause-toggle'); advance(5000); click('resume-button');
  advance(500);
  assert(G.endingPending && !G.ending, 'Paused ending timer was consumed');
  advance(750);
  assert(G.ending, 'Ending did not resume');
  advance(500); click('pause-toggle');
  const flightBefore = JSON.stringify([G.endingTime, G.flightRabbit]);
  advance(5000);
  assert(JSON.stringify([G.endingTime, G.flightRabbit]) === flightBefore, 'Paused flight moved');
  click('home-button');
  assert(!G.started && !G.paused && !G.ending && G.requestItems.length === 0, 'Home did not clear the round');
  assert(game.contexts[0].state === 'closed' && game.gains[0].disconnected, 'Home kept old audio alive');
  start();
  assert(game.contexts.length === 2 && G.carrots.length === 1, 'New round reused old ending audio');
}

// Sound choice survives reload; restricted storage never prevents play.
{
  const storage = {};
  const first = createGame(390, 844, 1, true, { storage });
  first.sound.click();
  const next = createGame(390, 844, 2, true, { storage });
  assert(!next.G.soundEnabled && next.sound.attributes['aria-pressed'] === 'true', 'Saved mute was not restored');
  next.start();
  assert(next.gains[0].gain.value === 0, 'Saved mute did not apply to initial audio');
  const blocked = createGame(390, 844, 3, true, { blockStorage: true });
  blocked.sound.click(); blocked.start();
  assert(blocked.G.started && !blocked.G.soundEnabled, 'Blocked storage broke controls');
}

// Resume must be enqueued even if suspend has not changed the context state yet.
{
  const game = createGame(390, 844, 4, true, { pendingSuspend: true });
  game.start();
  const audio = game.contexts[0], resumes = audio.resumes;
  game.click('pause-toggle'); game.click('resume-button');
  assert(audio.resumes > resumes && !game.G.paused, 'Quick resume was lost behind suspend');
  const gainsBefore = game.gains.length;
  game.step(300000);
  assert(game.gains.length - gainsBefore <= 3, 'Stale BGM scheduled a backlog of notes');
}

// Speech is optional, prefers explicit Korean quality hints, and never changes a game action.
{
  const game = createGame(390, 844, 8, false);
  game.start();
  assert(game.G.hintUntil > game.G.clock, 'First request did not show a tap guide');
  game.advance(3000);
  assert(game.G.score === 0 && game.G.requestItems.length === 0 && game.G.flyingCarrots.length === 0, 'Tap demonstration collected a vegetable for the child');
  assert(game.G.hintUntil <= game.G.clock, 'First-tap guide did not finish');
  game.tap(30, 30);
  assert(game.G.hintUntil > game.G.clock && game.G.score === 0, 'Silent picture-card tap did not repeat the visual guide');
}

function speechMock(voices = []) {
  return { voices, spoken: [], cancellations: 0, events: {},
    getVoices() { if (this.failVoices) throw Error('Voices unavailable'); return this.voices; },
    addEventListener(name, fn) { this.events[name] = fn; },
    cancel() { this.cancellations++; },
    speak(utterance) { if (this.failSpeak) throw Error('Speech unavailable'); this.spoken.push(utterance); },
    change(voices) { this.voices = voices; this.events.voiceschanged(); }
  };
}
const localKorean = { name: 'Local Korean', lang: 'ko-KR', localService: true };
const remoteKorean = { name: 'Remote Korean', lang: 'ko-KR', localService: false, default: true };
const unknownKorean = { name: 'Korean without service metadata', lang: 'ko_KR' };
const localEnglish = { name: 'Local English', lang: 'en-US', localService: true, default: true };
const localDefaultKorean = { ...localKorean, name: 'Default Korean', default: true };
const enhancedKorean = { ...localDefaultKorean, name: 'Korean Enhanced' };
const naturalKorean = { ...remoteKorean, name: 'Korean Natural' };
const neuralKorean = { ...unknownKorean, voiceURI: 'provider.ko-KR.Neural.voice' };
const premiumKorean = { ...remoteKorean, name: 'Korean PREMIUM' };
const premiumURIKorean = { ...unknownKorean, voiceURI: 'com.apple.voice.premium.ko-KR.voice' };
const premiumLocalKorean = { ...localKorean, name: 'Korean Premium' };
const premiumDefaultLocalKorean = { ...premiumLocalKorean, default: true };
const premiumEnglish = { ...localEnglish, name: 'English Premium' };
const friendVoiceSettings = {
  turtle: [0.96, 1], penguin: [0.98, 1], fox: [1, 1], brownBear: [0.97, 1],
  lion: [0.98, 1], leopardCat: [1, 1], squid: [0.99, 1], duck: [1, 1],
  tiger: [1, 1], sunBear: [0.98, 1], chick: [1.02, 1], cat: [1.01, 1],
};

function assertFriendVoice(utterance, name) {
  const [rate, pitch] = friendVoiceSettings[name];
  assert(utterance.rate === rate && utterance.pitch === pitch && utterance.volume === 0.65, 'Animal lost its voice settings or gentle volume: ' + name);
}

function showFriend(game, name) {
  game.G.carrots = [];
  friends.forEach(friend => { game.G[friend].visible = friend === name; });
  const ch = game.G[name];
  ch.enter = 1;
  ch.x = ch.targetX = 195;
  ch.y = ch.targetY = 500;
  return ch;
}

function finishSpeech(speech) {
  const utterance = speech.spoken[speech.spoken.length - 1];
  if (utterance) { utterance.onstart(); utterance.onend(); }
}

function nextFriendSpeech(game, speech, name) {
  finishSpeech(speech); game.advance(1100);
  const ch = showFriend(game, name);
  const before = speech.spoken.length;
  game.tap(ch.x, ch.y);
  assert(speech.spoken.length === before + 1, 'Ready animal tap did not speak: ' + name);
  const utterance = speech.spoken[speech.spoken.length - 1];
  assertFriendVoice(utterance, name);
  return utterance;
}

function tapFriendGreeting(game, speech, name, greeting) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const ch = showFriend(game, name);
    game.tap(ch.x, ch.y);
    if (game.G.feedback.includes(greeting + ' ')) return speech.spoken[speech.spoken.length - 1];
    finishSpeech(speech);
    game.advance(1100);
  }
  throw new Error('Animal did not offer an addressed greeting: ' + name);
}

for (const [scenario, voices, expected] of [
  ['ordinary local default', [remoteKorean, localKorean, localDefaultKorean], localDefaultKorean],
  ['ordinary local', [remoteKorean, localEnglish, localKorean], localKorean],
  ['ordinary default', [unknownKorean, remoteKorean, localEnglish], remoteKorean],
  ['ordinary first', [unknownKorean, { ...unknownKorean }], unknownKorean],
  ['unknown service', [unknownKorean, localEnglish], unknownKorean],
  ['enhanced name', [localDefaultKorean, enhancedKorean], enhancedKorean],
  ['natural name', [localDefaultKorean, naturalKorean], naturalKorean],
  ['neural URI', [localDefaultKorean, neuralKorean], neuralKorean],
  ['premium above enhanced', [enhancedKorean, premiumKorean], premiumKorean],
  ['premium URI', [enhancedKorean, premiumURIKorean], premiumURIKorean],
  ['equal quality local default', [premiumKorean, premiumLocalKorean, premiumDefaultLocalKorean], premiumDefaultLocalKorean],
  ['equal quality local', [premiumKorean, premiumLocalKorean], premiumLocalKorean],
  ['equal quality default', [premiumURIKorean, premiumKorean], premiumKorean],
  ['equal quality first', [premiumURIKorean, { ...premiumURIKorean }], premiumURIKorean],
  ['foreign premium excluded', [premiumEnglish, localKorean], localKorean],
  ['foreign-only fallback', [premiumEnglish, localEnglish], undefined],
  ['empty-list fallback', [], undefined],
]) {
  const speech = speechMock(voices);
  const game = createGame(390, 844, 1, true, { speech });
  game.start();
  assert(speech.spoken.length === 1 && game.G.carrots.length === 1, 'Voice selection prevented the initial spoken request');
  const first = speech.spoken[0];
  assert(first.voice === expected, 'Korean voice selection failed: ' + scenario);
  assert(first.lang === (expected ? expected.lang : 'ko-KR'), 'Unspecified-voice fallback did not request Korean');
  assert(first.text === '당근 한 개 줄래?', 'Initial request did not use conversational Korean quantity');
  assert(speech.cancellations === 0, 'Starting an idle speech engine issued an unnecessary cancel');
}

// Auto-saving a draft must preserve the synchronous iOS-like start-gesture speech unlock.
for (const [draft, blockStorage] of [['', false], ['별이', false], ['하늘', true]]) {
  const speech = speechMock();
  speech.inGesture = false;
  speech.unlocked = false;
  speech.blocked = 0;
  const normalSpeak = speech.speak;
  speech.speak = function (utterance) {
    if (!this.unlocked && !this.inGesture) { this.blocked++; return; }
    this.unlocked = true;
    normalSpeak.call(this, utterance);
  };
  const game = createGame(390, 844, 11, true, { speech, blockStorage });
  if (draft) {
    game.elements['play-name-input'].value = draft;
    game.elements['play-name-input'].input({ isComposing: false });
  }
  speech.inGesture = true;
  game.start();
  speech.inGesture = false;
  assert(speech.unlocked && speech.spoken.length === 1, 'Empty voice list missed the synchronous start-gesture speech opportunity');
  if (draft) {
    assert(blockStorage ? !game.storage['moon-rabbit-play-name'] : game.storage['moon-rabbit-play-name'] === draft, 'Starting without pressing save mishandled nickname persistence');
    assert(game.elements['play-name-feedback'].attributes['data-state'] === (blockStorage ? 'session' : 'saved'), 'Starting without pressing save did not show the correct storage result');
  }
  assert(speech.spoken[0].voice === undefined && speech.spoken[0].lang === 'ko-KR', 'Initial iOS-style request did not use the Korean language fallback');
  speech.change([localEnglish]);
  assert(speech.spoken.length === 1, 'A foreign voice list retried the pending Korean fallback');
  speech.change([localKorean]);
  assert(speech.blocked === 0 && speech.spoken.length === 2 && speech.spoken[1].voice === localKorean, 'Late Korean voice could not speak after the start gesture unlocked speech');
  speech.change([localKorean]);
  assert(speech.spoken.length === 2, 'Pending fallback was retried more than once');
  speech.spoken[1].onstart(); speech.spoken[1].onend();
  speech.change([remoteKorean, localKorean]);
  assert(speech.spoken.length === 2, 'Completed guidance was repeated by a voice-list refresh');
}

// A fallback that starts or finishes, including synchronous callbacks, must not be retried.
for (const phase of ['start', 'end', 'sync-start', 'sync-end']) {
  const speech = speechMock();
  const normalSpeak = speech.speak;
  if (phase.startsWith('sync-')) speech.speak = function (utterance) {
    normalSpeak.call(this, utterance);
    utterance.onstart();
    if (phase === 'sync-end') utterance.onend();
  };
  const game = createGame(390, 844, 12, true, { speech });
  game.start();
  const first = speech.spoken[0];
  if (phase === 'start') first.onstart();
  if (phase === 'end') first.onend();
  speech.change([localKorean]);
  assert(speech.spoken.length === 1, 'An already started or completed fallback repeated after ' + phase);
}
{
  const speech = speechMock();
  const game = createGame(390, 844, 13, true, { speech });
  game.start();
  speech.spoken[0].onerror();
  speech.change([unknownKorean]);
  assert(speech.spoken.length === 2 && speech.spoken[1].voice === unknownKorean, 'An unstarted fallback error lost its one late-Korean retry');
  speech.change([localKorean]);
  assert(speech.spoken.length === 2, 'Fallback-error recovery retained another pending retry');
}

// A delayed voice must not revive an instruction after the child acts or leaves.
for (const action of ['pickup', 'pause', 'home', 'hidden', 'mute', 'next-request']) {
  const speech = speechMock();
  const game = createGame(390, 844, 2, true, { speech });
  game.start(); game.advance(200);
  assert(speech.spoken.length === 1, 'Initial language fallback was skipped');
  if (action === 'pickup' || action === 'next-request') {
    const item = game.G.carrots[0];
    game.tap(item.x, item.y);
    if (action === 'next-request') game.advance(2300);
  }
  if (action === 'pause') game.click('pause-toggle');
  if (action === 'home') game.click('home-button');
  if (action === 'hidden') game.visibility(true);
  if (action === 'mute') game.sound.click();
  const beforeChange = speech.spoken.length;
  speech.change([localKorean]);
  assert(speech.spoken.length === beforeChange, 'Late voice revived the initial request after ' + action);
  if (action === 'pickup') {
    game.advance(400);
    assert(game.G.score === 1, 'Language fallback prevented delivery');
  }
}
{
  const speech = speechMock();
  const game = createGame(390, 844, 3, true, { speech });
  game.start(); game.click('home-button'); game.start();
  assert(speech.spoken.length === 2, 'A restarted game did not make its own initial fallback');
  speech.change([localKorean]);
  assert(speech.spoken.length === 3 && speech.spoken[2].voice === localKorean, 'Restart retained an old pending instruction or lost the current one');
}

// Picture-card taps repeat guidance without collecting, and old callbacks cannot change new audio.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 4, true, { speech });
  game.start();
  const first = speech.spoken[0];
  assert(first.lang === 'ko-KR' && first.rate === 0.96 && first.pitch === 1 && first.volume === 0.65, 'Speech did not preserve the conversational pace, normal pitch and gentle volume');
  first.onstart();
  assert(game.gains[0].gain.value === 0.25, 'Speaking did not lower existing audio');
  game.tap(30, 30);
  assert(speech.spoken.length === 1, 'Rapid picture-card tap restarted the instruction');
  game.advance(1100); game.tap(30, 30);
  assert(speech.spoken.length === 2 && game.G.score === 0 && game.G.flyingCarrots.length === 0, 'Picture-card tap did not repeat guidance independently of collection');
  assert(game.G.hintUntil > game.G.clock, 'Picture-card tap did not restore a visual hint');
  const second = speech.spoken[1];
  second.onstart(); first.onend(); first.onerror();
  assert(game.gains[0].gain.value === 0.25, 'Old speech callback changed the new speech volume');
  game.sound.click(); second.onend();
  assert(game.gains[0].gain.value === 0, 'Speech callback overrode mute');
  game.sound.click();
  assert(speech.spoken.length === 3, 'Unmute did not read the current request');
  const third = speech.spoken[2]; third.onstart(); third.onend();
  assert(game.gains[0].gain.value === 1, 'Completed speech did not restore audio');
  game.click('pause-toggle'); game.tap(30, 30);
  assert(speech.spoken.length === 3 && game.gains[0].gain.value === 0, 'Pause allowed instructions or audio');
  game.click('resume-button');
  assert(speech.spoken.length === 4, 'Resume did not read the current request');
  const resumed = speech.spoken[3]; resumed.onstart();
  const cancellations = speech.cancellations;
  game.click('home-button'); resumed.onend();
  assert(speech.cancellations > cancellations && !game.G.started && game.contexts[0].state === 'closed', 'Home kept speech or game audio alive');
}

// Actual deliveries count aloud; each new request uses natural one-to-three wording.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 5, true, { speech });
  game.start();
  const quantities = ['한', '두', '세'];
  const counts = ['하나', '둘', '셋'];
  for (let round = 0; round < 3; round++) {
    const request = requests[round];
    const label = request.type === 'carrot' ? '당근' : '오이';
    assert(speech.spoken[speech.spoken.length - 1].text === label + ' ' + quantities[round] + ' 개 줄래?', 'Next request used the wrong spoken quantity or conversational wording');
    for (let count = 1; count <= request.count; count++) {
      game.advance(1100);
      const item = game.G.carrots.find(value => value.type === request.type);
      assert(item, 'Speech prevented the next choice from appearing');
      const cancellations = speech.cancellations;
      game.tap(item.x, item.y);
      assert(speech.cancellations > cancellations, 'Pickup did not cancel the previous instruction');
      game.advance(400);
      assert(speech.spoken[speech.spoken.length - 1].text === counts[count - 1], 'Delivery did not count the visible quantity');
    }
    game.advance(1850);
  }
  game.G.score = 13; game.G.requestIndex = 5; game.G.requestItems = ['cucumber', 'cucumber']; game.G.requestReadyAt = 0;
  game.G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 }];
  game.tap(100, 300); game.advance(400);
  const last = speech.spoken[speech.spoken.length - 1]; last.onstart();
  const cancellations = speech.cancellations;
  game.advance(1300); last.onend();
  assert(game.G.ending && speech.cancellations > cancellations && game.gains[0].gain.value === 1, 'Ending retained an instruction or reduced audio volume');
}

// Both rabbits answer with the remaining quantity while keeping delivery and rewards separate.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 15, true, { speech });
  const { G, tap, advance } = game;
  const mainRabbit = () => tap(G.rabbit.x, G.rabbit.y);
  const moonRabbit = () => tap(G.moonX, G.moonY);
  const lastText = () => speech.spoken[speech.spoken.length - 1].text;
  game.start(); advance(200);
  const tutorial = G.carrots[0];
  tap(tutorial.x, tutorial.y); advance(400); advance(1800); advance(150);
  assert(G.requestIndex === 1 && G.requestItems.length === 0, 'Rabbit dialogue did not reach the two-item request');
  const scoreBefore = G.score;
  mainRabbit();
  assert(lastText() === '오이 두 개 찾아 줄래?' && G.feedback === lastText(), 'Main rabbit did not ask for the initial quantity');
  assert(G.rabbit.bounce === 1 && G.rabbit.happy === 2 && G.score === scoreBefore, 'Dialogue lost the main rabbit reaction or added score');
  const spokenBefore = speech.spoken.length;
  for (let i = 0; i < 4; i++) { mainRabbit(); moonRabbit(); }
  assert(speech.spoken.length === spokenBefore, 'Repeated rabbit taps restarted the same dialogue within the cooldown');
  assert(G.dimming === 0.3 && G.score === scoreBefore, 'Moon dialogue lost its reaction or changed score');
  advance(1100); moonRabbit();
  assert(speech.spoken.length === spokenBefore + 1 && lastText() === '오이 두 개 찾아 줄래?', 'Moon rabbit could not repeat dialogue after the cooldown');
  assert(G.hintUntil === G.clock + 2800, 'Rabbit dialogue did not renew the visual guide');

  const correct = G.carrots.find(item => item.type === 'cucumber');
  tap(correct.x, correct.y); advance(100);
  const inFlightSpeech = speech.spoken.length, inFlightFeedback = G.feedback;
  mainRabbit(); moonRabbit();
  assert(speech.spoken.length === inFlightSpeech && G.feedback === inFlightFeedback, 'In-flight dialogue announced a stale remaining quantity');
  assert(G.flyingCarrots.length === 1 && G.score === scoreBefore, 'Rabbit taps changed an in-flight delivery');
  advance(300); mainRabbit();
  assert(lastText() === '오이 한 개 더 찾아 줄래?' && G.requestItems.length === 1 && G.score === scoreBefore + 1, 'Dialogue repeated the whole goal instead of the remaining quantity');
  advance(1200);
  const final = G.carrots.find(item => item.type === 'cucumber');
  tap(final.x, final.y); advance(400);
  const completionDeadline = G.requestReadyAt;
  advance(400); mainRabbit();
  assert(lastText() === '고마워' && G.requestItems.length === 2 && G.score === 3, 'Completed request did not thank the child without adding score');
  assert(G.requestReadyAt === G.clock + 1800 && G.requestReadyAt > completionDeadline, 'Thank-you dialogue did not preserve the completed request long enough');
  advance(1100); moonRabbit();
  assert(lastText() === '고마워' && G.requestIndex === 1 && G.requestReadyAt === G.clock + 1800, 'Moon rabbit did not share completed-request dialogue');
}

// Three-item requests also use the current number still needed, independently of total score.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 16, true, { speech });
  const { G, tap } = game;
  game.start();
  G.requestIndex = 2; G.score = 3; G.requestItems = []; G.carrots = [];
  tap(G.rabbit.x, G.rabbit.y);
  assert(speech.spoken[speech.spoken.length - 1].text === '당근 세 개 찾아 줄래?', 'Three-item dialogue used the wrong quantity');
  G.requestItems = ['carrot']; G.score = 4;
  tap(G.moonX, G.moonY);
  assert(speech.spoken[speech.spoken.length - 1].text === '당근 두 개 더 찾아 줄래?', 'Two remaining items were announced incorrectly');
  G.requestItems.push('carrot'); G.score = 5;
  tap(G.rabbit.x, G.rabbit.y);
  assert(speech.spoken[speech.spoken.length - 1].text === '당근 한 개 더 찾아 줄래?' && G.score === 5, 'One remaining item was announced incorrectly');
}

// Muted or unavailable speech still gives the same visual reply and tap guide.
for (const mode of ['muted', 'unavailable']) {
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 17, true, mode === 'muted' ? { speech } : {});
  const { G, tap } = game;
  game.start();
  if (mode === 'muted') game.sound.click();
  G.requestIndex = 1; G.score = 2; G.requestItems = ['cucumber']; G.carrots = [];
  const spokenBefore = speech.spoken.length;
  tap(G.rabbit.x, G.rabbit.y); tap(G.moonX, G.moonY);
  assert(speech.spoken.length === spokenBefore, 'Silent rabbit dialogue spoke in ' + mode + ' mode');
  assert(G.feedback === '오이 한 개 더 찾아 줄래?' && G.hintUntil === G.clock + 2800, 'Silent rabbit dialogue lost its reply or visual guide');
  assert(game.elements['learning-status'].textContent.includes(G.feedback) && G.score === 2, 'Silent reply was unavailable to status feedback or changed progress');
}

// The final waiting period accepts only the rabbits; the flight accepts no dialogue.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 18, true, { speech });
  const { G, tap, advance } = game;
  game.start();
  G.score = 13; G.requestIndex = 5; G.requestItems = ['cucumber', 'cucumber']; G.requestReadyAt = 0;
  G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 }];
  tap(100, 300); advance(400);
  assert(G.endingPending && G.score === 14, 'Final delivery did not enter its waiting period');
  G.lion.enter = 1; G.lion.x = G.lion.targetX; G.lion.y = G.lion.targetY; G.lion.react = 0;
  const beforeOtherTap = JSON.stringify([G.feedback, G.hintUntil, G.endingStartAt, G.particles]);
  const beforeSpeech = speech.spoken.length;
  tap(G.lion.x, G.lion.y); tap(30, 30); tap(20, 300);
  assert(G.lion.react === 0 && JSON.stringify([G.feedback, G.hintUntil, G.endingStartAt, G.particles]) === beforeOtherTap && speech.spoken.length === beforeSpeech, 'Non-rabbit input remained active during the final wait');
  const originalDeadline = G.endingStartAt;
  advance(400); tap(G.rabbit.x, G.rabbit.y);
  assert(speech.spoken[speech.spoken.length - 1].text === '고마워' && G.endingStartAt === G.clock + 1200 && G.endingStartAt > originalDeadline, 'Final rabbit dialogue did not preserve its thank-you period');
  const mainDeadline = G.endingStartAt;
  advance(300); tap(G.moonX, G.moonY);
  assert(G.endingStartAt > mainDeadline && G.feedback === '고마워' && G.score === 14, 'Final moon dialogue did not keep the completed count');
  advance(1250);
  assert(G.ending && !G.endingPending, 'Final thank-you wait did not finish');
  const endingState = JSON.stringify([G.feedback, G.hintUntil, G.rabbit.bounce, G.dimming, G.particles]);
  const endingSpeech = speech.spoken.length;
  tap(G.rabbit.x, G.rabbit.y); tap(G.moonX, G.moonY);
  assert(JSON.stringify([G.feedback, G.hintUntil, G.rabbit.bounce, G.dimming, G.particles]) === endingState && speech.spoken.length === endingSpeech && G.score === 14, 'Ending dialogue changed the flying scene');
}

function genericLineText(line) {
  return (line.address ? '친구야 ' : '') + line.text;
}

// Every animal exhausts a varied deck before repeating; rapid taps consume no lines.
for (const [index, name] of friends.entries()) {
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 30 + index, true, { speech });
  game.start(); finishSpeech(speech);
  const base = game.api.FRIEND_DIALOGUE[name];
  const contexts = game.api.FRIEND_CONTEXT_DIALOGUE[name];
  assert(base.length === 12 && Object.keys(contexts).length === 3, 'Animal did not receive its full dialogue set: ' + name);
  const expected = new Set([...base, contexts.carrot].map(genericLineText));
  assert(expected.size === 13 && new Set([...base, ...Object.values(contexts)].map(genericLineText)).size === 15, 'Animal dialogue contains duplicate lines: ' + name);
  const seen = new Set();
  let previous = '';
  for (let turn = 0; turn < 26; turn++) {
    if (turn % 13 === 0) seen.clear();
    game.advance(1100);
    const ch = showFriend(game, name);
    const before = JSON.stringify([game.G.score, game.G.requestIndex, game.G.requestItems,
      game.G.requestReadyAt, game.G.hintUntil, game.api.requestLabel()]);
    const spokenBefore = speech.spoken.length;
    game.tap(ch.x, ch.y);
    assert(speech.spoken.length === spokenBefore + 1 && ch.react === 1, 'Animal tap did not speak and react: ' + name);
    const utterance = speech.spoken[speech.spoken.length - 1];
    assertFriendVoice(utterance, name);
    assert(utterance.voice === localKorean, 'Single available Korean voice was not retained: ' + name);
    const reply = utterance.text;
    assert(reply && reply !== previous, 'Animal repeated its previous line: ' + name);
    assert(expected.has(reply) && !seen.has(reply), 'Animal repeated a line before exhausting its dialogue deck: ' + name);
    if (turn === 3) assert(reply === genericLineText(contexts.carrot), 'Fourth animal reply did not acknowledge the current vegetable: ' + name);
    assert(game.G.feedback.includes(reply) && game.elements['learning-status'].textContent.includes(game.api.requestLabel()), 'Animal dialogue hid its reply or the current request: ' + name);
    assert(JSON.stringify([game.G.score, game.G.requestIndex, game.G.requestItems,
      game.G.requestReadyAt, game.G.hintUntil, game.api.requestLabel()]) === before, 'Animal dialogue changed learning progress: ' + name);
    seen.add(reply); previous = reply;
    finishSpeech(speech);
    for (let tap = 0; tap < 3; tap++) game.tap(ch.x, ch.y);
    assert(speech.spoken.length === spokenBefore + 1 && game.G.feedback.includes(reply), 'Rapid animal taps cycled or restarted dialogue: ' + name);
    if (turn % 13 === 12) assert(seen.size === 13, 'Animal failed to visit every base line and one context line: ' + name);
  }
  assert(Array.from(seen).some(reply => reply.startsWith('친구야 ')) && Array.from(seen).some(reply => !reply.startsWith('친구야 ')), 'Animal did not mix greetings with observation dialogue: ' + name);
}

// Context reflects the live request, remains unique within a deck, and resets with a new game.
for (const [index, name] of friends.entries()) {
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 130 + index, true, { speech });
  game.start();
  const contexts = game.api.FRIEND_CONTEXT_DIALOGUE[name];
  const contextTexts = new Set(Object.values(contexts).map(genericLineText));
  const seen = new Set();
  for (const [context, requestIndex, score] of [['carrot', 0, 0], ['cucumber', 1, 1], ['moon', 4, 10]]) {
    for (let turn = 0; turn < 4; turn++) {
      // Change the request immediately before the context turn, not when the deck was created.
      if (turn === 3) { game.G.requestIndex = requestIndex; game.G.score = score; }
      const reply = nextFriendSpeech(game, speech, name).text;
      assert(!seen.has(reply), 'Changing requests repeated an already used animal line: ' + name);
      seen.add(reply);
      assert(turn === 3 ? reply === genericLineText(contexts[context]) : !contextTexts.has(reply), 'Animal used stale context or interrupted its base lines: ' + name + '/' + context);
    }
  }
  finishSpeech(speech); game.click('home-button'); game.start();
  const restartReplies = [];
  for (let turn = 0; turn < 4; turn++) restartReplies.push(nextFriendSpeech(game, speech, name).text);
  assert(restartReplies[3] === genericLineText(contexts.carrot) && new Set(restartReplies).size === 4, 'New game retained used context or repeated its initial deck: ' + name);
}

// Only the best available quality tier is shared across animals; variants remain one speaker.
{
  const voiceA = { name: 'Voice A', voiceURI: 'mock.a', lang: 'ko-KR', localService: true };
  const voiceACompact = { ...voiceA, name: 'Voice A (Compact)', voiceURI: 'mock.a.compact' };
  const voiceAEnhanced = { ...voiceA, name: 'Voice A (Enhanced)', voiceURI: 'mock.a.enhanced' };
  const voiceAPremium = { ...voiceA, name: 'Voice A (Premium)', voiceURI: 'mock.a.premium' };
  const voiceB = { ...voiceA, name: 'Voice B (Premium)', voiceURI: 'mock.b.premium' };
  const voiceC = { ...voiceA, name: 'Voice C (Premium)', voiceURI: 'mock.c.premium' };
  const voiceBasic = { ...voiceA, name: 'Voice D', voiceURI: 'mock.d' };
  const voices = [voiceC, voiceACompact, premiumKorean, voiceB, voiceAPremium, premiumEnglish, voiceA, voiceAEnhanced, voiceBasic];
  const speech = speechMock(voices);
  const game = createGame(390, 844, 80, true, { speech, storage: { 'moon-rabbit-play-name': '별이' } });
  game.start();
  assert(speech.spoken[0].voice === voiceC && speech.spoken[0].rate === 0.96 && speech.spoken[0].pitch === 1, 'Initial request no longer used the best Korean voice and normal guidance settings');
  const assigned = {};
  for (const [index, name] of friends.entries()) {
    const expected = [voiceAPremium, voiceB, voiceC][index % 3];
    const kinds = new Set();
    for (let turn = 0; turn < 13; turn++) {
      const utterance = nextFriendSpeech(game, speech, name);
      assert(utterance.voice === expected, 'Animal assignment duplicated quality variants, downgraded quality or changed between lines: ' + name);
      kinds.add(utterance.text.startsWith('별이야 ') ? 'named' : 'observation');
    }
    assert(kinds.size === 2, 'Voice consistency did not exercise named and observation lines: ' + name);
    assigned[name] = expected.voiceURI;
  }
  assert(new Set(Object.values(assigned)).size === 3, 'Available local speaker families were not distributed across animals');
  const reordered = voices.slice().reverse().map(voice => ({ ...voice }));
  const voiceZero = { ...voiceA, name: 'Voice 0 (Premium)', voiceURI: 'mock.zero.premium' };
  for (const refreshed of [reordered, [voiceZero, ...reordered]]) {
    speech.change(refreshed);
    for (const name of friends) {
      const utterance = nextFriendSpeech(game, speech, name);
      assert(utterance.voice.voiceURI === assigned[name] && refreshed.includes(utterance.voice), 'Voice refresh changed an existing speaker or reused a stale voice object: ' + name);
    }
  }
  const replacementAPremium = { ...voiceAPremium, name: 'Voice A [Premium]', voiceURI: 'mock.a.premium.updated' };
  speech.change([voiceZero, voiceA, replacementAPremium, voiceB, voiceC, premiumKorean]);
  for (const [index, name] of friends.entries()) {
    const expected = [replacementAPremium, voiceB, voiceC][index % 3];
    assert(nextFriendSpeech(game, speech, name).voice === expected, 'Removing a quality variant changed the remembered speaker family: ' + name);
  }
  // An old family with only an Enhanced variant must give way to an available Premium family.
  speech.change([voiceZero, voiceAEnhanced, voiceC, premiumKorean]);
  assert(nextFriendSpeech(game, speech, 'turtle').voice === voiceZero, 'Remembered family kept a lower quality variant despite a Premium alternative');
  assert(nextFriendSpeech(game, speech, 'penguin').voice === voiceC, 'A removed speaker family was not reassigned within the highest quality tier');
  assert(nextFriendSpeech(game, speech, 'fox').voice === voiceC, 'Removing another speaker changed an available assigned family');
  finishSpeech(speech); game.advance(1100); game.tap(30, 30);
  let guidance = speech.spoken[speech.spoken.length - 1];
  assert(guidance.voice === voiceZero && guidance.rate === 0.96 && guidance.pitch === 1 && guidance.volume === 0.65, 'Picture-card guidance inherited an animal voice or profile');
  game.tap(game.G.rabbit.x, game.G.rabbit.y);
  guidance = speech.spoken[speech.spoken.length - 1];
  assert(guidance.voice === voiceZero && guidance.rate === 0.96 && guidance.pitch === 1, 'Rabbit dialogue inherited an animal voice or profile');
  game.G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 }];
  game.tap(100, 300); game.advance(400);
  guidance = speech.spoken[speech.spoken.length - 1];
  assert(guidance.text === '하나' && guidance.voice === voiceZero && guidance.rate === 0.96 && guidance.pitch === 1 && guidance.volume === 0.65, 'Counting inherited an animal voice or profile');
}

// Newly available enhanced/neural/premium voices upgrade basic assignments immediately.
{
  const basicA = { name: 'Basic A', voiceURI: 'mock.basic.a', lang: 'ko-KR', localService: true };
  const basicB = { ...basicA, name: 'Basic B', voiceURI: 'mock.basic.b' };
  const enhanced = { ...basicA, name: 'New Enhanced', voiceURI: 'mock.new.enhanced' };
  const neural = { ...basicA, name: 'New Speaker', voiceURI: 'mock.new.neural' };
  const premium = { ...basicA, name: 'New Premium', voiceURI: 'mock.new.premium' };
  const speech = speechMock([basicA, basicB]);
  const game = createGame(390, 844, 82, true, { speech });
  game.start();
  assert(nextFriendSpeech(game, speech, 'turtle').voice === basicA && nextFriendSpeech(game, speech, 'penguin').voice === basicB, 'Basic voices did not remain usable without quality-labelled voices');
  speech.change([basicA, enhanced, basicB]);
  for (const name of friends) assert(nextFriendSpeech(game, speech, name).voice === enhanced, 'Enhanced voice did not replace a basic assignment: ' + name);
  speech.change([basicA, basicB, neural]);
  for (const name of friends) assert(nextFriendSpeech(game, speech, name).voice === neural, 'Neural URI did not outrank a basic voice: ' + name);
  speech.change([basicA, enhanced, premium, basicB, neural]);
  for (const name of friends) assert(nextFriendSpeech(game, speech, name).voice === premium, 'Premium voice did not replace an earlier lower-tier family: ' + name);
}

// Temporary loss of local voices must not mix personal speech with remote assignments.
{
  const localA = { name: 'Local A', voiceURI: 'mock.local.a', lang: 'ko-KR', localService: true };
  const localB = { ...localA, name: 'Local B', voiceURI: 'mock.local.b' };
  const localZero = { ...localA, name: 'Local 0', voiceURI: 'mock.local.zero' };
  const remoteA = { name: 'Remote A', voiceURI: 'mock.remote.a', lang: 'ko-KR', localService: false };
  const remoteB = { ...remoteA, name: 'Remote B', voiceURI: 'mock.remote.b' };
  const remoteZero = { ...remoteA, name: 'Remote 0', voiceURI: 'mock.remote.zero' };
  const speech = speechMock([remoteA, localB, localA, remoteB]);
  const game = createGame(390, 844, 81, true, { speech, storage: { 'moon-rabbit-play-name': '별이' } });
  game.start();
  const greeting = () => {
    finishSpeech(speech); game.advance(1100);
    const utterance = tapFriendGreeting(game, speech, 'penguin', '별이야');
    assertFriendVoice(utterance, 'penguin');
    return utterance;
  };
  assert(greeting().voice === localB, 'Named animal dialogue did not use its local speaker assignment');
  speech.change([remoteB, remoteA]);
  let utterance = greeting();
  assert(utterance.voice === remoteB && utterance.text.startsWith('친구야 '), 'Remote fallback lost the animal speaker or exposed the nickname');
  speech.change([localZero, remoteA, localA, localB, remoteB]);
  utterance = greeting();
  assert(utterance.voice === localB && utterance.text.startsWith('별이야 '), 'Returning local voices lost the earlier local assignment');
  speech.change([remoteZero, remoteB, remoteA]);
  utterance = greeting();
  assert(utterance.voice === remoteB && utterance.text.startsWith('친구야 '), 'General voice assignment was overwritten by the local assignment');
  assert(speech.spoken.every(value => !value.text.includes('별이') || value.voice.localService === true), 'Nickname reached a remote or implicit voice during list changes');
}

// Animal chatter waits for instructions, deliveries and the protected counting beat.
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 60, true, { speech });
  game.start();
  let ch = showFriend(game, 'turtle');
  const first = speech.spoken[0], initialFeedback = game.G.feedback;
  game.tap(ch.x, ch.y); first.onstart(); game.tap(ch.x, ch.y);
  assert(speech.spoken.length === 1 && game.G.feedback === initialFeedback && ch.react === 1, 'Animal interrupted queued or playing guidance');
  first.onend(); game.advance(1100);
  ch = showFriend(game, 'turtle');
  game.G.requestIndex = 1; game.G.score = 1; game.G.requestItems = [];
  game.G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 }];
  game.tap(100, 300);
  const inFlightFeedback = game.G.feedback, inFlightSpeech = speech.spoken.length;
  game.tap(ch.x, ch.y);
  assert(speech.spoken.length === inFlightSpeech && game.G.feedback === inFlightFeedback, 'Animal interrupted an in-flight delivery');
  game.advance(400);
  const count = speech.spoken[speech.spoken.length - 1];
  assert(count.text === '하나' && game.G.requestItems.length === 1, 'Animal dialogue changed the delivery count');
  count.onstart(); game.tap(ch.x, ch.y);
  assert(speech.spoken[speech.spoken.length - 1] === count, 'Animal replaced the spoken count');
  count.onend(); game.tap(ch.x, ch.y);
  assert(speech.spoken[speech.spoken.length - 1] === count, 'Animal skipped the brief wait after counting');
  game.advance(850); ch = showFriend(game, 'turtle'); game.tap(ch.x, ch.y);
  assert(speech.spoken[speech.spoken.length - 1] !== count && game.G.score === 2 && game.G.requestItems.length === 1, 'Animal did not recover after counting or changed progress');
}

// Personal names use only a known local Korean voice; other voices say the generic greeting.
for (const [scenario, voices, namedSpeech, failVoices] of [
  ['local Korean over remote premium', [premiumKorean, localKorean], true],
  ['remote Korean', [premiumKorean], false],
  ['unknown service', [unknownKorean], false],
  ['empty list', [], false],
  ['foreign local', [premiumEnglish], false],
  ['failed voice lookup', [localKorean], false, true],
]) {
  const speech = speechMock(voices);
  speech.failVoices = !!failVoices;
  const storage = { 'moon-rabbit-play-name': '별이' };
  const game = createGame(390, 844, 65, true, { speech, storage });
  game.start(); finishSpeech(speech);
  const reply = tapFriendGreeting(game, speech, 'fox', '별이야');
  assertFriendVoice(reply, 'fox');
  assert(game.G.feedback.includes('별이야 '), 'Saved nickname was missing from visual dialogue: ' + scenario);
  assert(reply.text.startsWith(namedSpeech ? '별이야 ' : '친구야 '), 'Nickname speech did not respect the local-only boundary: ' + scenario);
  if (namedSpeech) assert(reply.voice === localKorean, 'Named dialogue used a remote or unspecified voice');
  else assert(speech.spoken.every(utterance => !utterance.text.includes('별이')), 'Nickname reached a nonlocal speech request: ' + scenario);
  finishSpeech(speech);
  const spokenBefore = speech.spoken.length;
  speech.change([localKorean]);
  assert(speech.spoken.length === spokenBefore, 'Late voice availability replayed personal dialogue');
}
for (const mode of ['muted', 'unavailable']) {
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 66, true, { speech: mode === 'muted' ? speech : undefined,
    storage: { 'moon-rabbit-play-name': '별이', 'moon-rabbit-sound': mode === 'muted' ? 'off' : 'on' } });
  game.start();
  tapFriendGreeting(game, speech, 'fox', '별이야');
  assert(game.G.feedback.includes('별이야 ') && speech.spoken.length === 0, 'Silent animal dialogue lost the visual name or unexpectedly spoke: ' + mode);
}

// Saving, restoring, clearing and blocked storage keep the nickname a browser-only preference.
for (const [entered, expected] of [
  ['  하늘\t 별이  ', '하늘 별이'],
  ['별이', '별이'],
  ['별이💫12<>_', '별이'],
  ['가'.repeat(15), '가'.repeat(12)],
]) {
  const game = createGame(390, 844, 69, false);
  game.elements['play-name-input'].value = entered;
  game.submit('play-name-form');
  assert(game.storage['moon-rabbit-play-name'] === expected && game.elements['play-name-input'].value === expected, 'Nickname normalization or length limit was not applied');
  assert(!game.G.started && game.G.score === 0, 'Nickname normalization changed the game state');
}
{
  const storage = {};
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 70, true, { storage, speech });
  game.elements['play-name-input'].value = '  별이  ';
  game.submit('play-name-form');
  assert(storage['moon-rabbit-play-name'] === '별이' && !game.G.started && game.G.score === 0, 'Saving a nickname did not trim it or unexpectedly started play');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'cat', '별이야').text.startsWith('별이야 '), 'Nickname without a final consonant used the wrong vocative');
  finishSpeech(speech); game.click('home-button');
  game.elements['play-name-input'].value = '하늘'; game.submit('play-name-form');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'cat', '하늘아').text.startsWith('하늘아 '), 'Nickname with a final consonant used the wrong vocative');
  finishSpeech(speech); game.click('home-button'); game.click('clear-play-name');
  assert(!storage['moon-rabbit-play-name'] && game.elements['play-name-input'].value === '', 'Clearing a nickname retained saved or visible input');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'cat', '친구야').text.startsWith('친구야 '), 'Cleared nickname remained in dialogue after a new game');
  const restored = createGame(390, 844, 71, false, { storage: { 'moon-rabbit-play-name': '하늘' } });
  assert(restored.elements['play-name-input'].value === '하늘' && !restored.G.started, 'Saved nickname did not restore independently of game state');
}
{
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 72, true, { speech, blockStorage: true });
  game.elements['play-name-input'].value = '별이'; game.submit('play-name-form');
  assert(!game.storage['moon-rabbit-play-name'], 'Blocked storage unexpectedly persisted a nickname');
  assert(game.elements['play-name-status'].textContent.includes('이번 놀이'), 'Storage failure did not explain session-only naming');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'duck', '별이야').text.startsWith('별이야 '), 'Storage failure discarded the session nickname');
  finishSpeech(speech); game.click('home-button'); game.click('clear-play-name');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'duck', '친구야').text.startsWith('친구야 '), 'Storage failure prevented clearing the session nickname');
}

// The welcome screen distinguishes unsaved input, durable storage and the current call name.
{
  const game = createGame(390, 844, 73, false);
  const input = game.elements['play-name-input'];
  const feedback = game.elements['play-name-feedback'];
  const status = game.elements['play-name-status'];
  const preview = game.elements['play-name-preview'];
  assert(feedback.attributes['data-state'] === 'empty' && status.textContent === '이름 없이도 놀 수 있어요.' && preview.hidden, 'Initial nickname state falsely indicated a saved name');
  const composing = '  별이  ';
  input.value = composing; input.input({ isComposing: true });
  assert(input.value === composing && !game.storage['moon-rabbit-play-name'], 'Input handling rewrote Korean composition or saved it early');
  input.input({ isComposing: false });
  assert(feedback.attributes['data-state'] === 'dirty' && status.textContent === '아직 저장 전이에요' && preview.hidden, 'Draft nickname retained a success state or stale preview');
  game.submit('play-name-form');
  assert(feedback.attributes['data-state'] === 'saved' && status.textContent === '✓ 저장됐어요', 'Explicit save did not show a clear success state');
  assert(!preview.hidden && preview.textContent === '부를 이름 · 별이야' && input.value === '별이', 'Saved nickname preview did not show the normalized vocative');
  input.value = '하늘'; input.input({ isComposing: false });
  assert(feedback.attributes['data-state'] === 'dirty' && preview.hidden && game.storage['moon-rabbit-play-name'] === '별이', 'Editing a saved name changed storage or kept the old preview');
  input.value = '  별이 '; input.input({ isComposing: false });
  assert(feedback.attributes['data-state'] === 'saved' && status.textContent === '✓ 저장됐어요' && !preview.hidden, 'Returning to the saved value did not restore its saved state');
  assert(input.value === '  별이 ', 'Status updates rewrote the active input value');
  game.click('clear-play-name');
  assert(feedback.attributes['data-state'] === 'empty' && status.textContent === '이름을 지웠어요.' && preview.hidden && input.focused, 'Clearing a name did not confirm removal and restore input focus');
}
{
  const game = createGame(390, 844, 74, false, { storage: { 'moon-rabbit-play-name': '별이' } });
  const input = game.elements['play-name-input'];
  assert(game.elements['play-name-feedback'].attributes['data-state'] === 'saved' && game.elements['play-name-status'].textContent === '✓ 저장된 이름이에요', 'Restored nickname was not clearly identified as saved');
  assert(!game.elements['play-name-preview'].hidden && game.elements['play-name-preview'].textContent === '부를 이름 · 별이야', 'Restored nickname had no call-name preview');
  input.value = '하늘'; input.input({ isComposing: false });
  input.value = '별이'; input.input({ isComposing: false });
  assert(game.elements['play-name-status'].textContent === '✓ 저장된 이름이에요', 'Undoing an edit lost the restored-state message');
}

// Failed storage never looks successful, while the session name remains usable.
{
  const game = createGame(390, 844, 75, false, { blockStorage: true });
  const input = game.elements['play-name-input'];
  const status = game.elements['play-name-status'];
  const feedback = game.elements['play-name-feedback'];
  const preview = game.elements['play-name-preview'];
  input.value = '하늘'; game.submit('play-name-form');
  assert(feedback.attributes['data-state'] === 'session' && status.textContent.includes('이번 놀이에서만') && !status.textContent.includes('✓'), 'Blocked storage displayed a durable-save success');
  assert(!preview.hidden && preview.textContent === '부를 이름 · 하늘아', 'Session-only save lost its call-name preview');
  input.value = '별이'; input.input({ isComposing: false });
  input.value = '하늘'; input.input({ isComposing: false });
  assert(feedback.attributes['data-state'] === 'session' && !status.textContent.includes('✓'), 'Undoing an edit mislabeled a session-only name as saved');
}
{
  const storage = { 'moon-rabbit-play-name': '별이' };
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 76, true, { storage, speech, blockStorageRemoval: true });
  game.click('clear-play-name');
  assert(storage['moon-rabbit-play-name'] === '별이' && game.elements['play-name-input'].value === '', 'Removal failure was not distinguished from the cleared session value');
  assert(game.elements['play-name-feedback'].attributes['data-state'] === 'error' && !game.elements['play-name-status'].textContent.includes('✓') && game.elements['play-name-preview'].hidden, 'Removal failure displayed success or a stale name preview');
  game.start(); finishSpeech(speech);
  assert(tapFriendGreeting(game, speech, 'fox', '친구야').text.startsWith('친구야 '), 'Failed persistent removal kept using the old name in this session');
}

// Invalid nonempty input preserves the saved name; an intentional blank draft clears it on start.
for (const draft of ['123💫<>_', '']) {
  const storage = { 'moon-rabbit-play-name': '별이' };
  const speech = speechMock([localKorean]);
  const game = createGame(390, 844, 77, true, { storage, speech });
  const input = game.elements['play-name-input'];
  input.value = draft; input.input({ isComposing: false });
  if (draft) {
    game.submit('play-name-form');
    assert(game.elements['play-name-feedback'].attributes['data-state'] === 'error' && !game.elements['play-name-status'].textContent.includes('✓'), 'Invalid nickname submission falsely succeeded');
    assert(input.attributes['aria-invalid'] === 'true' && game.elements['play-name-preview'].hidden, 'Invalid nickname lacked an accessible error state or retained a stale preview');
    assert(storage['moon-rabbit-play-name'] === '별이' && input.value === draft, 'Invalid nickname erased the previous name or the editable input');
  }
  game.start();
  if (draft) {
    assert(!game.G.started && speech.spoken.length === 0 && input.focused, 'Invalid draft started play or failed to return focus for correction');
    input.value = '별이'; input.input({ isComposing: false });
    assert(input.attributes['aria-invalid'] === 'false', 'Correcting the nickname retained an accessible error state');
    game.start();
  }
  finishSpeech(speech);
  assert(game.G.started && game.G.score === 0, 'Valid or corrected nickname prevented normal play');
  assert(draft ? storage['moon-rabbit-play-name'] === '별이' : !storage['moon-rabbit-play-name'], 'Start did not preserve invalid input or clear an intentional blank');
  const greeting = draft ? '별이야' : '친구야';
  assert(tapFriendGreeting(game, speech, 'fox', greeting).text.startsWith(greeting + ' '), 'Start used the wrong nickname after draft validation');
}

// Missing audio hardware and speech failures leave the visual game usable and retryable.
{
  const speech = speechMock([localKorean]); speech.failVoices = true;
  const game = createGame(390, 844, 6, true, { speech }); game.start();
  assert(game.G.started && speech.spoken.length === 1 && speech.spoken[0].voice === undefined && speech.spoken[0].lang === 'ko-KR', 'Voice enumeration failure did not use the language fallback');
  speech.spoken[0].onstart();
  speech.failVoices = false; speech.failSpeak = true;
  game.advance(1100); game.tap(30, 30);
  assert(game.gains[0].gain.value === 1, 'Speech failure left existing audio lowered');
  speech.failSpeak = false; game.tap(30, 30);
  assert(speech.spoken.length === 2, 'Speech failed to recover immediately after a blocked call');
  speech.spoken[1].onstart(); speech.spoken[1].onerror();
  assert(game.gains[0].gain.value === 1, 'Speech error failed to restore audio');
  game.tap(30, 30);
  assert(speech.spoken.length === 3 && speech.spoken[2].text === speech.spoken[1].text, 'Speech error left the same-text cooldown locked');
  speech.spoken[2].onstart(); speech.spoken[1].onerror();
  assert(game.gains[0].gain.value === 0.25, 'Stale speech error changed the replacement utterance');
  const noAudioSpeech = speechMock([localKorean]);
  const noAudio = createGame(390, 844, 7, false, { speech: noAudioSpeech });
  noAudio.start(); noAudioSpeech.spoken[0].onstart(); noAudioSpeech.spoken[0].onend();
  assert(noAudio.G.started && noAudio.contexts.length === 0, 'Speech depended on Web Audio availability');
}

// Rendering is side-effect free, and particle motion is independent of refresh rate.
{
  const results = [];
  for (const rate of [30, 60, 120]) {
    const game = createGame(390, 844, rate, false);
    game.G.particles = [{ x: 0, y: 0, vx: 1, vy: 0, life: 1, decay: 0.012, size: 3, type: 'star' }];
    for (let i = 0; i < rate / 2; i++) game.api.updateParticles(1 / rate);
    results.push({ ...game.G.particles[0] });
    game.G.flyingCarrots = [{ sx: 100, sy: 300, size: 30, t: 0.5, type: 'carrot' }];
    const before = JSON.stringify(game.G.particles);
    for (let i = 0; i < 100; i++) game.api.drawFlyingCarrots();
    assert(JSON.stringify(game.G.particles) === before, 'Drawing created or moved particles');
    game.api.spawnParticles(100, 100, 200, 'star');
    assert(game.G.particles.length === 48, 'Particle cap failed');
    const start = game.api.flightPos(100, 300, 200, 100, 0, 90, 'spiral', 1.2);
    assert(start.x === 100 && start.y === 300, 'Spiral jumped at takeoff');
  }
  for (const value of results) for (const key of ['x', 'y', 'life'])
    assert(Math.abs(value[key] - results[0][key]) < 1e-9, 'Refresh rate changed particle ' + key);
}

// Reduced motion retains clear feedback and HiDPI keeps touch coordinates in CSS pixels.
{
  const game = createGame(390, 844, 42, false, { reducedMotion: true, dpr: 3 });
  game.start(); game.advance(200);
  assert(game.canvas.width === 780 && game.canvas.height === 1688, 'HiDPI backing size was not capped at 2');
  const item = game.G.carrots[0];
  game.tap(item.x, item.y); game.advance(400);
  assert(game.G.score === 1 && game.G.requestItems[0] === item.type, 'HiDPI touch coordinates drifted');
  const friend = game.G[game.G.characterOrder[0]];
  assert(friend.enter === 1 && friend.x === friend.targetX, 'Reduced motion kept a large entrance animation');
  assert(game.G.particles.every(p => p.vx === 0 && p.vy === 0), 'Reduced motion kept moving particles');
  game.tap(game.G.moonX, game.G.moonY);
  assert(game.G.dimming === 0, 'Reduced motion flashed the scene');
  game.resize(844, 390);
  game.media.change({ matches: false });
  assert(!game.G.reducedMotion, 'Motion preference change was ignored');
}
log('PASS syntax, 28 ending scenarios, requested-item matching, quantities 1-3, quiet hints, request transitions, rotation recovery, pause, home, replay, audio lifecycle/storage, Korean speech selection and gesture unlock, remaining-quantity rabbit dialogue, 180 animal lines, non-repeating dialogue decks, live contexts and replay reset, natural-pitch profiles, highest-quality speaker families and upgrades, counting protection, nickname storage, draft/save feedback, start autosave and local-only speech, picture-card guidance, HiDPI, motion and particle regressions');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function nameHashMock(options = {}) {
  return {
    ...options, calls: [], encoded: [],
    digest(algorithm, data) {
      const pending = deferred();
      this.calls.push({ algorithm, data, ...pending });
      if (this.throwDigest) throw Error('Digest unavailable');
      if (this.rejectDigest) pending.reject(Error('Digest rejected'));
      return pending.promise;
    },
  };
}

function presetDigestResult(game) {
  // Match a synthetic test name to the public lookup key; never put the actual preset name here.
  return new Uint8Array(game.api.PRESET_NAME_SHA256.match(/../g).map(byte => parseInt(byte, 16))).buffer;
}

function recordingMock(options = {}) {
  return {
    ...options, requests: [], decodes: [], sources: [], resumptions: [], timers: new Map(), timerID: 0,
    response(url = '') {
      const data = new ArrayBuffer(8); data.mockURL = url;
      return { ok: this.httpOK !== false, arrayBuffer: () => Promise.resolve(data) };
    },
    fetch(url, options) {
      // Existing animal cases isolate that channel; main-guidance cases opt in below.
      if (url.startsWith('assets/guidance/') && !this.includeGuidance) throw Error('Guidance recordings omitted by this fixture');
      const pending = deferred();
      this.requests.push({ url, options, ...pending });
      if (this.throwFetch) throw Error('Fetch unavailable');
      if (!this.holdFetch) {
        if (this.failFetch) pending.reject(Error('Network unavailable'));
        else pending.resolve(this.response(url));
      }
      return pending.promise;
    },
    decode(data) {
      const pending = deferred();
      this.decodes.push({ data, ...pending });
      if (!this.holdDecode) {
        if (this.failDecode) pending.reject(Error('Unsupported audio'));
        else pending.resolve({ duration: 2, sampleRate: 44100, mockURL: data.mockURL });
      }
      return pending.promise;
    },
    createSource() {
      const source = {
        started: false, stopped: false, disconnected: false,
        connect(destination) { this.destination = destination; },
        disconnect() { this.disconnected = true; },
        start() { this.started = true; },
        stop() { this.stopped = true; },
      };
      this.sources.push(source);
      return source;
    },
    setTimer(fn, delay) { const id = ++this.timerID; this.timers.set(id, { fn, delay }); return id; },
    fireTimeouts() {
      const timers = Array.from(this.timers.values());
      this.timers.clear();
      timers.forEach(({ fn, delay }) => { assert(delay === 5000, 'Voice loading timeout changed'); fn(); });
    },
  };
}

async function flushRecordingWork() {
  // Flush the fetch/body/decode/play promise chain without wall-clock sleeps.
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

function tapRecordingFriend(game, speech, name = 'turtle') {
  if (speech) finishSpeech(speech);
  game.advance(1100);
  const ch = showFriend(game, name);
  game.tap(ch.x, ch.y);
  return ch;
}

function finishRecording(recordings) {
  const source = recordings.sources[recordings.sources.length - 1];
  if (source && source.onended) source.onended();
}

async function checkRecordings() {
  // Recorded dialogue works with and without Web Speech, with its own gain and no overlap.
  for (const withSpeech of [true, false]) {
    const speech = withSpeech ? speechMock([localKorean]) : null;
    const recordings = recordingMock({ holdFetch: true });
    const game = createGame(390, 844, 180, true, { speech, recordings });
    game.start();
    const ch = tapRecordingFriend(game, speech);
    const spokenBefore = speech ? speech.spoken.length : 0;
    assert(recordings.requests.length === 1 && recordings.sources.length === 0, 'Animal did not begin loading its fixed recording');
    game.advance(1100); game.tap(ch.x, ch.y);
    assert(recordings.requests.length === 1 && (!speech || speech.spoken.length === spokenBefore), 'Repeated tap overlapped pending recording loading');
    recordings.requests[0].resolve(recordings.response());
    await flushRecordingWork();
    const source = recordings.sources[0];
    assert(source && source.started && game.gains[0].gain.value === 0.25, 'Decoded recording failed to start or duck music');
    assert(source.destination !== game.gains[0] && source.destination.gain.value === 0.65 && game.destinations[game.destinations.length - 1] === game.contexts[0].destination, 'Recording inherited the ducked music gain instead of its own output');
    assert(recordings.timers.size === 0, 'Successful recording retained its loading timeout');
    game.advance(1100); game.tap(ch.x, ch.y);
    assert(recordings.requests.length === 1, 'Repeated tap overlapped a playing recording');
    finishRecording(recordings);
    assert(game.gains[0].gain.value === 1 && source.disconnected && source.destination.disconnected, 'Recording completion did not restore music or release nodes');
    game.click('home-button');
  }

  // Loading/decoding failures fall back exactly once and leave later taps usable.
  for (const scenario of [{ failFetch: true }, { throwFetch: true }, { httpOK: false }, { failDecode: true }, { holdFetch: true }]) {
    const speech = speechMock([localKorean]);
    const recordings = recordingMock(scenario);
    const game = createGame(390, 844, 181, true, { speech, recordings });
    game.start();
    const before = speech.spoken.length;
    tapRecordingFriend(game, speech);
    if (scenario.holdFetch) recordings.fireTimeouts();
    await flushRecordingWork();
    assert(speech.spoken.length === before + 1 && recordings.sources.length === 0 && recordings.timers.size === 0, 'Recording failure did not fall back exactly once: ' + JSON.stringify(scenario));
    assertFriendVoice(speech.spoken[speech.spoken.length - 1], 'turtle');
    if (scenario.holdFetch) {
      assert(recordings.requests[0].options.signal.aborted, 'Timed-out recording fetch was not aborted');
      recordings.requests[0].resolve(recordings.response());
      await flushRecordingWork();
      assert(recordings.sources.length === 0 && speech.spoken.length === before + 1, 'Late timed-out fetch started sound or repeated fallback');
    }
    game.click('home-button');
  }

  // No Web Audio still leaves the original device-speech path available.
  {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const game = createGame(390, 844, 182, false, { speech, recordings });
    game.start(); tapRecordingFriend(game, speech);
    assert(recordings.requests.length === 0 && speech.spoken.length === 2, 'Missing audio hardware attempted a recording or lost device speech');
    game.click('home-button');
  }

  // Suspended contexts keep their deadline until resume really runs; late resolution stays cancelled.
  for (const mode of ['resume', 'timeout', 'denied', 'still-suspended']) {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const game = createGame(390, 844, 187, true, { speech, recordings });
    game.start();
    game.contexts[0].state = 'suspended';
    recordings.holdResume = mode === 'resume' || mode === 'timeout';
    recordings.failResume = mode === 'denied';
    recordings.resumeWithoutRunning = mode === 'still-suspended';
    const spokenBefore = speech.spoken.length;
    tapRecordingFriend(game, speech); await flushRecordingWork();
    assert(recordings.sources.length === 0 && recordings.resumptions.length > 0, 'Suspended context queued an inaudible recording: ' + mode);
    if (mode !== 'denied') assert(recordings.timers.size === 1, 'Pending resume lost its loading deadline: ' + mode);
    if (mode === 'resume') {
      recordings.resumptions.forEach(pending => { pending.context.state = 'running'; pending.resolve(); });
      await flushRecordingWork();
      assert(recordings.sources.length === 1 && recordings.sources[0].started && recordings.timers.size === 0 && speech.spoken.length === spokenBefore, 'Successful audio resume did not start the waiting recording');
    } else {
      if (mode !== 'denied') recordings.fireTimeouts();
      await flushRecordingWork();
      assert(recordings.sources.length === 0 && speech.spoken.length === spokenBefore + 1 && recordings.timers.size === 0, 'Unavailable audio resume did not fall back to speech: ' + mode);
      recordings.resumptions.forEach(pending => { pending.context.state = 'running'; pending.resolve(); });
      await flushRecordingWork();
      assert(recordings.sources.length === 0 && speech.spoken.length === spokenBefore + 1, 'Late audio resume replayed a cancelled recording: ' + mode);
    }
    game.click('home-button');
  }

  // All existing stop actions cancel recordings; stale completion callbacks cannot restore audio.
  for (const action of ['mute', 'pause', 'hide', 'pickup', 'home']) {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const game = createGame(390, 844, 183, true, { speech, recordings });
    game.start(); tapRecordingFriend(game, speech); await flushRecordingWork();
    const source = recordings.sources[0], oldEnd = source.onended;
    if (action === 'mute') game.sound.click();
    if (action === 'pause') game.click('pause-toggle');
    if (action === 'hide') game.visibility(true);
    if (action === 'home') game.click('home-button');
    if (action === 'pickup') {
      game.G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 }];
      game.tap(100, 300);
    }
    assert(source.stopped && source.disconnected && source.destination.disconnected, 'Stop action left recording active: ' + action);
    const gainsAfter = JSON.stringify(game.gains.map(gain => gain.gain.value));
    oldEnd(); await flushRecordingWork();
    assert(JSON.stringify(game.gains.map(gain => gain.gain.value)) === gainsAfter, 'Cancelled recording callback changed audio state: ' + action);
    game.click('home-button');
  }

  // Cancellation while fetch or decode is pending never starts late sound or fallback speech.
  for (const pendingStage of ['fetch', 'decode']) {
    const speech = speechMock([localKorean]);
    const recordings = recordingMock(pendingStage === 'fetch' ? { holdFetch: true } : { holdDecode: true });
    const game = createGame(390, 844, 184, true, { speech, recordings });
    game.start(); tapRecordingFriend(game, speech); await flushRecordingWork();
    const before = speech.spoken.length;
    game.sound.click();
    assert(recordings.requests[0].options.signal.aborted && recordings.timers.size === 0, 'Cancellation did not release pending recording work');
    if (pendingStage === 'fetch') recordings.requests[0].resolve(recordings.response());
    else recordings.decodes[0].resolve({ duration: 2 });
    await flushRecordingWork();
    assert(recordings.sources.length === 0 && speech.spoken.length === before && game.gains[0].gain.value === 0, 'Cancelled ' + pendingStage + ' completion played or unmuted audio');
    game.click('home-button');
  }

  // The decoded cache reuses a completed deck and evicts older entries after other animals speak.
  {
    const recordings = recordingMock();
    const game = createGame(390, 844, 185, true, { recordings });
    game.start(); Math.random = () => 0;
    for (let turn = 0; turn < 14; turn++) {
      tapRecordingFriend(game, null); await flushRecordingWork(); finishRecording(recordings);
    }
    assert(recordings.requests.length === 13 && recordings.decodes.length === 13 && recordings.sources.length === 14, 'Repeated deck did not reuse decoded recording buffers');
    for (let turn = 0; turn < 13; turn++) {
      tapRecordingFriend(game, null, 'penguin'); await flushRecordingWork(); finishRecording(recordings);
    }
    const before = recordings.requests.length;
    tapRecordingFriend(game, null); await flushRecordingWork();
    assert(recordings.requests.length === before + 1, 'Decoded cache retained an old buffer beyond its capacity');
    assert(recordings.requests.every(({ url }) => /^assets\/voices\/(turtle|penguin)\/(base-(?:0[1-9]|1[0-2])|carrot)\.m4a\?v=20261114$/.test(url)), 'Recording request was not a fixed public dialogue URL');
    game.click('home-button');
  }

  // Names use a local prefix, then the animal's recording; either completion order is safe.
  for (const order of ['decode-first', 'name-first']) {
    const speech = speechMock([localKorean]), recordings = recordingMock({ holdDecode: true });
    const game = createGame(390, 844, 186, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0;
    tapRecordingFriend(game, speech, 'fox');
    const prefix = speech.spoken[speech.spoken.length - 1];
    assert(prefix.text === '별이야,' && prefix.voice === localKorean, 'Personal recording did not isolate the name in a local prefix');
    assert(recordings.requests.length === 1 && recordings.requests[0].url === 'assets/voices/fox/base-02-body.m4a?v=20261114', 'Personal recording URL was not the fixed name-free body asset');
    if (order === 'name-first') { prefix.onstart(); prefix.onend(); }
    await flushRecordingWork();
    recordings.decodes[0].resolve({ duration: 2 }); await flushRecordingWork();
    if (order === 'decode-first') {
      assert(recordings.sources.length === 0 && recordings.timers.size === 1, 'Decoded body started before the local name finished');
      prefix.onstart();
      assert(game.gains[0].gain.value === 0.25, 'Local name did not duck background audio');
      prefix.onend();
    }
    await flushRecordingWork();
    assert(recordings.sources.length === 1 && recordings.sources[0].started && recordings.timers.size === 0 && speech.spoken.length === 2, 'Name/body handoff failed or repeated the full sentence: ' + order);
    const source = recordings.sources[0];
    prefix.onend(); prefix.onerror(); await flushRecordingWork();
    assert(recordings.sources.length === 1 && !source.stopped && game.gains[0].gain.value === 0.25, 'Duplicate name callbacks overlapped or cancelled the animal body');
    finishRecording(recordings);
    assert(game.gains[0].gain.value === 1, 'Name/body completion did not restore music');
    game.click('home-button');
  }

  // Cancellation during a personal prefix stops speech and pending audio without late playback.
  for (const stage of ['fetch', 'decode', 'name']) {
    const speech = speechMock([localKorean]);
    const recordings = recordingMock(stage === 'fetch' ? { holdFetch: true } : stage === 'decode' ? { holdDecode: true } : {});
    const game = createGame(390, 844, 188, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    const prefix = speech.spoken[speech.spoken.length - 1], cancellations = speech.cancellations;
    prefix.onstart(); game.sound.click();
    assert(speech.cancellations > cancellations && recordings.requests[0].options.signal.aborted && recordings.timers.size === 0, 'Cancelling a name left speech or loading active: ' + stage);
    prefix.onend(); prefix.onerror();
    if (stage === 'fetch') recordings.requests[0].resolve(recordings.response());
    if (stage === 'decode') recordings.decodes[0].resolve({ duration: 2 });
    await flushRecordingWork();
    assert(recordings.sources.length === 0 && speech.spoken.length === 2 && game.gains[0].gain.value === 0, 'Late name or body completion replayed cancelled audio: ' + stage);
    game.click('home-button');
  }

  // Prefix creation/playback errors skip only the local name and keep the animal body playable.
  for (const failure of ['construct', 'speak', 'error-before-start', 'error-after-start']) {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const game = createGame(390, 844, 191, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0;
    speech.failConstruct = failure === 'construct';
    speech.failSpeak = failure === 'speak';
    tapRecordingFriend(game, speech, 'fox');
    if (failure.startsWith('error-')) {
      const prefix = speech.spoken[speech.spoken.length - 1];
      if (failure === 'error-after-start') prefix.onstart();
      prefix.onerror();
    }
    await flushRecordingWork();
    assert(recordings.requests[0].url === 'assets/voices/fox/base-02-body.m4a?v=20261114' && recordings.sources.length === 1 && recordings.sources[0].started, 'Local prefix failure blocked the animal body: ' + failure);
    assert(speech.spoken.length === (failure.startsWith('error-') ? 2 : 1) && recordings.timers.size === 0, 'Local prefix failure replayed the sentence or retained its deadline: ' + failure);
    finishRecording(recordings);
    assert(game.gains[0].gain.value === 1, 'Local prefix failure left audio ducked: ' + failure);
    game.click('home-button');
  }

  // A name prefix cannot wait forever, and fallback must not repeat a name already started.
  for (const nameStarted of [false, true]) {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const game = createGame(390, 844, 189, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    const prefix = speech.spoken[speech.spoken.length - 1];
    if (nameStarted) prefix.onstart();
    assert(recordings.sources.length === 0 && recordings.timers.size === 1, 'Pending prefix had no loading deadline');
    recordings.fireTimeouts(); await flushRecordingWork();
    const fallback = speech.spoken[speech.spoken.length - 1], body = game.api.FRIEND_DIALOGUE.fox[1].text;
    assert(speech.spoken.length === 3 && fallback.text === (nameStarted ? body : '별이야 ' + body), 'Prefix timeout repeated or omitted the personal name incorrectly');
    assert(!fallback.text.includes('별이') || fallback.voice === localKorean, 'Prefix fallback sent a personal name to a nonlocal voice');
    prefix.onend(); prefix.onerror(); await flushRecordingWork();
    assert(recordings.sources.length === 0 && speech.spoken.length === 3, 'Timed-out prefix callback resumed the body or repeated fallback');
    game.click('home-button');
  }

  // A failed body download preserves the same name-once rule as a prefix timeout.
  for (const nameStarted of [false, true]) {
    const speech = speechMock([localKorean]), recordings = recordingMock({ holdFetch: true });
    const game = createGame(390, 844, 192, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox');
    const prefix = speech.spoken[speech.spoken.length - 1];
    if (nameStarted) prefix.onstart();
    recordings.requests[0].reject(Error('Body download failed')); await flushRecordingWork();
    const body = game.api.FRIEND_DIALOGUE.fox[1].text;
    assert(speech.spoken.length === 3 && speech.spoken[2].text === (nameStarted ? body : '별이야 ' + body), 'Body download fallback repeated or omitted the name incorrectly');
    prefix.onend(); await flushRecordingWork();
    assert(recordings.sources.length === 0 && speech.spoken.length === 3 && recordings.timers.size === 0, 'Failed body download resumed from a late prefix callback');
    game.click('home-button');
  }

  // No local Korean voice means a generic whole recording, with no personal text sent to speech.
  for (const voices of [[remoteKorean], [], [localEnglish]]) {
    const speech = speechMock(voices), recordings = recordingMock();
    const game = createGame(390, 844, 190, true, { speech, recordings, storage: { 'moon-rabbit-play-name': '별이' } });
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(game.G.feedback.includes('별이야 ') && recordings.requests.length === 1 && recordings.requests[0].url === 'assets/voices/fox/base-02.m4a?v=20261114', 'Unavailable local name did not use the generic whole recording');
    assert(recordings.sources.length === 1 && recordings.sources[0].started && speech.spoken.every(utterance => !utterance.text.includes('별이')), 'Unavailable local voice leaked a name or blocked generic recording playback');
    game.click('home-button');
  }

  // A matching saved-name lookup chooses a whole preset recording without a TTS prefix.
  for (const withSpeech of [true, false]) {
    const speech = withSpeech ? speechMock([localKorean]) : null;
    const recordings = recordingMock(), crypto = nameHashMock();
    const game = createGame(390, 844, 193, true, { speech, recordings, crypto,
      storage: { 'moon-rabbit-play-name': '  별이  ' } });
    assert(crypto.calls.length === 1 && crypto.calls[0].algorithm === 'SHA-256' && crypto.encoded[0] === '별이', 'Saved name was not normalized before the local preset lookup');
    crypto.calls[0].resolve(presetDigestResult(game)); await flushRecordingWork();
    game.start(); Math.random = () => 0;
    const spokenBefore = speech ? speech.spoken.length : 0;
    tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests.length === 1 && recordings.requests[0].url === 'assets/voices/fox/base-02-featured.m4a?v=20261114', 'Matching saved name did not choose its whole preset recording');
    assert(recordings.sources.length === 1 && recordings.sources[0].started && (!speech || speech.spoken.length === spokenBefore), 'Preset recording added a TTS name or required Web Speech');
    finishRecording(recordings);
    tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests[1].url === 'assets/voices/fox/base-03.m4a?v=20261114', 'Preset lookup replaced an unaddressed line with a named recording');
    game.click('home-button');
  }

  // Explicit save starts a fresh lookup, including browser-storage failure for the current game.
  for (const blockStorage of [false, true]) {
    const speech = speechMock([localKorean]), recordings = recordingMock(), crypto = nameHashMock();
    const game = createGame(390, 844, 194, true, { speech, recordings, crypto, blockStorage });
    assert(crypto.calls.length === 0, 'An empty name unnecessarily started a preset lookup');
    game.elements['play-name-input'].value = '  별이  '; game.submit('play-name-form');
    assert(crypto.calls.length === 1 && crypto.encoded[0] === '별이', 'Saving a name did not refresh its normalized preset lookup');
    crypto.calls[0].resolve(presetDigestResult(game)); await flushRecordingWork();
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests[0].url.endsWith('/base-02-featured.m4a?v=20261114') && speech.spoken.length === 1, 'Saved preset name did not apply to the current game');
    assert(blockStorage ? !game.storage['moon-rabbit-play-name'] : game.storage['moon-rabbit-play-name'] === '별이', 'Preset lookup changed nickname persistence behavior');
    game.click('home-button');
  }

  // Unknown, pending, failed and unsupported lookups keep the ordinary local-prefix/body path.
  for (const mode of ['mismatch', 'pending', 'rejected', 'throws', 'no-crypto', 'no-subtle', 'no-encoder']) {
    const speech = speechMock([localKorean]), recordings = recordingMock();
    const crypto = mode === 'no-crypto' ? undefined : nameHashMock({
      rejectDigest: mode === 'rejected', throwDigest: mode === 'throws',
      noSubtle: mode === 'no-subtle', noEncoder: mode === 'no-encoder',
    });
    const game = createGame(390, 844, 195, true, { speech, recordings, crypto, storage: { 'moon-rabbit-play-name': '별이' } });
    if (mode === 'mismatch') crypto.calls[0].resolve(new Uint8Array(32).buffer);
    await flushRecordingWork();
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    const prefix = speech.spoken[speech.spoken.length - 1];
    assert(recordings.requests[0].url === 'assets/voices/fox/base-02-body.m4a?v=20261114' && prefix.text === '별이야,' && prefix.voice === localKorean, 'Unconfirmed preset lookup bypassed ordinary private-name handling: ' + mode);
    prefix.onstart(); prefix.onend(); await flushRecordingWork();
    assert(recordings.sources.length === 1 && recordings.sources[0].started, 'Unconfirmed preset lookup blocked body playback: ' + mode);
    game.click('home-button');
  }

  // A stale successful lookup cannot select another name's audio after a save, clear, or rename-back.
  for (const change of ['rename', 'clear', 'rename-back']) {
    const speech = speechMock([localKorean]), recordings = recordingMock(), crypto = nameHashMock();
    const game = createGame(390, 844, 196, true, { speech, recordings, crypto, storage: { 'moon-rabbit-play-name': '별이' } });
    const staleLookup = crypto.calls[0];
    if (change === 'clear') game.click('clear-play-name');
    else {
      game.elements['play-name-input'].value = '하늘'; game.submit('play-name-form');
      if (change === 'rename-back') {
        game.elements['play-name-input'].value = '별이'; game.submit('play-name-form');
      }
    }
    staleLookup.resolve(presetDigestResult(game)); await flushRecordingWork();
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests[0].url === 'assets/voices/fox/base-02' + (change === 'clear' ? '' : '-body') + '.m4a?v=20261114', 'Stale lookup selected a preset recording after ' + change);
    if (change === 'clear') assert(speech.spoken.length === 1 && game.G.feedback.includes('친구야 '), 'Cleared name survived in speech or feedback');
    else assert(speech.spoken[1].text === (change === 'rename' ? '하늘아,' : '별이야,'), 'Stale lookup replaced the current name prefix');
    game.click('home-button');
  }

  // Even an already matched name loses its preset immediately when the user saves another name.
  {
    const speech = speechMock([localKorean]), recordings = recordingMock(), crypto = nameHashMock();
    const game = createGame(390, 844, 197, true, { speech, recordings, crypto, storage: { 'moon-rabbit-play-name': '별이' } });
    crypto.calls[0].resolve(presetDigestResult(game)); await flushRecordingWork();
    game.elements['play-name-input'].value = '하늘'; game.submit('play-name-form');
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests[0].url.endsWith('/base-02-body.m4a?v=20261114') && speech.spoken[1].text === '하늘아,', 'Pending replacement lookup retained the prior name preset');
    game.click('home-button');
  }

  // A missing preset asset falls back to the actual saved name through a known local voice.
  {
    const speech = speechMock([localKorean]), recordings = recordingMock({ failFetch: true }), crypto = nameHashMock();
    const game = createGame(390, 844, 198, true, { speech, recordings, crypto, storage: { 'moon-rabbit-play-name': '별이' } });
    crypto.calls[0].resolve(presetDigestResult(game)); await flushRecordingWork();
    game.start(); Math.random = () => 0; tapRecordingFriend(game, speech, 'fox'); await flushRecordingWork();
    assert(recordings.requests[0].url.endsWith('/base-02-featured.m4a?v=20261114') && speech.spoken.length === 2 && speech.spoken[1].text === '별이야 ' + game.api.FRIEND_DIALOGUE.fox[1].text && speech.spoken[1].voice === localKorean, 'Preset download failure lost or exposed the actual saved name');
    assert(recordings.sources.length === 0 && recordings.timers.size === 0, 'Failed preset download retained pending playback');
    game.click('home-button');
  }
}

function playingRecordingURL(recordings) {
  const source = recordings.sources[recordings.sources.length - 1];
  return source && source.buffer && source.buffer.mockURL;
}

async function checkGuidanceRecordings() {
  // Play all six requests and fourteen deliveries using recorded main guidance without Web Speech.
  {
    const recordings = recordingMock({ includeGuidance: true });
    const game = createGame(390, 844, 210, true, { recordings });
    game.start(); await flushRecordingWork();
    for (const [round, request] of requests.entries()) {
      assert(game.G.requestIndex === round && playingRecordingURL(recordings) === 'assets/guidance/request-' + request.type + '-' + request.count + '.m4a?v=20261114', 'Recorded main request used the wrong vegetable or quantity');
      for (let count = 1; count <= request.count; count++) {
        for (let attempt = 0; !game.G.carrots.some(item => item.type === request.type) && attempt < 80; attempt++) game.step();
        game.advance(150);
        const item = game.G.carrots.find(item => item.type === request.type);
        assert(item, 'Recorded guidance blocked the next vegetable');
        const previous = recordings.sources[recordings.sources.length - 1];
        game.tap(item.x, item.y);
        assert(previous.stopped, 'Vegetable pickup did not stop recorded main guidance');
        game.advance(400); await flushRecordingWork();
        assert(playingRecordingURL(recordings) === 'assets/guidance/count-' + count + '.m4a?v=20261114', 'Recorded delivery count did not match visible quantity');
      }
      const countSource = recordings.sources[recordings.sources.length - 1];
      game.advance(round === requests.length - 1 ? 1250 : 1900); await flushRecordingWork();
      assert(countSource.stopped, 'Next request or ending did not stop the previous recorded count');
    }
    assert(game.G.score === 14 && game.G.ending && recordings.timers.size === 0, 'Recorded main guidance blocked the ending or retained work');
    game.click('home-button');
  }

  // Rabbit and moon replies select full remaining quantities, "more" phrases and thanks.
  {
    const recordings = recordingMock({ includeGuidance: true });
    const game = createGame(390, 844, 211, true, { recordings });
    game.start(); await flushRecordingWork();
    for (const [requestIndex, delivered, key] of [
      [2, 0, 'find-carrot-3'], [2, 1, 'more-carrot-2'], [2, 2, 'more-carrot-1'],
      [1, 0, 'find-cucumber-2'], [1, 1, 'more-cucumber-1'], [1, 2, 'thanks'],
    ]) {
      game.advance(1100);
      game.G.requestIndex = requestIndex;
      game.G.requestItems = Array(delivered).fill(requests[requestIndex].type);
      game.G.requestReadyAt = delivered === requests[requestIndex].count ? game.G.clock + 1800 : 0;
      game.G.carrots = [];
      game.tap(game.G.rabbit.x, game.G.rabbit.y); await flushRecordingWork();
      assert(playingRecordingURL(recordings) === 'assets/guidance/' + key + '.m4a?v=20261114', 'Recorded rabbit reply selected the wrong remaining-quantity asset: ' + key);
      const source = recordings.sources[recordings.sources.length - 1];
      game.tap(game.G.moonX, game.G.moonY); await flushRecordingWork();
      assert(recordings.sources[recordings.sources.length - 1] === source && !source.stopped, 'Same-text moon reply restarted recorded guidance inside its cooldown');
    }
    game.click('home-button');
  }

  // Main recordings obey mute and pause, and resume with the current request.
  for (const action of ['mute', 'pause']) {
    const recordings = recordingMock({ includeGuidance: true });
    const game = createGame(390, 844, 212, true, { recordings });
    game.start(); await flushRecordingWork();
    const source = recordings.sources[0], oldEnd = source.onended;
    if (action === 'mute') game.sound.click(); else game.click('pause-toggle');
    oldEnd();
    assert(source.stopped && game.gains[0].gain.value === 0, 'Main guidance ignored stop action or restored muted audio: ' + action);
    if (action === 'mute') game.sound.click(); else game.click('resume-button');
    await flushRecordingWork();
    assert(recordings.sources.length === 2 && playingRecordingURL(recordings).includes('/request-carrot-1.m4a'), 'Main guidance did not resume the current request: ' + action);
    game.click('home-button');
  }

  // Recorded main-guidance failure uses normal device speech, and failed attempts remain retryable.
  for (const failure of ['network', 'timeout', 'synchronous-and-speech']) {
    const speech = speechMock([localKorean]);
    const recordings = recordingMock({ includeGuidance: true, failFetch: failure === 'network',
      holdFetch: failure === 'timeout', throwFetch: failure === 'synchronous-and-speech' });
    if (failure === 'synchronous-and-speech') speech.failSpeak = true;
    const game = createGame(390, 844, 213, true, { speech, recordings });
    game.start();
    if (failure === 'timeout') recordings.fireTimeouts();
    await flushRecordingWork();
    if (failure !== 'synchronous-and-speech') {
      assert(speech.spoken.length === 1 && speech.spoken[0].text === '당근 한 개 줄래?', 'Main recording failure did not fall back to the original request');
      speech.spoken[0].onerror();
    }
    recordings.failFetch = false; recordings.holdFetch = false; recordings.throwFetch = false; speech.failSpeak = false;
    const before = recordings.requests.length;
    game.tap(30, 30); await flushRecordingWork();
    assert(recordings.requests.length === before + 1 && recordings.sources.length === 1 && recordings.sources[0].started, 'Failed main guidance retained a same-text cooldown and blocked immediate retry: ' + failure);
    game.click('home-button');
  }
}

let recordingRegressionFailure = null;
let recordingRegressionComplete = false;
checkRecordings().then(checkGuidanceRecordings).then(() => {
  recordingRegressionComplete = true;
  log('PASS prerecorded dialogue and main guidance, all request/count transitions without Web Speech, remaining-quantity recordings, loading overlap protection, output gain, fetch/decode/timeout fallback and retry, cancellation and stale callbacks, decoded cache reuse/eviction, local name-prefix/body sequencing, preset lookup/save/restore/races/fallback and nickname handling');
}).catch(error => {
  recordingRegressionFailure = error;
  log('FAIL recording regression: ' + error.message + '\n' + (error.stack || ''));
  if (typeof process !== 'undefined') process.exitCode = 1;
});
if (typeof drainMicrotasks === 'function') {
  // JavaScriptCore's quit() does not propagate an exit code; surface async failures synchronously.
  drainMicrotasks();
  if (recordingRegressionFailure) throw recordingRegressionFailure;
  assert(recordingRegressionComplete, 'Recording regressions left an unresolved asynchronous step');
}
