// Boot and the one loop for Solmar. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between six
// screens: title, play, paused, busted, wasted and complete.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, createGame, readSave, startRun, stepGame } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function announce(message) {
  status.textContent = message;
}

// A staged screenshot: build the scene, paint it twice, signal readiness.
function runShot(name) {
  const input = createInput(canvas);
  const game = createGame(seed, input, readSave());
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  // A handle for automated play-tests to inspect the live state.
  window.__solmar = { game, seed };
}

function runGame() {
  const input = createInput(canvas);
  const game = createGame(seed, input, readSave());
  window.__solmar = { game, seed };
  let accumulator = 0;
  let last = performance.now();

  function startFresh() {
    game.audio.ensure();
    game.audio.click();
    startRun(game, true);
    announce('Playing. Follow the objective on screen.');
  }

  function continueSave() {
    game.audio.ensure();
    game.audio.click();
    startRun(game, false);
    announce('Playing. Welcome back to Solmar.');
  }

  function handleTitleClick(click) {
    if (!click) return;
    for (const btn of game.uiButtons) {
      if (click.x >= btn.x && click.x <= btn.x + btn.w && click.y >= btn.y && click.y <= btn.y + btn.h) {
        if (btn.id === 'start') startFresh();
        else if (btn.id === 'continue' && game.hasSave) continueSave();
        return;
      }
    }
  }

  function handleActions() {
    const actions = input.wasTapped('Enter') || input.wasTapped('Space');
    if (game.screen === 'title') {
      if (actions) startFresh();
      handleTitleClick(input.takeClick());
      return;
    }
    if (game.screen === 'busted' || game.screen === 'wasted' || game.screen === 'complete') {
      if (actions) {
        startRun(game, true);
        announce('Playing. Follow the objective on screen.');
      }
      return;
    }
    if (input.wasTapped('KeyP') || input.wasTapped('Escape')) {
      if (game.screen === 'play') {
        game.screen = 'paused';
        announce('Paused.');
      } else if (game.screen === 'paused') {
        game.screen = 'play';
        announce('Playing.');
      }
      return;
    }
    if (game.screen === 'paused' && input.takeClick()) {
      game.screen = 'play';
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (game.screen === 'play') {
      while (accumulator >= STEP && game.screen === 'play') {
        stepGame(game, STEP);
        accumulator -= STEP;
      }
    } else if (game.screen === 'title') {
      // The title screen keeps the city alive behind it.
      while (accumulator >= STEP) {
        stepGame(game, STEP);
        accumulator -= STEP;
      }
      // On the title screen the player does not move, but traffic does:
      // stepGame moves the player only when input moves them, and the
      // title screen reads no movement keys.
    } else {
      accumulator = 0;
    }
    renderer.draw(game);
    input.endFrame();
  }

  // Leaving the tab pauses a running game rather than letting the city run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'play') {
      game.screen = 'paused';
      announce('Paused.');
    }
  });

  announce('Solmar. Press Enter or click Start to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
