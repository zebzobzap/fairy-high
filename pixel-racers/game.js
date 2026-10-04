(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const questText = document.getElementById('questText');
  const statusText = document.getElementById('statusText');
  const restartButton = document.getElementById('restartButton');
  const throwButton = document.getElementById('throwButton');
  const moveButtons = [...document.querySelectorAll('[data-key]')];
  const garagePanel = document.getElementById('garagePanel');
  const garageChoices = document.getElementById('garageChoices');

  const SCALE = 2;
  const W = 320;
  const H = 180;
  const TOTAL_TIME = 360;
  const BALL_TIME = 300;
  const TRACK = { cx: 160, cy: 90, rx: 116, ry: 61, halfWidth: 16 };
  const keys = new Set();

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.imageSmoothingEnabled = false;

  const colours = {
    grass: '#68bd54',
    grassDark: '#4e9f41',
    grassLight: '#8bd06d',
    road: '#59616b',
    roadDark: '#414852',
    roadLight: '#717a85',
    line: '#f8e7a7',
    kerbA: '#fff3d1',
    kerbB: '#e34b4b',
    outline: '#1d2733',
    white: '#fffaf0',
    black: '#111820',
    yellow: '#ffd441',
    orange: '#f58a33',
    blue: '#3f80e8',
    red: '#e44646',
    green: '#39a96b',
    pink: '#e75ba7',
    purple: '#8d62d8',
    cyan: '#45c4d8',
    dust: '#d7c58a'
  };

  const CAR_TYPES = [
    { name: 'Red Rocket', body: colours.red, stripe: '#ffd6d6' },
    { name: 'Blue Buggy', body: colours.blue, stripe: '#cfe6ff' },
    { name: 'Yellow Zapper', body: colours.yellow, stripe: '#fff7bf' },
    { name: 'Green Machine', body: colours.green, stripe: '#c9f4dc' },
    { name: 'Pink Popper', body: colours.pink, stripe: '#ffd7ef' },
    { name: 'Purple Van', body: colours.purple, stripe: '#e6d7ff' }
  ];

  const NPC_NAMES = ['BEEP', 'ZOOM', 'BOP'];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const wrapAngle = value => {
    let a = value;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function trackPoint(t) {
    return {
      x: TRACK.cx + Math.cos(t) * TRACK.rx,
      y: TRACK.cy + Math.sin(t) * TRACK.ry
    };
  }

  function trackTangent(t) {
    return Math.atan2(TRACK.ry * Math.cos(t), -TRACK.rx * Math.sin(t));
  }

  function nearestTrackInfo(x, y) {
    const t = Math.atan2((y - TRACK.cy) / TRACK.ry, (x - TRACK.cx) / TRACK.rx);
    const p = trackPoint(t);
    return { t, x: p.x, y: p.y, error: Math.hypot(x - p.x, y - p.y) };
  }

  function makeNpc(index, progress) {
    const p = trackPoint(progress);
    return {
      id: 'npc-' + index,
      name: NPC_NAMES[index],
      x: p.x,
      y: p.y,
      angle: trackTangent(progress),
      progress,
      laps: 0,
      type: (index + 1) % CAR_TYPES.length,
      hasBall: false,
      throwCooldown: 2 + index,
      bob: index,
      knockedOut: false
    };
  }

  function initialState() {
    const startT = -Math.PI / 2;
    const playerPoint = trackPoint(startT);
    return {
      remaining: TOTAL_TIME,
      time: 0,
      ballPhaseStarted: false,
      ended: false,
      paused: false,
      pauseReason: '',
      pauseTimer: 0,
      countdown: 0,
      pendingNpc: null,
      message: 'Warm-up lap. Power Balls unlock when the clock reaches 5:00.',
      messageTimer: 5,
      player: {
        id: 'player',
        x: playerPoint.x,
        y: playerPoint.y,
        angle: trackTangent(startT),
        speed: 18,
        type: 0,
        hasBall: false,
        throwCooldown: 0,
        laps: 0,
        hits: 0,
        lapTravel: 0,
        lastTrackAngle: startT,
        knockedOut: false
      },
      npcs: [
        makeNpc(0, startT - 0.22),
        makeNpc(1, startT - 0.44),
        makeNpc(2, startT - 0.66)
      ],
      pickups: [0.0, 1.05, 2.1, 3.15, 4.2, 5.25].map((t, index) => {
        const p = trackPoint(t);
        return { id: index, t, x: p.x, y: p.y, active: false, respawn: 0 };
      }),
      projectiles: [],
      particles: []
    };
  }

  let state = initialState();
  let last = performance.now();

  function setMessage(text, seconds = 2.5) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return mins + ':' + String(secs).padStart(2, '0');
  }

  function updateHud() {
    if (state.ended) {
      questText.textContent = 'Race finished.';
    } else if (state.paused) {
      questText.textContent = state.pauseReason || 'Race paused.';
    } else if (!state.ballPhaseStarted) {
      questText.textContent = 'Warm-up: Power Balls unlock at 5:00.';
    } else {
      questText.textContent = 'Power Ball race: collect, throw, race.';
    }

    statusText.textContent =
      'Time: ' + formatTime(state.remaining) +
      ' · Laps: ' + state.player.laps +
      ' · Hits: ' + state.player.hits +
      ' · Ball: ' + (state.player.hasBall ? 'READY' : '—');
  }

  function resetGame() {
    state = initialState();
    garagePanel.hidden = true;
    garageChoices.innerHTML = '';
    keys.clear();
    updateHud();
  }

  function activateBalls() {
    state.ballPhaseStarted = true;
    state.pickups.forEach(p => {
      p.active = true;
      p.respawn = 0;
    });
    setMessage('POWER BALLS UNLOCKED! Grab one and press THROW.', 4);
  }

  function updatePlayer(dt) {
    const p = state.player;
    p.throwCooldown = Math.max(0, p.throwCooldown - dt);

    const accelerating = keys.has('arrowup') || keys.has('w');
    const braking = keys.has('arrowdown') || keys.has('s');
    const left = keys.has('arrowleft') || keys.has('a');
    const right = keys.has('arrowright') || keys.has('d');

    // Kid-friendly assisted driving: the car cruises by itself, steering is stronger,
    // and the circuit gently corrects small mistakes.
    const cruiseSpeed = 31;
    if (braking) p.speed -= 58 * dt;
    else if (accelerating) p.speed += 42 * dt;
    else p.speed += (cruiseSpeed - p.speed) * Math.min(1, dt * 2.6);
    p.speed = clamp(p.speed, 0, 46);

    const steerStrength = 2.65 * clamp(p.speed / 24, 0.45, 1);
    if (left) p.angle -= steerStrength * dt;
    if (right) p.angle += steerStrength * dt;

    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;

    const track = nearestTrackInfo(p.x, p.y);

    if (p.speed > 4) {
      const desiredAngle = trackTangent(track.t);
      const angleAssist = track.error > TRACK.halfWidth ? 2.1 : 1.25;
      p.angle += wrapAngle(desiredAngle - p.angle) * Math.min(1, dt * angleAssist);
    }

    if (track.error > 2) {
      const centreAssist = track.error > TRACK.halfWidth ? 2.4 : 0.75;
      const pull = Math.min(1, dt * centreAssist);
      p.x += (track.x - p.x) * pull;
      p.y += (track.y - p.y) * pull;
    }

    if (track.error > TRACK.halfWidth) {
      p.speed *= Math.pow(0.45, dt);
    }
    if (track.error > TRACK.halfWidth + 20) {
      p.x += (track.x - p.x) * Math.min(1, dt * 4);
      p.y += (track.y - p.y) * Math.min(1, dt * 4);
    }

    p.x = clamp(p.x, 4, W - 4);
    p.y = clamp(p.y, 4, H - 4);

    const currentTrackAngle = nearestTrackInfo(p.x, p.y).t;
    const delta = wrapAngle(currentTrackAngle - p.lastTrackAngle);
    if (Math.abs(delta) < 0.45) {
      p.lapTravel += delta;
      if (p.lapTravel >= Math.PI * 2) {
        p.lapTravel -= Math.PI * 2;
        p.laps += 1;
        setMessage('LAP ' + p.laps + '!', 1.5);
      }
      if (p.lapTravel < -0.3) p.lapTravel = -0.3;
    }
    p.lastTrackAngle = currentTrackAngle;
  }

  function updateNpcs(dt) {
    state.npcs.forEach((npc, index) => {
      npc.throwCooldown = Math.max(0, npc.throwCooldown - dt);
      const previousLap = Math.floor((npc.progress + Math.PI / 2) / (Math.PI * 2));
      const pace = 0.29 + index * 0.013 + Math.sin(state.time * 0.45 + index) * 0.008;
      npc.progress += pace * dt;
      const currentLap = Math.floor((npc.progress + Math.PI / 2) / (Math.PI * 2));
      if (currentLap > previousLap) npc.laps += currentLap - previousLap;

      const p = trackPoint(npc.progress);
      npc.x = p.x;
      npc.y = p.y;
      npc.angle = trackTangent(npc.progress);
      npc.bob += dt * 6;

    });
  }

  function updatePickups(dt) {
    if (!state.ballPhaseStarted) return;

    state.pickups.forEach(pickup => {
      if (!pickup.active) {
        pickup.respawn -= dt;
        if (pickup.respawn <= 0) pickup.active = true;
        return;
      }

      const racer = state.player;
      if (!racer.hasBall && dist(racer, pickup) < 9) {
        racer.hasBall = true;
        pickup.active = false;
        pickup.respawn = 5.5;
        setMessage('BALL READY — press THROW!', 2);
      }
    });
  }

  function throwBall(racer) {
    if (racer.id !== 'player') return;
    if (!state.ballPhaseStarted || !racer.hasBall || racer.throwCooldown > 0 || state.paused || state.ended) return;
    racer.hasBall = false;
    racer.throwCooldown = 0.45;

    const angle = racer.angle;

    state.projectiles.push({
      owner: racer.id,
      x: racer.x + Math.cos(angle) * 9,
      y: racer.y + Math.sin(angle) * 9,
      vx: Math.cos(angle) * 88,
      vy: Math.sin(angle) * 88,
      life: 1.7
    });

    if (racer.id === 'player') setMessage('THROW!', 0.7);
    updateHud();
  }

  function burstCar(racer) {
    const car = CAR_TYPES[racer.type];
    for (let i = 0; i < 18; i += 1) {
      const a = (Math.PI * 2 * i) / 18;
      const speed = 18 + (i % 5) * 5;
      state.particles.push({
        x: racer.x,
        y: racer.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.8 + (i % 4) * 0.08,
        colour: i % 3 === 0 ? car.stripe : car.body
      });
    }
  }

  function showPlayerGarage() {
    garageChoices.innerHTML = '';
    const current = state.player.type;
    const options = [1, 2, 3].map(offset => (current + offset) % CAR_TYPES.length);
    options.forEach(typeIndex => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = CAR_TYPES[typeIndex].name;
      button.addEventListener('click', () => choosePlayerCar(typeIndex));
      garageChoices.appendChild(button);
    });
    garagePanel.hidden = false;
  }

  function choosePlayerCar(typeIndex) {
    state.player.type = typeIndex;
    state.player.speed = 18;
    state.player.hasBall = false;
    state.player.knockedOut = false;
    garagePanel.hidden = true;
    state.pauseReason = 'New car ready.';
    state.countdown = 3;
    setMessage('New car ready. 3… 2… 1… GO!', 3.5);
    updateHud();
  }

  function replaceNpc(npc) {
    const current = npc.type;
    npc.type = (current + 1 + Math.floor(Math.random() * (CAR_TYPES.length - 1))) % CAR_TYPES.length;
    npc.hasBall = false;
    npc.knockedOut = false;
    npc.throwCooldown = 2.5;
  }

  function registerHit(projectile, target) {
    burstCar(target);
    target.knockedOut = true;
    state.projectiles = [];

    if (projectile.owner === 'player') {
      state.player.hits += 1;
    }

    state.paused = true;

    if (target.id === 'player') {
      state.pauseReason = 'Your car was bonked. Pick a replacement.';
      state.player.speed = 0;
      showPlayerGarage();
      setMessage('POP! Pick a new car.', 99);
    } else {
      state.pendingNpc = target.id;
      state.pauseTimer = 1.15;
      state.pauseReason = target.name + ' was bonked. New car incoming.';
      setMessage('POP! ' + target.name + ' needs a new car.', 2.8);
    }

    updateHud();
  }

  function updateProjectiles(dt) {
    for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
      const ball = state.projectiles[i];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.life -= dt;

      if (ball.life <= 0 || ball.x < -5 || ball.x > W + 5 || ball.y < -5 || ball.y > H + 5) {
        state.projectiles.splice(i, 1);
        continue;
      }

      const candidates = ball.owner === 'player'
        ? state.npcs
        : [state.player];

      const target = candidates.find(racer => dist(ball, racer) < 8);
      if (target) {
        registerHit(ball, target);
        break;
      }
    }
  }

  function updateParticles(dt) {
    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.life -= dt;
    });
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function updatePause(dt) {
    updateParticles(dt);

    if (state.pauseTimer > 0) {
      state.pauseTimer -= dt;
      if (state.pauseTimer <= 0 && state.pendingNpc) {
        const npc = state.npcs.find(r => r.id === state.pendingNpc);
        if (npc) replaceNpc(npc);
        state.pendingNpc = null;
        state.countdown = 3;
        state.pauseReason = 'New car ready.';
      }
      updateHud();
      return;
    }

    if (state.countdown > 0) {
      state.countdown -= dt;
      if (state.countdown <= 0) {
        state.countdown = 0;
        state.paused = false;
        state.pauseReason = '';
        state.messageTimer = 0;
        setMessage('GO!', 0.7);
      }
      updateHud();
    }
  }

  function update(dt) {
    state.time += dt;
    if (state.messageTimer > 0 && state.messageTimer < 90) state.messageTimer -= dt;

    if (state.ended) {
      updateParticles(dt);
      return;
    }

    if (state.paused) {
      updatePause(dt);
      return;
    }

    state.remaining = Math.max(0, state.remaining - dt);
    if (!state.ballPhaseStarted && state.remaining <= BALL_TIME) activateBalls();

    if (state.remaining <= 0) {
      state.ended = true;
      state.player.speed = 0;
      state.projectiles = [];
      setMessage('FINISH!', 99);
      updateHud();
      return;
    }

    updatePlayer(dt);
    updateNpcs(dt);
    updatePickups(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateHud();
  }

  function drawGrass() {
    ctx.fillStyle = colours.grass;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i += 1) {
      const x = (i * 47 + 11) % W;
      const y = (i * 29 + 7) % H;
      ctx.fillStyle = i % 4 === 0 ? colours.grassLight : colours.grassDark;
      ctx.fillRect(x, y, 1, i % 3 === 0 ? 2 : 1);
    }

    ctx.fillStyle = '#79c4ed';
    ctx.fillRect(136, 72, 48, 36);
    ctx.fillStyle = '#aee3ff';
    for (let y = 76; y < 106; y += 8) ctx.fillRect(141, y, 15, 1);

    ctx.fillStyle = '#4c8f43';
    ctx.fillRect(18, 20, 21, 10);
    ctx.fillRect(281, 145, 22, 9);
    ctx.fillStyle = '#2f6f35';
    ctx.fillRect(22, 17, 13, 12);
    ctx.fillRect(286, 141, 13, 12);
  }

  function strokeEllipse(colour, width) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.rx, TRACK.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawTrack() {
    strokeEllipse(colours.roadDark, 39);
    strokeEllipse(colours.road, 34);
    strokeEllipse(colours.roadLight, 2);

    ctx.lineWidth = 2;
    for (let i = 0; i < 32; i += 1) {
      const t1 = (Math.PI * 2 * i) / 32;
      const t2 = t1 + 0.09;
      ctx.strokeStyle = i % 2 === 0 ? colours.kerbA : colours.kerbB;
      ctx.beginPath();
      const outer1 = {
        x: TRACK.cx + Math.cos(t1) * (TRACK.rx + 17),
        y: TRACK.cy + Math.sin(t1) * (TRACK.ry + 17)
      };
      const outer2 = {
        x: TRACK.cx + Math.cos(t2) * (TRACK.rx + 17),
        y: TRACK.cy + Math.sin(t2) * (TRACK.ry + 17)
      };
      ctx.moveTo(outer1.x, outer1.y);
      ctx.lineTo(outer2.x, outer2.y);
      ctx.stroke();
    }

    ctx.strokeStyle = colours.line;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(TRACK.cx, TRACK.cy, TRACK.rx, TRACK.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = colours.white;
    ctx.fillRect(156, 11, 8, 2);
    ctx.fillStyle = colours.black;
    for (let x = 156; x < 164; x += 2) {
      if ((x / 2) % 2 === 0) ctx.fillRect(x, 11, 2, 2);
    }

    ctx.fillStyle = '#f5ca45';
    ctx.fillRect(145, 78, 30, 18);
    ctx.fillStyle = '#c68e23';
    ctx.fillRect(149, 82, 22, 10);
    drawText('PIXEL', 160, 83, colours.outline, 'center', 5);
    drawText('CITY', 160, 89, colours.outline, 'center', 5);
  }

  function drawPickup(pickup) {
    if (!state.ballPhaseStarted || !pickup.active) return;
    const pulse = 1 + Math.sin(state.time * 7 + pickup.id) * 0.7;
    ctx.fillStyle = 'rgba(255, 244, 128, .35)';
    ctx.fillRect(pickup.x - 6, pickup.y - 6, 12, 12);
    ctx.fillStyle = colours.outline;
    ctx.fillRect(pickup.x - 3, pickup.y - 3 + pulse, 6, 6);
    ctx.fillStyle = colours.yellow;
    ctx.fillRect(pickup.x - 2, pickup.y - 4 + pulse, 4, 6);
    ctx.fillStyle = colours.white;
    ctx.fillRect(pickup.x - 1, pickup.y - 3 + pulse, 2, 2);
  }

  function drawCar(racer, isPlayer = false) {
    const car = CAR_TYPES[racer.type];
    ctx.save();
    ctx.translate(Math.round(racer.x), Math.round(racer.y));
    ctx.rotate(racer.angle);

    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(-6, -4, 13, 9);

    ctx.fillStyle = colours.outline;
    ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = car.body;
    ctx.fillRect(-6, -3, 12, 6);

    ctx.fillStyle = colours.black;
    ctx.fillRect(-4, -5, 4, 2);
    ctx.fillRect(2, -5, 4, 2);
    ctx.fillRect(-4, 3, 4, 2);
    ctx.fillRect(2, 3, 4, 2);

    ctx.fillStyle = car.stripe;
    ctx.fillRect(-2, -3, 5, 6);
    ctx.fillStyle = '#aee4ff';
    ctx.fillRect(0, -2, 3, 4);
    ctx.fillStyle = colours.white;
    ctx.fillRect(5, -2, 1, 1);
    ctx.fillRect(5, 1, 1, 1);

    if (isPlayer) {
      ctx.strokeStyle = colours.yellow;
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -5, 16, 10);
    }

    ctx.restore();

    if (racer.hasBall) {
      ctx.fillStyle = colours.yellow;
      ctx.fillRect(Math.round(racer.x) - 2, Math.round(racer.y) - 11, 4, 4);
      ctx.fillStyle = colours.white;
      ctx.fillRect(Math.round(racer.x) - 1, Math.round(racer.y) - 11, 1, 1);
    }
  }

  function drawProjectiles() {
    state.projectiles.forEach(ball => {
      ctx.fillStyle = colours.outline;
      ctx.fillRect(Math.round(ball.x) - 3, Math.round(ball.y) - 3, 6, 6);
      ctx.fillStyle = colours.yellow;
      ctx.fillRect(Math.round(ball.x) - 2, Math.round(ball.y) - 2, 4, 4);
      ctx.fillStyle = colours.white;
      ctx.fillRect(Math.round(ball.x) - 1, Math.round(ball.y) - 1, 1, 1);
    });
  }

  function drawParticles() {
    state.particles.forEach(p => {
      ctx.globalAlpha = clamp(p.life / 0.8, 0, 1);
      ctx.fillStyle = p.colour;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
    });
    ctx.globalAlpha = 1;
  }

  function drawText(text, x, y, colour = colours.outline, align = 'left', size = 7) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px monospace';
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? line + ' ' + word : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawMessage() {
    if (state.messageTimer <= 0 && !state.paused && !state.ended) return;
    const lines = wrapText(state.message, 39);
    const h = 12 + lines.length * 9;
    ctx.fillStyle = 'rgba(19, 28, 39, .92)';
    ctx.fillRect(8, H - h - 8, W - 16, h);
    ctx.fillStyle = colours.white;
    lines.forEach((line, index) => drawText(line, 14, H - h - 3 + index * 9, colours.white, 'left', 6));
  }

  function drawTopHud() {
    ctx.fillStyle = 'rgba(17, 24, 34, .9)';
    ctx.fillRect(6, 5, 74, 18);
    ctx.fillRect(W - 91, 5, 85, 18);
    drawText(formatTime(state.remaining), 12, 9, colours.white, 'left', 9);
    drawText('LAP ' + state.player.laps, W - 85, 9, colours.white, 'left', 7);
    drawText('HIT ' + state.player.hits, W - 47, 9, colours.yellow, 'left', 7);

    if (!state.ballPhaseStarted) {
      drawText('BALLS AT 5:00', 160, 8, colours.white, 'center', 7);
    } else if (state.player.hasBall) {
      drawText('BALL READY', 160, 8, colours.yellow, 'center', 7);
    }
  }

  function drawPauseOverlay() {
    if (!state.paused) return;

    ctx.fillStyle = 'rgba(15, 22, 31, .55)';
    ctx.fillRect(0, 0, W, H);

    if (state.countdown > 0) {
      const number = Math.max(1, Math.ceil(state.countdown));
      drawText(String(number), W / 2, H / 2 - 23, colours.yellow, 'center', 30);
      drawText('GET READY', W / 2, H / 2 + 10, colours.white, 'center', 8);
    } else {
      drawText('RACE PAUSED', W / 2, 42, colours.white, 'center', 12);
      drawText(state.pauseReason, W / 2, 61, colours.yellow, 'center', 7);
    }
  }

  function drawFinish() {
    if (!state.ended) return;
    ctx.fillStyle = 'rgba(15, 22, 31, .84)';
    ctx.fillRect(30, 28, 260, 124);
    drawText('FINISH!', 160, 42, colours.yellow, 'center', 17);
    drawText('Laps: ' + state.player.laps, 160, 72, colours.white, 'center', 9);
    drawText('Cars bonked: ' + state.player.hits, 160, 86, colours.white, 'center', 9);
    const score = state.player.laps + state.player.hits;
    drawText('Score: ' + score, 160, 104, colours.yellow, 'center', 11);
    drawText('Press Restart to race again.', 160, 130, colours.white, 'center', 6);
  }

  function draw() {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawGrass();
    drawTrack();
    state.pickups.forEach(drawPickup);

    const racers = [
      ...state.npcs.filter(npc => !npc.knockedOut).map(npc => ({ y: npc.y, draw: () => drawCar(npc, false) })),
      ...(state.player.knockedOut ? [] : [{ y: state.player.y, draw: () => drawCar(state.player, true) }])
    ];
    racers.sort((a, b) => a.y - b.y).forEach(item => item.draw());

    drawProjectiles();
    drawParticles();
    drawTopHud();
    drawMessage();
    drawPauseOverlay();
    drawFinish();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd', 'e', ' '].includes(key)) {
      event.preventDefault();
    }
    if ((key === 'e' || key === ' ') && !event.repeat) {
      throwBall(state.player);
      return;
    }
    keys.add(key);
  });

  window.addEventListener('keyup', event => {
    keys.delete(event.key.toLowerCase());
  });

  function holdKey(button, key) {
    const start = event => {
      event.preventDefault();
      keys.add(key);
      button.classList.add('is-held');
      if (button.setPointerCapture && event.pointerId !== undefined) {
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
      }
    };
    const stop = event => {
      if (event) event.preventDefault();
      keys.delete(key);
      button.classList.remove('is-held');
    };
    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('lostpointercapture', stop);
    button.addEventListener('contextmenu', event => event.preventDefault());
  }

  moveButtons.forEach(button => holdKey(button, button.dataset.key));

  throwButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    throwButton.classList.add('is-held');
    throwBall(state.player);
  });
  throwButton.addEventListener('pointerup', () => throwButton.classList.remove('is-held'));
  throwButton.addEventListener('pointercancel', () => throwButton.classList.remove('is-held'));
  throwButton.addEventListener('contextmenu', event => event.preventDefault());

  restartButton.addEventListener('click', resetGame);

  window.pixelBallRacersDebug = {
    getState: () => ({
      remaining: state.remaining,
      ballPhaseStarted: state.ballPhaseStarted,
      paused: state.paused,
      ended: state.ended,
      player: {
        x: state.player.x,
        y: state.player.y,
        laps: state.player.laps,
        hits: state.player.hits,
        hasBall: state.player.hasBall,
        type: state.player.type
      },
      npcs: state.npcs.map(npc => ({
        id: npc.id,
        name: npc.name,
        laps: npc.laps,
        hasBall: npc.hasBall,
        type: npc.type
      }))
    }),
    throwBall: () => throwBall(state.player),
    reset: resetGame
  };

  updateHud();
  requestAnimationFrame(loop);
})();
