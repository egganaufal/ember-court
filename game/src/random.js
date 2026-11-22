// A small seeded random number generator (mulberry32): the same seed gives the
// same game, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from 0 up to (not including) n. */
export function randomInt(random, n) {
  return Math.floor(random() * n);
}

/** One element of an array, picked uniformly. */
export function randomPick(random, array) {
  return array[randomInt(random, array.length)];
}

/** A shuffled copy of an array (Fisher-Yates); the original is untouched. */
export function shuffle(random, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(random, i + 1);
    const held = out[i];
    out[i] = out[j];
    out[j] = held;
  }
  return out;
}
