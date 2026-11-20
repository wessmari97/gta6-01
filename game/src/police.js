// The wanted system and the police of Solmar. Crimes add stars; the
// police answer with foot cops and patrol cars that chase the player.
// Stay out of sight and out of trouble and the heat cools off, one star
// at a time. Get caught on foot and it is BUSTED; run out of health and
// it is WASTED.
import { BEACH_Y, pointBlocked, roadCenter } from './world.js';
import { randRange } from './random.js';
import { hurtPlayer } from './player.js';

export const MAX_WANTED = 5;
export const DECAY_SECONDS = 25;
export const COP_RADIUS = 14;

export function createPolice() {
  return {
    wanted: 0,
    lastCrime: -999,
    cops: [],
    cars: [],
  };
}

// Raise the wanted level by stars (never above the cap) and remember when
// the crime happened, for the cool-down.
export function addWanted(game, stars, reason) {
  const police = game.police;
  if (stars <= 0) return;
  police.wanted = Math.min(MAX_WANTED, police.wanted + stars);
  police.lastCrime = game.time;
  if (game.police.wanted > 0) game.audio.siren(true, 0);
}

function spawnCop(game) {
  const { player, rng } = game;
  const angle = rng() * Math.PI * 2;
  const dist = randRange(rng, 420, 620);
  const x = player.x + Math.cos(angle) * dist;
  const y = player.y + Math.sin(angle) * dist;
  return {
    x: Math.max(30, Math.min(game.city.width - 30, x)),
    y: Math.max(30, Math.min(BEACH_Y - 30, y)),
    angle,
    speed: 195,
    health: 50,
    hurtTimer: 0,
    down: false,
    downTimer: 0,
  };
}

function spawnPoliceCar(game) {
  const { player, rng, city } = game;
  // Start on the road nearest the player, a few blocks away.
  const col = Math.max(0, Math.min(9, Math.round(player.x / 390)));
  const row = Math.max(0, Math.min(7, Math.round(player.y / 390)));
  const horizontal = rng() < 0.5;
  const x = horizontal ? player.x + (rng() < 0.5 ? 500 : -500) : roadCenter('v', col);
  const y = horizontal ? roadCenter('h', row) : player.y + (rng() < 0.5 ? 500 : -500);
  return {
    x: Math.max(60, Math.min(city.width - 60, x)),
    y: Math.max(60, Math.min(BEACH_Y - 60, y)),
    angle: horizontal ? 0 : Math.PI / 2,
    speed: 0,
    cruise: 330,
    color: '#2f6fd9',
    kind: 'police',
    health: 120,
    axis: horizontal ? 'h' : 'v',
    dir: 1,
    lastTurn: 0,
    brake: false,
    smoke: 0,
  };
}

// A foot cop runs at the player; touching a slow player on foot busts them.
function updateCop(game, cop, dt) {
  const { player } = game;
  if (cop.down) {
    cop.downTimer -= dt;
    if (cop.downTimer <= 0) cop.down = false;
    return;
  }
  if (cop.hurtTimer > 0) cop.hurtTimer -= dt;
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const d = Math.hypot(dx, dy) || 1;
  cop.angle = Math.atan2(dy, dx);
  const nx = cop.x + (dx / d) * cop.speed * dt;
  const ny = cop.y + (dy / d) * cop.speed * dt;
  if (!pointBlocked(game.city, nx, cop.y, COP_RADIUS)) cop.x = nx;
  if (!pointBlocked(game.city, cop.x, ny, COP_RADIUS)) cop.y = ny;
  // Caught: the player is on foot and not outrunning the cop.
  if (d < 30 && player.onFoot) {
    game.endRun('busted');
  }
  // A cop that gets close on foot can land a hit.
  if (d < 40 && player.onFoot && hurtPlayer(game, 12)) {
    game.endRun('wasted');
  }
}

// A police car drives toward the player's block and rams their car.
function updatePoliceCar(game, car, dt) {
  const { player } = game;
  // Steer toward the player: pick the axis that closes the bigger gap.
  const dx = player.x - car.x;
  const dy = player.y - car.y;
  const wantAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
  if (car.axis !== wantAxis) {
    // Turn at the next intersection: head for the nearest cross road.
    const cross = wantAxis === 'h'
      ? roadCenter('h', Math.round(car.y / 390))
      : roadCenter('v', Math.round(car.x / 390));
    const along = wantAxis === 'h' ? car.y : car.x;
    if (Math.abs(along - cross) < 40) {
      car.axis = wantAxis;
      car.dir = wantAxis === 'h' ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
      car.angle = wantAxis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  // Chase speed grows with the wanted level.
  const target = Math.min(430, 260 + game.police.wanted * 34);
  car.speed += Math.max(-500 * dt, Math.min(320 * dt, target - car.speed));
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (car.axis === 'h') {
    const centre = roadCenter('h', Math.max(0, Math.min(7, Math.round(car.y / 390))));
    car.y = centre + (car.dir > 0 ? 20 : -20);
    car.x = nx;
  } else {
    const centre = roadCenter('v', Math.max(0, Math.min(9, Math.round(car.x / 390))));
    car.x = centre + (car.dir > 0 ? -20 : 20);
    car.y = ny;
  }
  // Ram the player's car, or run the player down on foot.
  const d = Math.hypot(player.x - car.x, player.y - car.y);
  if (d < 46) {
    if (player.onFoot) {
      if (hurtPlayer(game, 20)) game.endRun('wasted');
      // Knock the player aside so the car does not sit on them.
      player.x += (player.x - car.x) / (d || 1) * 30;
      player.y += (player.y - car.y) / (d || 1) * 30;
    } else if (player.car) {
      player.car.health -= 6 * dt;
      car.health -= 8;
      car.speed *= 0.5;
      game.audio.thud(0.4);
      if (player.car.health <= 0) {
        player.car.health = 0;
        player.car.speed = 0;
      }
    }
  }
}

export function updatePolice(game, dt) {
  const police = game.police;
  const { player } = game;
  // How many cops and cars the current wanted level calls for.
  const wantCops = Math.min(3, police.wanted);
  const wantCars = police.wanted >= 2 ? Math.min(3, police.wanted - 1) : 0;
  while (police.cops.length < wantCops) police.cops.push(spawnCop(game));
  while (police.cars.length < wantCars) {
    const car = spawnPoliceCar(game);
    police.cars.push(car);
    game.cars.push(car);
  }
  // Cool down: no crime for a while and no cop nearby, lose a star.
  const nearestCop = police.cops.reduce((best, cop) => {
    const d = Math.hypot(cop.x - player.x, cop.y - player.y);
    return Math.min(best, d);
  }, Infinity);
  if (police.wanted > 0 && game.time - police.lastCrime > DECAY_SECONDS && nearestCop > 500) {
    police.wanted -= 1;
    police.lastCrime = game.time;
    if (police.wanted === 0) game.audio.siren(false, 0);
  }
  // Extra cops and cars melt away when the heat drops.
  while (police.cops.length > wantCops) police.cops.pop();
  while (police.cars.length > wantCars) {
    const car = police.cars.pop();
    const index = game.cars.indexOf(car);
    if (index !== -1) game.cars.splice(index, 1);
  }
  for (const cop of police.cops) updateCop(game, cop, dt);
  for (const car of police.cars) updatePoliceCar(game, car, dt);
  game.audio.siren(police.wanted > 0, dt);
}
