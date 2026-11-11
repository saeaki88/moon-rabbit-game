'use strict';

// Run from the repository root with node or the macOS JavaScriptCore CLI.
const source = typeof readFile === 'function'
  ? readFile('game.js')
  : require('node:fs').readFileSync('game.js', 'utf8');
const log = typeof print === 'function' ? print : console.log;
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
  if (withAudio) window.AudioContext = AudioContext;
  globalThis.document = { hidden: false, getElementById: id => id === 'game' ? canvas : element(id),
    addEventListener(name, fn) { documentEvents[name] = fn; } };
  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = fn => { frame = fn; };
  const marker = '  requestAnimationFrame(loop);\n})();';
  assert(source.includes(marker), 'Test cannot inspect the game IIFE');
  // Expose state only in this temporary evaluation, never in the shipped game.
  new Function(source.replace(marker, '  globalThis.__smokeState = G; globalThis.__smokeApi = {scheduleBGM, updateParticles, spawnParticles, draw, drawFlyingCarrots, flightPos};\n' + marker))();
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
    start, click, visibility, storage, media, api: globalThis.__smokeApi };

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
    assert(G.basket.length === (score - 1) % 5 + 1 && G.basket[G.basket.length - 1] === item.type, 'Counting basket lost quantity or vegetable type');
    assert(friends.filter(name => G[name].visible).length === thresholds.filter(n => n <= score).length, 'Incorrect friend progression');
    for (let a = 0; a < G.carrots.length; a++) {
      for (let b = a + 1; b < G.carrots.length; b++) {
        const one = G.carrots[a], two = G.carrots[b];
        assert(Math.hypot(one.x - two.x, one.y - two.y) > (one.size + two.size) * 1.55, 'Vegetables overlap');
      }
    }
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
  assert(game.destinations.slice(1).every(destination => destination === gains[0]), 'A sound bypassed the mute gain');
  log('PASS ' + width + 'x' + height + ' ' + ending);
}

const sizes = [[390, 844], [844, 390], [320, 568], [568, 320], [390, 390], [320, 320], [480, 480]];
['arc', 'spiral', 'bounce', 'float'].forEach((ending, type) => {
  sizes.forEach(([width, height], index) => runEnding(width, height, ending, 20261013 + type * 100 + index));
});

// The last two simultaneous pickups must cap the score at the goal.
{
  const { G, tap, advance, start } = createGame(390, 844);
  start();
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
  G.score = 13; G.carrots = [{ x: 100, y: 300, size: 30, scale: 1, type: 'carrot', wobble: 0 }];
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
  assert(!G.started && !G.paused && !G.ending && G.basket.length === 0, 'Home did not clear the round');
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
  assert(game.G.score === 1 && game.G.basket[0] === item.type, 'HiDPI touch coordinates drifted');
  const friend = game.G[game.G.characterOrder[0]];
  assert(friend.enter === 1 && friend.x === friend.targetX, 'Reduced motion kept a large entrance animation');
  assert(game.G.particles.every(p => p.vx === 0 && p.vy === 0), 'Reduced motion kept moving particles');
  game.tap(game.G.moonX, game.G.moonY);
  assert(game.G.dimming === 0, 'Reduced motion flashed the scene');
  game.resize(844, 390);
  game.media.change({ matches: false });
  assert(!game.G.reducedMotion, 'Motion preference change was ignored');
}
log('PASS syntax, 28 ending scenarios, counting, pause, home, replay, audio lifecycle/storage, HiDPI, motion and particle regressions');
