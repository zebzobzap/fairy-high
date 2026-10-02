(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const questText = document.getElementById('questText');
  const statusText = document.getElementById('statusText');
  const restartButton = document.getElementById('restartButton');
  const interactButton = document.getElementById('interactButton');
  const moveButtons = [...document.querySelectorAll('[data-key]')];

  const W = canvas.width;
  const H = canvas.height;
  const keys = new Set();

  const colours = {
    grass: '#82cd68',
    grassDark: '#65b755',
    grassLight: '#a4df7d',
    path: '#e6cf99',
    pathDark: '#c7a971',
    river: '#5cb5e7',
    riverDark: '#358bc7',
    riverLight: '#a5e4ff',
    bridge: '#9a6738',
    bridgeDark: '#694223',
    outline: '#3e2c28',
    white: '#fff6e6',
    cream: '#ffe4b0',
    yellow: '#f6ca3b',
    red: '#d94b3f',
    redDark: '#9d2f34',
    skin: '#ffd0a6',
    blush: '#e78d8b',
    hair: '#f4c75c',
    hairDark: '#b97932',
    wing: '#ffe9a6',
    wingEdge: '#f3bf4c',
    pink: '#ff7faf',
    pinkDark: '#bb4b7c',
    green: '#3f9d4f',
    greenDark: '#266b35',
    purple: '#9b72d2',
    blue: '#547bce',
    navy: '#203b65',
    black: '#1f1b1a',
    muted: '#7a5b4d'
  };

  const initialState = () => ({
    player: {
      x: 39,
      y: 132,
      dir: 'down',
      speed: 54,
      bob: 0
    },
    friend: {
      x: 116,
      y: 103,
      joined: false,
      name: 'Pippa'
    },
    petals: [
      { id: 1, x: 48, y: 72, taken: false },
      { id: 2, x: 83, y: 137, taken: false },
      { id: 3, x: 118, y: 45, taken: false }
    ],
    petalsCollected: 0,
    bridgeRepaired: false,
    won: false,
    message: 'Welcome to the Entry Garden. Collect the glowing petals.',
    messageTimer: 3.5,
    time: 0
  });

  let state = initialState();
  let last = performance.now();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const near = (a, b, radius) => dist(a, b) <= radius;

  function resetGame() {
    state = initialState();
    updateHud();
  }

  function setMessage(text, seconds = 3) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function updateHud() {
    statusText.textContent = `Petals: ${state.petalsCollected} / 3`;

    if (state.won) {
      questText.textContent = 'Quest complete: welcome to Fairy High.';
    } else if (!state.bridgeRepaired && state.petalsCollected < 3) {
      questText.textContent = 'Quest: collect 3 glowing petals.';
    } else if (!state.bridgeRepaired) {
      questText.textContent = 'Quest: press E at the broken bridge.';
    } else {
      questText.textContent = 'Quest: cross the bridge and press E at the Fairy High gate.';
    }
  }

  function canStandAt(x, y) {
    if (x < 8 || x > W - 8 || y < 17 || y > H - 10) return false;

    const inRiver = x > 144 && x < 166;
    const atBridgeGap = y > 83 && y < 112;
    if (inRiver && !(state.bridgeRepaired && atBridgeGap)) return false;

    const treeColliders = [
      { x: 28, y: 38, r: 11 },
      { x: 96, y: 24, r: 10 },
      { x: 40, y: 160, r: 11 },
      { x: 236, y: 31, r: 10 },
      { x: 294, y: 152, r: 13 }
    ];

    return treeColliders.every(tree => Math.hypot(x - tree.x, y - tree.y) > tree.r);
  }

  function update(dt) {
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;

    if (state.won) return;

    const player = state.player;
    let dx = 0;
    let dy = 0;

    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? 'left' : 'right';
      else player.dir = dy < 0 ? 'up' : 'down';
      player.bob += dt * 12;
    }

    const nx = player.x + dx * player.speed * dt;
    const ny = player.y + dy * player.speed * dt;

    if (canStandAt(nx, player.y)) player.x = nx;
    if (canStandAt(player.x, ny)) player.y = ny;
    player.x = clamp(player.x, 8, W - 8);
    player.y = clamp(player.y, 17, H - 10);

    for (const petal of state.petals) {
      if (!petal.taken && near(player, petal, 9)) {
        petal.taken = true;
        state.petalsCollected += 1;
        setMessage(`You found a glowing petal. ${state.petalsCollected} of 3 collected.`, 2.2);
        updateHud();
      }
    }

    if (state.bridgeRepaired && state.friend.joined) {
      const followX = player.x - (player.dir === 'left' ? -13 : player.dir === 'right' ? 13 : 0);
      const followY = player.y + 15;
      state.friend.x += (followX - state.friend.x) * Math.min(1, dt * 3);
      state.friend.y += (followY - state.friend.y) * Math.min(1, dt * 3);
    }
  }

  function interact() {
    if (state.won) {
      resetGame();
      return;
    }

    const p = state.player;
    const bridge = { x: 155, y: 97 };
    const gate = { x: 284, y: 88 };

    if (near(p, state.friend, 18) && !state.friend.joined) {
      if (state.petalsCollected < 3) {
        setMessage('Pippa: The bridge is broken. Three glowing petals can mend it.', 3.5);
      } else {
        setMessage('Pippa: That should be enough magic. Let’s fix the bridge.', 3);
      }
      return;
    }

    if (near(p, bridge, 18) && !state.bridgeRepaired) {
      if (state.petalsCollected >= 3) {
        state.bridgeRepaired = true;
        state.friend.joined = true;
        setMessage('The petals sparkle. The bridge repairs itself. Pippa joins you.', 4);
        updateHud();
      } else {
        setMessage('The bridge needs three glowing petals before it can be repaired.', 3);
      }
      return;
    }

    if (near(p, gate, 18)) {
      if (state.bridgeRepaired) {
        state.won = true;
        setMessage('Welcome to Fairy High. Your mushroom dorm is ready.', 8);
        updateHud();
      } else {
        setMessage('The Fairy High gate is across the river. Repair the bridge first.', 3);
      }
      return;
    }

    setMessage('Nothing to use here yet.', 1.4);
  }

  function drawRect(x, y, w, h, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawText(text, x, y, colour = colours.outline, align = 'left', size = 6) {
    ctx.save();
    ctx.font = `${size}px monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = colour;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = colours.grass;
    ctx.fillRect(0, 0, W, H);

    // Pixel grass texture.
    for (let i = 0; i < 170; i += 1) {
      const x = (i * 47 + 13) % W;
      const y = (i * 31 + 19) % H;
      const c = i % 3 === 0 ? colours.grassLight : colours.grassDark;
      drawRect(x, y, 1, 2, c);
    }

    // Path: start to bridge and bridge to gate.
    drawPathSegment(18, 132, 130, 97, 18);
    drawPathSegment(169, 97, 285, 89, 18);
    drawPathSegment(278, 89, 302, 72, 16);

    // River.
    drawRect(145, 0, 21, H, colours.riverDark);
    drawRect(148, 0, 16, H, colours.river);
    for (let y = 4; y < H; y += 16) {
      drawRect(151, y, 7, 2, colours.riverLight);
      drawRect(158, y + 7, 4, 1, colours.riverLight);
    }

    drawBridge();

    // Fairy High side glow.
    drawRect(248, 61, 58, 48, 'rgba(255, 242, 173, .35)');
  }

  function drawPathSegment(x1, y1, x2, y2, radius) {
    ctx.save();
    ctx.strokeStyle = colours.pathDark;
    ctx.lineWidth = radius + 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = colours.path;
    ctx.lineWidth = radius;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBridge() {
    if (state.bridgeRepaired) {
      drawRect(139, 87, 32, 22, colours.bridgeDark);
      for (let x = 140; x <= 166; x += 6) drawRect(x, 88, 4, 20, colours.bridge);
      drawRect(138, 91, 34, 2, colours.cream);
      drawRect(138, 103, 34, 2, colours.cream);
      return;
    }

    drawRect(137, 90, 10, 18, colours.bridgeDark);
    drawRect(137, 90, 8, 4, colours.bridge);
    drawRect(137, 101, 8, 4, colours.bridge);
    drawRect(165, 90, 10, 18, colours.bridgeDark);
    drawRect(167, 90, 8, 4, colours.bridge);
    drawRect(167, 101, 8, 4, colours.bridge);
  }

  function drawTree(x, y, kind = 0) {
    drawRect(x - 3, y + 7, 6, 8, '#7b4a27');
    const c1 = kind ? '#4d9d44' : '#3e8c3c';
    const c2 = kind ? '#6bb65a' : '#55a84b';
    drawRect(x - 10, y - 4, 20, 11, colours.outline);
    drawRect(x - 9, y - 5, 18, 10, c1);
    drawRect(x - 14, y + 2, 28, 12, colours.outline);
    drawRect(x - 13, y + 1, 26, 11, c2);
    drawRect(x - 8, y + 10, 16, 8, colours.outline);
    drawRect(x - 7, y + 9, 14, 7, c1);
  }

  function drawMushroomDorm(x, y, tint = 'red') {
    const cap = tint === 'blue' ? colours.blue : tint === 'purple' ? colours.purple : colours.red;
    drawRect(x - 10, y - 10, 20, 9, colours.outline);
    drawRect(x - 9, y - 12, 18, 11, cap);
    drawRect(x - 15, y - 4, 30, 10, colours.outline);
    drawRect(x - 14, y - 6, 28, 10, cap);
    drawRect(x - 10, y + 4, 20, 18, colours.outline);
    drawRect(x - 9, y + 3, 18, 18, '#f6d9a9');
    drawRect(x - 3, y + 12, 6, 9, '#75503a');
    drawRect(x - 12, y - 2, 4, 3, colours.white);
    drawRect(x - 2, y - 8, 4, 3, colours.white);
    drawRect(x + 6, y - 3, 5, 3, colours.white);
  }

  function drawGate() {
    const x = 284;
    const y = 76;
    drawRect(x - 22, y - 7, 44, 5, colours.outline);
    drawRect(x - 21, y - 8, 42, 5, colours.redDark);
    drawRect(x - 18, y - 17, 6, 38, colours.outline);
    drawRect(x - 17, y - 16, 4, 36, '#805331');
    drawRect(x + 12, y - 17, 6, 38, colours.outline);
    drawRect(x + 13, y - 16, 4, 36, '#805331');
    drawRect(x - 15, y - 16, 30, 10, colours.outline);
    drawRect(x - 14, y - 17, 28, 10, '#ffe0a7');
    drawText('FAIRY', x, y - 15, colours.redDark, 'center', 5);
    drawText('HIGH', x, y - 9, colours.redDark, 'center', 5);
    drawRect(x - 7, y + 13, 14, 8, '#cb9a60');
  }

  function drawPetal(petal) {
    if (petal.taken) return;
    const pulse = Math.sin(state.time * 6 + petal.id) * 1.2;
    const x = petal.x;
    const y = petal.y + pulse;
    drawRect(x - 1, y - 7, 3, 3, '#fff6bc');
    drawRect(x - 3, y - 5, 7, 7, colours.pinkDark);
    drawRect(x - 2, y - 6, 5, 8, colours.pink);
    drawRect(x, y - 2, 2, 2, colours.white);
    drawRect(x - 5, y - 8, 1, 1, '#fff6bc');
    drawRect(x + 5, y - 4, 1, 1, '#fff6bc');
    drawRect(x + 3, y + 4, 1, 1, '#fff6bc');
  }

  function drawDialogue() {
    if (state.messageTimer <= 0 && !state.won) return;
    const text = state.message;
    const lines = wrapText(text, 45);
    const boxH = 13 + lines.length * 8;
    drawRect(8, H - boxH - 7, W - 16, boxH, colours.outline);
    drawRect(10, H - boxH - 9, W - 20, boxH, '#fff8ec');
    lines.forEach((line, i) => drawText(line, 16, H - boxH - 4 + i * 8, colours.outline, 'left', 6));
  }

  function wrapText(text, max) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function pxFactory(originX, originY) {
    return (x, y, w, h, colour) => drawRect(originX + x, originY + y, w, h, colour);
  }

  function drawWingPair(px, dir, main, edge) {
    if (dir === 'left') {
      px(8, 3, 7, 12, edge);
      px(9, 4, 5, 10, main);
      px(10, 6, 3, 2, colours.white);
      return;
    }
    if (dir === 'right') {
      px(1, 3, 7, 12, edge);
      px(2, 4, 5, 10, main);
      px(3, 6, 3, 2, colours.white);
      return;
    }
    px(-3, 4, 6, 10, edge);
    px(-2, 5, 5, 8, main);
    px(13, 4, 6, 10, edge);
    px(13, 5, 5, 8, main);
    px(-1, 8, 3, 2, colours.white);
    px(14, 8, 3, 2, colours.white);
  }

  function drawMushroomFairy(x, y, dir = 'down', frame = 0) {
    const bob = Math.sin(frame) > 0.25 ? 1 : 0;
    const px = pxFactory(Math.round(x - 8), Math.round(y - 15 + bob));

    drawRect(x - 6, y + 4, 12, 3, 'rgba(0,0,0,.18)');
    drawWingPair(px, dir, colours.wing, colours.wingEdge);

    // Hair and head.
    px(3, 5, 10, 8, colours.outline);
    px(4, 6, 8, 7, colours.hair);

    // Mushroom cap changes by direction.
    if (dir === 'up') {
      px(1, 0, 14, 7, colours.outline);
      px(2, 0, 12, 6, colours.red);
      px(4, 1, 3, 2, colours.white);
      px(10, 2, 3, 2, colours.white);
    } else if (dir === 'left' || dir === 'right') {
      px(1, 0, 13, 7, colours.outline);
      px(2, 0, 11, 6, colours.red);
      px(4, 1, 3, 2, colours.white);
      px(9, 3, 3, 2, colours.white);
    } else {
      px(1, 1, 14, 7, colours.outline);
      px(2, 0, 12, 7, colours.red);
      px(4, 1, 3, 2, colours.white);
      px(10, 2, 3, 2, colours.white);
      px(7, 4, 2, 2, colours.white);
    }

    if (dir !== 'up') {
      px(5, 8, 6, 5, colours.skin);
      px(5, 9, 1, 1, colours.black);
      px(10, 9, 1, 1, colours.black);
      px(7, 11, 3, 1, colours.blush);
    } else {
      px(4, 7, 8, 4, colours.hairDark);
    }

    // Body.
    px(4, 13, 8, 7, colours.outline);
    px(5, 12, 6, 7, colours.redDark);
    px(4, 15, 8, 4, colours.red);
    px(6, 13, 4, 2, colours.white);
    px(3, 19, 3, 4, colours.outline);
    px(10, 19, 3, 4, colours.outline);
    px(4, 19, 2, 3, colours.skin);
    px(10, 19, 2, 3, colours.skin);
  }

  function drawBlossomFriend(x, y, dir = 'down') {
    const px = pxFactory(Math.round(x - 8), Math.round(y - 14));
    drawRect(x - 5, y + 4, 10, 3, 'rgba(0,0,0,.16)');
    drawWingPair(px, dir, '#ffd0dd', '#f28fb5');
    px(3, 2, 10, 9, colours.outline);
    px(4, 2, 8, 8, colours.pink);
    px(9, 0, 4, 4, colours.yellow);
    px(10, -1, 3, 3, colours.pinkDark);
    if (dir !== 'up') {
      px(5, 7, 6, 5, colours.skin);
      px(5, 8, 1, 1, colours.black);
      px(10, 8, 1, 1, colours.black);
    } else {
      px(4, 7, 8, 4, colours.pinkDark);
    }
    px(4, 12, 8, 7, colours.outline);
    px(5, 12, 6, 6, colours.pinkDark);
    px(4, 15, 8, 4, colours.pink);
    px(5, 19, 2, 3, colours.black);
    px(10, 19, 2, 3, colours.black);
  }

  function drawWorldObjects() {
    drawTree(28, 38);
    drawTree(96, 24, 1);
    drawTree(40, 160, 1);
    drawTree(236, 31);
    drawTree(294, 152, 1);

    drawMushroomDorm(251, 139, 'red');
    drawMushroomDorm(281, 136, 'purple');
    drawGate();

    // Flowers and stones.
    const decor = [
      [22, 96, colours.pink], [64, 47, colours.yellow], [110, 152, colours.pink],
      [189, 127, colours.pink], [215, 75, colours.yellow], [303, 34, colours.pink]
    ];
    for (const [x, y, c] of decor) {
      drawRect(x - 1, y - 1, 3, 3, c);
      drawRect(x, y + 1, 1, 3, colours.greenDark);
    }

    drawText('Dorms', 266, 159, colours.outline, 'center', 5);
  }

  function drawWinScreen() {
    if (!state.won) return;
    drawRect(36, 28, 248, 120, 'rgba(255, 248, 236, .95)');
    drawRect(40, 32, 240, 112, '#fff8ec');
    drawText('Welcome to Fairy High!', 160, 48, colours.redDark, 'center', 10);
    drawText('You passed the Entry Challenge.', 160, 68, colours.outline, 'center', 7);
    drawText('Pippa is your neighbour in', 160, 82, colours.outline, 'center', 6);
    drawText('the mushroom dorms.', 160, 91, colours.outline, 'center', 6);
    drawMushroomDorm(138, 121, 'red');
    drawMushroomDorm(182, 121, 'purple');
    drawText('Press E or Restart to play again.', 160, 134, colours.muted, 'center', 6);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGround();
    drawWorldObjects();

    for (const petal of state.petals) drawPetal(petal);

    const entities = [
      { y: state.friend.y, draw: () => drawBlossomFriend(state.friend.x, state.friend.y, state.friend.joined ? state.player.dir : 'down') },
      { y: state.player.y, draw: () => drawMushroomFairy(state.player.x, state.player.y, state.player.dir, state.player.bob) }
    ];

    entities.sort((a, b) => a.y - b.y).forEach(entity => entity.draw());

    drawDialogue();
    drawWinScreen();
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
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd', 'e'].includes(key)) {
      event.preventDefault();
    }
    if (key === 'e') interact();
    else keys.add(key);
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

  for (const button of moveButtons) {
    holdKey(button, button.dataset.key);
  }

  interactButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    interactButton.classList.add('is-held');
    interact();
  });
  interactButton.addEventListener('pointerup', () => interactButton.classList.remove('is-held'));
  interactButton.addEventListener('pointercancel', () => interactButton.classList.remove('is-held'));
  interactButton.addEventListener('contextmenu', event => event.preventDefault());

  restartButton.addEventListener('click', resetGame);

  // Small read-only hook used by our automated smoke test.
  window.fairyHighDebug = {
    getState: () => ({
      player: { x: state.player.x, y: state.player.y, dir: state.player.dir },
      petalsCollected: state.petalsCollected,
      bridgeRepaired: state.bridgeRepaired,
      won: state.won
    })
  };

  updateHud();
  requestAnimationFrame(loop);
})();
