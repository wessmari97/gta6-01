// Seeded randomness for Solmar. One seed builds the same city, the same
// traffic and the same pedestrians every time, which is what makes the
// staged screenshots repeatable. The generator is mulberry32: small, fast,
// and plenty random for a game. Nothing else in the game rolls dice except
// through the helpers here.
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let v = s;
    v = Math.imul(v ^ (v >>> 15), v | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}

// A whole number from low to high, both ends included.
export function randInt(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}

// A decimal from low (included) to high (excluded).
export function randRange(rng, low, high) {
  return low + rng() * (high - low);
}

// One entry of an array, chosen by the generator.
export function randPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A Fisher-Yates shuffle of a copy of the array, driven by the generator.
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
  return items;
}
