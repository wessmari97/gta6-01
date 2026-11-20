// Drawing only: the city, the actors and the screens, pixels out. The camera
// follows Rio (or drifts slowly over the title screen), the world is drawn in
// world coordinates, and the HUD and panels are drawn in screen space.

import { CITY_SIZE, drawCity } from './city.js';
import { currentMission, currentTarget } from './missions.js';
import { drawHud } from './hud.js';

function clampCam(value, view, size) {
  if (view >= size) return (size - view) / 2;
  return Math.max(0, Math.min(size - view, value));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  if (car.wrecked) {
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, -22, -11, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,120,120,0.7)';
    ctx.beginPath();
    ctx.arc(-6, -4, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -20, -9, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(ctx, -22, -11, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#bfe3f2';
    roundRect(ctx, -6, -9, 14, 18, 3);
    ctx.fill();
    ctx.fillStyle = '#20242a';
    roundRect(ctx, 14, -9, 6, 18, 2);
    ctx.fill();
    if (car.kind === 'police') {
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(-14, -11, 8, 5);
      ctx.fillStyle = '#2b6cff';
      ctx.fillRect(-14, 6, 8, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 4);
    }
  }
  ctx.restore();
}

function drawPed(ctx, ped) {
  if (ped.state === 'down') {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y, 13, 8, ped.angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(ped.x, ped.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(ped.x + Math.cos(ped.angle) * 4, ped.y + Math.sin(ped.angle) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCop(ctx, cop) {
  if (cop.state === 'down') {
    ctx.fillStyle = '#2b4a6b';
    ctx.beginPath();
    ctx.ellipse(cop.x, cop.y, 13, 8, cop.angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#2b4a6b';
  ctx.beginPath();
  ctx.arc(cop.x, cop.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f3a55';
  ctx.beginPath();
  ctx.arc(cop.x, cop.y - 3, 8, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(cop.x + Math.cos(cop.angle) * 4, cop.y + Math.sin(cop.angle) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.car) return;
  if (p.hurtT > 0 && Math.floor(p.hurtT * 10) % 2 === 0) return;
  ctx.fillStyle = '#ff5a3c';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c39a';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 5, p.y + Math.sin(p.angle) * 5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
  ctx.stroke();
  if (p.punchT > 0) {
    ctx.strokeStyle = 'rgba(255,210,62,0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34, p.angle - 0.9, p.angle + 0.9);
    ctx.stroke();
  }
}

function drawMarker(ctx, G, view) {
  const target = currentTarget(G);
  if (!target) return;
  const pulse = 1 + 0.12 * Math.sin(G.time * 5);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(target.x, target.y - 34);
  ctx.lineTo(target.x + 9, target.y - 18);
  ctx.lineTo(target.x - 9, target.y - 18);
  ctx.closePath();
  ctx.fill();
  // Off-screen: an arrow at the view edge pointing at the target.
  if (target.x < view.x || target.x > view.x + view.w || target.y < view.y || target.y > view.y + view.h) {
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    const ang = Math.atan2(target.y - cy, target.x - cx);
    const ax = cx + Math.cos(ang) * (view.w / 2 - 60);
    const ay = cy + Math.sin(ang) * (view.h / 2 - 60);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPanel(ctx, viewW, viewH, title, lines, prompt, accent) {
  const w = 620;
  const h = 150 + lines.length * 30 + 60;
  const x = (viewW - w) / 2;
  const y = (viewH - h) / 2;
  ctx.fillStyle = 'rgba(18,24,32,0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.fillStyle = accent || '#ffd23e';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, viewW / 2, y + 66);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, viewW / 2, y + 108 + i * 30);
  });
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(prompt, viewW / 2, y + h - 24);
  return { x, y, w, h };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280;
  let viewH = 720;
  let dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(G) {
    const p = G.player;
    let camX;
    let camY;
    if (G.screen === 'title') {
      camX = clampCam(1350 - viewW / 2 + Math.sin(G.time * 0.05) * 260, viewW, CITY_SIZE);
      camY = clampCam(1350 - viewH / 2 + Math.cos(G.time * 0.04) * 180, viewH, CITY_SIZE);
    } else {
      camX = clampCam(p.x - viewW / 2, viewW, CITY_SIZE);
      camY = clampCam(p.y - viewH / 2, viewH, CITY_SIZE);
    }
    const view = { x: camX, y: camY, w: viewW, h: viewH };
    ctx.setTransform(dpr, 0, 0, dpr, -camX * dpr, -camY * dpr);
    drawCity(ctx, G.city, view);
    drawMarker(ctx, G, view);
    for (const car of G.cars) {
      if (car.x < camX - 60 || car.x > camX + viewW + 60 || car.y < camY - 60 || car.y > camY + viewH + 60) continue;
      drawCar(ctx, car);
    }
    for (const ped of G.peds) {
      if (ped.x < camX - 40 || ped.x > camX + viewW + 40 || ped.y < camY - 40 || ped.y > camY + viewH + 40) continue;
      drawPed(ctx, ped);
    }
    for (const cop of G.cops.list) {
      if (cop.x < camX - 40 || cop.x > camX + viewW + 40 || cop.y < camY - 40 || cop.y > camY + viewH + 40) continue;
      drawCop(ctx, cop);
    }
    drawPlayer(ctx, G);
    // Screen space from here.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G.screen === 'title') {
      ctx.fillStyle = 'rgba(18,24,32,0.55)';
      ctx.fillRect(0, 0, viewW, viewH);
      const save = G.hasSave;
      const lines = [
        'Rio is a driver for hire in Solmar, a sun-soaked coastal city.',
        'Steal cars, outrun the police, and finish six jobs for Mara.',
        '',
        'WASD / Arrows — move & drive · Shift — run · Space / J — punch',
        'E — steal / leave a car · P — pause · M — skip the current job',
        save ? 'A saved game was found: Continue picks up where you left off.' : 'No saved game yet — Start begins Job 1.',
      ];
      drawPanel(ctx, viewW, viewH, 'SOLMAR', lines, save ? 'Press Enter to start, or click Start / Continue' : 'Press Enter or click Start to play', '#ffd23e');
      // Buttons for mouse users, below the panel so they never cover its text.
      const bw = 200;
      const bh = 46;
      const panelH = 150 + lines.length * 30 + 60;
      const by = (viewH - panelH) / 2 + panelH + 18;
      const bx1 = viewW / 2 - bw - 12;
      const bx2 = viewW / 2 + 12;
      ctx.fillStyle = '#ffd23e';
      roundRect(ctx, bx1, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Start', bx1 + bw / 2, by + 30);
      if (save) {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, bx2, by, bw, bh, 8);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText('Continue', bx2 + bw / 2, by + 30);
      }
      G.uiButtons = [
        { id: 'start', x: bx1, y: by, w: bw, h: bh },
        ...(save ? [{ id: 'continue', x: bx2, y: by, w: bw, h: bh }] : []),
      ];
      return;
    }
    drawHud(ctx, G, viewW, viewH);
    if (G.screen === 'paused') {
      drawPanel(ctx, viewW, viewH, 'Paused', ['The city waits for you.'], 'Press P to resume');
    } else if (G.screen === 'busted') {
      drawPanel(ctx, viewW, viewH, 'BUSTED', ['The Solmar police caught up with Rio.', `Cash kept: $${p.cash}.`], 'Press Enter to try again', '#2b6cff');
    } else if (G.screen === 'wasted') {
      drawPanel(ctx, viewW, viewH, 'WASTED', ['Rio is down. The city keeps moving.', `Cash kept: $${p.cash}.`], 'Press Enter to try again', '#e5534b');
    } else if (G.screen === 'complete') {
      drawPanel(ctx, viewW, viewH, 'SOLMAR IS YOURS', ['All six jobs done. Mara pays out in full.', `Final cash: $${p.cash}.`], 'Press Enter to play again', '#5ec95a');
    }
  }

  return { draw, size: () => ({ w: viewW, h: viewH }) };
}
