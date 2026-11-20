// A tiny seeded random generator for Solmar, so a seed always builds the
// same city and the same traffic. mulberry32 is a small, fast generator
// with a good spread for a game like this; the helpers below are the only
// ways the rest of the game draws random numbers.
export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// A whole number in [low, high] from the generator.
export function randInt(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}

// A decimal in [low, high) from the generator.
export function randRange(rng, low, high) {
  return low + rng() * (high - low);
}

// One element of an array, picked by the generator.
export function randPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// Shuffle a copy of an array in place order, using the generator.
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
