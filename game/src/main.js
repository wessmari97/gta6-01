// Boot and the one loop for Solmar. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between six screens: title, play, paused, busted, wasted and
// complete.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity, roadCenter } from './city.js';
import { createPlayer, resetPlayerToSpawn, updatePlayer } from './player.js';
import { createCars, updateTraffic } from './cars.js';
import { createPeds, updatePeds } from './peds.js';
import { createCops, updateCops } from './cops.js';
import { createMissions, readProgress, skipMission, startMission, updateMissions } from './missions.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function buildGame() {
  const rng = makeRng(seed);
  const city = buildCity(rng);
  const spawn = { x: roadCenter(1), y: roadCenter(4) };
  const G = {
    seed,
    rng,
    city,
    spawn,
    player: createPlayer(spawn),
    cars: createCars(rng, 26, 16),
    peds: createPeds(rng, 18),
    cops: createCops(),
    missions: createMissions(),
    wanted: 0,
    clock: 0,
    time: 0,
    screen: 'title',
    hasSave: false,
    banner: null,
    uiButtons: [],
    input: null,
    audio: null,
    announce(message) {
      status.textContent = message;
    },
  };
  const save = readProgress();
  if (save) {
    G.hasSave = true;
    G.savedProgress = save;
  }
  return G;
}

function applySave(G, save) {
  G.player.cash = save.cash || 0;
  G.missions.index = Math.max(0, Math.min(save.mission || 0, G.missions.list.length - 1));
  G.missions.done = !!save.done;
}

function startFresh(G) {
  G.audio.ensure();
  G.audio.click();
  G.player.cash = 0;
  G.missions = createMissions();
  G.wanted = 0;
  G.cops = createCops();
  resetPlayerToSpawn(G);
  G.screen = 'play';
  startMission(G);
  G.announce('Playing. Follow the objective on screen.');
}

function continueSave(G) {
  const save = G.savedProgress || readProgress();
  if (!save) {
    startFresh(G);
    return;
  }
  G.audio.ensure();
  G.audio.click();
  applySave(G, save);
  G.wanted = 0;
  G.cops = createCops();
  resetPlayerToSpawn(G);
  G.screen = 'play';
  if (G.missions.done) {
    G.screen = 'complete';
    G.announce('All jobs done. Solmar is yours.');
    return;
  }
  startMission(G);
  G.announce('Playing. Welcome back to Solmar.');
}

function retryAfterCaught(G) {
  G.audio.ensure();
  G.audio.click();
  G.wanted = 0;
  G.cops = createCops();
  resetPlayerToSpawn(G);
  G.screen = 'play';
  if (!G.missions.done) startMission(G);
  G.announce('Playing. Follow the objective on screen.');
}

function stepWorld(G, dt) {
  G.time += dt;
  if (G.banner && G.banner.t > 0) G.banner.t -= dt;
  if (G.screen === 'title') {
    updateTraffic(G, dt);
    updatePeds(G, dt);
    return;
  }
  if (G.screen !== 'play') return;
  G.clock += dt;
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateCops(G, dt);
  // Missions only advance while Rio is free, not while caught.
  if (G.screen === 'play') {
    updateMissions(G, dt);
  }
  const driving = !!G.player.car;
  const speed = driving ? G.player.car.speed : 0;
  G.audio.update(dt, driving, speed, G.wanted, G.time);
}

function runShot(name, G) {
  stageShot(name, G);
  const steps = name === 'start' ? 300 : 30;
  for (let i = 0; i < steps; i += 1) stepWorld(G, STEP);
  const renderer = createRenderer(canvas);
  G.renderer = renderer;
  let painted = 0;
  function paint() {
    renderer.draw(G);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  window.__solmar = { game: G, seed };
}

function runGame() {
  const G = buildGame();
  G.input = createInput(canvas);
  G.audio = createAudio();
  const renderer = createRenderer(canvas);
  G.renderer = renderer;
  window.__solmar = { game: G, seed };
  let accumulator = 0;
  let last = performance.now();

  function handleTitleClick(click) {
    if (!click) return;
    for (const btn of G.uiButtons) {
      if (click.x >= btn.x && click.x <= btn.x + btn.w && click.y >= btn.y && click.y <= btn.y + btn.h) {
        if (btn.id === 'start') startFresh(G);
        else if (btn.id === 'continue' && G.hasSave) continueSave(G);
        return;
      }
    }
  }

  function handleActions() {
    const input = G.input;
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      if (G.screen === 'title') {
        startFresh(G);
        return;
      }
      if (G.screen === 'busted' || G.screen === 'wasted') {
        retryAfterCaught(G);
        return;
      }
      if (G.screen === 'complete') {
        startFresh(G);
        return;
      }
    }
    if (G.screen === 'title') {
      handleTitleClick(input.takeClick());
      return;
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (G.screen === 'play') {
        G.screen = 'paused';
        G.announce('Paused.');
      } else if (G.screen === 'paused') {
        G.screen = 'play';
        G.announce('Playing.');
      }
      return;
    }
    if (G.screen === 'paused' && input.takeClick()) {
      G.screen = 'play';
      G.announce('Playing.');
      return;
    }
    if (G.screen === 'play' && input.wasPressed('KeyM')) {
      skipMission(G);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (G.screen === 'title' || G.screen === 'play') {
      while (accumulator >= STEP && (G.screen === 'title' || G.screen === 'play')) {
        stepWorld(G, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(G);
    G.input.endFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') {
      G.screen = 'paused';
      G.announce('Paused.');
    }
  });

  G.announce('Solmar. Press Enter or click Start to play.');
  requestAnimationFrame(frame);
}

if (shot) {
  const G = buildGame();
  G.input = createInput(canvas);
  G.audio = createAudio();
  runShot(shot, G);
} else {
  runGame();
}

export { STEP };
