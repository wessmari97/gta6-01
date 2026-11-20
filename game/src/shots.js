// Screenshot staging for Solmar: ?shot=start|drive|chase|mission (with
// &seed=N) plays the real game forward from a fresh world to a fixed
// frame, so each screenshot is what a short game really looks like and
// the same seed always gives the same frame. The autopilot drives and
// walks the way a player would, toward waypoints on the roads.
import { STEP, stepGame } from './game.js';
import { startMission } from './missions.js';
import { createCar, nearestStealable } from './vehicles.js';

// A stand-in for the keyboard that the autopilot steers with.
function fakeInput() {
  const drive = { x: 0, y: 0 };
  return {
    drive,
    isDown: () => false,
    wasTapped: () => false,
    moveAxis: () => ({ x: drive.x, y: drive.y }),
    running: () => false,
    takeClick: () => null,
    endFrame: () => {},
  };
}

// Steer a car toward a point: forward, and left or right by the angle to
// it. A sharp turn at speed needs a slow car, so the throttle eases off
// (coast) or brakes when the angle to the target is wide and the car is
// moving fast; a slow car just turns and goes.
function steerToward(car, tx, ty) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = diff > 0.18 ? 1 : diff < -0.18 ? -1 : 0;
  const abs = Math.abs(diff);
  const fast = Math.abs(car.speed) > 220;
  const throttle = abs > 1.0 && fast ? 1 : abs > 0.5 && fast ? 0 : -1;
  return { x: steer, y: throttle };
}

// Walk toward a point on foot.
function walkToward(player, tx, ty) {
  const dx = tx - player.x;
  const dy = ty - player.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

// Put the player in a car at their spot: use a nearby parked car, or
// park one there when the street is empty. The car takes the player's
// facing, so the staged drive starts in the intended direction.
function putPlayerInCar(game) {
  let car = nearestStealable(game);
  if (!car) {
    car = createCar(game.city, game.rng, 'parked', game.player.x, game.player.y, game.player.angle);
    game.cars.push(car);
  }
  car.angle = game.player.angle;
  game.player.car = car;
  game.player.onFoot = false;
  car.kind = 'player';
  car.health = Math.max(car.health, 80);
  game.player.x = car.x;
  game.player.y = car.y;
  game.player.angle = car.angle;
  return true;
}

// Drive a route of road intersections, steering toward each in turn.
function driveRoute(game, input, route, seconds) {
  let leg = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const car = game.player.car;
    if (!car) break;
    const target = route[Math.min(leg, route.length - 1)];
    const steer = steerToward(car, target.x, target.y);
    input.drive.x = steer.x;
    input.drive.y = steer.y;
    if (Math.hypot(car.x - target.x, car.y - target.y) < 110) leg += 1;
    // Step the world by hand: the shot has no main loop.
    stepWorld(game);
    if (game.screen !== 'play') break;
  }
}

// One world step for a staged scene (the same step the loop uses).
function stepWorld(game) {
  stepGame(game, STEP);
  game.input.endFrame();
}

export function stageShot(name, game) {
  const input = fakeInput();
  game.input = input;
  game.screen = 'play';
  if (name === 'start') {
    // The title screen over a living downtown: traffic and people move.
    game.screen = 'title';
    game.player.x = 1608;
    game.player.y = 1218;
    for (let i = 0; i < 5 / STEP; i += 1) stepWorld(game);
    return 'title';
  }
  if (name === 'drive') {
    // Driving east along the Marina road with traffic around and the
    // first mission on the HUD: a straight run, so the car is clearly
    // moving and the city streams past.
    game.player.x = 800;
    game.player.y = 2778;
    game.player.angle = 0;
    putPlayerInCar(game);
    startMission(game, 0);
    driveRoute(game, input, [{ x: 3300, y: 2778 }], 6);
    return 'play';
  }
  if (name === 'chase') {
    // A three-star chase: the player flees east along a Downtown road,
    // two patrol cars hunting them from behind.
    game.player.x = 800;
    game.player.y = 1218;
    game.player.angle = 0;
    putPlayerInCar(game);
    startMission(game, 0);
    game.addWanted(3, 'staged chase');
    driveRoute(game, input, [{ x: 3300, y: 1218 }], 7);
    return 'play';
  }
  // Mission: on foot near the Marina pickup, walking to the marker.
  // The player starts a short walk away, so the marker and the objective
  // are both on screen and the job is clearly in progress.
  game.player.x = 1400;
  game.player.y = 2778;
  game.player.onFoot = true;
  startMission(game, 0);
  const steps = Math.floor(1.5 / STEP);
  for (let i = 0; i < steps; i += 1) {
    const axis = walkToward(game.player, 1900, 2778);
    input.drive.x = axis.x;
    input.drive.y = axis.y;
    stepWorld(game);
    if (game.screen !== 'play') break;
  }
  return 'play';
}
