// Missions and the story of Solmar. The player is Rio, a driver for
// hire; Mara, the fixer, hands out the jobs. Each mission is data: a
// name, a short story, a list of steps and a cash reward. The mission
// system tracks the current step, the objective marker, time limits and
// the payout, and saves progress when a mission is done.
import { addWanted } from './police.js';

// Places in the city, in world coordinates.
const PLACES = {
  marina: { x: 1900, y: 2778 },
  downtown: { x: 1700, y: 1200 },
  oldtown: { x: 400, y: 400 },
  garage: { x: 3400, y: 800 },
  beachfront: { x: 2000, y: 2950 },
  pier: { x: 1900, y: 2950 },
};

export const MISSIONS = [
  {
    id: 'first-fare',
    name: 'First Fare',
    reward: 150,
    story: 'Mara: "Rio, you are back in Solmar. Pick up a fare at the Marina and drop them in Downtown. Easy money."',
    steps: [
      { kind: 'goto', x: PLACES.marina.x, y: PLACES.marina.y, radius: 90, text: 'Pick up the fare at the Marina' },
      { kind: 'goto', x: PLACES.downtown.x, y: PLACES.downtown.y, radius: 90, text: 'Drop the fare in Downtown' },
    ],
  },
  {
    id: 'package-run',
    name: 'Package Run',
    reward: 250,
    story: 'Mara: "A package is waiting in Old Town. Bring it to the Marina — and be quick about it."',
    steps: [
      { kind: 'pickup', x: PLACES.oldtown.x, y: PLACES.oldtown.y, radius: 80, text: 'Pick up the package in Old Town' },
      { kind: 'goto', x: PLACES.marina.x, y: PLACES.marina.y, radius: 90, text: 'Deliver the package to the Marina', timeLimit: 90 },
    ],
  },
  {
    id: 'hot-wheels',
    name: 'Hot Wheels',
    reward: 300,
    story: 'Mara: "A client wants a ride in style. Borrow a car — any car — and bring it to the garage in East Industrial."',
    steps: [
      { kind: 'getcar', text: 'Borrow a car — any car will do' },
      { kind: 'goto', x: PLACES.garage.x, y: PLACES.garage.y, radius: 100, text: 'Bring the car to the garage' },
    ],
  },
  {
    id: 'lose-the-heat',
    name: 'Lose the Heat',
    reward: 200,
    story: 'Mara: "The cops are on you now. Lose them — get your wanted level to zero and stay clean."',
    startWanted: 2,
    steps: [
      { kind: 'lose', text: 'Lose the cops — get to zero stars' },
    ],
  },
  {
    id: 'the-getaway',
    name: 'The Getaway',
    reward: 400,
    story: 'Mara: "Drive to the Beachfront without getting busted. The whole force will be on your tail."',
    startWanted: 3,
    steps: [
      { kind: 'goto', x: PLACES.beachfront.x, y: PLACES.beachfront.y, radius: 110, text: 'Reach the Beachfront' },
    ],
  },
  {
    id: 'sunset-job',
    name: 'Sunset Job',
    reward: 500,
    story: 'Mara: "One last run, Rio. A package in Old Town, the pier at the Marina, seventy-five seconds. Make it count."',
    startWanted: 2,
    steps: [
      { kind: 'pickup', x: PLACES.oldtown.x, y: PLACES.oldtown.y, radius: 80, text: 'Pick up the last package' },
      { kind: 'goto', x: PLACES.pier.x, y: PLACES.pier.y, radius: 90, text: 'Deliver it to the Marina pier', timeLimit: 75 },
    ],
  },
];

export function createMissions() {
  return {
    index: 0,
    active: null,
    step: 0,
    stepTimer: 0,
    completed: [],
    banner: null,
    bannerTimer: 0,
    nextTimer: 0,
  };
}

// Show a centre-screen message for a few seconds.
function showBanner(missions, text, seconds = 3.5) {
  missions.banner = text;
  missions.bannerTimer = seconds;
}

export function startMission(game, index) {
  const missions = game.missions;
  const def = MISSIONS[index];
  if (!def) return false;
  missions.index = index;
  missions.active = def;
  missions.step = 0;
  missions.stepTimer = def.steps[0].timeLimit || 0;
  if (def.startWanted) addWanted(game, def.startWanted, 'mission heat');
  showBanner(missions, `${def.name}\n${def.story}`, 5);
  return true;
}

// Skip to the next mission (the M key): drop the current job and start
// the one after it, if there is one.
export function skipMission(game) {
  const missions = game.missions;
  if (!missions.active) return false;
  if (missions.index + 1 >= MISSIONS.length) return false;
  missions.active = null;
  return startMission(game, missions.index + 1);
}

// Restart the current mission from its first step (after a failure).
function restartMission(game) {
  const missions = game.missions;
  if (!missions.active) return;
  missions.step = 0;
  missions.stepTimer = missions.active.steps[0].timeLimit || 0;
  showBanner(missions, 'Mission failed — try again.', 3);
}

function completeMission(game) {
  const missions = game.missions;
  const def = missions.active;
  missions.completed.push(def.id);
  game.cash += def.reward;
  game.audio.jingle();
  showBanner(missions, `Mission complete: ${def.name}\n+$${def.reward}`, 4);
  game.save();
  missions.active = null;
  missions.nextTimer = 4;
}

export function updateMissions(game, dt) {
  const missions = game.missions;
  if (missions.bannerTimer > 0) {
    missions.bannerTimer -= dt;
    if (missions.bannerTimer <= 0) missions.banner = null;
  }
  // After a completed mission, the next one starts by itself.
  if (!missions.active) {
    if (missions.nextTimer > 0) {
      missions.nextTimer -= dt;
      if (missions.nextTimer <= 0) {
        if (missions.index + 1 < MISSIONS.length) startMission(game, missions.index + 1);
        else {
          game.endRun('complete');
        }
      }
    }
    return;
  }
  const step = missions.active.steps[missions.step];
  if (!step) return;
  // A time limit runs out: the mission fails and restarts.
  if (step.timeLimit) {
    missions.stepTimer -= dt;
    if (missions.stepTimer <= 0) {
      restartMission(game);
      return;
    }
  }
  const player = game.player;
  let done = false;
  if (step.kind === 'goto') {
    done = Math.hypot(player.x - step.x, player.y - step.y) < step.radius;
  } else if (step.kind === 'pickup') {
    done = player.onFoot && Math.hypot(player.x - step.x, player.y - step.y) < step.radius;
  } else if (step.kind === 'getcar') {
    done = !player.onFoot;
  } else if (step.kind === 'lose') {
    done = game.police.wanted === 0;
  } else if (step.kind === 'survive') {
    missions.stepTimer -= dt;
    done = missions.stepTimer <= 0;
  }
  if (!done) return;
  game.audio.blip();
  missions.step += 1;
  if (missions.step >= missions.active.steps.length) {
    completeMission(game);
  } else {
    const next = missions.active.steps[missions.step];
    missions.stepTimer = next.timeLimit || 0;
    showBanner(missions, next.text, 3);
  }
}

// The map marker for the current step, if it has a place.
export function missionMarker(game) {
  const missions = game.missions;
  if (!missions.active) return null;
  const step = missions.active.steps[missions.step];
  if (!step || step.x === undefined) return null;
  return { x: step.x, y: step.y };
}

// The one-line objective the HUD shows.
export function objectiveText(game) {
  const missions = game.missions;
  if (!missions.active) {
    if (missions.completed.length >= MISSIONS.length) return 'Solmar Legend — all jobs done';
    return 'Free roam — explore Solmar';
  }
  const step = missions.active.steps[missions.step];
  if (!step) return missions.active.name;
  let text = step.text;
  if (step.timeLimit) text += ` — ${Math.max(0, Math.ceil(missions.stepTimer))}s`;
  return text;
}
