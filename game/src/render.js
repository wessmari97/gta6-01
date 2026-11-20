// Rendering for Solmar: the camera, the city, the cars and people, and the
// screens (title, pause, busted, wasted, complete). Everything is drawn
// with the canvas 2D API in a warm, sun-soaked palette. Only what the
// camera sees is drawn, so a big city stays fast.
import { BEACH_Y, DISTRICT_NAMES, PITCH, ROAD_W, WATER_Y, WORLD_H, WORLD_W, districtAt } from './world.js';
import { CAR_H, CAR_W } from './vehicles.js';
import { drawHud, drawMinimap } from './hud.js';
import { missionMarker } from './missions.js';

const GROUND = '#d9c08a';
const SAND = '#ecd3a0';
const WATER = '#3aa7c9';
const WATER_DEEP = '#2b8fb5';
const ROAD = '#3d3d46';
const ROAD_EDGE = '#2e2e35';
const LANE = '#e8d27a';
const SIDEWALK = '#cbb98f';
const PARK = '#7fae5a';
const PARK_DARK = '#6a9a4c';

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawRoads(ctx, city, view) {
  ctx.fillStyle = ROAD;
  for (let k = 0; k < 10; k += 1) {
    const x = k * PITCH;
    if (x + ROAD_W < view.x || x > view.x + view.w) continue;
    ctx.fillRect(x, 0, ROAD_W, WORLD_H);
  }
  for (let k = 0; k < 8; k += 1) {
    const y = k * PITCH;
    if (y + ROAD_W < view.y || y > view.y + view.h) continue;
    ctx.fillRect(0, y, WORLD_W, ROAD_W);
  }
  // Lane dashes down the middle of each road.
  ctx.fillStyle = LANE;
  for (let k = 0; k < 10; k += 1) {
    const x = k * PITCH + ROAD_W / 2 - 2;
    if (x < view.x || x > view.x + view.w) continue;
    for (let y = 0; y < WORLD_H; y += 64) {
      if (y + 30 < view.y || y > view.y + view.h) continue;
      ctx.fillRect(x, y, 4, 30);
    }
  }
  for (let k = 0; k < 8; k += 1) {
    const y = k * PITCH + ROAD_W / 2 - 2;
    if (y < view.y || y > view.y + view.h) continue;
    for (let x = 0; x < WORLD_W; x += 64) {
      if (x + 30 < view.x || x > view.x + view.w) continue;
      ctx.fillRect(x, y, 30, 4);
    }
  }
}

function drawBeach(ctx, view) {
  if (BEACH_Y > view.y + view.h || WATER_Y < view.y) return;
  ctx.fillStyle = SAND;
  ctx.fillRect(0, BEACH_Y, WORLD_W, WATER_Y - BEACH_Y);
  ctx.fillStyle = WATER;
  ctx.fillRect(0, WATER_Y, WORLD_W, WORLD_H - WATER_Y);
  // Gentle waves: two sine lines that move with time.
  ctx.strokeStyle = WATER_DEEP;
  ctx.lineWidth = 3;
  for (let row = 0; row < 2; row += 1) {
    const y = WATER_Y + 26 + row * 34;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_W; x += 48) {
      const yy = y + Math.sin(x / 160 + row * 2) * 5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // A pier jutting into the sea at the Marina.
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(1860, BEACH_Y - 10, 80, WATER_Y - BEACH_Y + 60);
}

function drawBlocks(ctx, city, view) {
  for (let j = 0; j < 7; j += 1) {
    for (let i = 0; i < 9; i += 1) {
      const x = i * PITCH + ROAD_W;
      const y = j * PITCH + ROAD_W;
      const size = PITCH - ROAD_W;
      if (x + size < view.x || x > view.x + view.w || y + size < view.y || y > view.y + view.h) continue;
      ctx.fillStyle = SIDEWALK;
      ctx.fillRect(x, y, size, size);
    }
  }
  for (const park of city.parks) {
    if (park.x + park.w < view.x || park.x > view.x + view.w || park.y + park.h < view.y || park.y > view.y + view.h) continue;
    ctx.fillStyle = PARK;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    for (const tree of park.trees) {
      ctx.fillStyle = PARK_DARK;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8fbf6a';
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const b of city.buildings) {
    if (b.x + b.w < view.x || b.x > view.x + view.w || b.y + b.h < view.y || b.y > view.y + view.h) continue;
    // A soft shadow, then the body, then a roof line and windows.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + b.tall * 0.4, b.y + b.tall * 0.4, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
    if (b.w > 70 && b.h > 70) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let wy = b.y + 22; wy < b.y + b.h - 14; wy += 24) {
        for (let wx = b.x + 12; wx < b.x + b.w - 14; wx += 24) {
          ctx.fillRect(wx, wy, 10, 12);
        }
      }
    }
  }
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, -CAR_W / 2 + 3, -CAR_H / 2 + 4, CAR_W, CAR_H, 7);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 7);
  ctx.fill();
  // Windshield and rear window.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(6, -CAR_H / 2 + 3, 10, CAR_H - 6);
  ctx.fillRect(-CAR_W / 2 + 4, -CAR_H / 2 + 3, 7, CAR_H - 6);
  // Wheels.
  ctx.fillStyle = '#1c1c22';
  ctx.fillRect(-CAR_W / 2 + 4, -CAR_H / 2 - 3, 10, 5);
  ctx.fillRect(-CAR_W / 2 + 4, CAR_H / 2 - 2, 10, 5);
  ctx.fillRect(CAR_W / 2 - 14, -CAR_H / 2 - 3, 10, 5);
  ctx.fillRect(CAR_W / 2 - 14, CAR_H / 2 - 2, 10, 5);
  if (car.kind === 'police') {
    // Flashing light bar.
    const phase = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#2f6fd9';
    ctx.fillRect(-4, -CAR_H / 2 - 1, 8, 5);
    ctx.fillStyle = phase ? '#2f6fd9' : '#ff3b30';
    ctx.fillRect(-4, CAR_H / 2 - 4, 8, 5);
  }
  // Smoke from a wrecked car.
  if (car.smoke > 0) {
    const puff = (Math.sin(time * 5 + car.x) * 0.5 + 0.5) * car.smoke;
    ctx.fillStyle = `rgba(120,120,120,${0.25 + puff * 0.4})`;
    ctx.beginPath();
    ctx.arc(-CAR_W / 2 - 6, -4 + Math.sin(time * 3) * 3, 7 + puff * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, pants, walkPhase, down) {
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    // Lying flat.
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = shirt;
    roundRect(ctx, -12, -6, 24, 12, 5);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(walkPhase) * 2;
  ctx.rotate(angle);
  // Legs.
  ctx.fillStyle = pants;
  ctx.fillRect(-6, -6 + bob, 12, 4);
  ctx.fillRect(-6, 2 - bob, 12, 4);
  // Body.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(4, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMarker(ctx, marker, time) {
  const pulse = 1 + Math.sin(time * 4) * 0.15;
  ctx.save();
  ctx.translate(marker.x, marker.y);
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOffscreenArrow(ctx, game, marker, viewW, viewH) {
  const { player } = game;
  const dx = marker.x - player.x;
  const dy = marker.y - player.y;
  const d = Math.hypot(dx, dy);
  if (d < 320) return;
  const angle = Math.atan2(dy, dx);
  const cx = viewW / 2 + Math.cos(angle) * Math.min(viewW / 2 - 40, 260);
  const cy = viewH / 2 + Math.sin(angle) * Math.min(viewH / 2 - 40, 200);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(d)}m`, cx, cy + 30);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280;
  let viewH = 720;
  let scale = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = Math.max(320, rect.width);
    viewH = Math.max(240, rect.height);
    scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewW * scale);
    canvas.height = Math.round(viewH * scale);
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    get viewW() {
      return viewW;
    },
    get viewH() {
      return viewH;
    },
    draw(game) {
      const { player, city, time } = game;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // Camera: follow the player, clamped inside the world.
      let camX = player.x - viewW / 2;
      let camY = player.y - viewH / 2;
      if (game.screen === 'title') {
        camX = 1500 + Math.sin(time * 0.05) * 220 - viewW / 2;
        camY = 1200 - viewH / 2;
      }
      camX = Math.max(0, Math.min(WORLD_W - viewW, camX));
      camY = Math.max(0, Math.min(WORLD_H - viewH, camY));
      game.camera.x = camX;
      game.camera.y = camY;
      const view = { x: camX, y: camY, w: viewW, h: viewH };

      ctx.fillStyle = GROUND;
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.save();
      ctx.translate(-camX, -camY);
      drawBeach(ctx, view);
      drawRoads(ctx, city, view);
      drawBlocks(ctx, city, view);
      const marker = missionMarker(game);
      if (marker && game.screen === 'play') drawMarker(ctx, marker, time);
      for (const car of game.cars) {
        if (car.x + 60 < view.x || car.x - 60 > view.x + view.w || car.y + 60 < view.y || car.y - 60 > view.y + view.h) continue;
        drawCar(ctx, car, time);
      }
      for (const ped of game.peds) {
        if (ped.x + 30 < view.x || ped.x - 30 > view.x + view.w || ped.y + 30 < view.y || ped.y - 30 > view.y + view.h) continue;
        drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.pants, ped.walkPhase, ped.down);
      }
      for (const cop of game.police.cops) {
        if (cop.x + 30 < view.x || cop.x - 30 > view.x + view.w || cop.y + 30 < view.y || cop.y - 30 > view.y + view.h) continue;
        drawPerson(ctx, cop.x, cop.y, cop.angle, '#2f6fd9', '#1c1c22', time * 10, cop.down);
        // A cop's cap.
        ctx.fillStyle = '#1c2a4a';
        ctx.beginPath();
        ctx.arc(cop.x + 4, cop.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // The player: a white shirt, dark trousers, and a punch arc.
      if (game.screen !== 'title') {
        drawPerson(ctx, player.x, player.y, player.angle, '#f2f2f2', '#2f2f38', player.moving ? time * 12 : 0, false);
        if (player.punchAnim > 0) {
          ctx.save();
          ctx.translate(player.x, player.y);
          ctx.rotate(player.angle);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(20, 0, 14, -0.9, 0.9);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();

      if (game.screen === 'play' || game.screen === 'paused') {
        drawHud(ctx, game, viewW, viewH);
        drawMinimap(ctx, game, viewW, viewH);
        if (marker) drawOffscreenArrow(ctx, game, marker, viewW, viewH);
      }
      if (game.screen === 'title') this.drawTitle(game);
      else if (game.screen === 'paused') this.drawPaused(game);
      else if (game.screen === 'busted') this.drawEnd(game, 'BUSTED', 'The Solmar police caught you. Your crew will post bail — try again.');
      else if (game.screen === 'wasted') this.drawEnd(game, 'WASTED', 'You ran out of health in Solmar. Dust yourself off and go again.');
      else if (game.screen === 'complete') this.drawEnd(game, 'SOLMAR LEGEND', 'Every job done. Mara says you own this city now, Rio.');
      // A mission banner sits over the game for a few seconds.
      if (game.missions.banner && game.screen === 'play') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const boxW = Math.min(viewW - 80, 640);
        // Wrap the banner's lines to the box, so a long story line reads.
        const wrapped = [];
        ctx.font = 'bold 17px system-ui, sans-serif';
        for (const raw of game.missions.banner.split('\n')) {
          let line = '';
          for (const word of raw.split(' ')) {
            const trial = line ? line + ' ' + word : word;
            if (ctx.measureText(trial).width > boxW - 28 && line) {
              wrapped.push(line);
              line = word;
            } else {
              line = trial;
            }
          }
          if (line) wrapped.push(line);
        }
        const boxH = 26 + wrapped.length * 22;
        roundRect(ctx, (viewW - boxW) / 2, 84, boxW, boxH, 10);
        ctx.fill();
        ctx.fillStyle = '#ffd23a';
        ctx.textAlign = 'center';
        wrapped.forEach((line, i) => ctx.fillText(line, viewW / 2, 106 + i * 22));
      }
    },
    drawTitle(game) {
      ctx.fillStyle = 'rgba(20,16,10,0.55)';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 84px system-ui, sans-serif';
      ctx.fillText('SOLMAR', viewW / 2, viewH * 0.3);
      ctx.fillStyle = '#fff2d9';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('An open-world crime story in a sun-soaked coastal city', viewW / 2, viewH * 0.3 + 36);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = '#ffe9b8';
      const story = [
        'You are Rio, a driver for hire. Mara, the fixer, has work for you:',
        'pick up fares, run packages, borrow cars, and stay ahead of the police.',
        'Complete all six jobs to become a Solmar legend.',
      ];
      story.forEach((line, i) => ctx.fillText(line, viewW / 2, viewH * 0.44 + i * 24));
      ctx.fillStyle = '#fff2d9';
      ctx.font = '15px system-ui, sans-serif';
      const controls = [
        'WASD / Arrows — move and drive      Shift — run      E — steal / leave a car',
        'Space / J — punch      P — pause      M — next mission',
      ];
      controls.forEach((line, i) => ctx.fillText(line, viewW / 2, viewH * 0.6 + i * 24));
      // Buttons, stored on the game so the main loop can hit-test clicks.
      const bw = 240;
      const bh = 54;
      const startBtn = { id: 'start', x: viewW / 2 - bw - 12, y: viewH * 0.72, w: bw, h: bh };
      const contBtn = { id: 'continue', x: viewW / 2 + 12, y: viewH * 0.72, w: bw, h: bh };
      game.uiButtons = [startBtn, contBtn];
      for (const btn of game.uiButtons) {
        const enabled = btn.id === 'start' || game.hasSave;
        ctx.fillStyle = enabled ? '#ffd23a' : 'rgba(255,210,58,0.35)';
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();
        ctx.fillStyle = '#241a08';
        ctx.font = 'bold 19px system-ui, sans-serif';
        ctx.fillText(btn.id === 'start' ? 'START' : 'CONTINUE', btn.x + btn.w / 2, btn.y + 35);
      }
      ctx.fillStyle = 'rgba(255,242,217,0.8)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('Best: ' + game.bestText, viewW / 2, viewH * 0.72 + 84);
    },
    drawPaused(game) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText('PAUSED', viewW / 2, viewH / 2);
      ctx.fillStyle = '#fff2d9';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Press P or click to keep playing', viewW / 2, viewH / 2 + 40);
    },
    drawEnd(game, title, subtitle) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.textAlign = 'center';
      ctx.fillStyle = title === 'BUSTED' ? '#6fb3ff' : title === 'WASTED' ? '#ff5a4a' : '#ffd23a';
      ctx.font = 'bold 72px system-ui, sans-serif';
      ctx.fillText(title, viewW / 2, viewH * 0.42);
      ctx.fillStyle = '#fff2d9';
      ctx.font = '19px system-ui, sans-serif';
      ctx.fillText(subtitle, viewW / 2, viewH * 0.42 + 40);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Cash $' + game.cash + '   •   Jobs done ' + game.missions.completed.length + ' / 6', viewW / 2, viewH * 0.42 + 76);
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 19px system-ui, sans-serif';
      ctx.fillText('Press Enter to try again', viewW / 2, viewH * 0.42 + 120);
    },
  };
}
