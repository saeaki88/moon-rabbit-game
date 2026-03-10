(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
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
    eye: '#1a1a2e',
    carrotBody: '#e8863a',
    carrotTop: '#4a8a5a',
    carrotStripe: '#d07530',
    heart: '#e87080',
    starP: '#ffd780',
  };

  // ===== Audio =====
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq, dur, type, vol, ramp) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
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
      gain.connect(audioCtx.destination);
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

  function playFanfare() {
    if (!audioCtx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const t = audioCtx.currentTime + i * 0.14;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(audioCtx.destination);
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
      gain.connect(audioCtx.destination);
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
        gain2.connect(audioCtx.destination);
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
        gain.connect(audioCtx.destination);
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
    if (bgmPlaying) return;
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
    lastCarrotTime: 0,
    carrotDelay: 1200,
    celebrating: 0,
    rabbit: { x: 0, y: 0, size: 0, bounce: 0, happy: 0, eating: 0 },
    turtle: { visible: false, x: 0, y: 0, size: 0, enter: 0, targetX: 0 },
    squid: { visible: false, x: 0, y: 0, size: 0, enter: 0, targetY: 0 },
    cat: { visible: false, x: 0, y: 0, size: 0, enter: 0, targetX: 0 },
    duck: { visible: false, x: 0, y: 0, size: 0, enter: 0, targetX: 0 },
    groundY: 0,
    moonX: 0, moonY: 0, moonR: 0,
    ending: false,
    endingTime: 0,
    endingPhase: '',
    flightRabbit: { x: 0, y: 0 },
    flightTurtle: { x: 0, y: 0 },
    flightSquid: { x: 0, y: 0 },
    flightCat: { x: 0, y: 0 },
    flightDuck: { x: 0, y: 0 },
    dimming: 0, // screen darkness when moon rabbit is tapped
  };

  for (let i = 0; i < 70; i++) {
    G.stars.push({
      x: Math.random(),
      y: Math.random() * 0.6,
      r: Math.random() * 1.8 + 0.4,
      speed: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // ===== Layout =====
  function layout() {
    const w = canvas.width, h = canvas.height;
    G.groundY = h * 0.78;
    G.moonR = Math.min(w, h) * 0.13;
    G.moonX = w * 0.82;
    G.moonY = h * 0.14;

    const s = Math.min(w, h) * 0.13;
    G.rabbit.size = s;
    G.rabbit.x = w * 0.5;
    G.rabbit.y = G.groundY - s * 0.15;

    G.turtle.size = s * 1.1;
    G.turtle.targetX = w * 0.2;
    G.turtle.y = G.groundY + G.turtle.size * 0.05;

    G.squid.size = s * 0.8;
    G.squid.x = w * 0.78;
    G.squid.targetY = G.groundY - G.squid.size * 1.5;

    G.cat.size = s * 0.9;
    G.cat.targetX = w * 0.72;
    G.cat.y = G.groundY - G.cat.size * 0.05;

    G.duck.size = s * 0.85;
    G.duck.targetX = w * 0.35;
    G.duck.y = G.groundY + G.duck.size * 0.05;

  }
  layout();
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
    }
    if (G.ending && (G.endingPhase === 'celebrating' || G.endingPhase === 'done')) {
      mr = G.moonR * 1.6;
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

  // ===== Moon Rabbit (friend on the moon) - BIGGER =====
  function drawMoonRabbit(mx, my, mr, t) {
    const s = mr * 0.55;
    const bobY = Math.sin(t * 1.5) * s * 0.05;

    ctx.save();
    ctx.translate(mx - mr * 0.1, my - mr * 0.15 + bobY);

    // During ending celebration, moon rabbit bounces excitedly
    const excitedBounce = (G.ending && G.endingPhase === 'celebrating')
      ? Math.abs(Math.sin(t * 8)) * s * 0.3 : 0;
    ctx.translate(0, -excitedBounce);

    // Body
    ellipse(0, 0, s * 0.35, s * 0.38, C.moonDark);
    ellipse(0, s * 0.03, s * 0.22, s * 0.25, C.moon);

    // Ears
    ctx.save();
    ctx.translate(-s * 0.1, -s * 0.35);
    ctx.rotate(-0.2);
    ellipse(0, -s * 0.2, s * 0.07, s * 0.22, C.moonDark);
    ellipse(0, -s * 0.2, s * 0.04, s * 0.16, '#d4a0a0');
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.08, -s * 0.35);
    ctx.rotate(0.15);
    ellipse(0, -s * 0.2, s * 0.07, s * 0.22, C.moonDark);
    ellipse(0, -s * 0.2, s * 0.04, s * 0.16, '#d4a0a0');
    ctx.restore();

    // Arms waving hello
    const armWave = Math.sin(t * 2.5) * 0.3;
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
    ctx.globalAlpha = 0.2;
    circle(-s * 0.14, s * 0.0, s * 0.04, '#c09080');
    circle(s * 0.14, s * 0.0, s * 0.04, '#c09080');
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

    // Feet
    ellipse(-s * 0.1, s * 0.3, s * 0.08, s * 0.04, C.moonDark);
    ellipse(s * 0.1, s * 0.3, s * 0.08, s * 0.04, C.moonDark);

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

    // Cheeks
    ctx.globalAlpha = 0.25;
    circle(-s * 0.17, -s * 0.07, s * 0.055, C.rabbitCheek);
    circle(s * 0.17, -s * 0.07, s * 0.055, C.rabbitCheek);
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

  function drawTurtle(t) {
    const tr = G.turtle;
    if (!tr.visible) return;
    if (G.ending) {
      drawTurtleAt(G.flightTurtle.x, G.flightTurtle.y, tr.size, t, tr.enter);
    } else {
      drawTurtleAt(tr.x, tr.y, tr.size, t, tr.enter);
    }
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

  function drawSquid(t) {
    const sq = G.squid;
    if (!sq.visible) return;
    if (G.ending) {
      drawSquidAt(G.flightSquid.x, G.flightSquid.y, sq.size, t, sq.enter);
    } else {
      drawSquidAt(sq.x, sq.y, sq.size, t, sq.enter);
    }
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

  function drawCat(t) {
    const c = G.cat;
    if (!c.visible) return;
    if (G.ending) {
      drawCatAt(G.flightCat.x, G.flightCat.y, c.size, t, c.enter);
    } else {
      drawCatAt(c.x, c.y, c.size, t, c.enter);
    }
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

  function drawDuck(t) {
    const d = G.duck;
    if (!d.visible) return;
    if (G.ending) {
      drawDuckAt(G.flightDuck.x, G.flightDuck.y, d.size, t, d.enter);
    } else {
      drawDuckAt(d.x, d.y, d.size, t, d.enter);
    }
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
  function spawnCarrot() {
    if (G.ending) return;
    const w = canvas.width, h = canvas.height;
    const size = Math.min(w, h) * 0.09;
    const margin = size * 1.2;

    let x, y, ok = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      x = margin + Math.random() * (w - margin * 2);
      y = margin + Math.random() * (G.groundY - margin * 2.5);
      const distR = Math.hypot(x - G.rabbit.x, y - G.rabbit.y);
      const distT = G.turtle.visible ? Math.hypot(x - G.turtle.x, y - G.turtle.y) : 999;
      const distS = G.squid.visible ? Math.hypot(x - G.squid.x, y - G.squid.y) : 999;
      const distC = G.cat.visible ? Math.hypot(x - G.cat.x, y - G.cat.y) : 999;
      const distD = G.duck.visible ? Math.hypot(x - G.duck.x, y - G.duck.y) : 999;
      if (distR > size * 2.5 && distT > size * 2 && distS > size * 2 && distC > size * 2 && distD > size * 2) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      x = margin + Math.random() * (w - margin * 2);
      y = margin * 1.5;
    }

    G.carrots.push({ x, y, size, scale: 0, wobble: Math.random() * Math.PI * 2 });
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
      drawCarrotShape(0, 0, fc.size * 0.6, t * 15);
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
    const alpha = 0.5 + Math.sin(t * 2.5) * 0.3;
    const fontSize = Math.min(w, h) * 0.05;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.moon;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('한번 더!', w / 2, h * 0.65);
    ctx.globalAlpha = 1;
  }

  // ===== Fly to Moon Logic =====
  function startFlyToMoon() {
    G.ending = true;
    G.endingTime = 0;
    G.endingPhase = 'flying';
    G.carrots = [];
    G.flyingCarrots = [];

    G.flightRabbit = { x: G.rabbit.x, y: G.rabbit.y, startX: G.rabbit.x, startY: G.rabbit.y };
    G.flightTurtle = { x: G.turtle.x, y: G.turtle.y, startX: G.turtle.x, startY: G.turtle.y };
    G.flightSquid = { x: G.squid.x, y: G.squid.y, startX: G.squid.x, startY: G.squid.y };
    G.flightCat = { x: G.cat.x, y: G.cat.y, startX: G.cat.x, startY: G.cat.y };
    G.flightDuck = { x: G.duck.x, y: G.duck.y, startX: G.duck.x, startY: G.duck.y };
    G.rabbit.happy = 10;
    G.rabbit.bounce = 0;

    playFlyToMoonSong();
  }

  function updateEnding(dt, now) {
    G.endingTime += dt;

    if (G.endingPhase === 'flying') {
      const duration = 4;
      const p = easeInOutCubic(Math.min(1, G.endingTime / duration));

      const targetRX = G.moonX - G.moonR * 0.5;
      const targetRY = G.moonY + G.moonR * 0.6;
      const targetTX = G.moonX - G.moonR * 1.5;
      const targetTY = G.moonY + G.moonR * 0.3;
      const targetSX = G.moonX + G.moonR * 0.8;
      const targetSY = G.moonY - G.moonR * 0.3;
      const targetCX = G.moonX + G.moonR * 1.3;
      const targetCY = G.moonY + G.moonR * 0.5;
      const targetDX = G.moonX - G.moonR * 1.8;
      const targetDY = G.moonY - G.moonR * 0.1;
      const arcHeight = canvas.height * 0.3;

      G.flightRabbit.x = G.flightRabbit.startX + (targetRX - G.flightRabbit.startX) * p;
      G.flightRabbit.y = G.flightRabbit.startY + (targetRY - G.flightRabbit.startY) * p
        - Math.sin(p * Math.PI) * arcHeight;

      G.flightTurtle.x = G.flightTurtle.startX + (targetTX - G.flightTurtle.startX) * p;
      G.flightTurtle.y = G.flightTurtle.startY + (targetTY - G.flightTurtle.startY) * p
        - Math.sin(p * Math.PI) * arcHeight * 0.8;

      G.flightSquid.x = G.flightSquid.startX + (targetSX - G.flightSquid.startX) * p;
      G.flightSquid.y = G.flightSquid.startY + (targetSY - G.flightSquid.startY) * p
        - Math.sin(p * Math.PI) * arcHeight * 1.1;

      G.flightCat.x = G.flightCat.startX + (targetCX - G.flightCat.startX) * p;
      G.flightCat.y = G.flightCat.startY + (targetCY - G.flightCat.startY) * p
        - Math.sin(p * Math.PI) * arcHeight * 0.9;

      G.flightDuck.x = G.flightDuck.startX + (targetDX - G.flightDuck.startX) * p;
      G.flightDuck.y = G.flightDuck.startY + (targetDY - G.flightDuck.startY) * p
        - Math.sin(p * Math.PI) * arcHeight * 1.0;

      // Trail particles
      if (Math.random() < 0.5) {
        G.particles.push({
          x: G.flightRabbit.x, y: G.flightRabbit.y + G.rabbit.size * 0.3,
          vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          life: 0.8, decay: 0.02, size: 3 + Math.random() * 4, type: 'star',
        });
      }
      if (G.turtle.visible && Math.random() < 0.4) {
        G.particles.push({
          x: G.flightTurtle.x, y: G.flightTurtle.y + G.turtle.size * 0.2,
          vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          life: 0.7, decay: 0.02, size: 3 + Math.random() * 3, type: 'star',
        });
      }
      if (G.squid.visible && Math.random() < 0.4) {
        G.particles.push({
          x: G.flightSquid.x, y: G.flightSquid.y + G.squid.size * 0.2,
          vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          life: 0.7, decay: 0.02, size: 3 + Math.random() * 3, type: 'heart',
        });
      }
      if (G.cat.visible && Math.random() < 0.4) {
        G.particles.push({
          x: G.flightCat.x, y: G.flightCat.y + G.cat.size * 0.2,
          vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          life: 0.7, decay: 0.02, size: 3 + Math.random() * 3, type: 'star',
        });
      }
      if (G.duck.visible && Math.random() < 0.4) {
        G.particles.push({
          x: G.flightDuck.x, y: G.flightDuck.y + G.duck.size * 0.2,
          vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          life: 0.7, decay: 0.02, size: 3 + Math.random() * 3, type: 'heart',
        });
      }
      G.rabbit.happy = 10;

      if (G.endingTime >= duration) {
        G.endingPhase = 'celebrating';
        G.endingTime = 0;
        spawnParticles(G.moonX, G.moonY, 25, 'heart');
        spawnParticles(G.moonX, G.moonY, 25, 'star');
      }
    }

    if (G.endingPhase === 'celebrating') {
      G.rabbit.happy = 10;
      G.rabbit.bounce = Math.max(0.5, G.rabbit.bounce);

      if (Math.sin(G.endingTime * 3) > 0.8) {
        if (Math.random() < 0.3) {
          spawnParticles(
            G.moonX + (Math.random() - 0.5) * G.moonR * 3,
            G.moonY + (Math.random() - 0.5) * G.moonR * 2,
            3, Math.random() < 0.5 ? 'heart' : 'star'
          );
        }
      }

      if (G.endingTime >= 4) {
        G.endingPhase = 'done';
        G.endingTime = 0;
      }
    }
  }

  function resetGame() {
    G.score = 0;
    G.ending = false;
    G.endingTime = 0;
    G.endingPhase = '';
    G.carrots = [];
    G.flyingCarrots = [];
    G.particles = [];
    G.celebrating = 0;
    G.rabbit.bounce = 0;
    G.rabbit.happy = 0;
    G.rabbit.eating = 0;
    G.turtle.visible = false;
    G.turtle.enter = 0;
    G.squid.visible = false;
    G.squid.enter = 0;
    G.cat.visible = false;
    G.cat.enter = 0;
    G.duck.visible = false;
    G.duck.enter = 0;
    layout();
    G.lastCarrotTime = performance.now();
    spawnCarrot();
  }

  // ===== Game Logic =====
  function onCarrotEaten() {
    const r = G.rabbit;
    r.eating = 1;
    r.happy = 3;
    r.bounce = 1;
    G.score++;
    playMunch();
    spawnParticles(r.x, r.y - r.size * 0.3, 8, 'heart');

    if (G.score === 3 && !G.turtle.visible) {
      G.turtle.visible = true;
      G.turtle.enter = 0;
      G.turtle.x = -G.turtle.size;
      playFanfare();
    }
    if (G.score === 6 && !G.squid.visible) {
      G.squid.visible = true;
      G.squid.enter = 0;
      G.squid.y = -G.squid.size * 2;
      playFanfare();
    }
    if (G.score === 9 && !G.cat.visible) {
      G.cat.visible = true;
      G.cat.enter = 0;
      G.cat.x = canvas.width + G.cat.size;
      playFanfare();
    }
    if (G.score === 12 && !G.duck.visible) {
      G.duck.visible = true;
      G.duck.enter = 0;
      G.duck.x = -G.duck.size * 2;
      playFanfare();
    }

    if (G.score === 15) {
      setTimeout(() => startFlyToMoon(), 800);
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

    if (G.ending) return;

    // Tap the moon (moon rabbit) → dim the screen
    if (Math.hypot(px - G.moonX, py - G.moonY) < G.moonR * 1.3) {
      G.dimming = 1;
      playSparkle();
      spawnParticles(G.moonX, G.moonY, 8, 'star');
      return;
    }

    // Check carrot hits
    for (let i = G.carrots.length - 1; i >= 0; i--) {
      const c = G.carrots[i];
      if (c.scale < 0.5) continue;
      const dist = Math.hypot(px - c.x, py - c.y);
      if (dist < c.size * 1.3) {
        playPop();
        playSparkle();
        spawnParticles(c.x, c.y, 6, 'star');
        G.flyingCarrots.push({ sx: c.x, sy: c.y, size: c.size, t: 0 });
        G.carrots.splice(i, 1);
        return;
      }
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

    if (G.turtle.visible) {
      const tr = G.turtle;
      if (Math.hypot(px - tr.x, py - tr.y) < tr.size * 0.5) {
        playSparkle();
        spawnParticles(tr.x, tr.y - tr.size * 0.2, 5, 'star');
        return;
      }
    }

    if (G.squid.visible) {
      const sq = G.squid;
      if (Math.hypot(px - sq.x, py - sq.y) < sq.size * 0.5) {
        playSparkle();
        spawnParticles(sq.x, sq.y - sq.size * 0.2, 5, 'heart');
        return;
      }
    }

    if (G.cat.visible) {
      const ct = G.cat;
      if (Math.hypot(px - ct.x, py - ct.y) < ct.size * 0.5) {
        playSparkle();
        spawnParticles(ct.x, ct.y - ct.size * 0.2, 5, 'heart');
        return;
      }
    }

    if (G.duck.visible) {
      const dk = G.duck;
      if (Math.hypot(px - dk.x, py - dk.y) < dk.size * 0.5) {
        playSparkle();
        spawnParticles(dk.x, dk.y - dk.size * 0.2, 5, 'star');
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

    if (G.turtle.visible) {
      if (G.turtle.enter < 1) G.turtle.enter += dt * 1.2;
      G.turtle.x += (G.turtle.targetX - G.turtle.x) * Math.min(1, dt * 1.5);
    }

    if (G.squid.visible) {
      if (G.squid.enter < 1) G.squid.enter += dt * 1.2;
      G.squid.y += (G.squid.targetY - G.squid.y) * Math.min(1, dt * 3);
    }

    if (G.cat.visible) {
      if (G.cat.enter < 1) G.cat.enter += dt * 1.2;
      G.cat.x += (G.cat.targetX - G.cat.x) * Math.min(1, dt * 1.5);
    }

    if (G.duck.visible) {
      if (G.duck.enter < 1) G.duck.enter += dt * 1.2;
      G.duck.x += (G.duck.targetX - G.duck.x) * Math.min(1, dt * 1.5);
    }

    if (G.celebrating > 0) {
      G.celebrating -= dt;
      r.happy = Math.max(r.happy, 2);
      r.bounce = Math.max(r.bounce, 0.5);
    }

    if (G.carrots.length === 0 && G.flyingCarrots.length === 0 && !G.ending) {
      if (now - G.lastCarrotTime > G.carrotDelay) {
        spawnCarrot();
        if (G.score > 3 && Math.random() < 0.3) {
          setTimeout(spawnCarrot, 400);
        }
        if (G.score > 8 && Math.random() < 0.2) {
          setTimeout(spawnCarrot, 800);
        }
      }
    }

    G.carrots.forEach(c => {
      c.scale = Math.min(1, c.scale + dt * 2.5);
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
      drawTurtle(t);
      drawDuck(t);
      drawRabbit(t);
      drawCat(t);
      drawSquid(t);
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
      circle(0, 0, c.size * 0.7, '#ffa040');
      ctx.globalAlpha = 1;
      drawCarrotShape(0, 0, c.size, c.wobble);
      ctx.restore();
    });

    drawTurtle(t);
    drawDuck(t);
    drawRabbit(t);
    drawCat(t);
    drawSquid(t);
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
