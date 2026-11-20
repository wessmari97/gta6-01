// The player on foot in Solmar: walking, running, punching, and taking
// hits. The player is a circle that slides along buildings; when the
// player drives, the car owns the movement instead and this module only
// tracks health and the punch timer.
import { pointBlocked } from './world.js';

export const PLAYER_RADIUS = 14;
export const WALK_SPEED = 175;
export const RUN_SPEED = 265;
export const PUNCH_RANGE = 34;
export const PUNCH_ARC = 1.1;
export const PUNCH_COOLDOWN = 0.45;
export const PUNCH_DAMAGE = 25;

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    health: 100,
    onFoot: true,
    car: null,
    punchTimer: 0,
    punchAnim: 0,
    hurtTimer: 0,
    moving: false,
  };
}

// Try to move the player by (dx, dy), sliding along walls: first x, then y,
// so the player glides around corners instead of sticking to them.
function tryMove(city, player, dx, dy) {
  const nx = player.x + dx;
  if (!pointBlocked(city, nx, player.y, PLAYER_RADIUS)) player.x = nx;
  const ny = player.y + dy;
  if (!pointBlocked(city, player.x, ny, PLAYER_RADIUS)) player.y = ny;
}

export function updatePlayerOnFoot(game, dt) {
  const { player, input, city } = game;
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.punchAnim > 0) player.punchAnim -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;

  const axis = input.moveAxis();
  const speed = input.running() ? RUN_SPEED : WALK_SPEED;
  player.moving = axis.x !== 0 || axis.y !== 0;
  if (player.moving) {
    const len = Math.hypot(axis.x, axis.y) || 1;
    const vx = (axis.x / len) * speed * dt;
    const vy = (axis.y / len) * speed * dt;
    player.angle = Math.atan2(axis.y, axis.x);
    tryMove(city, player, vx, vy);
  }

  // Punch: a short arc in front of the player. It hits pedestrians and
  // cops, and hitting one is a crime.
  if ((input.wasTapped('Space') || input.wasTapped('KeyJ')) && player.punchTimer <= 0) {
    player.punchTimer = PUNCH_COOLDOWN;
    player.punchAnim = 0.22;
    game.audio.thud(0.35);
    const hitX = player.x + Math.cos(player.angle) * (PLAYER_RADIUS + 12);
    const hitY = player.y + Math.sin(player.angle) * (PLAYER_RADIUS + 12);
    let hitAnyone = false;
    for (const ped of game.peds) {
      if (ped.down) continue;
      const d = Math.hypot(ped.x - hitX, ped.y - hitY);
      if (d < PUNCH_RANGE) {
        knockPed(game, ped);
        hitAnyone = true;
      }
    }
    for (const cop of game.police.cops) {
      const d = Math.hypot(cop.x - hitX, cop.y - hitY);
      if (d < PUNCH_RANGE) {
        cop.health -= PUNCH_DAMAGE;
        cop.hurtTimer = 0.4;
        if (cop.health <= 0) cop.down = true;
        hitAnyone = true;
        game.addWanted(2, 'attacked a cop');
      }
    }
    if (hitAnyone && game.police.wanted === 0) game.addWanted(1, 'assault');
  }
}

// A pedestrian that gets punched (or run over) falls down, stays down for
// a while, and counts as a crime against the player.
export function knockPed(game, ped) {
  ped.down = true;
  ped.downTimer = 6;
  game.audio.thud(0.4);
  game.addWanted(1, 'hurt a pedestrian');
}

// Hurt the player; returns true when the hit killed them.
export function hurtPlayer(game, damage) {
  const { player } = game;
  if (player.hurtTimer > 0 || game.screen !== 'play') return false;
  player.health -= damage;
  player.hurtTimer = 0.6;
  game.audio.thud(0.5);
  if (player.health <= 0) {
    player.health = 0;
    return true;
  }
  return false;
}
