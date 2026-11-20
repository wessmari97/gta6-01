// Cars in Solmar: traffic that drives the roads, parked cars to steal, and
// the car the player drives. Traffic follows the road grid with a simple
// rule (keep right, slow for the car ahead, sometimes turn), so the city
// feels alive without a full traffic simulation. Stealing a car is a crime.
import { BEACH_Y, pointBlocked, roadAt, roadCenter, randomRoadPoint, WORLD_H, WORLD_W } from './world.js';
import { randPick, randRange } from './random.js';
import { knockPed } from './player.js';

export const CAR_W = 44;
export const CAR_H = 22;
export const CAR_RADIUS = 20;
export const TRAFFIC_COUNT = 14;
export const PARKED_COUNT = 12;
export const MAX_DRIVE_SPEED = 430;
export const MAX_REVERSE_SPEED = 120;

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8b23a', '#5aa864', '#8a5fc0', '#e8e4da', '#2f2f38', '#d97ba8', '#4fb3c9', '#c9c9c9'];
const POLICE_COLOR = '#2f6fd9';

// The lane a car drives in: right-hand traffic, offset from the road centre.
function laneOffset(axis, dir) {
  if (axis === 'h') return dir > 0 ? 20 : -20;
  return dir > 0 ? -20 : 20;
}

export function createCar(city, rng, kind, x, y, angle) {
  return {
    x,
    y,
    angle,
    speed: 0,
    cruise: randRange(rng, 120, 175),
    color: kind === 'police' ? POLICE_COLOR : randPick(rng, CAR_COLORS),
    kind,
    health: 100,
    axis: angle === 0 || angle === Math.PI ? 'h' : 'v',
    dir: angle === 0 || angle === -Math.PI / 2 ? 1 : -1,
    lastTurn: 0,
    brake: false,
    smoke: 0,
  };
}

// A traffic car starts on a road, aligned with it.
export function spawnTrafficCar(game) {
  const { city, rng } = game;
  const p = randomRoadPoint(rng);
  const road = roadAt(city, p.x, p.y);
  let angle;
  let axis;
  let dir;
  if (road && road.axis === 'h') {
    axis = 'h';
    dir = rng() < 0.5 ? 1 : -1;
    angle = dir > 0 ? 0 : Math.PI;
    p.y = road.center + laneOffset(axis, dir);
  } else {
    axis = 'v';
    dir = rng() < 0.5 ? 1 : -1;
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.x = road ? road.center + laneOffset(axis, dir) : p.x;
  }
  const car = createCar(city, rng, 'traffic', p.x, p.y, angle);
  car.axis = axis;
  car.dir = dir;
  car.speed = car.cruise;
  return car;
}

// A parked car sits at the edge of a road, parallel to it.
export function spawnParkedCar(game) {
  const { city, rng } = game;
  const p = randomRoadPoint(rng);
  const road = roadAt(city, p.x, p.y);
  let angle = 0;
  if (road && road.axis === 'h') {
    angle = rng() < 0.5 ? 0 : Math.PI;
    p.y = road.center + (angle === 0 ? 34 : -34);
  } else if (road) {
    angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    p.x = road.center + (angle === Math.PI / 2 ? -34 : 34);
  }
  const car = createCar(city, rng, 'parked', p.x, p.y, angle);
  car.speed = 0;
  return car;
}

export function fillStreets(game) {
  game.cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) game.cars.push(spawnTrafficCar(game));
  for (let i = 0; i < PARKED_COUNT; i += 1) game.cars.push(spawnParkedCar(game));
}

// The car directly ahead of this one on the same road, if it is close.
function carAhead(game, car) {
  let nearest = null;
  let nearestD = 90;
  for (const other of game.cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = car.axis === 'h' ? dx * car.dir : dy * car.dir;
    const side = car.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
    if (forward > 0 && forward < nearestD && side < 30) {
      nearest = other;
      nearestD = forward;
    }
  }
  return nearest;
}

function updateTrafficCar(game, car, dt) {
  const { city } = game;
  // Slow down for the car ahead; otherwise cruise.
  const ahead = carAhead(game, car);
  const target = ahead ? 0 : car.cruise;
  car.speed += Math.max(-400 * dt, Math.min(200 * dt, target - car.speed));

  // At an intersection, sometimes turn onto the cross road.
  const road = roadAt(city, car.x, car.y);
  if (road) {
    const cross = road.axis === 'h'
      ? Math.abs(car.x - roadCenter('v', Math.round(car.x / 390))) < 26
      : Math.abs(car.y - roadCenter('h', Math.round(car.y / 390))) < 26;
    if (cross && game.time - car.lastTurn > 4 && game.rng() < 0.35) {
      car.lastTurn = game.time;
      const newAxis = road.axis === 'h' ? 'v' : 'h';
      const newDir = game.rng() < 0.5 ? 1 : -1;
      car.axis = newAxis;
      car.dir = newDir;
      car.angle = newAxis === 'h' ? (newDir > 0 ? 0 : Math.PI) : (newDir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }

  // Move, staying on the road: snap back to the lane each step.
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (car.axis === 'h') {
    const centre = roadCenter('h', Math.max(0, Math.min(7, Math.round(car.y / 390))));
    car.y = centre + laneOffset('h', car.dir);
    car.x = nx;
  } else {
    const centre = roadCenter('v', Math.max(0, Math.min(9, Math.round(car.x / 390))));
    car.x = centre + laneOffset('v', car.dir);
    car.y = ny;
  }
  // Turn around at the edge of the map instead of driving off it.
  if (car.x < 60 || car.x > WORLD_W - 60 || car.y < 60 || car.y > BEACH_Y - 60) {
    car.dir *= -1;
    car.angle += Math.PI;
    car.x = Math.max(60, Math.min(WORLD_W - 60, car.x));
    car.y = Math.max(60, Math.min(BEACH_Y - 60, car.y));
  }
}

// The car the player drives: accelerate, brake, steer, and crash.
function updatePlayerCar(game, car, dt) {
  const { input, city } = game;
  const axis = input.moveAxis();
  const forward = axis.y < 0;
  const back = axis.y > 0;
  if (forward) car.speed += 320 * dt;
  else if (back) car.speed -= car.speed > 0 ? 520 * dt : 260 * dt;
  else {
    // Rolling friction when no pedal is pressed.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  }
  car.speed = Math.max(-MAX_REVERSE_SPEED, Math.min(MAX_DRIVE_SPEED, car.speed));
  // Steering only bites while the car is moving, and more at low speed —
  // but never so little that a slow car cannot turn at all.
  const steer = (axis.x || 0) * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * 2.8 * dt * Math.min(1, Math.max(0.4, Math.abs(car.speed) / 140));

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // Check the nose and the body against buildings and the sea.
  const noseX = nx + Math.cos(car.angle) * (CAR_W / 2);
  const noseY = ny + Math.sin(car.angle) * (CAR_W / 2);
  if (pointBlocked(city, noseX, noseY, 8) || pointBlocked(city, nx, ny, CAR_RADIUS - 4)) {
    if (Math.abs(car.speed) > 120) {
      car.health -= Math.abs(car.speed) * 0.06;
      game.audio.thud(0.5);
    }
    car.speed *= -0.25;
  } else {
    car.x = nx;
    car.y = ny;
  }
  if (car.health < 40) car.smoke = Math.min(1, car.smoke + dt * 0.5);
  if (car.health <= 0) {
    car.health = 0;
    car.speed = 0;
    car.smoke = 1;
  }
  // The player rides with the car: keep their position on it, so the
  // camera, the minimap and the police all track the driver, not a ghost.
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
  game.audio.engine(Math.abs(car.speed) / MAX_DRIVE_SPEED, true);
}

// A car hitting a pedestrian: the pedestrian goes down and it is a crime.
function checkPedHits(game, car) {
  for (const ped of game.peds) {
    if (ped.down) continue;
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < CAR_RADIUS + 10 && Math.abs(car.speed) > 40) {
      knockPed(game, ped);
      car.speed *= 0.7;
    }
  }
}

// Two cars bumping: push apart and slow both. Only a genuinely hard
// hit (a big closing speed) dents either car — nudging through traffic
// at city speeds costs time, not the whole car.
function checkCarHits(game, car) {
  for (const other of game.cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < CAR_RADIUS * 2 && d > 0.01) {
      const push = (CAR_RADIUS * 2 - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      car.x -= nx * push;
      car.y -= ny * push;
      other.x += nx * push;
      other.y += ny * push;
      // Closing speed along the line between the cars.
      const rvx = Math.cos(other.angle) * other.speed - Math.cos(car.angle) * car.speed;
      const rvy = Math.sin(other.angle) * other.speed - Math.sin(car.angle) * car.speed;
      const closing = -(rvx * nx + rvy * ny);
      if (closing > 300) {
        car.health -= 6;
        other.health -= 6;
        car.speed *= 0.6;
        other.speed *= 0.6;
        game.audio.thud(0.35);
      } else if (closing > 20) {
        car.speed *= 0.9;
        other.speed *= 0.9;
      }
    }
  }
}

export function updateVehicles(game, dt) {
  const { player } = game;
  for (const car of game.cars) {
    if (car.kind === 'traffic') updateTrafficCar(game, car, dt);
    if (car === player.car) {
      updatePlayerCar(game, car, dt);
      checkPedHits(game, car);
      checkCarHits(game, car);
    }
  }
  // Keep the streets busy near the player: recycle distant traffic.
  for (let i = 0; i < game.cars.length; i += 1) {
    const car = game.cars[i];
    if (car.kind !== 'traffic') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d > 1700) game.cars[i] = spawnTrafficCar(game);
  }
}

// The nearest stealable car to the player, if one is close enough.
export function nearestStealable(game) {
  const { player } = game;
  let best = null;
  let bestD = 58;
  for (const car of game.cars) {
    if (car.kind === 'police' || car === player.car) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

// Get in the nearest car (stealing it is a crime) or get out of the car.
export function toggleCar(game) {
  const { player } = game;
  if (player.onFoot) {
    const car = nearestStealable(game);
    if (!car) return false;
    player.car = car;
    player.onFoot = false;
    car.kind = 'player';
    car.health = Math.max(car.health, 60);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    game.audio.blip();
    game.addWanted(1, 'stole a car');
    return true;
  }
  // Step out beside the car.
  const car = player.car;
  const side = { x: car.x - Math.sin(car.angle) * 34, y: car.y + Math.cos(car.angle) * 34 };
  if (!pointBlocked(game.city, side.x, side.y, 14)) {
    player.x = side.x;
    player.y = side.y;
  } else {
    player.x = car.x + Math.sin(car.angle) * 34;
    player.y = car.y - Math.cos(car.angle) * 34;
  }
  player.angle = car.angle;
  player.onFoot = true;
  player.car = null;
  car.kind = 'parked';
  car.speed = 0;
  game.audio.engine(0, false);
  return true;
}
