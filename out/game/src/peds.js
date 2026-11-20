// Pedestrians in Solmar: people walking the sidewalks and the parks.
// They wander the city, run from fast cars, and fall down when they are
// hit. A hurt pedestrian is a crime, so they are the wanted system's
// most common trigger.
import { pointBlocked, roadCenter } from './world.js';
import { randPick, randRange } from './random.js';

export const PED_COUNT = 16;
export const PED_RADIUS = 10;

const SHIRTS = ['#e8e4da', '#d94f3d', '#3d7dd9', '#5aa864', '#e8b23a', '#8a5fc0', '#4fb3c9', '#c97ba8'];
const PANTS = ['#2f2f38', '#4a4a55', '#6b5a4a', '#3a4a5a'];

function spawnPed(game) {
  const { city, rng } = game;
  // Start on a pavement: beside a road, offset from its centre line.
  const horizontal = rng() < 0.5;
  let x;
  let y;
  let angle;
  if (horizontal) {
    const row = Math.floor(randRange(rng, 0, 8));
    y = roadCenter('h', row) + (rng() < 0.5 ? 58 : -58);
    x = randRange(rng, 80, city.width - 80);
    angle = rng() < 0.5 ? 0 : Math.PI;
  } else {
    const col = Math.floor(randRange(rng, 0, 10));
    x = roadCenter('v', col) + (rng() < 0.5 ? 58 : -58);
    y = randRange(rng, 80, city.height - 320);
    angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  }
  return {
    x,
    y,
    angle,
    speed: randRange(rng, 28, 52),
    shirt: randPick(rng, SHIRTS),
    pants: randPick(rng, PANTS),
    walkPhase: randRange(rng, 0, Math.PI * 2),
    down: false,
    downTimer: 0,
    fleeTimer: 0,
  };
}

export function fillSidewalks(game) {
  game.peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) game.peds.push(spawnPed(game));
}

// A pedestrian who is down stays down, then gets up and walks away.
function updateDownPed(game, ped, dt) {
  ped.downTimer -= dt;
  if (ped.downTimer <= 0) {
    ped.down = false;
    ped.angle = game.rng() * Math.PI * 2;
  }
}

export function updatePeds(game, dt) {
  const { player } = game;
  for (let i = 0; i < game.peds.length; i += 1) {
    const ped = game.peds[i];
    if (ped.down) {
      updateDownPed(game, ped, dt);
      continue;
    }
    // Flee from a fast car that is close: run away from it.
    let fleeing = false;
    for (const car of game.cars) {
      if (car.kind === 'parked') continue;
      const d = Math.hypot(car.x - ped.x, car.y - ped.y);
      if (d < 90 && Math.abs(car.speed) > 120) {
        ped.angle = Math.atan2(ped.y - car.y, ped.x - car.x);
        ped.fleeTimer = 0.8;
        fleeing = true;
        break;
      }
    }
    const speed = ped.fleeTimer > 0 ? 150 : ped.speed;
    if (ped.fleeTimer > 0) ped.fleeTimer -= dt;
    // Wander: at an intersection, sometimes turn onto the cross street.
    if (!fleeing && game.rng() < dt * 0.12) {
      ped.angle += (game.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    ped.walkPhase += dt * (fleeing ? 14 : 8);
    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (pointBlocked(game.city, nx, ny, PED_RADIUS)) {
      // Walked into a wall: turn around and try again next frame.
      ped.angle += Math.PI;
    } else {
      ped.x = nx;
      ped.y = ny;
    }
    // Recycle pedestrians who wander far from the player, so the streets
    // near the action stay busy.
    const d = Math.hypot(ped.x - player.x, ped.y - player.y);
    if (d > 1600) game.peds[i] = spawnPed(game);
  }
}
