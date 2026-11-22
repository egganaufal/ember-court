// Feel, all cosmetic: the rules never wait for it. Tweens, floating damage
// numbers, the table shake, the turn banner and the win confetti. Confetti
// pieces are stateful (their own positions), so stepping the animation and
// then resetting the blink clock keeps them mid-fall.

import { FIELD, HOUSES } from './config.js';

const CONFETTI_COLORS = [
  HOUSES.ember.color, HOUSES.tide.color, HOUSES.thorn.color, HOUSES.gilt.color, '#c9a227',
];

export function createAnim() {
  return {
    time: 0,
    floaters: [],
    slides: [],
    shake: 0,
    banner: null,
    confetti: [],
  };
}

/** A number that floats up and fades over about a second. */
export function addFloater(anim, x, y, text, color) {
  anim.floaters.push({ x, y, text, color, age: 0, life: 1.0 });
}

/** Shake the table; strength grows with the damage. */
export function addShake(anim, strength) {
  anim.shake = Math.min(14, Math.max(anim.shake, strength));
}

/** A banner across the middle of the table for about two seconds. */
export function showBanner(anim, text) {
  anim.banner = { text, age: 0, life: 2.0 };
}

/** A card sliding from a point to its table slot over ~0.3 s. */
export function addSlide(anim, uid, fromX, fromY, slotIndex, side) {
  anim.slides.push({ uid, fromX, fromY, slotIndex, side, age: 0, life: 0.3 });
}

/** About 115 confetti pieces in the five house/gold colours, falling ~6 s. */
export function spawnConfetti(anim) {
  anim.confetti = [];
  for (let i = 0; i < 115; i += 1) {
    anim.confetti.push({
      x: Math.random() * FIELD.width,
      y: -40 - Math.random() * 120,
      vy: 130 + Math.random() * 160,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 1 + Math.random() * 2,
      size: 5 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rot: Math.random() * Math.PI,
      vr: -3 + Math.random() * 6,
      age: 0,
    });
  }
}

/** The blink phase (0..1) for prompts; 1 while the prompt is lit. */
export function blinkOn(anim) {
  return (anim.time % 1.0) < 0.7 ? 1 : 0.25;
}

/** Reset the blink clock (used by the win screenshot so its prompt shows). */
export function resetClock(anim) {
  anim.time = 0;
}

/** Advance every cosmetic piece by dt seconds. */
export function stepAnim(anim, dt) {
  anim.time += dt;
  for (const floater of anim.floaters) floater.age += dt;
  anim.floaters = anim.floaters.filter((f) => f.age < f.life);
  for (const slide of anim.slides) slide.age += dt;
  anim.slides = anim.slides.filter((s) => s.age < s.life);
  if (anim.shake > 0) anim.shake = Math.max(0, anim.shake - dt * 26);
  if (anim.banner !== null) {
    anim.banner.age += dt;
    if (anim.banner.age >= anim.banner.life) anim.banner = null;
  }
  for (const piece of anim.confetti) {
    piece.age += dt;
    piece.y += piece.vy * dt;
    piece.x += Math.sin(piece.age * piece.swaySpeed + piece.sway) * 24 * dt;
    piece.rot += piece.vr * dt;
  }
  anim.confetti = anim.confetti.filter((p) => p.y < FIELD.height + 24 && p.age < 6.5);
}

/** This frame's shake offset, or 0,0 when the table is still. */
export function shakeOffset(anim) {
  if (anim.shake <= 0.2) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * anim.shake,
    y: (Math.random() * 2 - 1) * anim.shake,
  };
}

/** The slide for a card uid, or null when it is not sliding. */
export function slideFor(anim, uid) {
  for (const slide of anim.slides) {
    if (slide.uid === uid) return slide;
  }
  return null;
}
