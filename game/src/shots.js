// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// sets the real game state to a staged moment — a title screen over a living
// city, a drive, a police chase, a mission on foot — and the renderer then
// paints exactly what a player would see. The same seed always stages the
// same frame.

import { roadCenter } from './city.js';
import { startMission, currentMission } from './missions.js';

function putPlayerInCar(G, x, y, angle, speed, color) {
  const car = {
    x, y, angle, speed,
    color: color || '#c94f4f',
    kind: 'parked',
    hp: 100,
    driven: true,
    wrecked: false,
    road: 'h',
    line: 0,
    dir: 1,
  };
  G.cars.push(car);
  G.player.car = car;
  G.player.x = x;
  G.player.y = y;
  G.player.angle = angle;
  return car;
}

function spawnPatrolBehind(G, x, y, angle) {
  G.cars.push({
    x, y, angle,
    speed: 320,
    color: '#2b4a6b',
    kind: 'police',
    hp: 130,
    driven: false,
    wrecked: false,
    patrol: true,
  });
}

export function stageShot(name, G) {
  const p = G.player;
  if (name === 'drive') {
    G.screen = 'play';
    startMission(G);
    G.banner = null;
    const y = roadCenter(2);
    putPlayerInCar(G, 700, y, 0, 300, '#c94f4f');
    return;
  }
  if (name === 'chase') {
    G.screen = 'play';
    startMission(G);
    G.banner = null;
    G.wanted = 3;
    G.cops.crimeT = 0;
    const y = roadCenter(3);
    putPlayerInCar(G, 1100, y, 0, 260, '#4f7ec9');
    spawnPatrolBehind(G, 980, y - 24, 0);
    spawnPatrolBehind(G, 1020, y + 30, 0);
    G.cops.list.push({
      x: 1180, y: y + 60, angle: -Math.PI / 2, speed: 208, hp: 60,
      punchCd: 0, state: 'chase', fallT: 0, radius: 14,
    });
    return;
  }
  if (name === 'mission') {
    G.screen = 'play';
    startMission(G);
    G.banner = null;
    const m = currentMission(G);
    const t = m && m.target ? m.target : { x: roadCenter(7), y: roadCenter(1) };
    p.x = Math.max(40, t.x - 260);
    p.y = Math.max(40, t.y + 40);
    p.angle = Math.atan2(t.y - p.y, t.x - p.x);
    p.car = null;
    return;
  }
  // Default: the title screen over the living city.
  G.screen = 'title';
}
