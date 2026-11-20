// Everything drawn over the world: health, cash, wanted stars, the current
// objective, speed and clock, the minimap, and the mission banner. All of it
// is canvas text and shapes, drawn in screen space after the world.

import { CITY_SIZE, districtAt } from './city.js';
import { currentMission, currentTarget, objectiveText } from './missions.js';

const MAP_SIZE = 172;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const a2 = a + Math.PI / 5;
    const x1 = x + Math.cos(a) * r;
    const y1 = y + Math.sin(a) * r;
    const x2 = x + Math.cos(a2) * r * 0.45;
    const y2 = y + Math.sin(a2) * r * 0.45;
    if (i === 0) ctx.moveTo(x1, y1);
    else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23e' : 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawMinimap(ctx, G, viewW, viewH) {
  const x0 = viewW - MAP_SIZE - 14;
  const y0 = viewH - MAP_SIZE - 14;
  const scale = MAP_SIZE / CITY_SIZE;
  ctx.fillStyle = 'rgba(20,28,36,0.82)';
  ctx.fillRect(x0 - 4, y0 - 4, MAP_SIZE + 8, MAP_SIZE + 8);
  ctx.fillStyle = '#4fa8c9';
  ctx.fillRect(x0, y0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = '#e9d9ac';
  ctx.fillRect(x0, y0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = '#f0dca8';
  ctx.fillRect(x0 + (2490 * scale), y0, MAP_SIZE - 2490 * scale, MAP_SIZE);
  ctx.strokeStyle = 'rgba(93,97,103,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let k = 0; k < 9; k += 1) {
    const c = (k * 300 + 45) * scale;
    ctx.moveTo(x0 + c, y0);
    ctx.lineTo(x0 + c, y0 + MAP_SIZE);
    ctx.moveTo(x0, y0 + c);
    ctx.lineTo(x0 + MAP_SIZE, y0 + c);
  }
  ctx.stroke();
  const dot = (wx, wy, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + wx * scale, y0 + wy * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const car of G.cars) {
    if (car.wrecked) continue;
    if (car.kind === 'police') dot(car.x, car.y, 3.5, '#2b6cff');
    else if (car.driven) dot(car.x, car.y, 4, '#ffffff');
    else dot(car.x, car.y, 2.5, '#e8e8e8');
  }
  for (const cop of G.cops.list) {
    if (cop.state !== 'down') dot(cop.x, cop.y, 3, '#2b6cff');
  }
  const target = currentTarget(G);
  if (target) {
    const pulse = 5 + 2 * Math.sin(G.time * 5);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x0 + target.x * scale, y0 + target.y * scale, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5a00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  dot(G.player.x, G.player.y, 4.5, '#ff5a3c');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x0 + G.player.x * scale, y0 + G.player.y * scale, 4.5, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawHud(ctx, G, viewW, viewH) {
  const p = G.player;
  ctx.textBaseline = 'alphabetic';
  // Health bar and cash, top left.
  ctx.fillStyle = 'rgba(20,28,36,0.72)';
  ctx.fillRect(14, 14, 216, 46);
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = '#3a3f45';
  ctx.fillRect(24, 24, 180, 14);
  ctx.fillStyle = hpFrac > 0.5 ? '#5ec95a' : hpFrac > 0.25 ? '#e8b13c' : '#e5534b';
  ctx.fillRect(24, 24, 180 * hpFrac, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash}`, 24, 54);
  // Wanted stars, top right.
  const stars = G.wanted;
  ctx.fillStyle = 'rgba(20,28,36,0.72)';
  ctx.fillRect(viewW - 14 - 5 * 30 - 8, 14, 5 * 30 + 8, 40);
  for (let i = 0; i < 5; i += 1) {
    star(ctx, viewW - 14 - 12 - i * 30, 34, 11, i < stars);
  }
  // Objective, top centre.
  const m = currentMission(G);
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const title = m ? `Job ${m.id + 1}: ${m.title}` : 'Solmar';
  const obj = objectiveText(G);
  ctx.fillStyle = 'rgba(20,28,36,0.72)';
  const lines = wrapText(ctx, obj, 420);
  const panelH = 34 + lines.length * 20 + 10;
  const panelW = 460;
  ctx.fillRect((viewW - panelW) / 2, 12, panelW, panelH);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText(title, viewW / 2, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, viewW / 2, 54 + i * 20);
  });
  // Speed, clock and district, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(20,28,36,0.72)';
  ctx.fillRect(14, viewH - 64, 210, 50);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.42);
    ctx.fillText(`${kmh} km/h`, 24, viewH - 36);
  } else {
    ctx.fillText('On foot', 24, viewH - 36);
  }
  const hours = 8 + Math.floor(G.clock / 3600);
  const mins = Math.floor((G.clock % 3600) / 60);
  const clock = `${String(hours % 24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`${clock} · ${districtAt(p.x, p.y)}`, 24, viewH - 20);
  // Mission banner, centre.
  if (G.banner && G.banner.t > 0) {
    const alpha = Math.min(1, G.banner.t);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(20,28,36,0.82)';
    const bw = 520;
    ctx.fillRect((viewW - bw) / 2, viewH / 2 - 130, bw, 84);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.banner.title, viewW / 2, viewH / 2 - 94);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px system-ui, sans-serif';
    const sub = wrapText(ctx, G.banner.sub, bw - 40);
    sub.forEach((line, i) => {
      ctx.fillText(line, viewW / 2, viewH / 2 - 66 + i * 20);
    });
    ctx.globalAlpha = 1;
  }
  drawMinimap(ctx, G, viewW, viewH);
}
