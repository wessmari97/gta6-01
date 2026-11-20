// The game state of Solmar and the one step that advances it. main.js
// owns the loop and the screens; shots.js owns the staged scenes; both
// build and step the game through here, so a screenshot is a real game.
import { buildCity } from './world.js';
import { createRng } from './random.js';
import { createPlayer, updatePlayerOnFoot, hurtPlayer } from './player.js';
import { fillStreets, toggleCar, updateVehicles } from './vehicles.js';
import { fillSidewalks, updatePeds } from './peds.js';
import { addWanted as policeAddWanted, createPolice, updatePolice } from './police.js';
import { createMissions, startMission, updateMissions } from './missions.js';
import { createAudio } from './audio.js';

export const SAVE_KEY = 'solmar-save-v1';
export const STEP = 1 / 60;

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function createGame(seed, input, save) {
  const rng = createRng(seed);
  const city = buildCity(rng);
  const game = {
    seed,
    rng,
    time: 0,
    clockMin: 9 * 60 + 15,
    city,
    input,
    audio: createAudio(),
    camera: { x: 0, y: 0 },
    screen: 'title',
    cash: save ? save.cash || 0 : 0,
    clockText: formatClock(9 * 60 + 15),
    hasSave: !!save,
    bestText: save ? `$${save.cash || 0} — ${save.completed || 0}/6 jobs` : 'no save yet',
    uiButtons: [],
    player: null,
    cars: [],
    peds: [],
    police: createPolice(),
    missions: createMissions(),
  };
  game.player = createPlayer(1608, 1218);
  fillStreets(game);
  fillSidewalks(game);
  if (save && Array.isArray(save.missions)) {
    game.missions.completed = save.missions.slice();
    game.missions.index = Math.min(save.missions.length, 5);
  }
  // Bound helpers the modules call back into.
  game.addWanted = (stars, reason) => policeAddWanted(game, stars, reason);
  game.endRun = (kind) => endRun(game, kind);
  game.save = () => writeSave(game);
  game.hurtPlayer = (damage) => hurtPlayer(game, damage);
  return game;
}

export function writeSave(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash,
      completed: game.missions.completed.length,
      missions: game.missions.completed,
    }));
    game.hasSave = true;
    game.bestText = `$${game.cash} — ${game.missions.completed.length}/6 jobs`;
  } catch {
    // Storage can be off: the save then lasts this visit only.
  }
}

// Start a fresh run: reset the player, the heat and the first mission.
export function startRun(game, fresh) {
  const save = fresh ? null : readSave();
  game.cash = save ? save.cash || 0 : 0;
  game.player = createPlayer(1608, 1218);
  game.police = createPolice();
  game.missions = createMissions();
  if (save && Array.isArray(save.missions)) {
    game.missions.completed = save.missions.slice();
    game.missions.index = Math.min(save.missions.length, 5);
  }
  game.time = 0;
  game.clockMin = 9 * 60 + 15;
  game.clockText = formatClock(game.clockMin);
  game.screen = 'play';
  if (game.missions.index < 6) startMission(game, game.missions.index);
}

// End a run: busted, wasted or complete. The save keeps cash and jobs.
export function endRun(game, kind) {
  if (game.screen !== 'play') return;
  game.screen = kind;
  game.audio.engine(0, false);
  game.audio.siren(false, 0);
  writeSave(game);
}

// One fixed step of the game, in the order the systems depend on each other.
// On the title screen only the city stays alive (traffic and people); the
// player, the police and the missions wait for the game to start.
export function stepGame(game, dt) {
  game.time += dt;
  game.clockMin += dt * 0.5;
  game.clockText = formatClock(game.clockMin);
  if (game.screen === 'title') {
    updateVehicles(game, dt);
    updatePeds(game, dt);
    return;
  }
  // The car key: get in or out, once per press.
  if (game.input.wasTapped('KeyE')) toggleCar(game);
  if (game.player.onFoot) updatePlayerOnFoot(game, dt);
  updateVehicles(game, dt);
  updatePeds(game, dt);
  updatePolice(game, dt);
  updateMissions(game, dt);
  // The clock wraps at midnight.
  if (game.clockMin >= 24 * 60) game.clockMin -= 24 * 60;
}

// The clock text the HUD shows, as a 12-hour time.
export function formatClock(mins) {
  const total = Math.floor(mins);
  const hours = Math.floor(total / 60) % 12 || 12;
  const mm = total % 60;
  const ampm = Math.floor(total / 60) < 12 ? 'AM' : 'PM';
  return `${hours}:${String(mm).padStart(2, '0')} ${ampm}`;
}
