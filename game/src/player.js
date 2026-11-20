// Rio on foot and behind the wheel. On foot he walks or runs, punches with
// Space or J, and presses E to steal a nearby car (or climb out of one).
// Driving is arcade physics: W/S for throttle and brake, A/D to steer, with
// the steering bite growing with speed. A wrecked car throws him out.

import { CITY_SIZE, resolveCircle } from './city.js';
import { addWanted } from './cops.js';

export const WALK_SPEED = 175;
export const RUN_SPEED = 268;
export const PLAYER_RADIUS = 14;
export const CAR_RADIUS = 18;

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: 0,
    hp: 100,
    maxHp: 100,
    cash: 0,
    car: null,
    punchT: 0,
    punchCd: 0,
    hurtT: 0,
    grabT: 0,
  };
}

function punchHits(G) {
  const p = G.player;
  const reach = 52;
  const arc = 1.2;
  const hitOne = (t) => {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > reach + (t.radius || 14)) return false;
    let diff = Math.atan2(dy, dx) - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < arc;
  };
  let hit = false;
  for (const ped of G.peds) {
    if (ped.state === 'down' || !hitOne(ped)) continue;
    ped.hp -= 30;
    ped.state = 'down';
    ped.fallT = 1.4;
    addWanted(G, 1);
    hit = true;
  }
  for (const cop of G.cops.list) {
    if (cop.state === 'down' || !hitOne(cop)) continue;
    cop.hp -= 25;
    const d = Math.max(1, Math.hypot(cop.x - p.x, cop.y - p.y));
    cop.x += ((cop.x - p.x) / d) * 26;
    cop.y += ((cop.y - p.y) / d) * 26;
    if (cop.hp <= 0) {
      cop.state = 'down';
      cop.fallT = 2.2;
    }
    addWanted(G, 1);
    hit = true;
  }
  return hit;
}

function nearestStealableCar(G) {
  const p = G.player;
  let best = null;
  let bestD = 62;
  for (const car of G.cars) {
    if (car.kind === 'police' || car.wrecked || car.driven) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  if (p.hurtT > 0) p.hurtT -= dt;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.punchT > 0) {
    p.punchT -= dt;
    if (punchHits(G)) p.punchT = 0;
  }

  if (p.car) {
    updateDriving(G, dt);
    return;
  }

  const mv = input.moveVector();
  const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = running ? RUN_SPEED : WALK_SPEED;
  if (mv.x !== 0 || mv.y !== 0) {
    p.angle = Math.atan2(mv.y, mv.x);
    p.x += mv.x * speed * dt;
    p.y += mv.y * speed * dt;
  }
  const fixed = resolveCircle(G.city, p.x, p.y, PLAYER_RADIUS);
  p.x = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, fixed.x));
  p.y = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, fixed.y));

  if (input.wasPressed('Space') || input.wasPressed('KeyJ')) {
    if (p.punchCd <= 0) {
      p.punchT = 0.18;
      p.punchCd = 0.45;
      G.audio.punch();
    }
  }
  if (input.wasPressed('KeyE')) {
    const car = nearestStealableCar(G);
    if (car) {
      p.car = car;
      car.driven = true;
      car.speed = 0;
      addWanted(G, 1);
      G.audio.pickup();
      G.announce('Car stolen. The police have been called.');
    }
  }
}

function updateDriving(G, dt) {
  const p = G.player;
  const car = p.car;
  const input = G.input;
  const up = input.isDown('KeyW') || input.isDown('ArrowUp');
  const down = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');

  const maxSpeed = car.kind === 'police' ? 470 : 430;
  if (up) car.speed += 300 * dt;
  if (down) car.speed -= 340 * dt;
  if (!up && !down) {
    const drag = 130 * dt;
    if (car.speed > 0) car.speed = Math.max(0, car.speed - drag);
    else if (car.speed < 0) car.speed = Math.min(0, car.speed + drag);
  }
  car.speed = Math.max(-130, Math.min(maxSpeed, car.speed));

  const steer = (right ? 1 : 0) - (left ? 1 : 0);
  const bite = Math.max(-1, Math.min(1, car.speed / 150));
  car.angle += steer * 2.5 * bite * dt;

  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveCircle(G.city, car.x, car.y, CAR_RADIUS);
  const hitWall = Math.hypot(fixed.x - car.x, fixed.y - car.y) > 0.5;
  car.x = Math.max(CAR_RADIUS, Math.min(CITY_SIZE - CAR_RADIUS, fixed.x));
  car.y = Math.max(CAR_RADIUS, Math.min(CITY_SIZE - CAR_RADIUS, fixed.y));
  if (hitWall && Math.abs(car.speed) > 120) {
    car.hp -= 6;
    car.speed *= 0.55;
    if (car.hp <= 0) wreckCar(G, car);
  }
  // Gentle car-to-car bumps: push apart, dent both, no drama.
  for (const other of G.cars) {
    if (other === car || other.wrecked) continue;
    const dx = car.x - other.x;
    const dy = car.y - other.y;
    const d = Math.hypot(dx, dy);
    const min = CAR_RADIUS * 2 + 4;
    if (d >= min || d === 0) continue;
    const push = (min - d) / 2;
    const nx = dx / d;
    const ny = dy / d;
    car.x += nx * push;
    car.y += ny * push;
    other.x -= nx * push;
    other.y -= ny * push;
    const closing = Math.abs(car.speed - (other.speed || 0));
    if (closing > 200) {
      car.hp -= 5;
      other.hp -= 5;
      car.speed *= 0.7;
      if (other.kind === 'traffic') other.speed *= 0.5;
      if (car.hp <= 0) wreckCar(G, car);
      if (other.hp <= 0 && other.kind !== 'police') other.wrecked = true;
    }
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;

  if (input.wasPressed('KeyE')) {
    p.car = null;
    car.driven = false;
    car.speed = 0;
    const side = p.angle + Math.PI / 2;
    p.x = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, car.x + Math.cos(side) * 30));
    p.y = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, car.y + Math.sin(side) * 30));
  }
}

export function wreckCar(G, car) {
  car.wrecked = true;
  car.speed = 0;
  car.driven = false;
  if (G.player.car === car) {
    G.player.car = null;
    G.player.x = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, car.x + 30));
    G.player.y = Math.max(PLAYER_RADIUS, Math.min(CITY_SIZE - PLAYER_RADIUS, car.y));
    G.announce('Your car is wrecked. Find another ride.');
  }
}

export function resetPlayerToSpawn(G) {
  const p = G.player;
  p.x = G.spawn.x;
  p.y = G.spawn.y;
  p.angle = 0;
  p.hp = p.maxHp;
  p.car = null;
  p.hurtT = 0;
  p.grabT = 0;
  p.punchT = 0;
  p.punchCd = 0;
}
