// Dapur Kilat — main. One clear job: the game loop, the screens, the
// ?shot= staging for screenshots, and wiring input, world, sound and render.

import { FIELD } from './config.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { createWorld, resetWorld, stationAtPoint, step } from './world.js';
import { draw, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7');
const shot = params.get('shot');

const sfx = new Sfx();
const input = new Input(canvas);
const world = createWorld(seed);

// A click on a station arms it (walk there, work it on arrival); a click on
// empty floor only walks there.
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const p = {
    x: ((e.clientX - r.left) / r.width) * 1280,
    y: ((e.clientY - r.top) / r.height) * 720,
  };
  input.clickAt(p, stationAtPoint);
});

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number(window.localStorage.getItem('dapur-kilat-best') || '0') || 0;
} catch (e) {
  best = 0;
}
let paused = false;
let last = performance.now();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function drainEvents() {
  for (const e of world.events) {
    if (e === 'pickup') sfx.pickup();
    else if (e === 'place') sfx.place();
    else if (e === 'chop') sfx.chop();
    else if (e === 'chopdone') sfx.chopDone();
    else if (e === 'cookdone') sfx.cookDone();
    else if (e === 'serve') sfx.serve();
    else if (e === 'coin') sfx.coin();
    else if (e === 'error') sfx.error();
    else if (e === 'expire') sfx.expire();
    else if (e === 'level') sfx.levelUp();
    else if (e === 'over') sfx.over();
    else if (e === 'tick') sfx.tick();
  }
  world.events.length = 0;
}

function startGame() {
  sfx.ensure();
  resetWorld(world);
  world.seed = seed;
  screen = SCREEN_PLAY;
  paused = false;
  setStatus('Cooking! Serve the orders before they run out.');
}

function endGame() {
  if (world.coins > best) {
    best = world.coins;
    try {
      window.localStorage.setItem('dapur-kilat-best', String(best));
    } catch (e) {
      /* storage unavailable: best score is session-only */
    }
  }
  screen = SCREEN_OVER;
  setStatus(`Shift over. You earned ${world.coins} coins.`);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const inp = input.read();

  if (inp.mutePressed) {
    sfx.muted = !sfx.muted;
  }
  if (screen === SCREEN_TITLE) {
    if (inp.startPressed || inp.interactPressed) startGame();
  } else if (screen === SCREEN_OVER) {
    if (inp.restartPressed || inp.interactPressed) startGame();
  } else if (screen === SCREEN_PLAY) {
    if (inp.pausePressed) {
      paused = !paused;
      setStatus(paused ? 'Paused.' : 'Cooking!');
    }
    if (!paused) {
      step(world, inp, dt);
      drainEvents();
      if (world.over) endGame();
    }
  }

  draw(ctx, world, screen, best, paused);
  requestAnimationFrame(frame);
}

if (shot) {
  // Staged screenshot: play the real rules forward, draw once, stop.
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  draw(ctx, world, screen, best, false);
  setStatus(`Dapur Kilat, ${shot} scene.`);
  window.__shotReady = true;
} else {
  setStatus('Dapur Kilat: a fast warung cooking game. Press Enter to start.');
  requestAnimationFrame(frame);
}
