// Dapur Kilat — world. One clear job: the whole simulation — chef, stations,
// orders, plating, serving, scoring, strikes and the shift timer. Rendering
// never lives here; input only arrives as one plain object per step.

import {
  CHEF, CHOP_SECONDS, COOK_SECONDS, BURN_SECONDS, FIELD, FLOOR_TOP,
  ITEMS, MAX_ORDERS, MAX_STRIKES, RECIPES, SHIFT_SECONDS, STATIONS,
  orderIntervalSeconds, orderPatienceSeconds, recipesForLevel,
} from './config.js';
import { mulberry32, pick } from './random.js';

const RANGE = 52; // how close the chef must be to work a station
const REPEAT_SECONDS = 0.32; // holding E near a crate keeps taking

export function createWorld(seed) {
  const rand = mulberry32(seed || 1);
  const boards = STATIONS.filter((s) => s.kind === 'board').map((s) => ({
    station: s, item: null, progress: 0, chopped: false,
  }));
  const stoves = STATIONS.filter((s) => s.kind === 'stove').map((s) => ({
    station: s, item: null, progress: 0, done: false, burnt: false, dinged: false,
  }));
  return {
    seed: seed || 1,
    rand,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    level: 1,
    served: 0,
    servedThisLevel: 0,
    strikes: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    chef: { x: 640, y: 600, dir: 1, moving: false, hand: [], bob: 0 },
    boards,
    stoves,
    plate: [],
    orders: [],
    orderSeq: 0,
    nextOrderIn: 2.5,
    particles: [],
    floats: [],
    events: [],
    over: false,
    overReason: '',
    crateRepeat: 0,
    armedNear: false,
    tickedSecond: -1,
  };
}

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}

export function stationAtPoint(p) {
  for (const s of STATIONS) {
    if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) return s;
  }
  return null;
}

// Point just outside a station, on its open side (the `approach` side in
// config): where the chef stands to work it. Fixed per station, never
// recomputed from the chef's position, so the target never flip-flops
// around a corner and wedges the chef between two counters.
export function approachPoint(station, from) {
  const gap = CHEF.radius + 10;
  const side = station.approach || 'S';
  if (side === 'E') {
    return {
      x: station.x + station.w + gap,
      y: Math.max(station.y + 10, Math.min(station.y + station.h - 10, from.y)),
    };
  }
  if (side === 'W') {
    return {
      x: station.x - gap,
      y: Math.max(station.y + 10, Math.min(station.y + station.h - 10, from.y)),
    };
  }
  if (side === 'N') {
    return {
      x: Math.max(station.x + 10, Math.min(station.x + station.w - 10, from.x)),
      y: station.y - gap,
    };
  }
  return {
    x: Math.max(station.x + 10, Math.min(station.x + station.w - 10, from.x)),
    y: station.y + station.h + gap,
  };
}

function nearStation(world, station) {
  const c = world.chef;
  const s = station;
  const nx = Math.max(s.x, Math.min(c.x, s.x + s.w));
  const ny = Math.max(s.y, Math.min(c.y, s.y + s.h));
  const dx = c.x - nx;
  const dy = c.y - ny;
  return dx * dx + dy * dy <= RANGE * RANGE;
}

function nearestStation(world) {
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    if (!nearStation(world, s)) continue;
    const dx = world.chef.x - (s.x + s.w / 2);
    const dy = world.chef.y - (s.y + s.h / 2);
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function handHas(world, item, state) {
  return world.chef.hand.some((h) => h.item === item && h.state === state);
}

function takeFromHand(world, item, state) {
  const hand = world.chef.hand;
  for (let i = hand.length - 1; i >= 0; i -= 1) {
    if (hand[i].item === item && hand[i].state === state) return hand.splice(i, 1)[0];
  }
  return null;
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color: color || '#fff6e5', life: 1.2 });
}

function addSteam(world, x, y) {
  world.particles.push({ x, y, vy: -26 - Math.random() * 14, life: 0.9, size: 5 + Math.random() * 5 });
}

export function plateRecipe(plate) {
  if (plate.length === 0) return null;
  for (const r of RECIPES) {
    if (r.needs.length !== plate.length) continue;
    const rest = plate.slice();
    let ok = true;
    for (const need of r.needs) {
      const i = rest.findIndex((c) => c.item === need.item && c.state === need.state);
      if (i < 0) {
        ok = false;
        break;
      }
      rest.splice(i, 1);
    }
    if (ok) return r;
  }
  return null;
}

function spawnOrder(world) {
  const pool = recipesForLevel(world.level);
  const recipe = pick(world.rand, pool);
  const patience = orderPatienceSeconds(world.level);
  world.orderSeq += 1;
  world.orders.push({
    id: world.orderSeq,
    recipe,
    patience,
    maxPatience: patience,
    born: world.time,
  });
  world.nextOrderIn = orderIntervalSeconds(world.level);
  world.events.push('order');
}

function serveDish(world, dish) {
  const order = world.orders.find((o) => o.recipe.id === dish.recipe);
  if (!order) {
    world.events.push('error');
    return false;
  }
  world.orders = world.orders.filter((o) => o !== order);
  const tipRatio = 0.5 * (order.patience / order.maxPatience);
  const mult = 1 + Math.min(1, world.combo * 0.1);
  const earned = Math.round(order.recipe.coins * (1 + tipRatio) * mult);
  world.coins += earned;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.served += 1;
  world.servedThisLevel += 1;
  addFloat(world, 1080, 470, `+${earned} coins`, '#f2c230');
  world.events.push('serve');
  world.events.push('coin');
  if (world.servedThisLevel >= 4) {
    world.servedThisLevel = 0;
    world.level += 1;
    addFloat(world, 640, 300, `LEVEL ${world.level}!`, '#5aa843');
    world.events.push('level');
  }
  return true;
}

// One press (edge) at a station.
function pressStation(world, station) {
  const chef = world.chef;
  if (station.kind === 'crate') {
    if (chef.hand.length >= CHEF.handMax) {
      world.events.push('error');
      return;
    }
    chef.hand.push({ item: station.item, state: 'raw' });
    world.events.push('pickup');
    return;
  }
  if (station.kind === 'board') {
    const board = world.boards.find((b) => b.station === station);
    if (!board.item) {
      const raw = chef.hand.find((h) => ITEMS[h.item].prep === 'chop' && h.state === 'raw');
      if (raw) {
        takeFromHand(world, raw.item, 'raw');
        board.item = { item: raw.item, state: 'raw' };
        board.progress = 0;
        world.events.push('place');
      }
      return;
    }
    if (board.item.state === 'chopped' && chef.hand.length < CHEF.handMax) {
      chef.hand.push(board.item);
      board.item = null;
      board.progress = 0;
      world.events.push('pickup');
    }
    return;
  }
  if (station.kind === 'stove') {
    const stove = world.stoves.find((s) => s.station === station);
    if (!stove.item) {
      const raw = chef.hand.find((h) => ITEMS[h.item].prep === 'cook' && h.state === 'raw');
      if (raw) {
        takeFromHand(world, raw.item, 'raw');
        stove.item = { item: raw.item, state: 'raw' };
        stove.progress = 0;
        stove.done = false;
        stove.burnt = false;
        stove.dinged = false;
        world.events.push('place');
      }
      return;
    }
    if ((stove.done || stove.burnt) && chef.hand.length < CHEF.handMax) {
      chef.hand.push(stove.item);
      stove.item = null;
      stove.progress = 0;
      stove.done = false;
      stove.burnt = false;
      stove.dinged = false;
      world.events.push('pickup');
    }
    return;
  }
  if (station.kind === 'plate') {
    const dish = plateRecipe(world.plate);
    if (dish && chef.hand.length < CHEF.handMax) {
      world.plate = [];
      chef.hand.push({ item: 'dish', recipe: dish.id, state: 'dish' });
      world.events.push('pickup');
      return;
    }
    if (chef.hand.length > 0 && world.plate.length < 4) {
      const top = chef.hand[chef.hand.length - 1];
      if (top.item === 'dish') {
        world.events.push('error');
        return;
      }
      chef.hand.pop();
      world.plate.push(top);
      world.events.push('place');
      return;
    }
    if (chef.hand.length === 0 && world.plate.length > 0) {
      chef.hand.push(world.plate.pop());
      world.events.push('pickup');
    }
    return;
  }
  if (station.kind === 'trash') {
    if (chef.hand.length > 0) {
      chef.hand.pop();
      world.events.push('place');
    }
    return;
  }
  if (station.kind === 'window') {
    const dish = chef.hand.find((h) => h.item === 'dish');
    if (!dish) {
      world.events.push('error');
      return;
    }
    if (serveDish(world, dish)) {
      takeFromHand(world, 'dish', 'dish');
    }
  }
}

// Holding interact: chopping advances, crates repeat-take.
function holdStation(world, station, dt) {
  const chef = world.chef;
  if (station.kind === 'board') {
    const board = world.boards.find((b) => b.station === station);
    if (board.item && board.item.state === 'raw') {
      board.progress += dt / CHOP_SECONDS;
      if (Math.random() < dt * 8) world.events.push('chop');
      if (board.progress >= 1) {
        board.item.state = 'chopped';
        board.progress = 1;
        world.events.push('chopdone');
        if (chef.hand.length < CHEF.handMax) {
          chef.hand.push(board.item);
          board.item = null;
          board.progress = 0;
          world.events.push('pickup');
        }
      }
    }
    return;
  }
  if (station.kind === 'crate') {
    world.crateRepeat += dt;
    if (world.crateRepeat >= REPEAT_SECONDS) {
      world.crateRepeat = 0;
      if (chef.hand.length < CHEF.handMax) {
        chef.hand.push({ item: station.item, state: 'raw' });
        world.events.push('pickup');
      }
    }
  }
}

function collide(world, nx, ny) {
  const r = CHEF.radius;
  const x = Math.max(8 + r, Math.min(FIELD.width - 8 - r, nx));
  const y = Math.max(FLOOR_TOP + r, Math.min(FIELD.height - 8 - r, ny));
  for (const s of STATIONS) {
    // Circle vs rect: clamp the centre into the rect itself, then compare
    // the distance to the radius. (Inflating the rect first AND comparing
    // to r doubles the blocked zone and seals the kitchen corridors.)
    const ox = Math.max(s.x, Math.min(x, s.x + s.w));
    const oy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - ox;
    const dy = y - oy;
    if (dx * dx + dy * dy < r * r) return null;
  }
  return { x, y };
}

// --- waypoint routing: the kitchen's counters block straight lines, so a
// click (or the pilot) routes through the open corridors instead.
const WAYPOINTS = [
  { x: 200, y: 665 }, // A bottom-left
  { x: 640, y: 665 }, // B bottom-centre
  { x: 1252, y: 665 }, // C bottom-right
  { x: 1252, y: 390 }, // D mid-right
  { x: 780, y: 390 }, // E mid-centre
  { x: 260, y: 390 }, // F mid-left
];
const EDGES = [[0, 1], [1, 2], [0, 5], [2, 3], [3, 4], [4, 5]];

function pointFree(x, y) {
  const r = CHEF.radius;
  if (x < 8 + r || x > FIELD.width - 8 - r || y < FLOOR_TOP + r || y > FIELD.height - 8 - r) return false;
  for (const s of STATIONS) {
    const ox = Math.max(s.x, Math.min(x, s.x + s.w));
    const oy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - ox;
    const dy = y - oy;
    if (dx * dx + dy * dy < r * r) return false;
  }
  return true;
}

function lineClear(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d / 12));
  for (let i = 0; i <= n; i += 1) {
    if (!pointFree(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  }
  return true;
}

function nearestWaypoint(p) {
  let best = -1;
  let bestD = Infinity;
  WAYPOINTS.forEach((w, i) => {
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d < bestD && lineClear(p, w)) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function findRoute(from, to) {
  if (lineClear(from, to)) return [{ x: to.x, y: to.y }];
  const start = nearestWaypoint(from);
  const goal = nearestWaypoint(to);
  if (start < 0 || goal < 0) return [{ x: to.x, y: to.y }];
  const prev = new Array(WAYPOINTS.length).fill(-1);
  const queue = [start];
  prev[start] = start;
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === goal) break;
    for (const [a, b] of EDGES) {
      const nxt = a === cur ? b : b === cur ? a : -1;
      if (nxt >= 0 && prev[nxt] < 0) {
        prev[nxt] = cur;
        queue.push(nxt);
      }
    }
  }
  if (prev[goal] < 0) return [{ x: to.x, y: to.y }];
  const path = [];
  let cur = goal;
  while (cur !== start) {
    path.unshift({ x: WAYPOINTS[cur].x, y: WAYPOINTS[cur].y });
    cur = prev[cur];
  }
  path.unshift({ x: WAYPOINTS[start].x, y: WAYPOINTS[start].y });
  path.push({ x: to.x, y: to.y });
  return path;
}

function moveChef(world, input, dt) {
  const chef = world.chef;
  let mx = input.mx || 0;
  let my = input.my || 0;
  if (mx !== 0 || my !== 0) {
    chef.route = [];
    chef.routeGoal = null;
  } else if (input.target) {
    if (!chef.routeGoal || Math.hypot(input.target.x - chef.routeGoal.x, input.target.y - chef.routeGoal.y) > 24 || chef.route.length === 0) {
      chef.route = findRoute({ x: chef.x, y: chef.y }, input.target);
      chef.routeGoal = { x: input.target.x, y: input.target.y };
      chef.stuck = 0;
      chef.lastD = Infinity;
    }
    const next = chef.route[0];
    if (next) {
      const dx = next.x - chef.x;
      const dy = next.y - chef.y;
      const d = Math.hypot(dx, dy);
      if (d < 10) {
        chef.route.shift();
        chef.lastD = Infinity;
        chef.stuck = 0;
      } else {
        const dd = Math.hypot(dx, dy);
        mx = dx / dd;
        my = dy / dd;
        if (d < (chef.lastD ?? Infinity) - 0.5) {
          chef.lastD = d;
          chef.stuck = 0;
        } else {
          chef.stuck = (chef.stuck || 0) + dt;
          if (chef.stuck > 1.5) {
            chef.route = [];
            chef.routeGoal = null;
          }
        }
      }
    }
  }
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    chef.dir = mx < -0.2 ? -1 : mx > 0.2 ? 1 : chef.dir;
    chef.moving = true;
    chef.bob += dt * 12;
    const sp = CHEF.speed * dt;
    const tryX = collide(world, chef.x + mx * sp, chef.y);
    if (tryX) chef.x = tryX.x;
    const tryY = collide(world, chef.x, chef.y + my * sp);
    if (tryY) chef.y = tryY.y;
  } else {
    chef.moving = false;
  }
}

export function step(world, input, dt) {
  if (world.over) return;
  world.time += dt;
  world.timeLeft = Math.max(0, SHIFT_SECONDS - world.time);
  if (world.timeLeft <= 0) {
    world.over = true;
    world.overReason = 'shift';
    world.events.push('over');
    return;
  }

  moveChef(world, input, dt);

  // Orders.
  world.nextOrderIn -= dt;
  if (world.nextOrderIn <= 0 && world.orders.length < MAX_ORDERS) spawnOrder(world);
  for (const o of world.orders) o.patience -= dt;
  const expired = world.orders.filter((o) => o.patience <= 0);
  for (const o of expired) {
    world.orders = world.orders.filter((x) => x !== o);
    world.strikes += 1;
    world.combo = 0;
    addFloat(world, 640, 200, 'Order expired!', '#d94f30');
    world.events.push('expire');
    if (world.strikes >= MAX_STRIKES) {
      world.over = true;
      world.overReason = 'strikes';
      world.events.push('over');
      return;
    }
  }

  // Low-patience tick each whole second.
  const sec = Math.floor(world.timeLeft);
  if (sec !== world.tickedSecond) {
    world.tickedSecond = sec;
    if (world.timeLeft <= 10 && world.timeLeft > 0) world.events.push('tick');
  }

  // Stoves cook on their own.
  for (const stove of world.stoves) {
    if (!stove.item || stove.burnt) continue;
    stove.progress += dt / COOK_SECONDS;
    if (Math.random() < dt * 6) {
      const s = stove.station;
      addSteam(world, s.x + s.w / 2 + (Math.random() - 0.5) * 60, s.y + 10);
    }
    if (!stove.done && stove.progress >= 1) {
      stove.done = true;
      if (!stove.dinged) {
        stove.dinged = true;
        world.events.push('cookdone');
      }
    }
    if (stove.progress >= 1 + BURN_SECONDS / COOK_SECONDS) {
      stove.item.state = 'burnt';
      stove.burnt = true;
      world.events.push('expire');
    }
  }

  // Interaction. Keyboard/mouse press and hold work a station; a station the
  // player clicked (or the pilot armed) also fires once on arrival, and an
  // armed chopping board keeps chopping while the chef stands at it.
  let station = null;
  let armedNear = false;
  if (input.targetStation) {
    const armed = stationById(input.targetStation);
    if (armed && nearStation(world, armed)) {
      station = armed;
      armedNear = true;
    }
  }
  if (!station) station = nearestStation(world);
  if (station) {
    let pressed = false;
    if (armedNear && !world.armedNear && !input.noArrivalPress) {
      pressStation(world, station);
      pressed = true;
    }
    if (!pressed && input.interactPressed) pressStation(world, station);
    if (input.interactHeld) holdStation(world, station, dt);
    else if (armedNear && station.kind === 'board') holdStation(world, station, dt);
  }
  world.armedNear = armedNear;
  if (input.clearPressed && world.plate.length > 0) {
    world.plate = [];
    world.events.push('place');
  }

  // Particles and floats age.
  for (const p of world.particles) {
    p.y += p.vy * dt;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  Object.keys(fresh).forEach((k) => {
    world[k] = fresh[k];
  });
}

