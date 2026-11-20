// Solmar itself: a procedural grid city on a warm coast. Roads run on a
// regular pitch; the squares between them hold buildings, parks or parking
// lots; the east edge is a beach and the sea. Everything is derived from one
// seed, so the same seed always builds the same city.
//
// Layout (all in world pixels):
//   PITCH 300 — distance between neighbouring road centrelines
//   ROAD_W 90 — a road's width; the block between two roads is 210 wide
//   Roads 0..8 run each way, so the city spans 0..2700. East of the last
//   road (x > 2490) is sand, and beyond x = 2700 is the sea.

export const PITCH = 300;
export const ROAD_W = 90;
export const ROAD_COUNT = 9;
export const CITY_SIZE = ROAD_COUNT * PITCH;
export const BEACH_X = (ROAD_COUNT - 1) * PITCH + ROAD_W;

const BUILDING_COLORS = ['#d97b4f', '#e8a85c', '#c96f5e', '#e5c07a', '#a8b878', '#d9a05b', '#c98a6b', '#e8b48a'];
const ROOF_COLORS = ['#8a4f3a', '#7a5a3a', '#6b4a4a', '#8a6b4a', '#5a6b4a', '#7a5a3a'];

export function roadCenter(k) {
  return k * PITCH + ROAD_W / 2;
}

export function isRoad(x, y) {
  const mx = ((x % PITCH) + PITCH) % PITCH;
  const my = ((y % PITCH) + PITCH) % PITCH;
  return mx < ROAD_W || my < ROAD_W;
}

export function nearestRoadX(x) {
  const k = Math.round((x - ROAD_W / 2) / PITCH);
  return Math.max(0, Math.min(ROAD_COUNT - 1, k)) * PITCH + ROAD_W / 2;
}

export function nearestRoadY(y) {
  return nearestRoadX(y);
}

export function districtAt(x, y) {
  if (x >= 1050 && x < 1650 && y >= 1050 && y < 1650) return 'Downtown';
  if (x < 1350 && y < 1350) return 'Old Town';
  if (x >= 1350 && y < 1350) return 'Marina';
  if (x < 1350) return 'Palms';
  return 'Harbor';
}

export function buildCity(rng) {
  const buildings = [];
  const parks = [];
  const lots = [];
  for (let i = 0; i < ROAD_COUNT - 1; i += 1) {
    for (let j = 0; j < ROAD_COUNT - 1; j += 1) {
      const bx = i * PITCH + ROAD_W;
      const by = j * PITCH + ROAD_W;
      const roll = rng.next();
      if (roll < 0.14) {
        const trees = [];
        const n = rng.int(3, 7);
        for (let t = 0; t < n; t += 1) {
          trees.push({ x: bx + rng.range(25, 185), y: by + rng.range(25, 185), r: rng.range(10, 18) });
        }
        parks.push({ x: bx, y: by, w: PITCH - ROAD_W, h: PITCH - ROAD_W, trees });
        continue;
      }
      if (roll < 0.24) {
        lots.push({ x: bx, y: by, w: PITCH - ROAD_W, h: PITCH - ROAD_W });
        continue;
      }
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b += 1) {
        const w = rng.range(60, 150);
        const h = rng.range(60, 150);
        const x = bx + rng.range(8, PITCH - ROAD_W - w - 8);
        const y = by + rng.range(8, PITCH - ROAD_W - h - 8);
        buildings.push({
          x, y, w, h,
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(ROOF_COLORS),
          tall: rng.chance(0.3),
        });
      }
    }
  }
  // A few palm trees along the sand.
  const palms = [];
  for (let p = 0; p < 14; p += 1) {
    palms.push({ x: BEACH_X + rng.range(20, 180), y: rng.range(60, CITY_SIZE - 60), r: rng.range(9, 14) });
  }
  return { size: CITY_SIZE, buildings, parks, lots, palms };
}

// Push a circle (x, y, radius) out of every building it overlaps. Returns a
// corrected position; if nothing overlaps, the input comes back unchanged.
export function resolveCircle(city, x, y, r) {
  let px = x;
  let py = y;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) {
      // Centre inside the building: shove out along the shortest side.
      const left = px - b.x;
      const right = b.x + b.w - px;
      const top = py - b.y;
      const bottom = b.y + b.h - py;
      const m = Math.min(left, right, top, bottom);
      if (m === left) px = b.x - r;
      else if (m === right) px = b.x + b.w + r;
      else if (m === top) py = b.y - r;
      else py = b.y + b.h + r;
      continue;
    }
    const d = Math.sqrt(d2);
    px = cx + (dx / d) * r;
    py = cy + (dy / d) * r;
  }
  return { x: px, y: py };
}

export function circleHitsBuilding(city, x, y, r) {
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// A random point on a road (the centreline of a random road, random offset).
export function randomRoadPoint(rng) {
  const horizontal = rng.chance(0.5);
  const k = rng.int(0, ROAD_COUNT - 1);
  const along = rng.range(0, CITY_SIZE);
  if (horizontal) return { x: along, y: roadCenter(k) };
  return { x: roadCenter(k), y: along };
}

// A random point on a sidewalk: just off a road's edge, inside a block.
export function randomSidewalkPoint(rng) {
  const p = randomRoadPoint(rng);
  const off = rng.pick([-1, 1]) * (ROAD_W / 2 + rng.range(6, 30));
  if (rng.chance(0.5)) return { x: p.x, y: Math.max(0, Math.min(CITY_SIZE, p.y + off)) };
  return { x: Math.max(0, Math.min(CITY_SIZE, p.x + off)), y: p.y };
}

function inView(view, x, y, w, h) {
  return x + w >= view.x && x <= view.x + view.w && y + h >= view.y && y <= view.y + view.h;
}

export function drawCity(ctx, city, view) {
  // Sea first (the backdrop for everything outside the land), then the land.
  ctx.fillStyle = '#4fa8c9';
  ctx.fillRect(view.x, view.y, view.w, view.h);
  ctx.fillStyle = '#e9d9ac';
  ctx.fillRect(Math.max(view.x, 0), Math.max(view.y, 0), Math.min(view.w, CITY_SIZE - Math.max(view.x, 0)), Math.min(view.h, CITY_SIZE - Math.max(view.y, 0)));
  // Sand on the east edge.
  ctx.fillStyle = '#f0dca8';
  ctx.fillRect(BEACH_X, Math.max(view.y, 0), CITY_SIZE - BEACH_X, Math.min(view.h, CITY_SIZE - Math.max(view.y, 0)));

  // Roads: asphalt strips, then a dashed centre line on each.
  ctx.fillStyle = '#5d6167';
  for (let k = 0; k < ROAD_COUNT; k += 1) {
    const c = roadCenter(k);
    ctx.fillRect(c - ROAD_W / 2, Math.max(view.y, 0), ROAD_W, Math.min(view.h, CITY_SIZE - Math.max(view.y, 0)));
    ctx.fillRect(Math.max(view.x, 0), c - ROAD_W / 2, Math.min(view.w, CITY_SIZE - Math.max(view.x, 0)), ROAD_W);
  }
  ctx.strokeStyle = '#e8d27a';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  for (let k = 0; k < ROAD_COUNT; k += 1) {
    const c = roadCenter(k);
    ctx.moveTo(c, Math.max(view.y, 0));
    ctx.lineTo(c, Math.min(view.y + view.h, CITY_SIZE));
    ctx.moveTo(Math.max(view.x, 0), c);
    ctx.lineTo(Math.min(view.x + view.w, CITY_SIZE), c);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Parks.
  for (const p of city.parks) {
    if (!inView(view, p.x, p.y, p.w, p.h)) continue;
    ctx.fillStyle = '#8fbf6a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#7aa85a';
    for (const t of p.trees) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Parking lots: grey slabs with white bay lines.
  for (const lot of city.lots) {
    if (!inView(view, lot.x, lot.y, lot.w, lot.h)) continue;
    ctx.fillStyle = '#8d9299';
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = lot.x + 30; s < lot.x + lot.w - 10; s += 30) {
      ctx.moveTo(s, lot.y + 12);
      ctx.lineTo(s, lot.y + lot.h - 12);
    }
    ctx.stroke();
  }
  // Buildings: a soft shadow, the walls, and a darker roof inset.
  for (const b of city.buildings) {
    if (!inView(view, b.x, b.y, b.w, b.h)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 10);
    }
  }
  // Palms on the beach.
  ctx.fillStyle = '#5e8f4e';
  for (const p of city.palms) {
    if (!inView(view, p.x, p.y, p.r * 2, p.r * 2)) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // District names, faint, at their centres.
  ctx.fillStyle = 'rgba(90,70,40,0.35)';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OLD TOWN', 675, 675);
  ctx.fillText('MARINA', 2025, 675);
  ctx.fillText('DOWNTOWN', 1350, 1350);
  ctx.fillText('PALMS', 675, 2025);
  ctx.fillText('HARBOR', 2025, 2025);
}
