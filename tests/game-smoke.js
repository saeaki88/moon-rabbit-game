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
    if (!elements[id]) elements[id] = { textContent: '', attributes: {}, hidden: false,
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, fn) { this[name] = fn; },
      focus() { this.focused = true; } };
    return elements[id];
  }
  const sound = element('sound-toggle');
  function audioParam() {
    return { value: 1,
      setValueAtTime(value, time) { numeric(value, time); this.value = value; },
      exponentialRampToValueAtTime: numeric, linearRampToValueAtTime: numeric };
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.destination = {}; this.resumes = 0; contexts.push(this); }
    get currentTime() { return now / 1000; }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
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
      setItem(key, value) { if (options.blockStorage) throw Error('Storage unavailable'); storage[key] = value; }
    },
    addEventListener(name, fn) { (windowEvents[name] ||= []).push(fn); } };
  if (options.speech) {
    window.speechSynthesis = options.speech;
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
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
  new Function(source.replace(marker, '  globalThis.__smokeState = G; globalThis.__smokeApi = {scheduleBGM, updateParticles, spawnParticles, draw, drawFlyingCarrots, flightPos, currentRequest, requestLabel};\n' + marker))();
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
  const visibility = hidden => { document.hidden = hidden; documentEvents.visibilitychange(); };
  return { G, step, advance, tap, resize, sound, gains, destinations, canvas, elements, contexts,
    start, click, visibility, storage, media, drawnText, api: globalThis.__smokeApi };

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

// iOS-like unlock: the first speak must occur synchronously inside the start gesture.
{
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
  const game = createGame(390, 844, 11, true, { speech });
  speech.inGesture = true;
  game.start();
  speech.inGesture = false;
  assert(speech.unlocked && speech.spoken.length === 1, 'Empty voice list missed the synchronous start-gesture speech opportunity');
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
log('PASS syntax, 28 ending scenarios, requested-item matching, quantities 1-3, quiet hints, request transitions, rotation recovery, pause, home, replay, audio lifecycle/storage, Korean speech selection and gesture unlock, remaining-quantity rabbit dialogue, picture-card guidance, HiDPI, motion and particle regressions');
