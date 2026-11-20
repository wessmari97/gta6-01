// Traffic and parked cars. Traffic follows the roads: each car rides one
// road's centreline in a lane, and at an intersection it sometimes turns
// onto the crossing road, so the flow looks alive without any pathfinding.
// Parked cars sit at the roadside waiting to be stolen.

import { CITY_SIZE, PITCH, ROAD_COUNT, roadCenter } from './city.js';

const CAR_COLORS = ['#c94f4f', '#4f7ec9', '#e8b13c', '#6b9e5a', '#8a5fc9', '#d9d9d9', '#3a3a3a', '#c97b4f'];
const LANE = 20;

function laneFor(horizontal, dir) {
  // Right-hand traffic: the lane sits on the right of the direction of travel.
  if (horizontal) return dir > 0 ? LANE : -LANE;
  return dir > 0 ? -LANE : LANE;
}

export function makeTrafficCar(rng, x, y) {
  const horizontal = rng.chance(0.5);
  const line = rng.int(0, ROAD_COUNT - 1);
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = laneFor(horizontal, dir);
  const speed = rng.range(90, 170);
  const pos = horizontal
    ? { x: x !== undefined ? x : rng.range(0, CITY_SIZE), y: roadCenter(line) + lane }
    : { x: roadCenter(line) + lane, y: y !== undefined ? y : rng.range(0, CITY_SIZE) };
  return {
    x: pos.x,
    y: pos.y,
    angle: horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
    speed,
    baseSpeed: speed,
    color: rng.pick(CAR_COLORS),
    kind: 'traffic',
    hp: 100,
    driven: false,
    wrecked: false,
    road: horizontal ? 'h' : 'v',
    line,
    dir,
  };
}

export function makeParkedCar(rng) {
  const horizontal = rng.chance(0.5);
  const line = rng.int(0, ROAD_COUNT - 1);
  const along = rng.range(60, CITY_SIZE - 60);
  const side = rng.pick([-1, 1]);
  const edge = side * (45 + 14);
  const pos = horizontal
    ? { x: along, y: roadCenter(line) + edge }
    : { x: roadCenter(line) + edge, y: along };
  return {
    x: pos.x,
    y: pos.y,
    angle: horizontal ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2),
    speed: 0,
    baseSpeed: 0,
    color: rng.pick(CAR_COLORS),
    kind: 'parked',
    hp: 100,
    driven: false,
    wrecked: false,
    road: horizontal ? 'h' : 'v',
    line,
    dir: side,
  };
}

export function createCars(rng, trafficCount, parkedCount) {
  const cars = [];
  for (let i = 0; i < trafficCount; i += 1) cars.push(makeTrafficCar(rng));
  for (let i = 0; i < parkedCount; i += 1) cars.push(makeParkedCar(rng));
  return cars;
}

function nearestCrossing(value) {
  // Index of the road whose centreline is closest to `value`.
  const k = Math.round((value - 45) / PITCH);
  return Math.max(0, Math.min(ROAD_COUNT - 1, k));
}

function carAhead(G, car) {
  // A car in front of us, in the same lane, close enough to matter.
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let best = Infinity;
  for (const other of G.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    if (along < 0 || along > 70) continue;
    const side = Math.abs(dx * -fy + dy * fx);
    if (side < 26) best = Math.min(best, along);
  }
  return best;
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.kind !== 'traffic' || car.wrecked || car.driven) continue;
    const ahead = carAhead(G, car);
    const want = ahead < 70 ? Math.max(0, car.baseSpeed * (ahead / 70)) : car.baseSpeed;
    car.speed += (want - car.speed) * Math.min(1, dt * 2);
    const step = car.speed * dt;
    if (car.road === 'h') {
      car.x += car.dir * step;
      car.y = roadCenter(car.line) + laneFor(true, car.dir);
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.y += car.dir * step;
      car.x = roadCenter(car.line) + laneFor(false, car.dir);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    // At an intersection, sometimes turn onto the crossing road.
    const along = car.road === 'h' ? car.x : car.y;
    const cross = nearestCrossing(along);
    const crossPos = roadCenter(cross);
    if (Math.abs(along - crossPos) < 24 && G.rng.chance(0.45 * dt)) {
      const newDir = G.rng.chance(0.5) ? 1 : -1;
      if (car.road === 'h') {
        car.road = 'v';
        car.line = cross;
        car.dir = newDir;
        car.x = roadCenter(cross) + laneFor(false, newDir);
        car.y = crossPos;
      } else {
        car.road = 'h';
        car.line = cross;
        car.dir = newDir;
        car.y = roadCenter(cross) + laneFor(true, newDir);
        car.x = crossPos;
      }
    }
    // Turn around at the city edge instead of driving into the sea.
    if (car.road === 'h') {
      if (car.x < 20 || car.x > CITY_SIZE - 20) {
        car.dir *= -1;
        car.x = Math.max(20, Math.min(CITY_SIZE - 20, car.x));
      }
    } else if (car.y < 20 || car.y > CITY_SIZE - 20) {
      car.dir *= -1;
      car.y = Math.max(20, Math.min(CITY_SIZE - 20, car.y));
    }
  }
}
