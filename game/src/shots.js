// Dapur Kilat — screenshot scenes. One clear job: stage deterministic frames
// of the real game (?shot=start|play|rush|end) by playing the real rules
// forward from a fresh world with a scripted pilot, so each screenshot is
// what a short game really looks like and the same seed gives the same frame.

import { CHEF, ITEMS, RECIPES, STATIONS } from './config.js';
import { approachPoint, createWorld, plateRecipe, resetWorld, stationById, step } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const STEP = 1 / 60;
const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const RUSH_SECONDS = 70;
const END_LIMIT_SECONDS = 600;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function boardFor(world, stationId) {
  return world.boards.find((b) => b.station.id === stationId);
}
function stoveFor(world, stationId) {
  return world.stoves.find((s) => s.station.id === stationId);
}

function crateStation(item) {
  return STATIONS.find((s) => s.kind === 'crate' && s.item === item);
}

// What the pilot wants to do right now: a station and an action.
function decideGoal(world) {
  const chef = world.chef;
  const dishInHand = chef.hand.find((h) => h.item === 'dish');
  if (dishInHand) return { station: stationById('window'), action: 'serve' };

  const dish = plateRecipe(world.plate);
  if (dish) return { station: stationById('plate'), action: 'pickup' };

  // Burnt food first: pick it up, then bin it.
  const burnt = world.stoves.find((s) => s.item && s.item.state === 'burnt');
  if (burnt) {
    if (chef.hand.some((h) => h.item === burnt.item.item && h.state === 'burnt')) {
      return { station: stationById('trash'), action: 'trash' };
    }
    return { station: burnt.station, action: 'pickup' };
  }

  const orders = world.orders;
  if (orders.length === 0) return { station: null, action: 'idle' };
  const order = orders[0];

  // Plate anything already carried that this order needs.
  const onPlate = world.plate.slice();
  for (const h of chef.hand) {
    if (h.item === 'dish') continue;
    const need = order.recipe.needs.find(
      (n) => n.item === h.item && n.state === h.state && !onPlate.some((c) => c.item === n.item && c.state === n.state),
    );
    if (need) {
      onPlate.push({ item: h.item, state: h.state });
      return { station: stationById('plate'), action: 'place' };
    }
  }

  // The plate holds something no active order needs: clear it.
  const neededEverywhere = new Set();
  for (const o of orders) {
    for (const n of o.recipe.needs) neededEverywhere.add(`${n.item}:${n.state}`);
  }
  if (world.plate.some((c) => !neededEverywhere.has(`${c.item}:${c.state}`))) {
    return { station: stationById('plate'), action: 'clear' };
  }

  // First missing component of the oldest order.
  const missing = order.recipe.needs.find(
    (n) => !onPlate.some((c) => c.item === n.item && c.state === n.state),
  );
  if (!missing) return { station: stationById('plate'), action: 'place' };

  // It is already on a board or a stove: go finish it.
  for (const b of world.boards) {
    if (b.item && b.item.item === missing.item) {
      return { station: b.station, action: b.item.state === 'raw' ? 'chop' : 'pickup' };
    }
  }
  for (const s of world.stoves) {
    if (s.item && s.item.item === missing.item) {
      if (s.item.state === 'burnt') return { station: s.station, action: 'pickup' };
      return { station: s.station, action: s.done ? 'pickup' : 'wait' };
    }
  }
  // It is in hand in the wrong state: prep it.
  const inHand = chef.hand.find((h) => h.item === missing.item);
  if (inHand) {
    if (ITEMS[missing.item].prep === 'chop') {
      const free = world.boards.find((b) => !b.item);
      if (free) return { station: free.station, action: 'place' };
      return { station: world.boards[0].station, action: 'chop' };
    }
    if (ITEMS[missing.item].prep === 'cook') {
      const free = world.stoves.find((s) => !s.item);
      if (free) return { station: free.station, action: 'place' };
      return { station: world.stoves[0].station, action: 'wait' };
    }
  }
  // Otherwise fetch it from its crate.
  return { station: crateStation(missing.item), action: 'take' };
}

// One pilot step: walk to the goal station; the world fires the station's
// action once on arrival (and keeps chopping an armed board), so the pilot
// only steers. 'clear' is the one action the pilot fires itself.
function pilotInput(world, mem, dt) {
  const input = {
    mx: 0, my: 0, interactHeld: false, interactPressed: false,
    clearPressed: false, pausePressed: false, mutePressed: false,
    startPressed: false, restartPressed: false, target: null, targetStation: null,
    // The pilot presses explicitly on arrival: the world's arrival-edge
    // press does not re-fire when the action at the SAME station changes
    // (place the last ingredient, then pick the finished dish up).
    noArrivalPress: true,
  };
  const goal = decideGoal(world);
  if (!goal.station) return input;
  const chef = world.chef;
  // Cache the approach point per goal station: recomputing it every step
  // from the chef's position makes the target flip around corners.
  if (mem.goalStation !== goal.station.id) {
    mem.goalStation = goal.station.id;
    mem.point = approachPoint(goal.station, chef);
    mem.cleared = false;
    mem.pressedFor = null;
  }
  const point = mem.point;
  input.target = point;
  input.targetStation = goal.station.id;
  const goalKey = `${goal.station.id}:${goal.action}`;
  if (goal.action === 'clear' && dist(chef, point) < 16 && !mem.cleared) {
    mem.cleared = true;
    input.clearPressed = true;
  }
  if (goal.action !== 'wait' && goal.action !== 'clear' && mem.pressedFor !== goalKey && dist(chef, point) < 16) {
    mem.pressedFor = goalKey;
    input.interactPressed = true;
  }
  return input;
}

// A hurried, careless pilot for the end scene: wanders, never interacts,
// so orders expire and the shift ends the way a bad shift does.
function badPilotInput(world, mem, dt) {
  mem.t = (mem.t || 0) + dt;
  const input = {
    mx: 0, my: 0, interactHeld: false, interactPressed: false,
    clearPressed: false, pausePressed: false, mutePressed: false,
    startPressed: false, restartPressed: false, target: null, targetStation: null,
  };
  if (mem.t > (mem.nextTurn || 0)) {
    mem.nextTurn = mem.t + 1.5;
    const a = Math.random() * Math.PI * 2;
    input.target = {
      x: 300 + Math.random() * 700,
      y: 200 + Math.random() * 400,
    };
    mem.target = input.target;
    void a;
  }
  input.target = mem.target || { x: 640, y: 500 };
  return input;
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      step(world, { mx: 0, my: 0, interactHeld: false, interactPressed: false, target: null }, STEP);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const mem = {};
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'rush' ? RUSH_SECONDS : PLAY_SECONDS;
  const pilot = name === 'end' ? badPilotInput : pilotInput;
  for (let i = 0; i < limit / STEP; i += 1) {
    if (world.over) break;
    step(world, pilot(world, mem, STEP), STEP);
  }
  const over = world.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.coins };
}

export function recipeList() {
  return RECIPES;
}

