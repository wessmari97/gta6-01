// Pedestrians: the people of Solmar. They stroll the sidewalks and the
// parks, pick a new destination when they arrive, and scatter when a car
// bears down on them or a punch lands. A pedestrian a car hits is a crime —
// the player learns that fast.

import { CITY_SIZE, randomSidewalkPoint, resolveCircle } from './city.js';
import { addWanted } from './cops.js';

const SHIRT_COLORS = ['#e86a6a', '#6a9fe8', '#e8c96a', '#7ac98a', '#c98ad9', '#e8e8e8', '#f09a5a'];

export function createPeds(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const at = randomSidewalkPoint(rng);
    const dest = randomSidewalkPoint(rng);
    peds.push({
      x: at.x,
      y: at.y,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(28, 62),
      targetX: dest.x,
      targetY: dest.y,
      state: 'walk',
      fallT: 0,
      hp: 30,
      shirt: rng.pick(SHIRT_COLORS),
      radius: 12,
    });
  }
  return peds;
}

function pickTarget(G, ped) {
  const dest = randomSidewalkPoint(G.rng);
  ped.targetX = dest.x;
  ped.targetY = dest.y;
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.fallT -= dt;
      if (ped.fallT <= 0) {
        ped.state = 'flee';
        ped.hp = 30;
        pickTarget(G, ped);
        ped.speed = 150;
      }
      continue;
    }
    const dx = ped.targetX - ped.x;
    const dy = ped.targetY - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) {
      pickTarget(G, ped);
      if (ped.state === 'flee') {
        ped.state = 'walk';
        ped.speed = G.rng.range(28, 62);
      }
      continue;
    }
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / d) * ped.speed * dt;
    ped.y += (dy / d) * ped.speed * dt;
    const fixed = resolveCircle(G.city, ped.x, ped.y, ped.radius);
    ped.x = Math.max(0, Math.min(CITY_SIZE, fixed.x));
    ped.y = Math.max(0, Math.min(CITY_SIZE, fixed.y));

    // A car bearing down on a pedestrian: they are hit, and it is a crime.
    for (const car of G.cars) {
      if (car.wrecked) continue;
      const cd = Math.hypot(car.x - ped.x, car.y - ped.y);
      if (cd < 26 && Math.abs(car.speed) > 40) {
        ped.hp -= 40;
        ped.state = 'down';
        ped.fallT = 1.6;
        ped.x += ((ped.x - car.x) / Math.max(1, cd)) * 22;
        ped.y += ((ped.y - car.y) / Math.max(1, cd)) * 22;
        if (car.driven) {
          addWanted(G, 1);
          G.announce('You hit a pedestrian. The police have been called.');
        }
        break;
      }
    }
  }
}
