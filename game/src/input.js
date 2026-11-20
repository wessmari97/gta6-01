// Keyboard and mouse input for Solmar. One object owns the keys that are
// held down and the ones that were just pressed, so the game can ask both
// "is the player holding W" and "did the player just press E". The canvas
// also reports clicks, which the menus use for their buttons.
export function createInput(canvas) {
  const held = new Set();
  const tapped = new Set();
  let click = null;

  function isDown(code) {
    return held.has(code);
  }

  function wasTapped(code) {
    return tapped.has(code);
  }

  // The four movement directions, as -1, 0 or 1, from WASD or the arrows.
  function moveAxis() {
    let x = 0;
    let y = 0;
    if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
    if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
    if (isDown('KeyW') || isDown('ArrowUp')) y -= 1;
    if (isDown('KeyS') || isDown('ArrowDown')) y += 1;
    return { x, y };
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    tapped.add(event.code);
    // The game scrolls the page with arrows and space otherwise; keep it still.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('click', onClick);

  return {
    isDown,
    wasTapped,
    moveAxis,
    // True while the run key is held.
    running() {
      return isDown('ShiftLeft') || isDown('ShiftRight');
    },
    // The latest click, if any, in canvas pixels; null when there is none.
    takeClick() {
      const found = click;
      click = null;
      return found;
    },
    // Forget this frame's taps, called once per frame after the game reads them.
    endFrame() {
      tapped.clear();
    },
  };
}
