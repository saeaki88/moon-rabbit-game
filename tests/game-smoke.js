'use strict';

// Run from the repository root with node or the macOS JavaScriptCore CLI.
const source = typeof readFile === 'function'
  ? readFile('game.js')
  : require('node:fs').readFileSync('game.js', 'utf8');
const log = typeof print === 'function' ? print : console.log;
const friends = ['turtle', 'penguin', 'fox', 'lion', 'squid', 'duck', 'tiger', 'sunBear', 'chick', 'cat'];
new Function(source);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createGame(width, height, seed = 20261013, withAudio = true) {
  let now = 0;
  let frame;
  let saveDepth = 0;
  const events = {};
  const windowEvents = {};
  const gains = [];
  const destinations = [];
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function numeric(...args) {
    assert(args.every(value => typeof value !== 'number' || Number.isFinite(value)), 'Non-finite Canvas/Audio argument');
  }
  const ctx = {};
  ['beginPath', 'closePath', 'ellipse', 'arc', 'fill', 'stroke', 'fillRect', 'fillText',
    'translate', 'scale', 'rotate', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo']
    .forEach(name => { ctx[name] = numeric; });
  ctx.save = () => { saveDepth++; };
  ctx.restore = () => { assert(--saveDepth >= 0, 'Unbalanced Canvas restore'); };
  ctx.createLinearGradient = (...args) => { numeric(...args); return { addColorStop: numeric }; };
  const canvas = { width: 0, height: 0, getContext: () => ctx,
    addEventListener: (name, fn) => { events[name] = fn; } };
  const sound = { textContent: '🔊', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, fn) { this[name] = fn; } };
  function audioParam() {
    return { value: 1,
      setValueAtTime(value, time) { numeric(value, time); this.value = value; },
      exponentialRampToValueAtTime: numeric, linearRampToValueAtTime: numeric };
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    get currentTime() { return now / 1000; }
    resume() { return Promise.resolve(); }
    createOscillator() { return { frequency: audioParam(), connect() {}, start: numeric, stop: numeric }; }
    createGain() {
      const node = { gain: audioParam(), connect(destination) { destinations.push(destination); } };
      gains.push(node);
      return node;
    }
  }
  globalThis.window = { innerWidth: width, innerHeight: height,
    addEventListener(name, fn) { (windowEvents[name] ||= []).push(fn); } };
  if (withAudio) window.AudioContext = AudioContext;
  globalThis.document = { getElementById: id => id === 'game' ? canvas : sound };
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = fn => { frame = fn; };
  const marker = '  requestAnimationFrame(loop);\n})();';
  assert(source.includes(marker), 'Test cannot inspect the game IIFE');
  // Expose state only in this temporary evaluation, never in the shipped game.
  new Function(source.replace(marker, '  globalThis.__smokeState = G;\n' + marker))();
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
    assert(canvas.width === w && canvas.height === h, 'Canvas did not resize');
  }
  return { G, step, advance, tap, resize, sound, gains, destinations, canvas };
}

function runEnding(width, height, ending, seed) {
  const game = createGame(width, height, seed);
  const { G, step, advance, tap, sound, gains } = game;
  assert(G.characterOrder.length === 10 && new Set(G.characterOrder).size === 10, 'Friends missing or duplicated');
  sound.click();
  assert(!G.soundEnabled && !G.started && sound.attributes['aria-pressed'] === 'true', 'Mute button started the game or missed accessibility state');
  step();
  tap(width / 2, height / 2);
  assert(G.started && G.carrots.length === 1 && gains[0].gain.value === 0, 'Muted first tap failed');
  sound.click();
  assert(G.soundEnabled && gains[0].gain.value === 1, 'Unmute did not restore the master gain');
  tap(G.moonX, G.moonY);
  assert(G.dimming === 1, 'Moon touch did not dim the screen');
  advance(200);
  assert(G.dimming < 1, 'Dimming did not fade');

  const vegetableTypes = new Set();
  const thresholds = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
  for (let score = 1; score <= 14; score++) {
    for (let attempts = 0; !G.carrots.length && attempts < 80; attempts++) step();
    assert(G.carrots.length > 0, 'No reachable vegetable spawned');
    advance(150);
    const item = G.carrots[0];
    vegetableTypes.add(item.type);
    // Exercise the enlarged hit area, outside the old 1.3x radius.
    tap(item.x + item.size * 1.4, item.y);
    assert(G.flyingCarrots.some(f => f.type === item.type), 'Vegetable pickup failed or lost its type');
    advance(400);
    assert(G.score === score, 'Score did not advance exactly once');
    assert(friends.filter(name => G[name].visible).length === thresholds.filter(n => n <= score).length, 'Incorrect friend progression');
    for (let a = 0; a < G.carrots.length; a++) {
      for (let b = a + 1; b < G.carrots.length; b++) {
        const one = G.carrots[a], two = G.carrots[b];
        assert(Math.hypot(one.x - two.x, one.y - two.y) > (one.size + two.size) * 1.55, 'Vegetables overlap');
      }
    }
  }
  assert(vegetableTypes.size === 2, 'Both vegetable types were not exercised');
  assert(G.sunBear.visible && friends.every(name => G[name].visible), 'A new or existing friend missed the ending');
  assert(G.endingPending && G.carrots.length === 0 && G.spawnTimes.length === 0, 'Goal did not stop spawning');
  assert(['arc', 'spiral', 'bounce', 'float'].includes(G.endingType), 'Invalid random ending selection');
  G.endingType = ending;
  // A late arrival must join the flight from its destination, fully visible.
  G.lion.x = -G.lion.size * 2;
  G.lion.enter = 0.1;
  G.sunBear.x = -G.sunBear.size * 2;
  G.sunBear.enter = 0.1;
  tap(width / 2, height / 2);
  assert(G.score === 14, 'Pending ending accepted another pickup');
  sound.click();
  assert(gains[0].gain.value === 0, 'Mute missed already queued sounds');
  advance(800);
  assert(G.ending && G.endingPhase === 'flying' && G.lion.enter === 1, 'Late friend did not join the ending');
  assert(G.flightLion.startX === G.lion.targetX, 'Late friend flight started off screen');
  assert(G.sunBear.enter === 1 && G.flightSunBear.startX === G.sunBear.targetX, 'Late sun bear did not join the ending fully visible');

  let celebrated = false;
  for (let frames = 0; G.endingPhase !== 'done' && frames < 250; frames++) {
    step();
    if (G.endingPhase === 'celebrating') celebrated = true;
    for (const name of ['rabbit', ...friends]) {
      const f = G['flight' + name[0].toUpperCase() + name.slice(1)];
      assert(f.x >= 0 && f.x <= width && f.y >= 0 && f.y <= height, 'Flight left the viewport: ' + name);
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
  assert(G.score === 0 && !G.ending && !G.endingPending && G.started, 'Replay did not reset the game');
  assert(friends.every(name => !G[name].visible && G[name].react === 0), 'Replay did not reset all friends');
  assert(G.spawnTimes.length === 0 && G.dimming === 0 && !G.soundEnabled, 'Replay leaked delayed spawns or reset mute');
  assert(G.carrots.length === 1 && new Set(G.characterOrder).size === 10, 'Replay did not restart correctly');
  assert(game.destinations.slice(1).every(destination => destination === gains[0]), 'A sound bypassed the mute gain');
  log('PASS ' + width + 'x' + height + ' ' + ending);
}

const sizes = [[390, 844], [844, 390], [320, 568], [568, 320], [390, 390]];
['arc', 'spiral', 'bounce', 'float'].forEach((ending, type) => {
  sizes.forEach(([width, height], index) => runEnding(width, height, ending, 20261013 + type * 100 + index));
});

// The last two simultaneous pickups must cap the score at the goal.
{
  const { G, tap, advance } = createGame(390, 844);
  tap(195, 422);
  G.score = 12;
  G.carrots = [
    { x: 80, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 },
    { x: 195, y: 300, size: 30, scale: 1, type: 'cucumber', wobble: 0 },
    { x: 310, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 },
  ];
  tap(80, 300); tap(195, 300); tap(310, 300);
  assert(G.flyingCarrots.length === 2, 'Accepted more than the remaining goal');
  G.spawnTimes.push(100);
  advance(400);
  assert(G.score === 14 && G.endingPending && G.spawnTimes.length === 0, 'Rapid goal or delayed-spawn cancellation failed');
}

// Friend touches trigger different feedback without adding score.
{
  const { G, tap, advance } = createGame(390, 844);
  tap(195, 422);
  G.carrots = [];
  for (const name of ['lion', 'tiger', 'fox', 'sunBear']) {
    const ch = G[name];
    ch.visible = true; ch.enter = 1; ch.x = ch.targetX; ch.y = ch.targetY;
    tap(ch.x, ch.y);
    assert(ch.react === 1 && G.score === 0, 'Friend touch failed: ' + name);
    assert(G.particles.slice(-7).every(p => p.type === (name === 'tiger' ? 'star' : 'heart')), 'Wrong touch particles');
    advance(200);
    assert(ch.react < 1, 'Touch reaction did not settle');
  }
}

// Audio support must not be necessary for starting and collecting.
{
  const { G, tap, advance } = createGame(390, 844, 42, false);
  tap(195, 422);
  advance(200);
  const item = G.carrots[0];
  tap(item.x, item.y);
  advance(400);
  assert(G.started && G.score === 1, 'Missing AudioContext broke gameplay');
}
log('PASS syntax, 20 ending scenarios, rapid collection, animal touches and audio fallback');
