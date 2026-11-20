// Keyboard and mouse state for one frame. `down` is held keys, `pressed` is
// the set of keys that went down since the last frame (edge triggered, so a
// single tap registers once even if the key is held). Call endFrame() after
// each simulation step so edges do not leak into the next frame.

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  let click = null;

  function codeOf(e) {
    return e.code || e.key || '';
  }

  window.addEventListener('keydown', (e) => {
    const c = codeOf(e);
    if (c === 'ArrowUp' || c === 'ArrowDown' || c === 'ArrowLeft' || c === 'ArrowRight' || c === 'Space') {
      e.preventDefault();
    }
    if (!down.has(c)) pressed.add(c);
    down.add(c);
  });
  window.addEventListener('keyup', (e) => {
    down.delete(codeOf(e));
  });
  window.addEventListener('blur', () => {
    down.clear();
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    click = { x: e.clientX - r.left, y: e.clientY - r.top };
  });

  return {
    isDown(code) {
      return down.has(code);
    },
    // True only on the frame the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    // The mouse click since the last frame, in canvas pixels, or null.
    takeClick() {
      const c = click;
      click = null;
      return c;
    },
    // Any of the movement keys held (WASD or arrows), as a unit vector.
    moveVector() {
      let x = 0;
      let y = 0;
      if (down.has('KeyA') || down.has('ArrowLeft')) x -= 1;
      if (down.has('KeyD') || down.has('ArrowRight')) x += 1;
      if (down.has('KeyW') || down.has('ArrowUp')) y -= 1;
      if (down.has('KeyS') || down.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const n = Math.hypot(x, y);
        x /= n;
        y /= n;
      }
      return { x, y };
    },
    endFrame() {
      pressed.clear();
    },
  };
}
