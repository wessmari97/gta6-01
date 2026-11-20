// A tiny seeded random source so a city built from one seed always comes out
// the same. Every helper below draws from one generator object; make a new
// one with makeRng(seed) whenever a fresh, repeatable stream is needed.

export function makeRng(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return {
    // Next float in [0, 1).
    next() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // Float in [min, max).
    range(min, max) {
      return min + this.next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    // One element of an array, picked uniformly.
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    // True with the given probability.
    chance(p) {
      return this.next() < p;
    },
  };
}
