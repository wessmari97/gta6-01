// Synthesised sound: no audio files, everything comes from the Web Audio
// API. Short effects are one-shot blips; the engine hum and the police siren
// are oscillators whose pitch is driven every frame from the game state, so
// they follow the speed and the wanted level. Nothing here starts until the
// player has pressed a key or clicked (the browser blocks audio before that).

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenOn = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch {
      ctx = null;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch {
      // Audio is decoration: never let a sound error stop the game.
    }
  }

  function note(freq, delay, dur) {
    if (!ctx) return;
    setTimeout(() => blip(freq, dur, 'sine', 0.1), delay);
  }

  return {
    ensure,
    click() {
      blip(620, 0.07, 'square', 0.06);
    },
    punch() {
      blip(140, 0.12, 'sawtooth', 0.12, 70);
    },
    pickup() {
      note(660, 0, 0.12);
      note(880, 90, 0.16);
    },
    missionDone() {
      note(523, 0, 0.14);
      note(659, 110, 0.14);
      note(784, 220, 0.14);
      note(1046, 330, 0.26);
    },
    busted() {
      note(392, 0, 0.2);
      note(311, 160, 0.2);
      note(233, 320, 0.36);
    },
    // Called every frame: drives the continuous engine and siren sounds.
    update(dt, driving, speed, wanted, time) {
      if (!ctx) return;
      if (engineOsc && engineGain) {
        const target = driving ? 0.045 + Math.min(0.05, Math.abs(speed) * 0.00012) : 0;
        engineGain.gain.value += (target - engineGain.gain.value) * Math.min(1, dt * 8);
        engineOsc.frequency.value = 55 + Math.abs(speed) * 0.32;
      }
      if (sirenOsc && sirenGain) {
        const want = wanted >= 2;
        if (want && !sirenOn) sirenOn = true;
        if (!want && sirenOn) sirenOn = false;
        const target = sirenOn ? 0.035 : 0;
        sirenGain.gain.value += (target - sirenGain.gain.value) * Math.min(1, dt * 6);
        if (sirenOn) sirenOsc.frequency.value = 700 + 260 * Math.sin(time * 5.2);
      }
    },
  };
}
