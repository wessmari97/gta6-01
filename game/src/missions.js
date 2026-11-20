// Rio's story: six jobs for a driver for hire, each with a target on the
// map, a short brief and a cash reward. A mission is a small state machine —
// go to the marker, and for fetch jobs go to a second marker after the
// pickup. Timed jobs restart if the clock runs out; the escape job is won
// by getting the cops off Rio's tail. M skips the current job (no reward).

import { roadCenter } from './city.js';
import { addWanted } from './cops.js';

function at(vRoad, hRoad) {
  return { x: roadCenter(vRoad), y: roadCenter(hRoad) };
}

export function createMissions() {
  const list = [
    {
      id: 0, kind: 'goto', title: 'First Fare', reward: 80,
      brief: 'Mara needs a driver. Pick up the fare waiting at the Marina.',
      target: { ...at(7, 1), label: 'Marina pickup' },
      second: null, timeLimit: null,
    },
    {
      id: 1, kind: 'fetch', title: 'The Package', reward: 150,
      brief: 'A parcel in Old Town, a buyer in the Harbor. Do not open it.',
      target: { ...at(1, 1), label: 'Old Town pickup' },
      second: { ...at(7, 7), label: 'Harbor drop-off' },
      timeLimit: null,
    },
    {
      id: 2, kind: 'escape', title: 'Hot Wheels', reward: 200,
      brief: 'Steal a car, get the cops after you, then lose them. Clean.',
      target: null, second: null, timeLimit: null,
    },
    {
      id: 3, kind: 'timed', title: 'Deadline Dash', reward: 250,
      brief: 'A client downtown pays double if you are there in 70 seconds.',
      target: { ...at(4, 4), label: 'Downtown client' },
      second: null, timeLimit: 70,
    },
    {
      id: 4, kind: 'fetch', title: 'The Getaway', reward: 300,
      brief: 'Pick Mara up in the Palms. The cops will be waiting — drive her to the beach house.',
      target: { ...at(1, 7), label: 'Palms pickup' },
      second: { x: 2580, y: 345, label: 'Beach house' },
      timeLimit: null,
    },
    {
      id: 5, kind: 'fetch', title: 'The Last Job', reward: 500,
      brief: 'One last warehouse run: Harbor to the Marina, 90 seconds, no questions.',
      target: { ...at(6, 6), label: 'Harbor warehouse' },
      second: { ...at(8, 2), label: 'Marina drop-off' },
      timeLimit: 90,
    },
  ];
  return { list, index: 0, stage: 0, timer: null, active: false, done: false, sawHeat: false };
}

export function currentMission(G) {
  if (G.missions.done) return null;
  return G.missions.list[G.missions.index];
}

export function currentTarget(G) {
  const m = currentMission(G);
  if (!m || !G.missions.active) return null;
  if (m.kind === 'escape') {
    if (G.missions.stage === 0) {
      // Point at the nearest stealable car.
      let best = null;
      let bestD = Infinity;
      for (const car of G.cars) {
        if (car.kind === 'police' || car.wrecked || car.driven) continue;
        const d = Math.hypot(car.x - G.player.x, car.y - G.player.y);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      return best ? { x: best.x, y: best.y, label: 'Steal a car' } : null;
    }
    return null;
  }
  if (m.kind === 'fetch' && G.missions.stage === 1) return m.second;
  return m.target;
}

export function objectiveText(G) {
  const m = currentMission(G);
  if (!m) return 'All jobs done. Solmar is yours, Rio.';
  if (!G.missions.active) return 'Press Enter to start the next job.';
  if (m.kind === 'escape') {
    return G.missions.stage === 0 ? 'Steal a car and get the cops after you.' : 'Lose the cops. Stay out of sight.';
  }
  if (m.kind === 'fetch' && G.missions.stage === 1) return `Deliver to ${m.second.label}.`;
  if (m.kind === 'timed' && G.missions.timer !== null) return `Reach ${m.target.label} — ${Math.ceil(G.missions.timer)}s left.`;
  return `Go to ${m.target.label}.`;
}

export function startMission(G) {
  const m = currentMission(G);
  if (!m) return;
  G.missions.active = true;
  G.missions.stage = 0;
  G.missions.sawHeat = false;
  G.missions.timer = m.timeLimit;
  G.banner = { title: `Job ${m.id + 1}: ${m.title}`, sub: m.brief, t: 4.5 };
  G.audio.pickup();
}

function completeMission(G) {
  const m = currentMission(G);
  G.player.cash += m.reward;
  G.audio.missionDone();
  G.banner = { title: `${m.title} — done!`, sub: `+$${m.reward}. Cash: $${G.player.cash}.`, t: 3.5 };
  G.missions.index += 1;
  G.missions.stage = 0;
  G.missions.timer = null;
  if (G.missions.index >= G.missions.list.length) {
    G.missions.done = true;
    G.missions.active = false;
    G.screen = 'complete';
    saveProgress(G);
    return;
  }
  G.missions.active = false;
  saveProgress(G);
}

export function skipMission(G) {
  const m = currentMission(G);
  if (!m || !G.missions.active) return;
  G.banner = { title: `${m.title} — skipped`, sub: 'No reward. Next job is waiting.', t: 3 };
  G.missions.index += 1;
  G.missions.stage = 0;
  G.missions.timer = null;
  if (G.missions.index >= G.missions.list.length) {
    G.missions.done = true;
    G.missions.active = false;
    G.screen = 'complete';
    saveProgress(G);
    return;
  }
  G.missions.active = false;
  saveProgress(G);
}

export function updateMissions(G, dt) {
  const m = currentMission(G);
  if (!m || !G.missions.active) return;
  if (m.timeLimit !== null && G.missions.timer !== null) {
    G.missions.timer -= dt;
    if (G.missions.timer <= 0) {
      G.missions.timer = m.timeLimit;
      G.banner = { title: 'Too slow!', sub: 'The clock ran out. Try this job again.', t: 3 };
      return;
    }
  }
  if (m.kind === 'escape') {
    if (G.missions.stage === 0) {
      if (G.wanted >= 1) {
        G.missions.stage = 1;
        G.missions.sawHeat = true;
        G.banner = { title: 'They are on you!', sub: 'Lose the cops. Stay out of sight until the heat fades.', t: 3.5 };
      }
      return;
    }
    if (G.missions.stage === 1 && G.wanted === 0) {
      completeMission(G);
    }
    return;
  }
  const target = currentTarget(G);
  if (!target) return;
  const d = Math.hypot(G.player.x - target.x, G.player.y - target.y);
  if (d > 58) return;
  if (m.kind === 'fetch' && G.missions.stage === 0) {
    G.missions.stage = 1;
    G.audio.pickup();
    if (m.id === 4) {
      // The Getaway: picking Mara up brings the heat.
      addWanted(G, 2);
      G.banner = { title: 'Mara is in!', sub: 'Cops on your tail. Get her to the beach house.', t: 3.5 };
    } else {
      G.banner = { title: 'Picked up', sub: `Now deliver to ${m.second.label}.`, t: 3 };
    }
    return;
  }
  completeMission(G);
}

export function saveProgress(G) {
  try {
    window.localStorage.setItem('solmar-save-v1', JSON.stringify({
      cash: G.player.cash,
      mission: Math.min(G.missions.index, G.missions.list.length - 1),
      done: G.missions.done,
    }));
  } catch {
    // Storage can be off: progress then lasts this visit only.
  }
}

export function readProgress() {
  try {
    const raw = window.localStorage.getItem('solmar-save-v1');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.mission !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
