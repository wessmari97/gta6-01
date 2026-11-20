// All of Solmar's sound, made with WebAudio and nothing else: there
// are no audio files to ship. Every call is guarded, so a browser with
// no audio — or one that waits for a gesture before it allows sound —
// just stays quiet instead of breaking the game.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenTimer = 0;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!context || !master) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = context.currentTime + when;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  // A burst of filtered noise, for impacts and punches.
  function thud(vol = 0.5) {
    if (!context || !master) return;
    try {
      const len = Math.floor(context.sampleRate * 0.12);
      const buffer = context.createBuffer(1, len, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = context.createBufferSource();
      src.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      const gain = context.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch {
      // Ignore audio failures.
    }
  }

  return {
    ensure,
    // A short click for the menus.
    click() {
      if (!ensure()) return;
      tone(660, 0.07, 'square', 0.12);
    },
    // A bright two-note blip for pickups and cash.
    blip() {
      if (!ensure()) return;
      tone(880, 0.09, 'sine', 0.25);
      tone(1318, 0.12, 'sine', 0.2, 0.07);
    },
    // The mission-complete jingle: four rising notes.
    jingle() {
      if (!ensure()) return;
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.25, i * 0.11));
    },
    // A low thud for punches and crashes.
    thud,
    // The engine hum: two oscillators whose pitch follows the speed.
    // speed01 runs 0..1; pass on as false while the player is on foot.
    engine(speed01, on) {
      if (!ensure()) return;
      try {
        if (!on) {
          if (engineGain) engineGain.gain.value = 0;
          return;
        }
        if (!engineOsc) {
          engineOsc = context.createOscillator();
          engineOsc2 = context.createOscillator();
          engineGain = context.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc2.type = 'square';
          engineOsc.frequency.value = 60;
          engineOsc2.frequency.value = 30;
          engineGain.gain.value = 0;
          const filter = context.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 900;
          engineOsc.connect(filter);
          engineOsc2.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
          engineOsc2.start();
        }
        const target = 0.05 + speed01 * 0.11;
        engineGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, context.currentTime, 0.1);
        engineOsc2.frequency.setTargetAtTime(28 + speed01 * 65, context.currentTime, 0.1);
      } catch {
        // Ignore audio failures.
      }
    },
    // The police siren: one oscillator swapping between two notes.
    // Call every frame with on true while the player is wanted.
    siren(on, dt) {
      if (!ensure()) return;
      try {
        if (!on) {
          if (sirenGain) sirenGain.gain.value = 0;
          return;
        }
        if (!sirenOsc) {
          sirenOsc = context.createOscillator();
          sirenGain = context.createGain();
          sirenOsc.type = 'triangle';
          sirenOsc.frequency.value = 750;
          sirenGain.gain.value = 0;
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
        }
        sirenGain.gain.setTargetAtTime(0.05, context.currentTime, 0.1);
        sirenTimer += dt;
        if (sirenTimer > 0.45) {
          sirenTimer = 0;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 700, context.currentTime, 0.05);
        }
      } catch {
        // Ignore audio failures.
      }
    },
  };
}
