// Dapur Kilat — configuration: field, recipes, stations, timings.
// One clear job: every number the game balances on lives here.

export const FIELD = { width: 1280, height: 720 };
export const HUD_HEIGHT = 96;
export const FLOOR_TOP = 104;
export const STEP = 1 / 60;

export const CHEF = {
  radius: 24,
  speed: 265,
  handMax: 3,
};

export const SHIFT_SECONDS = 150;
export const MAX_STRIKES = 3;
export const MAX_ORDERS = 4;
export const SERVE_FOR_LEVEL = 4;

// Ingredients: chop = needs the board, cook = needs the stove, none = ready as-is.
export const ITEMS = {
  tomato: { name: 'Tomato', prep: 'chop', color: '#e2483d', price: 0 },
  lettuce: { name: 'Lettuce', prep: 'chop', color: '#5aa843', price: 0 },
  bread: { name: 'Bread', prep: 'none', color: '#e0a458', price: 0 },
  cheese: { name: 'Cheese', prep: 'none', color: '#f2c230', price: 0 },
  noodle: { name: 'Noodle', prep: 'cook', color: '#f2d06b', price: 0 },
  patty: { name: 'Patty', prep: 'cook', color: '#8a5a3b', price: 0 },
};

// A component is one prepared ingredient: { item, state } where state is
// 'raw' | 'chopped' | 'cooked'. A dish is a set of components.
export const RECIPES = [
  {
    id: 'toast',
    name: 'Cheese Toast',
    needs: [
      { item: 'bread', state: 'raw' },
      { item: 'cheese', state: 'raw' },
    ],
    coins: 10,
    minLevel: 1,
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    needs: [
      { item: 'lettuce', state: 'chopped' },
      { item: 'tomato', state: 'chopped' },
    ],
    coins: 15,
    minLevel: 1,
  },
  {
    id: 'burger',
    name: 'Beef Burger',
    needs: [
      { item: 'bread', state: 'raw' },
      { item: 'patty', state: 'cooked' },
      { item: 'cheese', state: 'raw' },
    ],
    coins: 20,
    minLevel: 2,
  },
  {
    id: 'noodle',
    name: 'Noodle Bowl',
    needs: [
      { item: 'noodle', state: 'cooked' },
      { item: 'tomato', state: 'chopped' },
    ],
    coins: 20,
    minLevel: 2,
  },
  {
    id: 'mega',
    name: 'Mega Burger',
    needs: [
      { item: 'bread', state: 'raw' },
      { item: 'patty', state: 'cooked' },
      { item: 'cheese', state: 'raw' },
      { item: 'lettuce', state: 'chopped' },
    ],
    coins: 30,
    minLevel: 3,
  },
];

export const CHOP_SECONDS = 1.1;
export const COOK_SECONDS = 5.0;
export const BURN_SECONDS = 6.0; // past done before it burns

export function orderIntervalSeconds(level) {
  return Math.max(6, 12 - level);
}
export function orderPatienceSeconds(level) {
  return Math.max(32, 52 - level * 3);
}
export function recipesForLevel(level) {
  return RECIPES.filter((r) => r.minLevel <= level);
}

// Station rectangles on the floor (x, y, w, h). The kitchen is one open
// room; counters are islands the chef walks around.
export const STATIONS = [
  { id: 'crate-tomato', kind: 'crate', item: 'tomato', x: 16, y: 128, w: 128, h: 74, approach: 'E' },
  { id: 'crate-lettuce', kind: 'crate', item: 'lettuce', x: 16, y: 214, w: 128, h: 74, approach: 'E' },
  { id: 'crate-bread', kind: 'crate', item: 'bread', x: 16, y: 300, w: 128, h: 74, approach: 'E' },
  { id: 'crate-cheese', kind: 'crate', item: 'cheese', x: 16, y: 386, w: 128, h: 74, approach: 'E' },
  { id: 'crate-noodle', kind: 'crate', item: 'noodle', x: 16, y: 472, w: 128, h: 74, approach: 'E' },
  { id: 'crate-patty', kind: 'crate', item: 'patty', x: 16, y: 558, w: 128, h: 74, approach: 'E' },
  { id: 'board-1', kind: 'board', x: 300, y: 250, w: 190, h: 92, approach: 'S' },
  { id: 'board-2', kind: 'board', x: 540, y: 250, w: 190, h: 92, approach: 'S' },
  { id: 'stove-1', kind: 'stove', x: 300, y: 420, w: 190, h: 92, approach: 'S' },
  { id: 'stove-2', kind: 'stove', x: 540, y: 420, w: 190, h: 92, approach: 'S' },
  { id: 'plate', kind: 'plate', x: 850, y: 250, w: 210, h: 110, approach: 'W' },
  { id: 'trash', kind: 'trash', x: 850, y: 420, w: 92, h: 92, approach: 'W' },
  { id: 'window', kind: 'window', x: 980, y: 420, w: 220, h: 92, approach: 'S' },
];

// Warm warung palette.
export const COLORS = {
  floorA: '#e9c795',
  floorB: '#dfc08a',
  wall: '#8a4b2d',
  wood: '#b5763f',
  woodDark: '#8f5a2e',
  steel: '#9aa5b1',
  steelDark: '#6e7a86',
  cream: '#fff6e5',
  ink: '#3a2418',
  red: '#d94f30',
  green: '#5aa843',
  gold: '#f2c230',
  blue: '#4a90c2',
};
