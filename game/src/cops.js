// The wanted system and the police who enforce it. Crimes raise the wanted
// level (1–5); the level decides how many foot cops and patrol cars come
// after Rio. Lay low and the heat fades — but a cop standing next to Rio on
// foot will grab him, and a patrol car will ram his ride.

import { CITY_SIZE, randomRoadPoint, resolveCircle } from './city.js';
import { CAR_RADIUS } from './player.js';

const FOOT_COP_SPEED = 208;
const GRAB_TIME = 1.2;
const DECAY_QUIET = 8;
const DECAY_STEP = 6;

export function createCops() {
  return { list: [], crimeT: 99, decayT: 0, spawnT: 0 };
}

export function addWanted(G, n) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  if (G.wanted > before) {
    G.cops.crimeT = 0;
    G.cops.decayT = 0;
  }
}

function spawnPointNear(G, rng, minDist, maxDist) {
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomRoadPoint(rng);
    const d = Math.hypot(p.x - G.player.x, p.y - G.player.y);
    if (d >= minDist && d <= maxDist) return p;
  }
  const p = randomRoadPoint(rng);
  return p;
}

function spawnFootCop(G) {
  const p = spawnPointNear(G, G.rng, 420, 800);
  G.cops.list.push({
    x: p.x,
    y: p.y,
    angle: 0,
    speed: FOOT_COP_SPEED,
    hp: 60,
    punchCd: 0,
    state: 'chase',
    fallT: 0,
    radius: 14,
  });
}

function spawnPatrol(G) {
  const p = spawnPointNear(G, G.rng, 480, 900);
  const colors = ['#2b4a6b', '#1f3a55', '#33475e'];
  G.cars.push({
    x: p.x,
    y: p.y,
    angle: Math.atan2(G.player.y - p.y, G.player.x - p.x),
    speed: 0,
    color: colors[G.cars.length % colors.length],
    kind: 'police',
    hp: 130,
    driven: false,
    wrecked: false,
    patrol: true,
  });
}

function countPatrols(G) {
  let n = 0;
  for (const car of G.cars) if (car.kind === 'police' && !car.wrecked) n += 1;
  return n;
}

function nearestCopDist(G) {
  let best = Infinity;
  for (const cop of G.cops.list) {
    if (cop.state === 'down') continue;
    best = Math.min(best, Math.hypot(cop.x - G.player.x, cop.y - G.player.y));
  }
  for (const car of G.cars) {
    if (car.kind !== 'police' || car.wrecked) continue;
    best = Math.min(best, Math.hypot(car.x - G.player.x, car.y - G.player.y));
  }
  return best;
}

export function updateCops(G, dt) {
  const cops = G.cops;
  cops.crimeT += dt;

  // Heat fades when Rio has been quiet and no cop is close.
  if (G.wanted > 0 && cops.crimeT > DECAY_QUIET && nearestCopDist(G) > 320) {
    cops.decayT += dt;
    if (cops.decayT >= DECAY_STEP) {
      cops.decayT = 0;
      G.wanted -= 1;
      if (G.wanted === 0) {
        cops.list = [];
        for (const car of G.cars) {
          if (car.kind === 'police') car.wrecked = true;
        }
      }
    }
  }

  // Reinforcements arrive while the heat is on.
  cops.spawnT -= dt;
  if (G.wanted > 0 && cops.spawnT <= 0) {
    cops.spawnT = 1.6;
    const wantFoot = Math.min(G.wanted, 3);
    const aliveFoot = cops.list.filter((c) => c.state !== 'down').length;
    if (aliveFoot < wantFoot) spawnFootCop(G);
    const wantPatrol = G.wanted >= 2 ? Math.min(G.wanted - 1, 3) : 0;
    if (countPatrols(G) < wantPatrol) spawnPatrol(G);
  }

  const p = G.player;
  for (const cop of cops.list) {
    if (cop.state === 'down') {
      cop.fallT -= dt;
      if (cop.fallT <= 0) {
        cop.state = 'chase';
        cop.hp = 60;
      }
      continue;
    }
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.1) cop.angle = Math.atan2(dy, dx);
    if (d > 30) {
      cop.x += (dx / d) * cop.speed * dt;
      cop.y += (dy / d) * cop.speed * dt;
    }
    const fixed = resolveCircle(G.city, cop.x, cop.y, cop.radius);
    cop.x = Math.max(0, Math.min(CITY_SIZE, fixed.x));
    cop.y = Math.max(0, Math.min(CITY_SIZE, fixed.y));
    if (cop.punchCd > 0) cop.punchCd -= dt;
    // A cop on top of Rio on foot starts the grab; in a car he just gets hit.
    if (d < 46 && !p.car) {
      p.grabT += dt;
      if (cop.punchCd <= 0 && p.hurtT <= 0) {
        cop.punchCd = 0.9;
        p.hp -= 8;
        p.hurtT = 0.6;
        G.audio.punch();
        if (p.hp <= 0) G.screen = 'wasted';
      }
      if (p.grabT >= GRAB_TIME) {
        G.screen = 'busted';
        G.audio.busted();
      }
    } else if (d < 40 && p.car) {
      // A cop next to the car yanks at the door and dents it.
      if (cop.punchCd <= 0) {
        cop.punchCd = 1.1;
        p.car.hp -= 6;
        G.audio.punch();
        if (p.car.hp <= 0) {
          const car = p.car;
          car.wrecked = true;
          car.speed = 0;
          car.driven = false;
          p.car = null;
          p.x = Math.max(14, Math.min(CITY_SIZE - 14, car.x + 30));
          p.y = Math.max(14, Math.min(CITY_SIZE - 14, car.y));
        }
      }
      p.grabT = 0;
    } else {
      p.grabT = Math.max(0, p.grabT - dt * 2);
    }
  }
  cops.list = cops.list.filter((c) => !(c.state === 'down' && c.fallT <= -4));

  // Patrol cars chase by steering straight at Rio, sliding along walls.
  for (const car of G.cars) {
    if (car.kind !== 'police' || car.wrecked || car.driven) continue;
    const dx = p.x - car.x;
    const dy = p.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) continue;
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turn = Math.max(-2.6, Math.min(2.6, diff * 3));
    car.angle += turn * dt;
    const target = d > 260 ? 400 : 300;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.4);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const fixed = resolveCircle(G.city, car.x, car.y, CAR_RADIUS);
    car.x = Math.max(CAR_RADIUS, Math.min(CITY_SIZE - CAR_RADIUS, fixed.x));
    car.y = Math.max(CAR_RADIUS, Math.min(CITY_SIZE - CAR_RADIUS, fixed.y));
    // Ramming Rio: on foot it hurts him, in a car it wrecks the ride.
    if (d < CAR_RADIUS + 16) {
      if (p.car && p.car !== car) {
        p.car.hp -= 30 * dt;
        car.speed *= 0.98;
        if (p.car.hp <= 0) {
          const mine = p.car;
          mine.wrecked = true;
          mine.speed = 0;
          mine.driven = false;
          p.car = null;
          p.x = Math.max(14, Math.min(CITY_SIZE - 14, mine.x + 30));
          p.y = Math.max(14, Math.min(CITY_SIZE - 14, mine.y));
          G.announce('Your car was wrecked by the police.');
        }
      } else if (!p.car && p.hurtT <= 0) {
        p.hp -= 12;
        p.hurtT = 0.8;
        p.x += (dx / d) * -30;
        p.y += (dy / d) * -30;
        G.audio.punch();
        if (p.hp <= 0) G.screen = 'wasted';
      }
    }
  }
}
