// The heads-up display for Solmar: health, cash, wanted stars, the
// current objective, speed and the time of day — and the minimap, a small
// live map of the city with the player, the cars, the police and the
// mission marker on it.
import { BEACH_Y, WORLD_H, WORLD_W, districtAt } from './world.js';
import { objectiveText, missionMarker } from './missions.js';
import { MAX_DRIVE_SPEED } from './vehicles.js';

const MAP_W = 190;
const MAP_H = 150;

// Five stars, filled for the wanted level, empty otherwise.
function drawStars(ctx, x, y, wanted) {
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < wanted ? '#ffd23a' : 'rgba(255,255,255,0.35)';
    ctx.fillText('★', x + i * 24, y);
  }
}

export function drawHud(ctx, game, viewW, viewH) {
  const { player } = game;
  ctx.textAlign = 'left';
  // Health bar, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(14, 14, 210, 26);
  ctx.fillStyle = player.health > 50 ? '#5aa864' : player.health > 25 ? '#e8b23a' : '#d94f3d';
  ctx.fillRect(17, 17, 204 * Math.max(0, player.health / 100), 20);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('HEALTH ' + Math.ceil(player.health), 22, 32);
  // Cash, under the health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(14, 46, 210, 26);
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('$' + game.cash, 22, 65);
  // Wanted stars, top right.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(viewW - 150, 14, 136, 30);
  drawStars(ctx, viewW - 142, 37, game.police.wanted);
  // District and clock, top centre.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  const centreText = districtAt(game.city, player.x, player.y) + '  •  ' + game.clockText;
  ctx.font = '15px system-ui, sans-serif';
  const tw = ctx.measureText(centreText).width;
  ctx.fillRect((viewW - tw) / 2 - 12, 14, tw + 24, 26);
  ctx.fillStyle = '#fff2d9';
  ctx.textAlign = 'center';
  ctx.fillText(centreText, viewW / 2, 33);
  // Objective, bottom centre.
  const objective = objectiveText(game);
  ctx.font = 'bold 16px system-ui, sans-serif';
  const ow = ctx.measureText(objective).width;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect((viewW - ow) / 2 - 14, viewH - 46, ow + 28, 30);
  ctx.fillStyle = '#ffd23a';
  ctx.fillText(objective, viewW / 2, viewH - 25);
  // Speed, bottom right, only while driving.
  if (!player.onFoot && player.car) {
    const kmh = Math.round(Math.abs(player.car.speed) / MAX_DRIVE_SPEED * 180);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(viewW - 120, viewH - 46, 106, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(kmh + ' km/h', viewW - 24, viewH - 25);
  }
}

export function drawMinimap(ctx, game, viewW, viewH) {
  const { city, player } = game;
  const mx = 14;
  const my = viewH - MAP_H - 14;
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(mx - 4, my - 4, MAP_W + 8, MAP_H + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, MAP_W, MAP_H);
  ctx.clip();
  // Ground, sea and roads.
  ctx.fillStyle = '#c9b183';
  ctx.fillRect(mx, my, MAP_W, MAP_H);
  ctx.fillStyle = '#3aa7c9';
  ctx.fillRect(mx, my + BEACH_Y * sy, MAP_W, MAP_H - BEACH_Y * sy);
  ctx.fillStyle = '#3d3d46';
  for (let k = 0; k < 10; k += 1) ctx.fillRect(mx + k * 390 * sx, my, 96 * sx + 1, MAP_H);
  for (let k = 0; k < 8; k += 1) ctx.fillRect(mx, my + k * 390 * sy, MAP_W, 96 * sy + 1);
  // Buildings, as small blocks.
  ctx.fillStyle = 'rgba(120,80,50,0.8)';
  for (const b of city.buildings) {
    ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  }
  // The mission marker, pulsing.
  const marker = missionMarker(game);
  if (marker) {
    const pulse = 1 + Math.sin(game.time * 4) * 0.3;
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(mx + marker.x * sx, my + marker.y * sy, 4 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cars, police in blue, the player's car in white.
  for (const car of game.cars) {
    if (car.kind === 'parked') continue;
    ctx.fillStyle = car.kind === 'police' ? '#2f6fd9' : car === player.car ? '#ffffff' : '#e8e4da';
    ctx.fillRect(mx + car.x * sx - 1, my + car.y * sy - 1, 3, 3);
  }
  // Foot cops, in red.
  ctx.fillStyle = '#ff5a4a';
  for (const cop of game.police.cops) {
    ctx.fillRect(mx + cop.x * sx - 1, my + cop.y * sy - 1, 3, 3);
  }
  // The player, a bright dot with a ring.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mx + player.x * sx, my + player.y * sy, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx + player.x * sx, my + player.y * sy, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // The view rectangle, so the player can see where they are looking.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 4, my - 4, MAP_W + 8, MAP_H + 8);
}
