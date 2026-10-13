(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  // ===== Color Palette =====
  const C = {
    skyTop: '#060c1a',
    skyMid: '#0f1f3d',
    skyBot: '#1a3355',
    ground: '#142640',
    moon: '#f5e6c8',
    moonDark: '#e0d0b0',
    star: '#ffffff',
    rabbitBody: '#ede8df',
    rabbitInner: '#f5f0e8',
    rabbitEarInner: '#d4a0a0',
    rabbitCheek: '#e0b0b0',
    rabbitEye: '#1a1a2e',
    turtleBody: '#5a8a6a',
    turtleShell: '#8b6b4a',
    turtleShellDark: '#6b5238',
    turtleShellLight: '#a07850',
    turtleBelly: '#c4b99a',
    squidBody: '#e8a0b0',
    squidLight: '#f0c0cc',
    squidMantle: '#e090a5',
    squidFin: '#d4889a',
    catBody: '#d04040',
    catLight: '#e86868',
    catDark: '#a03030',
    catInner: '#f0a0a0',
    catNose: '#e07070',
    catEar: '#b03030',
    duckBody: '#d04040',
    duckLight: '#e86868',
    duckBeak: '#e8a030',
    duckBeakDark: '#c88020',
    duckWing: '#b83030',
    duckFeet: '#e8a030',
    chickBody: '#ffd740',
    chickLight: '#ffe680',
    chickWing: '#f0c000',
    chickBeak: '#e8883a',
    chickBeakDark: '#c06828',
    chickComb: '#e04040',
    chickFeet: '#e8883a',
    penguinBody: '#4a6ab0',
    penguinDark: '#2a4080',
    penguinLight: '#7090d0',
    penguinBelly: '#f5f0e5',
    penguinBeak: '#e88030',
    penguinFeet: '#e88030',
    penguinGoggle: '#e8a02a',
    penguinGlass: '#ffdc6a',
    lionBody: '#edb85c',
    lionLight: '#ffe0a0',
    lionMane: '#b96a32',
    lionManeLight: '#d98a3c',
    tigerBody: '#ef963e',
    tigerLight: '#ffe5bf',
    tigerStripe: '#754b37',
    foxBody: '#d98148',
    foxLight: '#fff0d8',
    foxDark: '#975238',
    eye: '#1a1a2e',
    carrotBody: '#e8863a',
    carrotTop: '#4a8a5a',
    carrotStripe: '#d07530',
    cucumberBody: '#5fa04a',
    cucumberLight: '#7dbb60',
    cucumberDark: '#3e7a34',
    cucumberStem: '#4a8a5a',
    glassFrame: '#2a3a5a',
    heart: '#e87080',
    starP: '#ffd780',
  };

  // ===== Audio =====
  let audioCtx = null;
  let masterGain = null;

  function ensureAudio() {
    if (!audioCtx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        audioCtx = new Audio();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(G.soundEnabled ? 1 : 0, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);
      } catch (_) {
        audioCtx = null;
        return;
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, ramp) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.connect(gain);
    gain.connect(masterGain);
    osc.frequency.setValueAtTime(freq, t);
    if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp, t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  }

  function playPop() { tone(800, 0.12, 'sine', 0.25, 250); }

  function playMunch() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      const start = t + i * 0.07;
      osc.frequency.setValueAtTime(350 + i * 80, start);
      osc.frequency.exponentialRampToValueAtTime(150, start + 0.05);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
      osc.start(start);
      osc.stop(start + 0.05);
    }
  }

  function playSparkle() { tone(1400, 0.15, 'sine', 0.08, 900); }

  function playLionRoar() { tone(180, 0.35, 'triangle', 0.07, 95); }

  function playFanfare() {
    if (!audioCtx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const t = audioCtx.currentTime + i * 0.14;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  function playFlyToMoonSong() {
    if (!audioCtx) return;
    const melody = [
      { f: 262, d: 0.18 }, { f: 294, d: 0.18 }, { f: 330, d: 0.18 }, { f: 349, d: 0.18 },
      { f: 392, d: 0.25 }, { f: 392, d: 0.12 }, { f: 440, d: 0.25 },
      { f: 392, d: 0.18 }, { f: 440, d: 0.18 }, { f: 494, d: 0.18 }, { f: 523, d: 0.3 },
      { f: 587, d: 0.15 }, { f: 523, d: 0.15 }, { f: 587, d: 0.15 }, { f: 659, d: 0.3 },
      { f: 784, d: 0.2 }, { f: 659, d: 0.2 }, { f: 784, d: 0.2 }, { f: 1047, d: 0.5 },
      { f: 1175, d: 0.15 }, { f: 1319, d: 0.15 }, { f: 1568, d: 0.4 },
    ];

    let time = audioCtx.currentTime + 0.1;
    melody.forEach(note => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.setValueAtTime(note.f, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.03);
      gain.gain.setValueAtTime(0.15, time + note.d * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);
      osc.start(time);
      osc.stop(time + note.d + 0.05);

      if (note.d >= 0.25) {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.frequency.setValueAtTime(note.f * 1.5, time);
        gain2.gain.setValueAtTime(0, time);
        gain2.gain.linearRampToValueAtTime(0.06, time + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + note.d);
        osc2.start(time);
        osc2.stop(time + note.d + 0.05);
      }

      time += note.d;
    });
  }

  // ===== Background Music =====
  let bgmPlaying = false;
  let bgmNextTime = 0;
  let bgmNoteIndex = 0;

  // Gentle lullaby melody (two phrases + repeat)
  const bgmMelody = [
    { f: 392, d: 0.35 }, { f: 330, d: 0.35 }, { f: 349, d: 0.2 }, { f: 330, d: 0.35 },
    { f: 294, d: 0.35 }, { f: 262, d: 0.35 }, { f: 294, d: 0.35 }, { f: 330, d: 0.7 },
    { f: 0, d: 0.15 },
    { f: 392, d: 0.35 }, { f: 330, d: 0.35 }, { f: 349, d: 0.2 }, { f: 330, d: 0.35 },
    { f: 392, d: 0.35 }, { f: 440, d: 0.35 }, { f: 392, d: 0.7 },
    { f: 0, d: 0.15 },
    { f: 330, d: 0.35 }, { f: 294, d: 0.35 }, { f: 262, d: 0.35 }, { f: 294, d: 0.5 },
    { f: 330, d: 0.35 }, { f: 349, d: 0.35 }, { f: 330, d: 0.7 },
    { f: 0, d: 0.3 },
    { f: 262, d: 0.35 }, { f: 294, d: 0.35 }, { f: 330, d: 0.35 }, { f: 392, d: 0.5 },
    { f: 349, d: 0.35 }, { f: 330, d: 0.35 }, { f: 294, d: 0.7 },
    { f: 0, d: 0.5 },
  ];

  function scheduleBGM() {
    if (!audioCtx || !bgmPlaying) return;
    while (bgmNextTime < audioCtx.currentTime + 0.5) {
      const note = bgmMelody[bgmNoteIndex % bgmMelody.length];
      if (note.f > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(note.f, bgmNextTime);
        gain.gain.setValueAtTime(0, bgmNextTime);
        gain.gain.linearRampToValueAtTime(0.05, bgmNextTime + 0.03);
        gain.gain.setValueAtTime(0.05, bgmNextTime + note.d * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, bgmNextTime + note.d * 0.95);
        osc.start(bgmNextTime);
        osc.stop(bgmNextTime + note.d);
      }
      bgmNextTime += note.d;
      bgmNoteIndex++;
    }
  }

  function startBGM() {
    if (!audioCtx || bgmPlaying) return;
    bgmPlaying = true;
    bgmNextTime = audioCtx.currentTime + 0.5;
    bgmNoteIndex = 0;
  }

  // ===== Game State =====
  const G = {
    score: 0,
    time: 0,
    carrots: [],
    flyingCarrots: [],
    particles: [],
    stars: [],
    started: false,
    soundEnabled: true,
    spawnTimes: [],
    lastCarrotTime: 0,
    carrotDelay: 600,
    endingType: null,
    celebrating: 0,
    rabbit: { x: 0, y: 0, size: 0, bounce: 0, happy: 0, eating: 0 },
    characterOrder: [],
    groundY: 0,
    moonX: 0, moonY: 0, moonR: 0,
    ending: false,
    endingPending: false,
    endingStartAt: 0,
    endingLayout: null,
    endingTime: 0,
    endingPhase: '',
    flightRabbit: { x: 0, y: 0 },
    dimming: 0, // screen darkness when moon rabbit is tapped
  };

  // One list drives spawning, layout, drawing, touch feedback and ending flights.
  const CHARACTER_SPEC = {
    turtle:  { size: 1.1,  x: 0.13, row: 0, from: 'left',  draw: drawTurtleAt,  particle: 'star' },
    penguin: { size: 0.95, x: 0.31, row: 0, from: 'left',  draw: drawPenguinAt, particle: 'star' },
    fox:     { size: 0.95, x: 0.5,  row: 0, from: 'right', draw: drawFoxAt,     particle: 'heart' },
    lion:    { size: 1.05, x: 0.69, row: 0, from: 'right', draw: drawLionAt,    particle: 'heart' },
    squid:   { size: 0.8,  x: 0.88, row: 0, from: 'top',   draw: drawSquidAt,   particle: 'heart', yOffset: -0.7 },
    duck:    { size: 0.85, x: 0.13, row: 1, from: 'left',  draw: drawDuckAt,    particle: 'star' },
    tiger:   { size: 0.95, x: 0.33, row: 1, from: 'left',  draw: drawTigerAt,   particle: 'star' },
    chick:   { size: 0.7,  x: 0.75, row: 1, from: 'right', draw: drawChickAt,   particle: 'heart' },
    cat:     { size: 0.9,  x: 0.9,  row: 1, from: 'right', draw: drawCatAt,     particle: 'heart' },
  };
  const CHARACTER_NAMES = Object.keys(CHARACTER_SPEC);
  const CARROT_GOAL = 14;
  const FRIEND_THRESHOLDS = CHARACTER_NAMES.map((_, i) =>
    Math.ceil((i + 1) * (CARROT_GOAL - 2) / CHARACTER_NAMES.length));
  CHARACTER_NAMES.forEach(name => {
    G[name] = { visible: false, x: 0, y: 0, size: 0, enter: 0, react: 0, targetX: 0, targetY: 0 };
    G[flightKey(name)] = { x: 0, y: 0 };
  });

  function flightKey(name) { return 'flight' + name[0].toUpperCase() + name.slice(1); }

  const soundButton = document.getElementById('sound-toggle');
  soundButton.addEventListener('click', () => {
    G.soundEnabled = !G.soundEnabled;
    soundButton.textContent = G.soundEnabled ? '🔊' : '🔇';
    soundButton.setAttribute('aria-pressed', String(!G.soundEnabled));
    const label = G.soundEnabled ? '소리 끄기' : '소리 켜기';
    soundButton.setAttribute('aria-label', label);
    soundButton.title = label;
    if (masterGain) masterGain.gain.setValueAtTime(G.soundEnabled ? 1 : 0, audioCtx.currentTime);
  });

  for (let i = 0; i < 70; i++) {
    G.stars.push({
      x: Math.random(),
      y: Math.random() * 0.6,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // 4 visually distinct ending types
  const ENDING_TYPES = ['arc', 'spiral', 'bounce', 'float'];

  // Character names for random order spawning
  function shuffleCharacterOrder() {
    const arr = CHARACTER_NAMES.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    G.characterOrder = arr;
  }
  function spawnCharacterByName(name) {
    const ch = G[name];
    const spec = CHARACTER_SPEC[name];
    ch.visible = true;
    ch.enter = 0;
    ch.x = spec.from === 'top' ? ch.targetX : spec.from === 'right' ? canvas.width + ch.size : -ch.size;
    ch.y = spec.from === 'top' ? -ch.size : ch.targetY;
    playFanfare();
  }

  // Flight path calculator per ending type
  function flightPos(sx, sy, tx, ty, p, arcH, type, offset) {
    const bx = sx + (tx - sx) * p;
    const by = sy + (ty - sy) * p;
    if (type === 'spiral') {
      const a = p * Math.PI * 3.5 + offset;
      const r = (1 - p) * arcH * 0.45;
      return { x: bx + Math.cos(a) * r, y: by - r * 0.7 - Math.sin(a) * r * 0.35 };
    }
    if (type === 'bounce') {
      const h = Math.abs(Math.sin(p * Math.PI * 4 + offset)) * arcH * Math.sin(p * Math.PI);
      return { x: bx, y: by - h };
    }
    if (type === 'float') {
      const sway = Math.sin(p * Math.PI * 5 + offset) * arcH * 0.15 * Math.sin(p * Math.PI);
      const ep = easeInOutCubic(p);
      return { x: sx + (tx - sx) * p + sway, y: sy + (ty - sy) * ep };
    }
    // arc (default) - big smooth parabola
    return { x: bx, y: by - Math.sin(p * Math.PI) * arcH };
  }

  // ===== Layout =====
  function layout() {
    const w = canvas.width, h = canvas.height;
    G.groundY = h * 0.7;
    G.moonR = Math.min(w, h) * 0.13;
    G.moonX = w * 0.8;
    G.moonY = Math.max(h * 0.16, G.moonR + 16);

    const s = Math.min(w, h) * 0.13;
    G.rabbit.size = s;
    G.rabbit.x = w * 0.56;
    G.rabbit.y = h * 0.87 - s * 0.15;
    CHARACTER_NAMES.forEach(name => {
      const ch = G[name], spec = CHARACTER_SPEC[name];
      ch.size = s * spec.size;
      ch.targetX = w * spec.x;
      ch.targetY = h * (spec.row === 0 ? 0.75 : 0.87) + (spec.yOffset || 0) * ch.size;
      if (!ch.visible || ch.enter >= 1) {
        ch.x = ch.targetX;
        ch.y = ch.targetY;
      } else if (spec.from !== 'top') {
        ch.y = ch.targetY;
      }
    });

    const moonY = Math.max(G.moonR * 1.6 + 16, h * 0.22);
    const backY = Math.max(h * 0.52, moonY + G.moonR * 1.6 + s * 0.7);
    const frontY = Math.max(h * 0.76, backY + s * 1.55);
    const targets = { rabbit: { x: w * 0.56, y: frontY } };
    CHARACTER_NAMES.forEach(name => {
      const spec = CHARACTER_SPEC[name];
      targets[name] = { x: w * spec.x, y: spec.row === 0 ? backY : frontY };
      clampFlight(name, targets[name]);
    });
    G.endingLayout = { moonX: w * 0.5, moonY, targets };
    if (G.ending) {
      ['rabbit', ...CHARACTER_NAMES].forEach(name => {
        const flight = G[flightKey(name)];
        if (G.endingPhase !== 'flying') Object.assign(flight, targets[name]);
        clampFlight(name, flight);
      });
    }
    // Resizing must not leave a tappable vegetable under a newly positioned friend.
    G.carrots = G.carrots.filter(c => veggieSpotFree(c.x, c.y, c.size, c));
  }

  function clampFlight(name, position) {
    const s = G[name].size;
    const side = s * (name === 'cat' ? 0.95 : 0.75);
    const top = s * (name === 'rabbit' ? 1.25 : 0.95);
    const bottom = s * (name === 'squid' ? 1.05 : 0.7);
    position.x = Math.max(side + 8, Math.min(canvas.width - side - 8, position.x));
    position.y = Math.max(top + 8, Math.min(canvas.height - bottom - 8, position.y));
  }

  function drawCharacters(t) {
    const names = ['rabbit', ...CHARACTER_NAMES].filter(name => name === 'rabbit' || G[name].visible);
    names.sort((a, b) => (G.ending ? G[flightKey(a)].y - G[flightKey(b)].y : G[a].y - G[b].y));
    names.forEach(name => {
      if (name === 'rabbit') { drawRabbit(t); return; }
      const ch = G[name];
      const position = G.ending ? G[flightKey(name)] : ch;
      const hop = Math.sin(Math.min(1, ch.react) * Math.PI) * ch.size * 0.2;
      CHARACTER_SPEC[name].draw(position.x, position.y - hop, ch.size, t, ch.enter, ch.react);
    });
  }
  layout();
  shuffleCharacterOrder();
  window.addEventListener('resize', () => { resize(); layout(); });

  // ===== Draw Helpers =====
  function ellipse(cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function circle(cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.abs(r), 0, Math.PI * 2);
    ctx.fill();
  }

  function easeOutBack(t) {
    const c = 1.7;
    return 1 + (t - 1) * (t - 1) * ((c + 1) * (t - 1) + c);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ===== Background =====
  function drawSky() {
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);

    if (G.ending && G.endingPhase === 'flying') {
      const p = Math.min(1, G.endingTime / 3);
      const blend = p * 0.3;
      grad.addColorStop(0, lerpColor(C.skyTop, '#101830', blend));
      grad.addColorStop(0.55, lerpColor(C.skyMid, '#1a2d55', blend));
      grad.addColorStop(1, lerpColor(C.skyBot, '#253d65', blend));
    } else {
      grad.addColorStop(0, C.skyTop);
      grad.addColorStop(0.55, C.skyMid);
      grad.addColorStop(1, C.skyBot);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function lerpColor(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  }

  function drawStarsBackground(t) {
    const w = canvas.width, h = canvas.height;
    G.stars.forEach(s => {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.globalAlpha = alpha;
      circle(s.x * w, s.y * h, s.r, C.star);
    });
    ctx.globalAlpha = 1;
  }

  function drawMoon(t) {
    let mx = G.moonX, my = G.moonY, mr = G.moonR;

    if (G.ending && G.endingPhase === 'flying') {
      const p = easeInOutCubic(Math.min(1, G.endingTime / 3));
      mr = G.moonR * (1 + p * 0.6);
      mx += (G.endingLayout.moonX - mx) * p;
      my += (G.endingLayout.moonY - my) * p;
    }
    if (G.ending && (G.endingPhase === 'celebrating' || G.endingPhase === 'done')) {
      mr = G.moonR * 1.6;
      mx = G.endingLayout.moonX;
      my = G.endingLayout.moonY;
    }

    // Glow layers
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.04 + (G.ending ? 0.02 : 0);
      circle(mx, my, mr * (1 + i * 0.8), C.moon);
    }
    ctx.globalAlpha = 1;
    circle(mx, my, mr, C.moon);

    // Craters
    ctx.globalAlpha = 0.08;
    circle(mx - mr * 0.3, my - mr * 0.15, mr * 0.12, '#b0a080');
    circle(mx + mr * 0.2, my + mr * 0.2, mr * 0.09, '#b0a080');
    circle(mx + mr * 0.05, my - mr * 0.05, mr * 0.07, '#b0a080');
    ctx.globalAlpha = 1;

    // Moon rabbit friend (bigger!)
    drawMoonRabbit(mx, my, mr, t);
  }

  // ===== Moon Rabbit (friend on the moon) - BIGGER & MORE ANIMATED =====
  function drawMoonRabbit(mx, my, mr, t) {
    const s = mr * 0.75;
    const bobY = Math.sin(t * 1.5) * s * 0.08;

    // Mini jump cycle
    const jumpCycle = t * 0.6;
    const jumpSin = Math.sin(jumpCycle * Math.PI * 2);
    const miniJump = Math.max(0, jumpSin) * s * 0.15;

    // Body sway
    const sway = Math.sin(t * 1.0) * 0.06;

    ctx.save();
    ctx.translate(mx - mr * 0.1, my - mr * 0.15 + bobY - miniJump);
    ctx.rotate(sway);

    // During ending celebration, moon rabbit bounces excitedly
    const excitedBounce = (G.ending && G.endingPhase === 'celebrating')
      ? Math.abs(Math.sin(t * 8)) * s * 0.3 : 0;
    ctx.translate(0, -excitedBounce);

    // Squash and stretch during jump
    const squashX = miniJump > 0 ? 1 - (miniJump / (s * 0.15)) * 0.08 : 1 + Math.max(0, -jumpSin) * 0.06;
    const stretchY = miniJump > 0 ? 1 + (miniJump / (s * 0.15)) * 0.08 : 1 - Math.max(0, -jumpSin) * 0.06;
    ctx.scale(squashX, stretchY);

    // Body
    ellipse(0, 0, s * 0.35, s * 0.38, C.moonDark);
    ellipse(0, s * 0.03, s * 0.22, s * 0.25, C.moon);

    // Ears - with wiggle
    const earWiggle = Math.sin(t * 2.2) * 0.1;
    ctx.save();
    ctx.translate(-s * 0.1, -s * 0.35);
    ctx.rotate(-0.2 + earWiggle);
    ellipse(0, -s * 0.2, s * 0.07, s * 0.22, C.moonDark);
    ellipse(0, -s * 0.2, s * 0.04, s * 0.16, '#d4a0a0');
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.08, -s * 0.35);
    ctx.rotate(0.15 - earWiggle);
    ellipse(0, -s * 0.2, s * 0.07, s * 0.22, C.moonDark);
    ellipse(0, -s * 0.2, s * 0.04, s * 0.16, '#d4a0a0');
    ctx.restore();

    // Arms waving hello - more lively
    const armWave = Math.sin(t * 3) * 0.4 + Math.sin(t * 1.5) * 0.15;
    ctx.save();
    ctx.translate(-s * 0.28, s * 0.0);
    ctx.rotate(-0.5 + armWave);
    ellipse(0, -s * 0.08, s * 0.06, s * 0.12, C.moonDark);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.28, s * 0.0);
    ctx.rotate(0.5 - armWave);
    ellipse(0, -s * 0.08, s * 0.06, s * 0.12, C.moonDark);
    ctx.restore();

    // Eyes
    const eyeY = -s * 0.1;
    if (G.ending && G.endingPhase === 'celebrating') {
      ctx.strokeStyle = '#8a7a60';
      ctx.lineWidth = s * 0.03;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-s * 0.09, eyeY, s * 0.035, Math.PI + 0.3, -0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.09, eyeY, s * 0.035, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      ellipse(-s * 0.09, eyeY, s * 0.03, s * 0.035, '#8a7a60');
      ellipse(s * 0.09, eyeY, s * 0.03, s * 0.035, '#8a7a60');
      circle(-s * 0.08, eyeY - s * 0.015, s * 0.012, C.moon);
      circle(s * 0.1, eyeY - s * 0.015, s * 0.012, C.moon);
    }

    // Cheeks
    ctx.globalAlpha = 0.25;
    circle(-s * 0.14, s * 0.0, s * 0.05, '#c09080');
    circle(s * 0.14, s * 0.0, s * 0.05, '#c09080');
    ctx.globalAlpha = 1;

    // Nose
    ellipse(0, -s * 0.04, s * 0.02, s * 0.015, '#c09080');

    // Mouth
    ctx.strokeStyle = '#b09080';
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -s * 0.01, s * 0.025, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Feet - kick during jump
    const footKick = miniJump > 0 ? Math.sin(jumpCycle * Math.PI * 4) * s * 0.04 : 0;
    ellipse(-s * 0.1 - footKick, s * 0.3, s * 0.08, s * 0.04, C.moonDark);
    ellipse(s * 0.1 + footKick, s * 0.3, s * 0.08, s * 0.04, C.moonDark);

    ctx.restore();
  }

  function drawGround() {
    if (G.ending) {
      const fadeOut = Math.min(1, G.endingTime / 2);
      ctx.globalAlpha = 1 - fadeOut;
    }

    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, G.groundY - 10, 0, h);
    grad.addColorStop(0, '#1c3a5e');
    grad.addColorStop(0.3, '#163050');
    grad.addColorStop(1, C.ground);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      const y = G.groundY + Math.sin(x * 0.008) * 6 + Math.sin(x * 0.02) * 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 40; i++) {
      const gx = (i / 40) * w + Math.sin(i * 11) * 15;
      const gy = G.groundY + 3 + Math.sin(i * 5) * 5;
      circle(gx, gy, 2 + Math.sin(i * 7) * 1.5, '#3a7a5a');
    }
    ctx.globalAlpha = 1;
  }

  // ===== Draw Rabbit (with hopping!) =====
  function drawRabbitAt(x, y, size, t, state) {
    const s = size;
    const bounce = state.bounce || 0;
    const happy = state.happy || 0;
    const eating = state.eating || 0;
    const bounceY = Math.sin(bounce * 4) * s * 0.12 * Math.min(1, bounce);
    const happyScale = 1 + Math.max(0, happy) * 0.03;
    const idleTilt = Math.sin(t * 0.7) * 0.02;

    // Continuous bunny hop animation
    const hopCycle = t * 2.0;
    const hopSin = Math.sin(hopCycle * Math.PI);
    const idleHop = bounce < 0.1 ? Math.max(0, hopSin) * s * 0.4 : 0;
    // Squash and stretch during hop
    const hopSquash = bounce < 0.1 ? (hopSin > 0 ? 1 - hopSin * 0.12 : 1 + Math.max(0, -hopSin) * 0.1) : 1;
    const hopStretch = bounce < 0.1 ? (hopSin > 0 ? 1 + hopSin * 0.12 : 1 - Math.max(0, -hopSin) * 0.1) : 1;

    ctx.save();
    ctx.translate(x, y - bounceY - idleHop);
    ctx.rotate(idleTilt);
    ctx.scale(happyScale * hopSquash, happyScale * hopStretch);

    // Shadow (only on ground)
    if (!G.ending || G.endingTime < 1) {
      const shadowScale = 1 - idleHop / (s * 0.2);
      ctx.globalAlpha = (0.15 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1)) * (0.5 + 0.5 * shadowScale);
      ellipse(0, s * 0.45 + idleHop, s * 0.35 * (0.8 + 0.2 * shadowScale), s * 0.06, '#000');
      ctx.globalAlpha = 1;
    }

    // Feet - animate during hop
    const footSpread = bounce < 0.1 && hopSin > 0.3 ? 1 + hopSin * 0.15 : 1;
    ellipse(-s * 0.17 * footSpread, s * 0.4, s * 0.13, s * 0.055, C.rabbitBody);
    ellipse(s * 0.17 * footSpread, s * 0.4, s * 0.13, s * 0.055, C.rabbitBody);

    // Body
    ellipse(0, s * 0.05, s * 0.38, s * 0.42, C.rabbitBody);
    ellipse(0, s * 0.1, s * 0.25, s * 0.28, C.rabbitInner);

    // Arms
    const armWave = happy > 0 ? Math.sin(t * 12) * 0.3 : 0;
    ctx.save();
    ctx.translate(-s * 0.32, s * 0.02);
    ctx.rotate(-0.3 + armWave);
    ellipse(0, 0, s * 0.08, s * 0.14, C.rabbitBody);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.32, s * 0.02);
    ctx.rotate(0.3 - armWave);
    ellipse(0, 0, s * 0.08, s * 0.14, C.rabbitBody);
    ctx.restore();

    // Ears - bounce during hop
    const earBounce = bounce < 0.1 && hopSin > 0 ? hopSin * 0.08 : 0;
    const earWobble = Math.sin(t * 1.8) * 0.04;
    ctx.save();
    ctx.translate(-s * 0.12, -s * 0.4);
    ctx.rotate(-0.12 + earWobble + earBounce);
    ellipse(0, -s * 0.28, s * 0.09, s * 0.3, C.rabbitBody);
    ellipse(0, -s * 0.28, s * 0.05, s * 0.22, C.rabbitEarInner);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.12, -s * 0.4);
    ctx.rotate(0.12 - earWobble - earBounce);
    ellipse(0, -s * 0.28, s * 0.09, s * 0.3, C.rabbitBody);
    ellipse(0, -s * 0.28, s * 0.05, s * 0.22, C.rabbitEarInner);
    ctx.restore();

    // Face
    const eyeY = -s * 0.18;
    const blink = Math.sin(t * 0.4) > 0.97;

    if (happy > 0.5) {
      ctx.strokeStyle = C.rabbitEye;
      ctx.lineWidth = s * 0.028;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-s * 0.11, eyeY, s * 0.04, Math.PI + 0.3, -0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.11, eyeY, s * 0.04, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      const eyeH = blink ? 0.01 : 1;
      ellipse(-s * 0.11, eyeY, s * 0.035, s * 0.04 * eyeH, C.rabbitEye);
      ellipse(s * 0.11, eyeY, s * 0.035, s * 0.04 * eyeH, C.rabbitEye);
      if (!blink) {
        circle(-s * 0.1, eyeY - s * 0.018, s * 0.013, '#fff');
        circle(s * 0.12, eyeY - s * 0.018, s * 0.013, '#fff');
      }
    }

    // Glasses! (round frames)
    ctx.strokeStyle = C.glassFrame;
    ctx.lineWidth = s * 0.02;
    ctx.lineCap = 'round';
    // Left lens
    ctx.beginPath();
    ctx.arc(-s * 0.11, eyeY, s * 0.075, 0, Math.PI * 2);
    ctx.stroke();
    // Right lens
    ctx.beginPath();
    ctx.arc(s * 0.11, eyeY, s * 0.075, 0, Math.PI * 2);
    ctx.stroke();
    // Bridge over nose
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, eyeY + s * 0.005);
    ctx.lineTo(s * 0.04, eyeY + s * 0.005);
    ctx.stroke();
    // Temple arms
    ctx.beginPath();
    ctx.moveTo(-s * 0.185, eyeY);
    ctx.lineTo(-s * 0.23, eyeY + s * 0.025);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.185, eyeY);
    ctx.lineTo(s * 0.23, eyeY + s * 0.025);
    ctx.stroke();
    // Glass reflection
    ctx.globalAlpha = 0.35;
    circle(-s * 0.135, eyeY - s * 0.035, s * 0.018, '#ffffff');
    circle(s * 0.085, eyeY - s * 0.035, s * 0.018, '#ffffff');
    ctx.globalAlpha = 1;

    // Cheeks
    ctx.globalAlpha = 0.25;
    circle(-s * 0.19, -s * 0.05, s * 0.05, C.rabbitCheek);
    circle(s * 0.19, -s * 0.05, s * 0.05, C.rabbitCheek);
    ctx.globalAlpha = 1;

    // Nose
    ellipse(0, -s * 0.08, s * 0.025, s * 0.018, C.rabbitEarInner);

    // Mouth
    if (eating > 0.3) {
      ellipse(0, -s * 0.03, s * 0.04, s * 0.035 * eating, '#c08080');
    } else {
      ctx.strokeStyle = '#c0a0a0';
      ctx.lineWidth = s * 0.015;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-s * 0.025, -s * 0.055, s * 0.025, 0.3, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.025, -s * 0.055, s * 0.025, Math.PI * 0.5, Math.PI - 0.3);
      ctx.stroke();
    }

    // Tail
    circle(s * 0.3, s * 0.2, s * 0.07, C.rabbitInner);

    ctx.restore();
  }

  function drawRabbit(t) {
    const r = G.rabbit;
    if (G.ending) {
      drawRabbitAt(G.flightRabbit.x, G.flightRabbit.y, r.size, t, r);
    } else {
      drawRabbitAt(r.x, r.y, r.size, t, r);
    }
  }

  // ===== Draw Turtle (bigger, crawling!) =====
  function drawTurtleAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));

    // Crawling animation - slow waddle
    const crawlCycle = t * 0.8;
    const crawlBob = Math.sin(crawlCycle * Math.PI * 2) * s * 0.015;
    const crawlTilt = Math.sin(crawlCycle * Math.PI * 2) * 0.03;

    ctx.save();
    ctx.translate(x, y + crawlBob);
    ctx.rotate(crawlTilt);
    ctx.scale(scale, scale);

    // Shadow
    if (!G.ending || G.endingTime < 1) {
      ctx.globalAlpha = 0.12 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1);
      ellipse(0, s * 0.22, s * 0.42, s * 0.07, '#000');
      ctx.globalAlpha = 1;
    }

    // Legs with crawling animation - alternate pairs
    const legPhase = crawlCycle * Math.PI * 2;
    const legLift1 = Math.max(0, Math.sin(legPhase)) * s * 0.04;
    const legLift2 = Math.max(0, Math.sin(legPhase + Math.PI)) * s * 0.04;
    const legSlide1 = Math.sin(legPhase) * s * 0.03;
    const legSlide2 = Math.sin(legPhase + Math.PI) * s * 0.03;

    // Front-left & back-right move together
    ellipse(-s * 0.3 + legSlide1, s * 0.15 - legLift1, s * 0.1, s * 0.07, C.turtleBody);
    ellipse(s * 0.32 + legSlide1, s * 0.18 - legLift1, s * 0.08, s * 0.06, C.turtleBody);
    // Front-right & back-left move together
    ellipse(s * 0.24 + legSlide2, s * 0.15 - legLift2, s * 0.1, s * 0.07, C.turtleBody);
    ellipse(-s * 0.2 + legSlide2, s * 0.18 - legLift2, s * 0.08, s * 0.06, C.turtleBody);

    // Shell base
    ctx.fillStyle = C.turtleShellDark;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.34, 0, Math.PI, 0);
    ctx.fill();

    // Shell dome
    ctx.fillStyle = C.turtleShell;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.02, s * 0.37, s * 0.32, 0, Math.PI, 0);
    ctx.fill();

    // Shell pattern
    ctx.globalAlpha = 0.25;
    circle(0, -s * 0.2, s * 0.09, C.turtleShellLight);
    circle(-s * 0.14, -s * 0.12, s * 0.06, C.turtleShellLight);
    circle(s * 0.14, -s * 0.12, s * 0.06, C.turtleShellLight);
    circle(-s * 0.08, -s * 0.28, s * 0.045, C.turtleShellLight);
    circle(s * 0.08, -s * 0.28, s * 0.045, C.turtleShellLight);
    ctx.globalAlpha = 1;

    // Belly
    ellipse(0, s * 0.07, s * 0.32, s * 0.11, C.turtleBelly);

    // Head (facing right toward rabbit) - bobs while crawling
    const headBob = Math.sin(crawlCycle * Math.PI * 2 + 0.5) * s * 0.02;
    ellipse(s * 0.38 + headBob, -s * 0.05, s * 0.15, s * 0.13, C.turtleBody);

    // Eye
    circle(s * 0.45 + headBob, -s * 0.1, s * 0.045, '#fff');
    circle(s * 0.46 + headBob, -s * 0.1, s * 0.025, C.eye);
    circle(s * 0.465 + headBob, -s * 0.105, s * 0.012, '#fff');

    // Smile
    ctx.strokeStyle = C.eye;
    ctx.lineWidth = s * 0.018;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(s * 0.42 + headBob, -s * 0.025, s * 0.04, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Cheek
    ctx.globalAlpha = 0.25;
    circle(s * 0.36 + headBob, s * 0.0, s * 0.04, '#e0a0a0');
    ctx.globalAlpha = 1;

    // Tail
    const tailWag = Math.sin(t * 3) * 0.2;
    ctx.save();
    ctx.translate(-s * 0.4, s * 0.07);
    ctx.rotate(tailWag);
    ellipse(0, 0, s * 0.06, s * 0.04, C.turtleBody);
    ctx.restore();

    ctx.restore();
  }

  // ===== Draw Squid (Dancing!) =====
  function drawSquidAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));
    const floatY = Math.sin(t * 1.1) * s * 0.1;
    const floatX = Math.sin(t * 0.7 + 1) * s * 0.04;

    // Dancing: rhythmic body sway, bounce, and tilt
    const dancePhase = t * 3.0;
    const danceBounce = Math.abs(Math.sin(dancePhase)) * s * 0.08;
    const danceSway = Math.sin(dancePhase * 0.5) * s * 0.06;
    const danceTilt = Math.sin(dancePhase) * 0.15;
    // Pulse scale for dance beat
    const dancePulse = 1 + Math.abs(Math.sin(dancePhase)) * 0.04;

    ctx.save();
    ctx.translate(x + floatX + danceSway, y + floatY - danceBounce);
    ctx.rotate(danceTilt);
    ctx.scale(scale * dancePulse, scale);

    // Tentacles (8 short cute ones) - dance wave
    for (let i = 0; i < 8; i++) {
      const tx = (i - 3.5) * s * 0.075;
      const wave = Math.sin(t * 3.5 + i * 0.7) * s * 0.06;
      const len = s * (0.3 + Math.sin(i * 2.1) * 0.05);
      ctx.strokeStyle = i % 2 === 0 ? C.squidBody : C.squidLight;
      ctx.lineWidth = s * 0.055;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, s * 0.18);
      ctx.quadraticCurveTo(tx + wave, s * 0.18 + len * 0.6, tx + wave * 1.5, s * 0.18 + len);
      ctx.stroke();
    }

    // Two longer tentacles - dramatic dance waves
    for (let side = -1; side <= 1; side += 2) {
      const wave = Math.sin(t * 2.5 + side) * s * 0.12;
      const wave2 = Math.cos(t * 3.0 + side * 2) * s * 0.06;
      ctx.strokeStyle = C.squidBody;
      ctx.lineWidth = s * 0.035;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(side * s * 0.25, s * 0.1);
      ctx.quadraticCurveTo(side * s * 0.4 + wave, s * 0.25 + wave2, side * s * 0.3 + wave * 1.5, s * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 0.3;
      circle(side * s * 0.35 + wave * 0.5, s * 0.3 + wave2 * 0.3, s * 0.02, C.squidMantle);
      circle(side * s * 0.32 + wave, s * 0.42, s * 0.018, C.squidMantle);
      ctx.globalAlpha = 1;
    }

    // Mantle
    ellipse(0, 0, s * 0.32, s * 0.3, C.squidBody);

    // Dome top
    ctx.fillStyle = C.squidBody;
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.45, 0, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.45, s * 0.28, -s * 0.05);
    ctx.fill();

    // Dome highlight
    ctx.fillStyle = C.squidLight;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.03);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.38, 0, -s * 0.46);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.38, s * 0.18, -s * 0.03);
    ctx.fill();

    // Fins - dance flap more vigorously
    const finFlap = Math.sin(t * 3.5) * 0.3;
    ctx.save();
    ctx.translate(-s * 0.28, -s * 0.22);
    ctx.rotate(-0.2 + finFlap);
    ellipse(0, 0, s * 0.12, s * 0.08, C.squidFin);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.28, -s * 0.22);
    ctx.rotate(0.2 - finFlap);
    ellipse(0, 0, s * 0.12, s * 0.08, C.squidFin);
    ctx.restore();

    // Belly
    ellipse(0, s * 0.05, s * 0.2, s * 0.18, C.squidLight);

    // Spots
    ctx.globalAlpha = 0.15;
    circle(-s * 0.08, -s * 0.32, s * 0.03, C.squidMantle);
    circle(s * 0.1, -s * 0.28, s * 0.025, C.squidMantle);
    circle(s * 0.0, -s * 0.4, s * 0.02, C.squidMantle);
    ctx.globalAlpha = 1;

    // Eyes - happy dancing eyes
    ellipse(-s * 0.13, -s * 0.05, s * 0.08, s * 0.085, '#fff');
    ellipse(s * 0.13, -s * 0.05, s * 0.08, s * 0.085, '#fff');
    const lookX = Math.sin(t * 0.5) * s * 0.015;
    const lookY = Math.cos(t * 0.3) * s * 0.01;
    circle(-s * 0.12 + lookX, -s * 0.045 + lookY, s * 0.045, C.eye);
    circle(s * 0.12 + lookX, -s * 0.045 + lookY, s * 0.045, C.eye);
    circle(-s * 0.1 + lookX, -s * 0.065 + lookY, s * 0.018, '#fff');
    circle(-s * 0.14 + lookX, -s * 0.03 + lookY, s * 0.01, '#fff');
    circle(s * 0.14 + lookX, -s * 0.065 + lookY, s * 0.018, '#fff');
    circle(s * 0.1 + lookX, -s * 0.03 + lookY, s * 0.01, '#fff');

    // Cheeks - extra glow when dancing
    ctx.globalAlpha = 0.35;
    ellipse(-s * 0.22, s * 0.02, s * 0.055, s * 0.035, '#e08090');
    ellipse(s * 0.22, s * 0.02, s * 0.055, s * 0.035, '#e08090');
    ctx.globalAlpha = 1;

    // Mouth - happy 'w' shape
    ctx.strokeStyle = C.eye;
    ctx.lineWidth = s * 0.018;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, s * 0.06);
    ctx.quadraticCurveTo(-s * 0.025, s * 0.09, 0, s * 0.065);
    ctx.quadraticCurveTo(s * 0.025, s * 0.09, s * 0.05, s * 0.06);
    ctx.stroke();

    // Dance sparkles (occasional)
    if (Math.sin(t * 5) > 0.9) {
      ctx.globalAlpha = 0.6;
      const sparkleX = Math.sin(t * 7) * s * 0.4;
      const sparkleY = Math.cos(t * 6) * s * 0.3 - s * 0.3;
      ctx.fillStyle = C.starP;
      drawStar4Small(sparkleX, sparkleY, s * 0.05);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawStar4Small(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.35;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ===== Draw Red Cat (빨간 고양이) =====
  function drawCatAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));

    // Sitting idle sway
    const swayCycle = t * 1.2;
    const swayTilt = Math.sin(swayCycle) * 0.04;
    const breathe = Math.sin(t * 2.0) * s * 0.01;

    ctx.save();
    ctx.translate(x, y + breathe);
    ctx.rotate(swayTilt);
    ctx.scale(scale, scale);

    // Shadow
    if (!G.ending || G.endingTime < 1) {
      ctx.globalAlpha = 0.12 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1);
      ellipse(0, s * 0.3, s * 0.38, s * 0.06, '#000');
      ctx.globalAlpha = 1;
    }

    // Tail - swishing behind body
    const tailSwish = Math.sin(t * 2.5) * 0.6;
    ctx.save();
    ctx.translate(-s * 0.35, s * 0.1);
    ctx.rotate(-0.3 + tailSwish);
    // Tail curve
    ctx.strokeStyle = C.catBody;
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.25 + Math.sin(t * 2.5) * s * 0.1, -s * 0.15, -s * 0.35, -s * 0.3);
    ctx.stroke();
    // Tail tip
    circle(-s * 0.35, -s * 0.3, s * 0.055, C.catDark);
    ctx.restore();

    // Hind legs (sitting)
    ellipse(-s * 0.2, s * 0.22, s * 0.13, s * 0.08, C.catBody);
    ellipse(s * 0.2, s * 0.22, s * 0.13, s * 0.08, C.catBody);
    // Paws
    ellipse(-s * 0.25, s * 0.28, s * 0.07, s * 0.04, C.catDark);
    ellipse(s * 0.25, s * 0.28, s * 0.07, s * 0.04, C.catDark);

    // Body
    ellipse(0, s * 0.02, s * 0.32, s * 0.3, C.catBody);
    // Belly
    ellipse(0, s * 0.08, s * 0.2, s * 0.2, C.catInner);

    // Front paws
    ellipse(-s * 0.15, s * 0.25, s * 0.07, s * 0.05, C.catBody);
    ellipse(s * 0.15, s * 0.25, s * 0.07, s * 0.05, C.catBody);

    // Head
    ellipse(0, -s * 0.22, s * 0.26, s * 0.23, C.catBody);

    // Ears (triangular)
    ctx.fillStyle = C.catBody;
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.35);
    ctx.lineTo(-s * 0.12, -s * 0.55);
    ctx.lineTo(-s * 0.04, -s * 0.35);
    ctx.fill();
    ctx.fillStyle = C.catEar;
    ctx.beginPath();
    ctx.moveTo(-s * 0.19, -s * 0.37);
    ctx.lineTo(-s * 0.13, -s * 0.50);
    ctx.lineTo(-s * 0.07, -s * 0.37);
    ctx.fill();

    ctx.fillStyle = C.catBody;
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.35);
    ctx.lineTo(s * 0.12, -s * 0.55);
    ctx.lineTo(s * 0.04, -s * 0.35);
    ctx.fill();
    ctx.fillStyle = C.catEar;
    ctx.beginPath();
    ctx.moveTo(s * 0.19, -s * 0.37);
    ctx.lineTo(s * 0.13, -s * 0.50);
    ctx.lineTo(s * 0.07, -s * 0.37);
    ctx.fill();

    // Eyes
    const blink = Math.sin(t * 0.35 + 1) > 0.97;
    const eyeY = -s * 0.24;
    if (blink) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = s * 0.02;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, eyeY);
      ctx.lineTo(-s * 0.06, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.06, eyeY);
      ctx.lineTo(s * 0.14, eyeY);
      ctx.stroke();
    } else {
      ellipse(-s * 0.1, eyeY, s * 0.04, s * 0.045, C.eye);
      ellipse(s * 0.1, eyeY, s * 0.04, s * 0.045, C.eye);
      circle(-s * 0.09, eyeY - s * 0.02, s * 0.016, '#fff');
      circle(s * 0.11, eyeY - s * 0.02, s * 0.016, '#fff');
    }

    // Nose (small triangle)
    ctx.fillStyle = C.catNose;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15);
    ctx.lineTo(-s * 0.025, -s * 0.175);
    ctx.lineTo(s * 0.025, -s * 0.175);
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = C.catInner;
    ctx.lineWidth = s * 0.012;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.08, -s * 0.16 + i * s * 0.025);
        ctx.lineTo(side * s * 0.28, -s * 0.17 + i * s * 0.04);
        ctx.stroke();
      }
    }

    // Mouth
    ctx.strokeStyle = C.catDark;
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15);
    ctx.lineTo(0, -s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-s * 0.03, -s * 0.11, s * 0.03, -0.3, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.03, -s * 0.11, s * 0.03, Math.PI * 0.5, Math.PI + 0.3);
    ctx.stroke();

    // Cheeks
    ctx.globalAlpha = 0.25;
    circle(-s * 0.16, -s * 0.13, s * 0.045, C.catInner);
    circle(s * 0.16, -s * 0.13, s * 0.045, C.catInner);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== Draw Red Duck (빨간 오리) =====
  function drawDuckAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));

    // Waddle animation
    const waddleCycle = t * 2.0;
    const waddleTilt = Math.sin(waddleCycle * Math.PI) * 0.08;
    const waddleBob = Math.abs(Math.sin(waddleCycle * Math.PI)) * s * 0.03;

    ctx.save();
    ctx.translate(x, y - waddleBob);
    ctx.rotate(waddleTilt);
    ctx.scale(scale, scale);

    // Shadow
    if (!G.ending || G.endingTime < 1) {
      ctx.globalAlpha = 0.12 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1);
      ellipse(0, s * 0.32, s * 0.35, s * 0.06, '#000');
      ctx.globalAlpha = 1;
    }

    // Feet (webbed)
    const footAngle = Math.sin(waddleCycle * Math.PI) * 0.15;
    ctx.save();
    ctx.translate(-s * 0.12, s * 0.28);
    ctx.rotate(-footAngle);
    ellipse(0, 0, s * 0.08, s * 0.035, C.duckFeet);
    // Toes
    ctx.fillStyle = C.duckFeet;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, 0);
    ctx.lineTo(-s * 0.1, -s * 0.02);
    ctx.lineTo(-s * 0.05, -s * 0.01);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.02, 0);
    ctx.lineTo(s * 0.06, -s * 0.02);
    ctx.lineTo(s * 0.04, s * 0.01);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.12, s * 0.28);
    ctx.rotate(footAngle);
    ellipse(0, 0, s * 0.08, s * 0.035, C.duckFeet);
    ctx.fillStyle = C.duckFeet;
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, 0);
    ctx.lineTo(-s * 0.06, -s * 0.02);
    ctx.lineTo(-s * 0.04, s * 0.01);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.06, 0);
    ctx.lineTo(s * 0.1, -s * 0.02);
    ctx.lineTo(s * 0.05, -s * 0.01);
    ctx.fill();
    ctx.restore();

    // Tail feathers
    ctx.fillStyle = C.duckWing;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.05);
    ctx.quadraticCurveTo(-s * 0.35, -s * 0.05, -s * 0.3, s * 0.12);
    ctx.quadraticCurveTo(-s * 0.25, s * 0.15, -s * 0.15, s * 0.1);
    ctx.fill();

    // Body (round)
    ellipse(0, s * 0.05, s * 0.3, s * 0.28, C.duckBody);
    // Belly
    ellipse(0, s * 0.1, s * 0.2, s * 0.2, C.duckLight);

    // Wings - gentle flap
    const wingFlap = Math.sin(t * 2.5) * 0.15;
    ctx.save();
    ctx.translate(-s * 0.25, s * 0.0);
    ctx.rotate(-0.2 + wingFlap);
    ellipse(0, s * 0.02, s * 0.08, s * 0.18, C.duckWing);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.25, s * 0.0);
    ctx.rotate(0.2 - wingFlap);
    ellipse(0, s * 0.02, s * 0.08, s * 0.18, C.duckWing);
    ctx.restore();

    // Head
    ellipse(0, -s * 0.22, s * 0.22, s * 0.2, C.duckBody);

    // Beak
    ctx.fillStyle = C.duckBeak;
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.17);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.19, s * 0.28, -s * 0.14);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.1, s * 0.08, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.145, s * 0.08, -s * 0.17);
    ctx.fill();
    // Beak line
    ctx.strokeStyle = C.duckBeakDark;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.145);
    ctx.lineTo(s * 0.26, -s * 0.145);
    ctx.stroke();

    // Eyes
    const blink = Math.sin(t * 0.45 + 2) > 0.97;
    const eyeY = -s * 0.24;
    if (blink) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.06, eyeY);
      ctx.lineTo(s * 0.02, eyeY);
      ctx.stroke();
    } else {
      ellipse(-s * 0.02, eyeY, s * 0.04, s * 0.045, C.eye);
      circle(-s * 0.01, eyeY - s * 0.018, s * 0.016, '#fff');
    }

    // Cheek
    ctx.globalAlpha = 0.25;
    circle(-s * 0.1, -s * 0.14, s * 0.04, C.duckLight);
    circle(s * 0.08, -s * 0.14, s * 0.04, C.duckLight);
    ctx.globalAlpha = 1;

    // Head tuft (little feathers on top)
    ctx.fillStyle = C.duckBody;
    ctx.beginPath();
    ctx.moveTo(-s * 0.02, -s * 0.4);
    ctx.quadraticCurveTo(s * 0.0, -s * 0.52, s * 0.04, -s * 0.45);
    ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.08, -s * 0.42);
    ctx.lineTo(s * 0.02, -s * 0.38);
    ctx.fill();

    ctx.restore();
  }

  // ===== Draw Yellow Chick (노랑 병아리) =====
  function drawChickAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));

    // Pecking bob animation
    const peckCycle = t * 2.5;
    const peckBob = Math.abs(Math.sin(peckCycle * Math.PI)) * s * 0.06;
    const peckTilt = Math.sin(peckCycle * Math.PI) * 0.06;

    ctx.save();
    ctx.translate(x, y - peckBob);
    ctx.rotate(peckTilt);
    ctx.scale(scale, scale);

    // Shadow
    if (!G.ending || G.endingTime < 1) {
      ctx.globalAlpha = 0.12 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1);
      ellipse(0, s * 0.28, s * 0.25, s * 0.05, '#000');
      ctx.globalAlpha = 1;
    }

    // Feet
    const footStep = Math.sin(peckCycle * Math.PI) * 0.12;
    ctx.save();
    ctx.translate(-s * 0.08, s * 0.24);
    ctx.rotate(-footStep);
    ctx.fillStyle = C.chickFeet;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.06, s * 0.04);
    ctx.lineTo(-s * 0.02, s * 0.02);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(s * 0.02, s * 0.02);
    ctx.lineTo(s * 0.06, s * 0.04);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.08, s * 0.24);
    ctx.rotate(footStep);
    ctx.fillStyle = C.chickFeet;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.06, s * 0.04);
    ctx.lineTo(-s * 0.02, s * 0.02);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(s * 0.02, s * 0.02);
    ctx.lineTo(s * 0.06, s * 0.04);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // Body (fluffy round)
    ellipse(0, s * 0.05, s * 0.26, s * 0.24, C.chickBody);
    // Belly highlight
    ellipse(0, s * 0.1, s * 0.17, s * 0.16, C.chickLight);

    // Wings - little flaps
    const wingFlap = Math.sin(t * 3.0) * 0.2;
    ctx.save();
    ctx.translate(-s * 0.22, s * 0.0);
    ctx.rotate(-0.3 + wingFlap);
    ellipse(0, s * 0.02, s * 0.06, s * 0.13, C.chickWing);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.22, s * 0.0);
    ctx.rotate(0.3 - wingFlap);
    ellipse(0, s * 0.02, s * 0.06, s * 0.13, C.chickWing);
    ctx.restore();

    // Head
    ellipse(0, -s * 0.2, s * 0.2, s * 0.18, C.chickBody);

    // Comb (빨간 볏)
    ctx.fillStyle = C.chickComb;
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -s * 0.37);
    ctx.quadraticCurveTo(-s * 0.02, -s * 0.46, s * 0.0, -s * 0.4);
    ctx.quadraticCurveTo(s * 0.02, -s * 0.48, s * 0.05, -s * 0.38);
    ctx.quadraticCurveTo(s * 0.03, -s * 0.35, -s * 0.04, -s * 0.37);
    ctx.fill();

    // Beak
    ctx.fillStyle = C.chickBeak;
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.18);
    ctx.lineTo(s * 0.2, -s * 0.16);
    ctx.lineTo(s * 0.08, -s * 0.13);
    ctx.closePath();
    ctx.fill();
    // Beak line
    ctx.strokeStyle = C.chickBeakDark;
    ctx.lineWidth = s * 0.01;
    ctx.beginPath();
    ctx.moveTo(s * 0.09, -s * 0.155);
    ctx.lineTo(s * 0.18, -s * 0.155);
    ctx.stroke();

    // Eyes
    const blink = Math.sin(t * 0.5 + 3) > 0.97;
    const eyeY = -s * 0.22;
    if (blink) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.06, eyeY);
      ctx.lineTo(s * 0.0, eyeY);
      ctx.stroke();
    } else {
      ellipse(-s * 0.03, eyeY, s * 0.035, s * 0.04, C.eye);
      circle(-s * 0.02, eyeY - s * 0.015, s * 0.014, '#fff');
    }

    // Cheeks
    ctx.globalAlpha = 0.3;
    circle(-s * 0.1, -s * 0.13, s * 0.04, '#f0c080');
    circle(s * 0.1, -s * 0.13, s * 0.04, '#f0c080');
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== Draw Penguin (Pororo-style blue penguin with goggles) =====
  function drawPenguinAt(x, y, size, t, enter) {
    const s = size;
    const scale = easeOutBack(Math.min(1, enter));

    // Waddle animation
    const waddle = t * 2.1;
    const waddleTilt = Math.sin(waddle * Math.PI) * 0.1;
    const waddleBob = Math.abs(Math.sin(waddle * Math.PI)) * s * 0.035;

    ctx.save();
    ctx.translate(x, y - waddleBob);
    ctx.rotate(waddleTilt);
    ctx.scale(scale, scale);

    // Shadow
    if (!G.ending || G.endingTime < 1) {
      ctx.globalAlpha = 0.12 * (G.ending ? Math.max(0, 1 - G.endingTime) : 1);
      ellipse(0, s * 0.38, s * 0.32, s * 0.06, '#000');
      ctx.globalAlpha = 1;
    }

    // Feet
    const footStep = Math.sin(waddle * Math.PI) * 0.2;
    ctx.save();
    ctx.translate(-s * 0.1, s * 0.33);
    ctx.rotate(-footStep);
    ellipse(0, 0, s * 0.09, s * 0.04, C.penguinFeet);
    // Webbed toe hints
    ctx.fillStyle = C.penguinFeet;
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, s * 0.01);
    ctx.lineTo(-s * 0.11, -s * 0.015);
    ctx.lineTo(-s * 0.04, -s * 0.005);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.1, s * 0.33);
    ctx.rotate(footStep);
    ellipse(0, 0, s * 0.09, s * 0.04, C.penguinFeet);
    ctx.fillStyle = C.penguinFeet;
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.01);
    ctx.lineTo(s * 0.11, -s * 0.015);
    ctx.lineTo(s * 0.04, -s * 0.005);
    ctx.fill();
    ctx.restore();

    // Body (round blue)
    ellipse(0, s * 0.05, s * 0.33, s * 0.36, C.penguinBody);

    // Flippers flapping
    const flipperFlap = Math.sin(t * 3.2) * 0.2;
    ctx.save();
    ctx.translate(-s * 0.3, s * 0.02);
    ctx.rotate(-0.2 + flipperFlap);
    ellipse(0, 0, s * 0.07, s * 0.18, C.penguinDark);
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.3, s * 0.02);
    ctx.rotate(0.2 - flipperFlap);
    ellipse(0, 0, s * 0.07, s * 0.18, C.penguinDark);
    ctx.restore();

    // Belly (cream oval)
    ellipse(0, s * 0.12, s * 0.21, s * 0.26, C.penguinBelly);

    // Head dome (slightly flatter top)
    ellipse(0, -s * 0.22, s * 0.3, s * 0.28, C.penguinBody);

    // Face patch (cream around eyes/beak - penguin look)
    ellipse(0, -s * 0.18, s * 0.22, s * 0.2, C.penguinBelly);

    // Goggles strap (arc over top of head)
    ctx.strokeStyle = C.penguinGoggle;
    ctx.lineWidth = s * 0.028;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, -s * 0.23);
    ctx.quadraticCurveTo(0, -s * 0.36, s * 0.22, -s * 0.23);
    ctx.stroke();

    // Goggle lens rings
    circle(-s * 0.11, -s * 0.22, s * 0.1, C.penguinGoggle);
    circle(s * 0.11, -s * 0.22, s * 0.1, C.penguinGoggle);
    // Glass (yellow)
    circle(-s * 0.11, -s * 0.22, s * 0.075, C.penguinGlass);
    circle(s * 0.11, -s * 0.22, s * 0.075, C.penguinGlass);
    // Bridge
    ctx.strokeStyle = C.penguinGoggle;
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(-s * 0.035, -s * 0.22);
    ctx.lineTo(s * 0.035, -s * 0.22);
    ctx.stroke();

    // Eyes inside goggles
    const blink = Math.sin(t * 0.42 + 4) > 0.97;
    if (blink) {
      ctx.strokeStyle = C.eye;
      ctx.lineWidth = s * 0.018;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, -s * 0.22);
      ctx.lineTo(-s * 0.08, -s * 0.22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.08, -s * 0.22);
      ctx.lineTo(s * 0.14, -s * 0.22);
      ctx.stroke();
    } else {
      circle(-s * 0.11, -s * 0.22, s * 0.03, C.eye);
      circle(s * 0.11, -s * 0.22, s * 0.03, C.eye);
      circle(-s * 0.1, -s * 0.235, s * 0.013, '#fff');
      circle(s * 0.12, -s * 0.235, s * 0.013, '#fff');
    }

    // Glass highlight (shine)
    ctx.globalAlpha = 0.45;
    circle(-s * 0.14, -s * 0.25, s * 0.022, '#ffffff');
    circle(s * 0.08, -s * 0.25, s * 0.022, '#ffffff');
    ctx.globalAlpha = 1;

    // Beak (orange triangle)
    ctx.fillStyle = C.penguinBeak;
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -s * 0.1);
    ctx.lineTo(s * 0.04, -s * 0.1);
    ctx.lineTo(0, -s * 0.04);
    ctx.closePath();
    ctx.fill();

    // Cheeks
    ctx.globalAlpha = 0.3;
    circle(-s * 0.2, -s * 0.12, s * 0.04, '#e88080');
    circle(s * 0.2, -s * 0.12, s * 0.04, '#e88080');
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== Friendly Fox =====
  function drawFoxAt(x, y, size, t, enter, react) {
    const s = size;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2) * s * 0.015);
    const scale = easeOutBack(Math.min(1, enter));
    ctx.scale(scale, scale);
    if (!G.ending) {
      ctx.globalAlpha = 0.12;
      ellipse(0, s * 0.34, s * 0.3, s * 0.05, '#000');
      ctx.globalAlpha = 1;
    }

    // Bushy tail with a cream tip, swishing faster when tapped.
    ctx.save();
    ctx.translate(-s * 0.18, s * 0.15);
    ctx.rotate(-0.3 + Math.sin(t * (react > 0 ? 12 : 2.5)) * (0.12 + (react || 0) * 0.25));
    ellipse(-s * 0.19, -s * 0.04, s * 0.26, s * 0.13, C.foxBody);
    ellipse(-s * 0.36, -s * 0.065, s * 0.11, s * 0.1, C.foxLight);
    ctx.restore();

    ellipse(0, s * 0.06, s * 0.23, s * 0.28, C.foxBody);
    ellipse(0, s * 0.09, s * 0.13, s * 0.19, C.foxLight);
    for (const side of [-1, 1]) {
      ellipse(side * s * 0.13, s * 0.3, s * 0.09, s * 0.055, C.foxDark);
      ctx.fillStyle = C.foxBody;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.25, -s * 0.32);
      ctx.lineTo(side * s * 0.23, -s * 0.72);
      ctx.lineTo(side * s * 0.05, -s * 0.4);
      ctx.fill();
      ctx.fillStyle = C.foxLight;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.21, -s * 0.39);
      ctx.lineTo(side * s * 0.215, -s * 0.64);
      ctx.lineTo(side * s * 0.11, -s * 0.43);
      ctx.fill();
    }
    ellipse(0, -s * 0.27, s * 0.26, s * 0.24, C.foxBody);
    // White cheeks meet in a pointed muzzle.
    ctx.fillStyle = C.foxLight;
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, -s * 0.25);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.23, 0, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.23, s * 0.24, -s * 0.25);
    ctx.quadraticCurveTo(s * 0.21, -s * 0.04, 0, -s * 0.035);
    ctx.quadraticCurveTo(-s * 0.21, -s * 0.04, -s * 0.24, -s * 0.25);
    ctx.fill();
    for (const side of [-1, 1]) {
      if (react > 0.2 || Math.sin(t * 0.45 + 2) > 0.98) {
        ctx.strokeStyle = C.eye;
        ctx.lineWidth = s * 0.02;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(side * s * 0.1, -s * 0.29, s * 0.035, Math.PI + 0.2, -0.2);
        ctx.stroke();
      } else {
        ellipse(side * s * 0.1, -s * 0.3, s * 0.03, s * 0.035, C.eye);
        circle(side * s * 0.1 + s * 0.008, -s * 0.314, s * 0.012, '#fff');
      }
    }
    ellipse(0, -s * 0.14, s * 0.03, s * 0.022, C.foxDark);
    ctx.strokeStyle = C.foxDark;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12);
    ctx.lineTo(0, -s * 0.09);
    ctx.moveTo(-s * 0.04, -s * 0.09);
    ctx.quadraticCurveTo(0, -s * 0.065, s * 0.04, -s * 0.09);
    ctx.stroke();
    ctx.restore();
  }

  // ===== Friendly Lion and Tiger =====
  function drawLionAt(x, y, size, t, enter, react) {
    drawBigCatAt(x, y, size, t, enter, react, true);
  }

  function drawTigerAt(x, y, size, t, enter, react) {
    drawBigCatAt(x, y, size, t, enter, react, false);
  }

  function drawBigCatAt(x, y, size, t, enter, react, lion) {
    const s = size;
    const body = lion ? C.lionBody : C.tigerBody;
    const light = lion ? C.lionLight : C.tigerLight;
    const dark = lion ? C.lionMane : C.tigerStripe;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.1) * s * 0.015);
    ctx.rotate(Math.sin(t * 1.7) * 0.025);
    const scale = easeOutBack(Math.min(1, enter));
    ctx.scale(scale, scale);

    if (!G.ending) {
      ctx.globalAlpha = 0.12;
      ellipse(0, s * 0.34, s * 0.33, s * 0.05, '#000');
      ctx.globalAlpha = 1;
    }

    // A soft curling tail, with a tuft or stripes.
    ctx.save();
    ctx.translate(s * 0.23, s * 0.13);
    ctx.rotate(Math.sin(t * 2.8) * 0.2);
    ctx.strokeStyle = body;
    ctx.lineWidth = s * 0.075;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.31, s * 0.06, s * 0.39, -s * 0.13, s * 0.3, -s * 0.26);
    ctx.stroke();
    if (lion) {
      ellipse(s * 0.3, -s * 0.26, s * 0.065, s * 0.095, dark);
    } else {
      ctx.strokeStyle = dark;
      ctx.lineWidth = s * 0.035;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * (0.25 + i * 0.03), -s * (0.02 + i * 0.065));
        ctx.lineTo(s * (0.32 + i * 0.01), -s * (0.02 + i * 0.065));
        ctx.stroke();
      }
    }
    ctx.restore();

    ellipse(0, s * 0.05, s * 0.27, s * 0.29, body);
    ellipse(0, s * 0.1, s * 0.16, s * 0.2, light);
    for (const side of [-1, 1]) {
      ellipse(side * s * 0.16, s * 0.29, s * 0.115, s * 0.07, body);
      ellipse(side * s * 0.16, s * 0.3, s * 0.065, s * 0.025, light);
      ellipse(side * s * 0.23, s * 0.04, s * 0.06, s * 0.15, body);
    }

    if (lion) {
      // Scalloped mane shakes when the lion is tapped.
      ctx.save();
      ctx.translate(0, -s * 0.27);
      ctx.rotate(Math.sin(t * 14) * (react || 0) * 0.14);
      circle(0, 0, s * 0.34, C.lionMane);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        circle(Math.cos(a) * s * 0.31, Math.sin(a) * s * 0.31, s * 0.095,
          i % 2 ? C.lionMane : C.lionManeLight);
      }
      ctx.restore();
    } else {
      ctx.strokeStyle = dark;
      ctx.lineWidth = s * 0.025;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.25, s * (0.01 + i * 0.07));
          ctx.lineTo(side * s * 0.19, s * (0.03 + i * 0.07));
          ctx.stroke();
        }
      }
    }

    for (const side of [-1, 1]) {
      circle(side * s * 0.2, -s * 0.48, s * 0.08, lion ? body : dark);
      circle(side * s * 0.2, -s * 0.48, s * 0.052, light);
    }
    ellipse(0, -s * 0.27, s * 0.27, s * 0.25, body);
    if (!lion) {
      ctx.fillStyle = dark;
      for (const dx of [-0.12, 0, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(s * (dx - 0.028), -s * 0.49);
        ctx.lineTo(s * (dx + 0.028), -s * 0.49);
        ctx.lineTo(s * dx, -s * (dx === 0 ? 0.36 : 0.4));
        ctx.fill();
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = s * 0.028;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.245, -s * (0.24 - i * 0.065));
          ctx.lineTo(side * s * 0.18, -s * (0.21 - i * 0.065));
          ctx.stroke();
        }
      }
    }

    const happyEyes = react > 0.2 || Math.sin(t * 0.5 + (lion ? 1 : 3)) > 0.98;
    for (const side of [-1, 1]) {
      if (happyEyes) {
        ctx.strokeStyle = C.eye;
        ctx.lineWidth = s * 0.022;
        ctx.beginPath();
        ctx.arc(side * s * 0.1, -s * 0.28, s * 0.038, Math.PI + 0.2, -0.2);
        ctx.stroke();
      } else {
        ellipse(side * s * 0.1, -s * 0.29, s * 0.035, s * 0.04, C.eye);
        circle(side * s * 0.1 + s * 0.01, -s * 0.305, s * 0.013, '#fff');
      }
      ellipse(side * s * 0.055, -s * 0.15, s * 0.08, s * 0.06, light);
    }
    ellipse(0, -s * 0.18, s * 0.035, s * 0.025, dark);
    ctx.strokeStyle = dark;
    ctx.lineWidth = s * 0.015;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.16);
    ctx.lineTo(0, -s * 0.12);
    ctx.moveTo(-s * 0.055, -s * 0.12);
    ctx.quadraticCurveTo(0, -s * 0.075, s * 0.055, -s * 0.12);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    circle(-s * 0.18, -s * 0.17, s * 0.035, '#e88478');
    circle(s * 0.18, -s * 0.17, s * 0.035, '#e88478');
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ===== Draw Cucumber =====
  function drawCucumberShape(x, y, size, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.18 + Math.sin(wobble || 0) * 0.08);

    // Main body (elongated)
    ctx.fillStyle = C.cucumberBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.17, size * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lighter belly stripe
    ctx.fillStyle = C.cucumberLight;
    ctx.beginPath();
    ctx.ellipse(-size * 0.04, 0, size * 0.08, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ridge lines along length
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = C.cucumberDark;
    ctx.lineWidth = size * 0.012;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size * 0.05, -size * 0.36);
      ctx.lineTo(i * size * 0.05, size * 0.36);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Small bump spots
    ctx.fillStyle = C.cucumberDark;
    for (let i = 0; i < 6; i++) {
      const sy = -size * 0.3 + i * size * 0.12;
      const sx = (i % 2 === 0 ? -1 : 1) * size * 0.07;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stem
    ctx.fillStyle = C.cucumberStem;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.5, size * 0.05, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tiny leaf
    ctx.fillStyle = C.carrotTop;
    ctx.beginPath();
    ctx.ellipse(size * 0.04, -size * 0.54, size * 0.05, size * 0.025, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawVeggieShape(type, x, y, size, wobble) {
    if (type === 'cucumber') drawCucumberShape(x, y, size, wobble);
    else drawCarrotShape(x, y, size, wobble);
  }

  // ===== Draw Carrot =====
  function drawCarrotShape(x, y, size, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(wobble || 0) * 0.08);

    ctx.fillStyle = C.carrotBody;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.45);
    ctx.quadraticCurveTo(-size * 0.18, size * 0.1, -size * 0.14, -size * 0.12);
    ctx.quadraticCurveTo(0, -size * 0.22, size * 0.14, -size * 0.12);
    ctx.quadraticCurveTo(size * 0.18, size * 0.1, 0, size * 0.45);
    ctx.fill();

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = C.carrotStripe;
    ctx.lineWidth = size * 0.02;
    for (let i = 0; i < 3; i++) {
      const sy = -size * 0.02 + i * size * 0.1;
      const sw = size * (0.11 - i * 0.02);
      ctx.beginPath();
      ctx.moveTo(-sw, sy);
      ctx.lineTo(sw, sy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = C.carrotTop;
    for (let a = -1; a <= 1; a++) {
      ctx.beginPath();
      ctx.ellipse(a * size * 0.06, -size * 0.32, size * 0.035, size * 0.12, a * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ===== Particles =====
  function spawnParticles(x, y, count, type) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      G.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        size: 4 + Math.random() * 6,
        type: type || 'star',
      });
    }
  }

  function updateParticles() {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.vx *= 0.99;
      p.life -= p.decay;
      if (p.life <= 0) G.particles.splice(i, 1);
    }
  }

  function drawHeart(x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.25);
    ctx.bezierCurveTo(x - size * 0.8, y - size * 0.3, x - size * 0.4, y - size * 0.9, x, y - size * 0.35);
    ctx.bezierCurveTo(x + size * 0.4, y - size * 0.9, x + size * 0.8, y - size * 0.3, x, y + size * 0.25);
    ctx.fill();
  }

  function drawStar4(x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const r = i % 2 === 0 ? size : size * 0.35;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawParticles() {
    G.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      if (p.type === 'heart') {
        ctx.fillStyle = C.heart;
        drawHeart(p.x, p.y, p.size);
      } else {
        ctx.fillStyle = C.starP;
        drawStar4(p.x, p.y, p.size);
      }
    });
    ctx.globalAlpha = 1;
  }

  // ===== Collectible Carrots =====
  function veggieHitRadius(size) { return Math.max(28, size * 1.55); }

  function veggieSpotFree(x, y, size, ignore) {
    const radius = veggieHitRadius(size);
    if (x < radius + 8 || x > canvas.width - radius - 8 || y < Math.max(84, radius + 8) || y > G.groundY - radius) return false;
    if (Math.hypot(x - G.moonX, y - G.moonY) < G.moonR + radius + 8) return false;
    if (Math.hypot(x - G.rabbit.x, y - G.rabbit.y) < radius + G.rabbit.size) return false;
    for (const name of CHARACTER_NAMES) {
      const ch = G[name];
      if (!ch.visible) continue;
      // Reserve the destination while a friend is entering, as well as its current position.
      for (const position of [ch, { x: ch.targetX, y: ch.targetY }]) {
        if (Math.hypot(x - position.x, y - position.y) < radius + ch.size * 0.95) return false;
      }
    }
    return G.carrots.every(c => c === ignore || Math.hypot(x - c.x, y - c.y) > radius + veggieHitRadius(c.size) + 8) &&
      G.flyingCarrots.every(c => Math.hypot(x - c.sx, y - c.sy) > radius + veggieHitRadius(c.size) + 8);
  }

  function spawnCarrot() {
    if (G.ending || G.endingPending || G.carrots.length >= 3 || G.score + G.flyingCarrots.length >= CARROT_GOAL) return;
    const size = Math.min(canvas.width, canvas.height) * 0.09;
    const margin = veggieHitRadius(size) + 8;
    const minY = Math.max(84, margin);
    const maxY = G.groundY - veggieHitRadius(size);
    let spot = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = margin + Math.random() * (canvas.width - margin * 2);
      const y = minY + Math.random() * Math.max(0, maxY - minY);
      if (veggieSpotFree(x, y, size)) { spot = { x, y }; break; }
    }
    // Never fall back to a position that overlaps a friend or another vegetable.
    if (!spot) {
      const spacing = margin * 2;
      for (let y = minY; y <= maxY && !spot; y += spacing) {
        for (let x = margin; x <= canvas.width - margin && !spot; x += spacing) {
          if (veggieSpotFree(x, y, size)) spot = { x, y };
        }
      }
    }
    if (!spot) { G.lastCarrotTime = performance.now(); return; }
    const type = Math.random() < 0.5 ? 'cucumber' : 'carrot';
    G.carrots.push({ ...spot, size, scale: 0, wobble: Math.random() * Math.PI * 2, type });
  }

  // ===== Flying Carrot Animation =====
  function updateFlyingCarrots(dt) {
    for (let i = G.flyingCarrots.length - 1; i >= 0; i--) {
      const fc = G.flyingCarrots[i];
      fc.t += dt * 2.8;
      if (fc.t >= 1) {
        G.flyingCarrots.splice(i, 1);
        onCarrotEaten();
      }
    }
  }

  function drawFlyingCarrots() {
    G.flyingCarrots.forEach(fc => {
      const t = fc.t;
      const ex = G.rabbit.x, ey = G.rabbit.y - G.rabbit.size * 0.15;
      const cpY = Math.min(fc.sy, ey) - 120;

      const mt = 1 - t;
      const x = mt * mt * fc.sx + 2 * mt * t * ((fc.sx + ex) / 2) + t * t * ex;
      const y = mt * mt * fc.sy + 2 * mt * t * cpY + t * t * ey;

      const scale = 1 - t * 0.6;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 1 - t * 0.3;
      drawVeggieShape(fc.type || 'carrot', 0, 0, fc.size * 0.6, t * 15);
      ctx.globalAlpha = 1;
      ctx.restore();

      if (Math.random() < 0.4) {
        G.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 0.6, decay: 0.03,
          size: 3 + Math.random() * 3,
          type: 'star',
        });
      }
    });
  }

  // ===== Score Display =====
  function drawScore() {
    if (G.score === 0) return;
    const s = Math.min(canvas.width, canvas.height) * 0.035;
    const x = 20, y = 20;

    drawCarrotShape(x + s * 0.4, y + s * 0.5, s * 1.1, 0);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${s}px -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85;
    ctx.fillText(G.score, x + s * 1.2, y + s * 0.55);
    ctx.globalAlpha = 1;
  }

  // ===== Start / End Screens =====
  function drawStartText(t) {
    const w = canvas.width, h = canvas.height;
    const alpha = 0.5 + Math.sin(t * 2.5) * 0.3;
    const fontSize = Math.min(w, h) * 0.045;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.moon;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('터치해서 시작!', w / 2, h * 0.55);
    ctx.globalAlpha = 1;
  }

  function drawEndingText(t) {
    if (G.endingPhase !== 'done') return;
    const w = canvas.width, h = canvas.height;
    const fontSize = Math.min(w, h) * 0.05;
    const alpha = 0.5 + Math.sin(t * 2.5) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.moon;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('한번 더!', w / 2, h * 0.9);
    ctx.globalAlpha = 1;
  }

  // ===== Fly to Moon Logic =====
  function startFlyToMoon() {
    if (G.ending) return;
    G.ending = true;
    G.endingPending = false;
    G.endingTime = 0;
    G.endingPhase = 'flying';
    G.carrots = [];
    G.flyingCarrots = [];
    G.spawnTimes = [];
    ['rabbit', ...CHARACTER_NAMES].forEach(name => {
      const ch = G[name];
      if (name !== 'rabbit') {
        ch.x = ch.targetX;
        ch.y = ch.targetY;
        ch.enter = 1;
        ch.react = 0;
      }
      G[flightKey(name)] = { x: ch.x, y: ch.y, startX: ch.x, startY: ch.y };
      clampFlight(name, G[flightKey(name)]);
    });
    G.rabbit.happy = 10;
    G.rabbit.bounce = 0;
    playFlyToMoonSong();
  }

  function updateEnding(dt, now) {
    G.endingTime += dt;
    const type = G.endingType || 'arc';
    const { moonX, moonY } = G.endingLayout;
    const moonR = G.moonR;

    if (G.endingPhase === 'flying') {
      const duration = type === 'float' ? 5 : 4;
      const p = easeInOutCubic(Math.min(1, G.endingTime / duration));

      const arcH = canvas.height * 0.25;
      ['rabbit', ...CHARACTER_NAMES].forEach((name, i) => {
        if (name !== 'rabbit' && !G[name].visible) return;
        const flight = G[flightKey(name)];
        const target = G.endingLayout.targets[name];
        const pos = flightPos(flight.startX, flight.startY, target.x, target.y, p,
          arcH * (0.85 + (i % 3) * 0.08), type, i * 1.2);
        flight.x = pos.x;
        flight.y = pos.y;
        clampFlight(name, flight);
      });

      // Trail particles - style varies per ending type
      const trailType = (type === 'float' || type === 'spiral') ? 'heart' : 'star';
      const trailAlt = trailType === 'heart' ? 'star' : 'heart';

      function trail(fx, fy, sz, rate, pt) {
        if (Math.random() < rate) {
          const vx = type === 'spiral' ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 2;
          const vy = type === 'bounce' ? -1 - Math.random() * 2 : 1 + Math.random() * 2;
          G.particles.push({ x: fx, y: fy + sz * 0.25, vx, vy,
            life: 0.8, decay: 0.02, size: 3 + Math.random() * 4, type: pt });
        }
      }
      ['rabbit', ...CHARACTER_NAMES].forEach((name, i) => {
        if (name !== 'rabbit' && !G[name].visible) return;
        const f = G[flightKey(name)];
        trail(f.x, f.y, G[name].size, 0.4, i % 2 ? trailAlt : trailType);
      });

      G.rabbit.happy = 10;

      if (G.endingTime >= duration) {
        G.endingPhase = 'celebrating';
        G.endingTime = 0;
        // Arrival burst varies per type
        if (type === 'spiral') {
          // ring explosion outward
          for (let i = 0; i < 30; i++) {
            const a = (Math.PI * 2 * i) / 30;
            G.particles.push({ x: moonX, y: moonY,
              vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
              life: 1, decay: 0.015, size: 5 + Math.random() * 4, type: i % 2 === 0 ? 'star' : 'heart' });
          }
        } else if (type === 'bounce') {
          // upward pop fountain
          for (let i = 0; i < 40; i++) {
            G.particles.push({ x: moonX + (Math.random() - 0.5) * moonR * 2, y: moonY,
              vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 5,
              life: 1, decay: 0.012, size: 4 + Math.random() * 5, type: 'heart' });
          }
        } else if (type === 'float') {
          // gentle shower from above
          for (let i = 0; i < 35; i++) {
            G.particles.push({ x: moonX + (Math.random() - 0.5) * moonR * 4,
              y: moonY - moonR * 2 - Math.random() * moonR,
              vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2,
              life: 1, decay: 0.01, size: 4 + Math.random() * 4, type: i % 3 === 0 ? 'star' : 'heart' });
          }
        } else {
          // arc: classic burst
          spawnParticles(moonX, moonY, 25, 'heart');
          spawnParticles(moonX, moonY, 25, 'star');
        }
      }
    }

    if (G.endingPhase === 'celebrating') {
      G.rabbit.happy = 10;
      G.rabbit.bounce = Math.max(0.5, G.rabbit.bounce);

      // Ongoing celebration effects vary per type
      if (type === 'spiral') {
        // Particles spiral outward continuously
        if (Math.random() < 0.4) {
          const a = G.endingTime * 4 + Math.random() * Math.PI;
          const r = moonR * (0.5 + Math.random());
          G.particles.push({ x: moonX + Math.cos(a) * r, y: moonY + Math.sin(a) * r,
            vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
            life: 0.8, decay: 0.02, size: 4 + Math.random() * 4, type: Math.random() < 0.5 ? 'star' : 'heart' });
        }
      } else if (type === 'bounce') {
        // Particles pop up repeatedly like popcorn
        if (Math.sin(G.endingTime * 6) > 0.5 && Math.random() < 0.6) {
          G.particles.push({
            x: moonX + (Math.random() - 0.5) * moonR * 3,
            y: moonY + moonR,
            vx: (Math.random() - 0.5) * 2, vy: -4 - Math.random() * 4,
            life: 0.9, decay: 0.02, size: 4 + Math.random() * 5, type: 'heart' });
        }
      } else if (type === 'float') {
        // Gentle hearts/stars drift down like snow
        if (Math.random() < 0.35) {
          G.particles.push({
            x: moonX + (Math.random() - 0.5) * moonR * 5,
            y: moonY - moonR * 2,
            vx: (Math.random() - 0.5) * 1, vy: 0.5 + Math.random() * 1.5,
            life: 1, decay: 0.01, size: 3 + Math.random() * 4, type: Math.random() < 0.6 ? 'heart' : 'star' });
        }
      } else {
        // arc: random bursts
        if (Math.sin(G.endingTime * 3) > 0.7 && Math.random() < 0.5) {
          spawnParticles(
            moonX + (Math.random() - 0.5) * moonR * 3,
            moonY + (Math.random() - 0.5) * moonR * 2,
            5, Math.random() < 0.5 ? 'heart' : 'star'
          );
        }
      }

      if (G.endingTime >= 5) {
        G.endingPhase = 'done';
        G.endingTime = 0;
      }
    }
  }

  function resetGame() {
    G.score = 0;
    G.ending = false;
    G.endingPending = false;
    G.endingStartAt = 0;
    G.endingTime = 0;
    G.endingPhase = '';
    G.endingType = null;
    G.carrots = [];
    G.flyingCarrots = [];
    G.spawnTimes = [];
    G.particles = [];
    G.celebrating = 0;
    G.dimming = 0;
    shuffleCharacterOrder();
    G.rabbit.bounce = 0;
    G.rabbit.happy = 0;
    G.rabbit.eating = 0;
    CHARACTER_NAMES.forEach(name => {
      G[name].visible = false;
      G[name].enter = 0;
      G[name].react = 0;
      G[flightKey(name)] = { x: 0, y: 0 };
    });
    layout();
    G.lastCarrotTime = performance.now();
    spawnCarrot();
  }

  // ===== Game Logic =====
  function onCarrotEaten() {
    if (G.ending || G.endingPending || G.score >= CARROT_GOAL) return;
    const r = G.rabbit;
    r.eating = 1;
    r.happy = 3;
    r.bounce = 1;
    G.score++;
    playMunch();
    spawnParticles(r.x, r.y - r.size * 0.3, 8, 'heart');

    G.characterOrder.forEach((name, i) => {
      if (G.score >= FRIEND_THRESHOLDS[i] && !G[name].visible) spawnCharacterByName(name);
    });
    if (G.score === CARROT_GOAL) {
      G.endingType = ENDING_TYPES[Math.floor(Math.random() * ENDING_TYPES.length)];
      G.endingPending = true;
      G.endingStartAt = performance.now() + 800;
      G.carrots = [];
      G.spawnTimes = [];
    }
    G.lastCarrotTime = performance.now();
  }

  function handleTap(px, py) {
    ensureAudio();

    if (!G.started) {
      G.started = true;
      startBGM();
      spawnCarrot();
      return;
    }

    if (G.endingPhase === 'done') {
      resetGame();
      return;
    }

    if (G.ending || G.endingPending) return;

    // Check carrot hits FIRST (fixes clicks near moon)
    for (let i = G.carrots.length - 1; i >= 0; i--) {
      const c = G.carrots[i];
      if (c.scale < 0.35) continue;
      const dist = Math.hypot(px - c.x, py - c.y);
      if (dist < veggieHitRadius(c.size) && G.score + G.flyingCarrots.length < CARROT_GOAL) {
        playPop();
        playSparkle();
        spawnParticles(c.x, c.y, 6, 'star');
        G.flyingCarrots.push({ sx: c.x, sy: c.y, size: c.size, t: 0, type: c.type });
        G.carrots.splice(i, 1);
        return;
      }
    }

    // Tap the moon (moon rabbit) → dim the screen
    if (Math.hypot(px - G.moonX, py - G.moonY) < G.moonR * 1.3) {
      G.dimming = 1;
      playSparkle();
      spawnParticles(G.moonX, G.moonY, 8, 'star');
      return;
    }

    // Tap characters
    const r = G.rabbit;
    if (Math.hypot(px - r.x, py - r.y) < r.size * 0.5) {
      r.bounce = 1;
      r.happy = 2;
      playSparkle();
      spawnParticles(r.x, r.y - r.size * 0.3, 5, 'heart');
      return;
    }

    for (const name of CHARACTER_NAMES) {
      const ch = G[name];
      if (!ch.visible || ch.enter < 0.5) continue;
      if (Math.hypot(px - ch.x, py - ch.y) < Math.max(24, ch.size * 0.65)) {
        ch.react = 1;
        if (name === 'lion') playLionRoar();
        else playSparkle();
        spawnParticles(ch.x, ch.y - ch.size * 0.2, 7, CHARACTER_SPEC[name].particle);
        return;
      }
    }
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    handleTap(e.clientX, e.clientY);
  });

  // ===== Update =====
  let lastTime = performance.now();

  function update(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    G.time = now / 1000;

    if (!G.started) return;

    // BGM scheduling
    scheduleBGM();

    // Dimming decay
    if (G.dimming > 0) G.dimming = Math.max(0, G.dimming - dt * 0.3);

    if (G.ending) {
      updateEnding(dt, now);
      const r = G.rabbit;
      if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 3);
      if (r.happy > 0) r.happy = Math.max(0, r.happy - dt * 0.5);
      if (r.eating > 0) r.eating = Math.max(0, r.eating - dt * 2.5);
      updateParticles();
      return;
    }

    // Normal game
    const r = G.rabbit;
    if (r.bounce > 0) r.bounce = Math.max(0, r.bounce - dt * 3);
    if (r.happy > 0) r.happy = Math.max(0, r.happy - dt * 1.5);
    if (r.eating > 0) r.eating = Math.max(0, r.eating - dt * 2.5);

    CHARACTER_NAMES.forEach(name => {
      const ch = G[name];
      if (!ch.visible) return;
      ch.enter = Math.min(1, ch.enter + dt * 1.5);
      const speed = CHARACTER_SPEC[name].from === 'top' ? 3 : 2.2;
      ch.x += (ch.targetX - ch.x) * Math.min(1, dt * speed);
      ch.y += (ch.targetY - ch.y) * Math.min(1, dt * speed);
      ch.react = Math.max(0, ch.react - dt * 1.8);
    });
    if (G.endingPending) {
      if (now >= G.endingStartAt) startFlyToMoon();
      updateParticles();
      return;
    }
    const scheduled = G.spawnTimes.filter(time => time <= now);
    G.spawnTimes = G.spawnTimes.filter(time => time > now);
    scheduled.forEach(() => spawnCarrot());

    if (G.celebrating > 0) {
      G.celebrating -= dt;
      r.happy = Math.max(r.happy, 2);
      r.bounce = Math.max(r.bounce, 0.5);
    }

    if (G.carrots.length === 0 && G.flyingCarrots.length === 0 && !G.ending) {
      if (now - G.lastCarrotTime > G.carrotDelay) {
        spawnCarrot();
        if (G.score > 2 && Math.random() < 0.4) {
          G.spawnTimes.push(now + 200);
        }
        if (G.score > 6 && Math.random() < 0.3) {
          G.spawnTimes.push(now + 400);
        }
      }
    }

    G.carrots.forEach(c => {
      c.scale = Math.min(1, c.scale + dt * 5);
      c.wobble += dt * 3;
    });

    updateFlyingCarrots(dt);
    updateParticles();
  }

  // ===== Draw =====
  function draw() {
    const t = G.time;

    drawSky();
    drawStarsBackground(t);
    drawMoon(t);
    drawGround();

    if (!G.started) {
      drawRabbit(t);
      drawStartText(t);
      return;
    }

    if (G.ending) {
      drawCharacters(t);
      drawParticles();
      drawScore();
      drawEndingText(t);
      return;
    }

    // Normal game
    G.carrots.forEach(c => {
      if (c.scale <= 0) return;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.globalAlpha = 0.12 + Math.sin(c.wobble * 2) * 0.04;
      const glowColor = c.type === 'cucumber' ? '#8ae070' : '#ffa040';
      circle(0, 0, c.size * 0.7, glowColor);
      ctx.globalAlpha = 1;
      drawVeggieShape(c.type || 'carrot', 0, 0, c.size, c.wobble);
      ctx.restore();
    });

    drawCharacters(t);
    drawFlyingCarrots();
    drawParticles();
    drawScore();
  }

  function drawDimOverlay() {
    if (G.dimming <= 0) return;
    ctx.globalAlpha = G.dimming * 0.55;
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    // Stars glow brighter when dimmed
    if (G.dimming > 0.3) {
      const extra = (G.dimming - 0.3) * 1.4;
      G.stars.forEach(s => {
        ctx.globalAlpha = extra * 0.5;
        circle(s.x * canvas.width, s.y * canvas.height, s.r * 2.5, '#aaccff');
      });
      ctx.globalAlpha = 1;
    }
  }

  // ===== Main Loop =====
  function loop(now) {
    update(now);
    draw();
    drawDimOverlay();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
