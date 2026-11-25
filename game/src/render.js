// Dapur Kilat — render. One clear job: draw everything on the canvas —
// kitchen, stations, chef, food, orders, timer and screens. No logic lives
// here beyond what a label or a hint needs to know.

import { CHEF, COLORS, FIELD, FLOOR_TOP, HUD_HEIGHT, ITEMS, RECIPES, STATIONS } from './config.js';
import { plateRecipe, stationById } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function shadowText(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.font = `${weight || 'bold'} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x + 2, y + 2);
  text(ctx, str, x, y, size, color, align, weight);
}

// --- food icons, drawn with canvas shapes (original art, no images) ---
export function drawItem(ctx, item, x, y, size, state) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#22201e';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (item === 'tomato') {
    ctx.fillStyle = '#e2483d';
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c93327';
    ctx.beginPath();
    ctx.arc(-s * 0.12, s * 0.16, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f8f3a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.28);
    ctx.lineTo(-s * 0.2, -s * 0.48);
    ctx.lineTo(-s * 0.02, -s * 0.36);
    ctx.lineTo(s * 0.16, -s * 0.5);
    ctx.lineTo(s * 0.1, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.16, -s * 0.1, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'lettuce') {
    ctx.fillStyle = '#5aa843';
    for (const [ox, oy, r] of [[-0.16, 0.08, 0.26], [0.14, 0.1, 0.26], [0, -0.14, 0.28]]) {
      ctx.beginPath();
      ctx.arc(ox * s, oy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7cc45e';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.06, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === 'bread') {
    ctx.fillStyle = '#c98d4a';
    rr(ctx, -s * 0.42, -s * 0.26, s * 0.84, s * 0.56, s * 0.2);
    ctx.fill();
    ctx.fillStyle = '#e0a458';
    rr(ctx, -s * 0.34, -s * 0.18, s * 0.68, s * 0.4, s * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#b57a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.05);
    ctx.lineTo(s * 0.2, -s * 0.05);
    ctx.stroke();
  } else if (item === 'cheese') {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, s * 0.3);
    ctx.lineTo(s * 0.42, s * 0.3);
    ctx.lineTo(s * 0.42, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a41f';
    for (const [ox, oy] of [[-0.14, 0.1], [0.18, -0.02], [0.02, 0.18]]) {
      ctx.beginPath();
      ctx.arc(ox * s, oy * s, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item === 'noodle') {
    ctx.fillStyle = '#fff6e5';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.42, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f2d06b';
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      const y = -s * 0.16 + i * s * 0.13;
      ctx.moveTo(-s * 0.3, y);
      ctx.bezierCurveTo(-s * 0.1, y - s * 0.12, s * 0.1, y + s * 0.12, s * 0.3, y);
      ctx.stroke();
    }
  } else if (item === 'patty') {
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e452c';
    for (const [ox, oy] of [[-0.18, -0.06], [0.12, 0.08], [0.2, -0.1]]) {
      ctx.beginPath();
      ctx.arc(ox * s, oy * s, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item === 'dish') {
    ctx.fillStyle = '#fff6e5';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b896';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e2483d';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.05, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5aa843';
    ctx.beginPath();
    ctx.arc(s * 0.12, s * 0.08, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state === 'chopped') {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.05);
    ctx.lineTo(s * 0.3, s * 0.05);
    ctx.moveTo(0, -s * 0.28);
    ctx.lineTo(0, s * 0.32);
    ctx.stroke();
  }
  if (state === 'cooked') {
    ctx.strokeStyle = '#d94f30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.46, -0.4, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.46, Math.PI - 0.4, Math.PI + 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();
}

function drawStation(ctx, world, s) {
  const { x, y, w, h } = s;
  ctx.save();
  if (s.kind === 'crate') {
    ctx.fillStyle = COLORS.woodDark;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.wood;
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    drawItem(ctx, s.item, x + 30, y + h / 2, 44, 'raw');
    text(ctx, ITEMS[s.item].name, x + 62, y + h / 2 - 8, 15, COLORS.cream, 'left');
    const prep = ITEMS[s.item].prep;
    text(ctx, prep === 'chop' ? 'chop it' : prep === 'cook' ? 'cook it' : 'ready', x + 62, y + h / 2 + 12, 12, '#ffd9a0', 'left');
  } else if (s.kind === 'board') {
    ctx.fillStyle = '#8f5a2e';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#e8c795';
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 8);
    ctx.fill();
    const board = world.boards.find((b) => b.station === s);
    text(ctx, 'CHOP', x + w / 2, y + 16, 13, '#8f5a2e');
    if (board.item) {
      drawItem(ctx, board.item.item, x + w / 2 - 18, y + h / 2 + 8, 46, board.item.state);
      if (board.item.state === 'raw') drawProgressRing(ctx, x + w / 2 + 52, y + h / 2 + 8, 16, board.progress, '#d94f30');
      else text(ctx, 'CHOPPED!', x + w / 2 + 52, y + h / 2 + 8, 11, '#5aa843');
    } else {
      ctx.strokeStyle = '#c9a06b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 34, y + h / 2 + 20);
      ctx.lineTo(x + w / 2 + 34, y + h / 2 - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 34, y + h / 2 - 8);
      ctx.lineTo(x + w / 2 + 52, y + h / 2 - 2);
      ctx.stroke();
    }
  } else if (s.kind === 'stove') {
    ctx.fillStyle = COLORS.steelDark;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#3c4148';
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 8);
    ctx.fill();
    const stove = world.stoves.find((v) => v.station === s);
    const cooking = stove.item && !stove.done && !stove.burnt;
    ctx.fillStyle = cooking ? '#ff7a3c' : '#22262b';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 + 6, 34, 0, Math.PI * 2);
    ctx.fill();
    if (cooking) {
      ctx.fillStyle = '#ffb37a';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2 + 6, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, 'STOVE', x + w / 2, y + 16, 13, '#cfd6dd');
    if (stove.item) {
      drawItem(ctx, stove.item.item, x + w / 2, y + h / 2 + 6, 44, stove.item.state);
      const frac = Math.min(1, stove.progress);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      rr(ctx, x + 14, y + h - 16, w - 28, 8, 4);
      ctx.fill();
      ctx.fillStyle = stove.burnt ? '#d94f30' : stove.done ? '#5aa843' : '#f2c230';
      rr(ctx, x + 14, y + h - 16, (w - 28) * frac, 8, 4);
      ctx.fill();
      if (stove.done && !stove.burnt) text(ctx, 'READY!', x + w / 2, y - 12, 13, '#5aa843');
      if (stove.burnt) text(ctx, 'BURNT!', x + w / 2, y - 12, 13, '#d94f30');
    }
  } else if (s.kind === 'plate') {
    ctx.fillStyle = COLORS.steel;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#e8edf0';
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 8);
    ctx.fill();
    text(ctx, 'PLATE', x + w / 2, y + 16, 13, '#6e7a86');
    const dish = plateRecipe(world.plate);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 + 12, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dish ? '#5aa843' : '#c9b896';
    ctx.lineWidth = dish ? 4 : 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2 + 12, 34, 0, Math.PI * 2);
    ctx.stroke();
    world.plate.forEach((c, i) => {
      const ang = (i / Math.max(1, world.plate.length)) * Math.PI * 2 - Math.PI / 2;
      drawItem(ctx, c.item, x + w / 2 + Math.cos(ang) * 16, y + h / 2 + 12 + Math.sin(ang) * 16, 26, c.state);
    });
    if (dish) text(ctx, `${dish.name} READY`, x + w / 2, y + h - 14, 13, '#3f8f3a');
    else if (world.plate.length > 0) text(ctx, `${world.plate.length}/4 on plate`, x + w / 2, y + h - 14, 12, '#6e7a86');
  } else if (s.kind === 'trash') {
    ctx.fillStyle = '#4a4f55';
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#33373c';
    rr(ctx, x + 10, y + 14, w - 20, h - 28, 6);
    ctx.fill();
    text(ctx, 'TRASH', x + w / 2, y + h - 12, 12, '#cfd6dd');
  } else if (s.kind === 'window') {
    const hasDish = world.chef.hand.some((h) => h.item === 'dish');
    ctx.fillStyle = hasDish ? '#5aa843' : COLORS.woodDark;
    rr(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#fff6e5';
    rr(ctx, x + 6, y + 6, w - 12, h - 12, 8);
    ctx.fill();
    text(ctx, 'SERVE  ▲', x + w / 2, y + h / 2 - 8, 20, hasDish ? '#3f8f3a' : '#8f5a2e');
    text(ctx, 'bring the finished dish here', x + w / 2, y + h / 2 + 16, 12, '#8f5a2e');
  }
  ctx.restore();
}

function drawChef(ctx, world) {
  const c = world.chef;
  const bob = c.moving ? Math.sin(c.bob) * 2 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 22, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // body (apron)
  ctx.fillStyle = '#fff6e5';
  rr(ctx, c.x - 20, c.y - 6 + bob, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#4a90c2';
  rr(ctx, c.x - 20, c.y + 14 + bob, 40, 8, 4);
  ctx.fill();
  // head + toque
  ctx.fillStyle = '#f2c49b';
  ctx.beginPath();
  ctx.arc(c.x, c.y - 18 + bob, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c.x - 9, c.y - 30 + bob, 9, 0, Math.PI * 2);
  ctx.arc(c.x, c.y - 34 + bob, 11, 0, Math.PI * 2);
  ctx.arc(c.x + 9, c.y - 30 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(c.x - 13, c.y - 32 + bob, 26, 8);
  // eyes
  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.arc(c.x - 5 + c.dir * 2, c.y - 18 + bob, 2, 0, Math.PI * 2);
  ctx.arc(c.x + 5 + c.dir * 2, c.y - 18 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  // carried items above the head
  c.hand.forEach((h, i) => {
    const hx = c.x + (i - (c.hand.length - 1) / 2) * 26;
    const hy = c.y - 52 + bob;
    ctx.fillStyle = 'rgba(255,246,229,0.92)';
    ctx.beginPath();
    ctx.arc(hx, hy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9b896';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (h.item === 'dish') drawItem(ctx, 'dish', hx, hy, 24, 'dish');
    else drawItem(ctx, h.item, hx, hy, 24, h.state);
  });
  ctx.restore();
}

function drawOrders(ctx, world) {
  const y0 = 8;
  text(ctx, 'ORDERS', 16, y0 + 10, 13, '#ffd9a0', 'left');
  world.orders.forEach((o, i) => {
    const x = 16 + i * 224;
    const y = y0 + 18;
    const w = 214;
    const h = 66;
    const frac = Math.max(0, o.patience / o.maxPatience);
    ctx.fillStyle = 'rgba(255,246,229,0.96)';
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = frac < 0.3 ? '#d94f30' : '#c9b896';
    ctx.lineWidth = frac < 0.3 ? 3 : 1.5;
    rr(ctx, x, y, w, h, 8);
    ctx.stroke();
    text(ctx, o.recipe.name, x + 10, y + 13, 14, '#3a2418', 'left');
    text(ctx, `$${o.recipe.coins}`, x + w - 10, y + 13, 14, '#8a6d1f', 'right');
    o.recipe.needs.forEach((n, j) => {
      drawItem(ctx, n.item, x + 22 + j * 26, y + 38, 22, n.state);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    rr(ctx, x + 10, y + 54, w - 20, 6, 3);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#5aa843' : frac > 0.25 ? '#f2c230' : '#d94f30';
    rr(ctx, x + 10, y + 54, (w - 20) * frac, 6, 3);
    ctx.fill();
  });
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#5a3220';
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.fillStyle = '#6e3d26';
  ctx.fillRect(0, HUD_HEIGHT - 4, FIELD.width, 4);
  drawOrders(ctx, world);
  // shift timer
  const tx = 940;
  const tw = 180;
  const frac = world.timeLeft / 150;
  text(ctx, 'SHIFT', tx + tw / 2, 18, 12, '#ffd9a0');
  const mm = Math.floor(world.timeLeft / 60);
  const ss = Math.floor(world.timeLeft % 60);
  text(ctx, `${mm}:${String(ss).padStart(2, '0')}`, tx + tw / 2, 40, 22, frac < 0.15 ? '#ff8a70' : '#fff6e5');
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, tx, 56, tw, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac < 0.15 ? '#d94f30' : '#f2c230';
  rr(ctx, tx, 56, tw * frac, 8, 4);
  ctx.fill();
  // coins, combo, level, strikes
  ctx.fillStyle = '#f2c230';
  ctx.beginPath();
  ctx.arc(1140, 22, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6d1f';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 1140, 23);
  text(ctx, `${world.coins}`, 1158, 22, 20, '#f2c230', 'left');
  text(ctx, `LV ${world.level}`, 1150, 48, 15, '#fff6e5', 'left');
  if (world.combo >= 2) text(ctx, `COMBO x${world.combo}`, 1150, 72, 15, '#7cc45e', 'left');
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < 3 - world.strikes ? '#d94f30' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(952 + i * 24, 84, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'missed', 1024, 84, 11, '#ffd9a0', 'left');
}

function hintFor(world, station) {
  if (!station) return '';
  const chef = world.chef;
  if (station.kind === 'crate') {
    return chef.hand.length >= 3 ? 'Hands full!' : `E — Take ${ITEMS[station.item].name}`;
  }
  if (station.kind === 'board') {
    const b = world.boards.find((x) => x.station === station);
    if (!b.item) return 'E — Put something to chop';
    if (b.item.state === 'raw') return 'HOLD E — Chop!';
    return 'E — Pick up chopped';
  }
  if (station.kind === 'stove') {
    const s = world.stoves.find((x) => x.station === station);
    if (!s.item) return 'E — Put something to cook';
    if (s.burnt) return 'E — Take it (burnt!)';
    if (s.done) return 'E — Take it, ready!';
    return 'Cooking… wait for the ding';
  }
  if (station.kind === 'plate') {
    const dish = plateRecipe(world.plate);
    if (dish) return 'E — Pick up the dish!';
    if (chef.hand.length > 0) return 'E — Add to plate (Q clears)';
    if (world.plate.length > 0) return 'E — Take back • Q — Clear';
    return 'Build a dish here';
  }
  if (station.kind === 'trash') return 'E — Throw away (Q clears plate)';
  if (station.kind === 'window') {
    return chef.hand.some((h) => h.item === 'dish') ? 'E — SERVE IT!' : 'Bring a finished dish here';
  }
  return '';
}

function drawHint(ctx, world, station) {
  if (!station) return;
  const hint = hintFor(world, station);
  if (!hint) return;
  const x = station.x + station.w / 2;
  const y = station.y - 26;
  ctx.font = 'bold 15px system-ui, sans-serif';
  const w = ctx.measureText(hint).width + 20;
  ctx.fillStyle = 'rgba(58,36,24,0.92)';
  rr(ctx, x - w / 2, y - 15, w, 30, 8);
  ctx.fill();
  text(ctx, hint, x, y, 15, '#fff6e5');
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, p.life * 0.5)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of world.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    shadowText(ctx, f.text, f.x, f.y, 20, f.color);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(40,20,10,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  shadowText(ctx, 'DAPUR KILAT', 640, 170, 84, '#f2c230');
  text(ctx, 'WARUNG RUSH  •  cook fast, serve faster', 640, 226, 22, '#fff6e5');
  ctx.fillStyle = 'rgba(255,246,229,0.95)';
  rr(ctx, 340, 270, 600, 210, 14);
  ctx.fill();
  text(ctx, 'HOW TO PLAY', 640, 296, 18, '#8f5a2e');
  const lines = [
    'Move: WASD / arrows, or click the floor.  Interact: E or click a station.',
    'Take ingredients from the crates, chop on the boards, cook on the stoves.',
    'Build the dish on the PLATE, carry it to SERVE before the order runs out.',
    '3 missed orders ends the shift. Combos pay more. Q clears the plate, P pauses.',
  ];
  lines.forEach((l, i) => text(ctx, l, 640, 326 + i * 26, 15, '#3a2418'));
  text(ctx, 'RECIPES:  Cheese Toast  •  Garden Salad  •  Beef Burger  •  Noodle Bowl  •  Mega Burger', 640, 452, 14, '#5a3220');
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  shadowText(ctx, 'CLICK OR PRESS ENTER TO START', 640, 540, 26, '#fff6e5');
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `Best shift: ${best} coins`, 640, 580, 16, '#ffd9a0');
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(40,20,10,0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const title = world.overReason === 'strikes' ? 'TOO MANY MISSED ORDERS!' : 'SHIFT OVER!';
  shadowText(ctx, title, 640, 220, 56, '#f2c230');
  text(ctx, `Coins earned: ${world.coins}`, 640, 300, 26, '#fff6e5');
  text(ctx, `Dishes served: ${world.served}    Best combo: x${world.bestCombo}    Level reached: ${world.level}`, 640, 344, 20, '#ffd9a0');
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  shadowText(ctx, 'PRESS R OR CLICK TO COOK AGAIN', 640, 420, 24, '#fff6e5');
  ctx.globalAlpha = 1;
}

export function draw(ctx, world, screen, best, paused) {
  // floor
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = COLORS.floorB;
  const tile = 64;
  for (let y = FLOOR_TOP; y < FIELD.height; y += tile) {
    for (let x = 0; x < FIELD.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  // wall band under the HUD
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, HUD_HEIGHT, FIELD.width, 8);

  for (const s of STATIONS) drawStation(ctx, world, s);
  drawParticles(ctx, world);
  drawChef(ctx, world);
  drawHud(ctx, world);

  if (screen === SCREEN_PLAY) {
    let station = null;
    if (world.chef) {
      let bestD = Infinity;
      for (const s of STATIONS) {
        const nx = Math.max(s.x, Math.min(world.chef.x, s.x + s.w));
        const ny = Math.max(s.y, Math.min(world.chef.y, s.y + s.h));
        const d = (world.chef.x - nx) ** 2 + (world.chef.y - ny) ** 2;
        if (d < bestD) {
          bestD = d;
          station = s;
        }
      }
      if (bestD > 52 * 52) station = null;
    }
    drawHint(ctx, world, station);
  }
  if (paused && screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(40,20,10,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    shadowText(ctx, 'PAUSED — press P to continue', 640, 360, 32, '#fff6e5');
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
  if (screen === SCREEN_OVER) drawOver(ctx, world);
}

export function recipeNames() {
  return RECIPES.map((r) => r.name).join('  •  ');
}
