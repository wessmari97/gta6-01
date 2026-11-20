// The city of Solmar: a procedural grid of roads and blocks, built once
// from a seeded generator so the same seed always builds the same city.
// Roads run on a regular pitch; the squares between them hold buildings,
// parks and plazas. The south edge is a beach and the sea. Districts give
// each part of town its own look and its own name for the HUD.
import { randInt, randPick, randRange } from './random.js';

export const WORLD_W = 3840;
export const WORLD_H = 3120;
export const PITCH = 390;
export const ROAD_W = 96;
export const BEACH_Y = 2826;
export const WATER_Y = 3030;

const COLS = 10;
const ROWS = 8;

// Warm, sun-soaked colours for the buildings, one set per district feel.
const PALETTE = {
  downtown: ['#c96f4a', '#b85c5a', '#d99a5b', '#8f6b4f', '#a85548'],
  oldtown: ['#d9a066', '#c98a5e', '#e0b184', '#b97a52', '#d18a6a'],
  marina: ['#5fa8a0', '#4f8f9e', '#7fb5a8', '#e0c184', '#c97e6a'],
  northside: ['#d9b48a', '#c9a06a', '#e6c795', '#b98a5e', '#d4a574'],
  industrial: ['#8a7f74', '#7a6f66', '#9a8a7a', '#6f655c', '#a89a8a'],
};

// Which district a block belongs to, by its grid position.
export function districtOfBlock(i, j) {
  if (j === ROWS - 1) return 'marina';
  if (i >= 3 && i <= 6 && j >= 2 && j <= 4) return 'downtown';
  if (i >= 7 && j <= 3) return 'industrial';
  if (i <= 2 && j <= 2) return 'oldtown';
  return 'northside';
}

export const DISTRICT_NAMES = {
  downtown: 'Downtown Solmar',
  oldtown: 'Old Town',
  marina: 'Marina Beach',
  northside: 'Northside',
  industrial: 'East Industrial',
};

// The centre line of a road: axis 'h' runs left-right at height y, 'v' runs
// up-down at width x. Roads sit on the grid pitch.
export function roadCenter(axis, index) {
  return index * PITCH + ROAD_W / 2;
}

// True when the point is on a road, with the road it is on.
export function roadAt(city, x, y) {
  const col = Math.floor(x / PITCH);
  const row = Math.floor(y / PITCH);
  const inRoadX = x - col * PITCH < ROAD_W;
  const inRoadY = y - row * PITCH < ROAD_W;
  if (inRoadY && col >= 0 && col < COLS) return { axis: 'h', index: row, center: roadCenter('h', row) };
  if (inRoadX && row >= 0 && row < ROWS) return { axis: 'v', index: col, center: roadCenter('v', col) };
  return null;
}

// True when a circle of the given radius at the point hits a building, the
// sea, or the edge of the world. Roads, sidewalks, parks and sand are open.
export function pointBlocked(city, x, y, radius) {
  if (x < radius || y < radius || x > WORLD_W - radius || y > WORLD_H - radius) return true;
  if (y > WATER_Y - radius) return true;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (x > b.x - radius && x < b.x + b.w + radius && y > b.y - radius && y < b.y + b.h + radius) return true;
  }
  return false;
}

// The district name at a point, for the HUD.
export function districtAt(city, x, y) {
  if (y >= BEACH_Y) return 'Marina Beach';
  const i = Math.max(0, Math.min(COLS - 2, Math.floor(x / PITCH)));
  const j = Math.max(0, Math.min(ROWS - 2, Math.floor(y / PITCH)));
  return DISTRICT_NAMES[districtOfBlock(i, j)];
}

function buildBlock(city, rng, i, j) {
  const x0 = i * PITCH + ROAD_W;
  const y0 = j * PITCH + ROAD_W;
  const size = PITCH - ROAD_W;
  const district = districtOfBlock(i, j);
  // A few blocks are parks: green, trees, no buildings.
  const isPark = district !== 'downtown' && rng() < 0.16;
  if (isPark) {
    const trees = [];
    const count = randInt(rng, 5, 9);
    for (let t = 0; t < count; t += 1) {
      trees.push({ x: x0 + randRange(rng, 24, size - 24), y: y0 + randRange(rng, 24, size - 24), r: randRange(rng, 10, 18) });
    }
    city.parks.push({ x: x0, y: y0, w: size, h: size, trees, district });
    return;
  }
  const palette = PALETTE[district];
  const slots = district === 'downtown' ? randInt(rng, 1, 2)
    : district === 'industrial' ? randInt(rng, 1, 2)
    : randInt(rng, 2, 4);
  // Split the block into a small grid of plots and put one building in each.
  const across = slots <= 2 ? 1 : 2;
  const down = slots <= 2 ? slots : 2;
  const cellW = size / across;
  const cellH = size / down;
  let placed = 0;
  for (let a = 0; a < across && placed < slots; a += 1) {
    for (let b = 0; b < down && placed < slots; b += 1) {
      const margin = district === 'downtown' ? 26 : 18;
      const w = cellW - margin * 2 - randRange(rng, 0, 30);
      const h = cellH - margin * 2 - randRange(rng, 0, 30);
      if (w < 40 || h < 40) continue;
      city.buildings.push({
        x: x0 + a * cellW + margin + randRange(rng, 0, 10),
        y: y0 + b * cellH + margin + randRange(rng, 0, 10),
        w,
        h,
        color: randPick(rng, palette),
        tall: district === 'downtown' ? randRange(rng, 14, 26) : randRange(rng, 4, 10),
        district,
      });
      placed += 1;
    }
  }
}

// Build the whole city from the generator: roads, blocks, beach and sea.
export function buildCity(rng) {
  const city = { width: WORLD_W, height: WORLD_H, buildings: [], parks: [] };
  for (let j = 0; j < ROWS - 1; j += 1) {
    for (let i = 0; i < COLS - 1; i += 1) {
      buildBlock(city, rng, i, j);
    }
  }
  return city;
}

// A point on a random road, for spawning cars and pedestrians.
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    const row = randInt(rng, 0, ROWS - 1);
    return { x: randRange(rng, 60, WORLD_W - 60), y: roadCenter('h', row) };
  }
  const col = randInt(rng, 0, COLS - 1);
  return { x: roadCenter('v', col), y: randRange(rng, 60, BEACH_Y - 60) };
}

// A point on the road nearest a given spot, for placing the player.
export function nearestRoadPoint(city, x, y) {
  const col = Math.max(0, Math.min(COLS - 1, Math.round(x / PITCH)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.round(y / PITCH)));
  const dx = Math.abs(x - roadCenter('v', col));
  const dy = Math.abs(y - roadCenter('h', row));
  if (dx < dy) return { x: roadCenter('v', col), y };
  return { x, y: roadCenter('h', row) };
}
