// Input for Solmar: keyboard state and mouse clicks on the canvas.
// The game needs two different questions answered — "is this key held
// right now" for movement, and "was this key pressed since the last
// frame" for one-off actions like stealing a car — so this module keeps
// both a held set and a per-frame tapped set.
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

  // Movement on both axes, each -1, 0 or 1, from WASD or the arrow keys.
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
    // Arrows and space would scroll the page; the game wants them instead.
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
    // True while either Shift key is held down.
    running() {
      return isDown('ShiftLeft') || isDown('ShiftRight');
    },
    // The most recent click in canvas pixels, or null; reading it clears it.
    takeClick() {
      const found = click;
      click = null;
      return found;
    },
    // Clear this frame's taps. The game calls this once per frame.
    endFrame() {
      tapped.clear();
    },
  };
}
