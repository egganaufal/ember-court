// The rival: a greedy heuristic that plays only from what it can see — its
// own hand, both tables, both life totals — never the player's hand.

import { affordablePlays, playCard } from './engine.js';

/**
 * The hand index the rival plays next, or -1 when it passes. Spell moments
 * first, then the best-value affordable creature, then fallback spells.
 */
export function nextPlay(state, side, random) {
  const me = state.players[side];
  const rival = state.players[1 - side];
  const affordable = new Set(affordablePlays(state, side));
  const find = (id) => {
    const index = me.hand.findIndex((card) => card.id === id);
    return index !== -1 && affordable.has(index) ? index : -1;
  };

  // 1. Spells whose moment has come.
  let at = find('cinder-bolt');
  if (at !== -1 && rival.life <= 3) return at;
  at = find('tide-mend');
  if (at !== -1 && me.life <= 15) return at;
  at = find('thorn-snare');
  if (at !== -1 && rival.table.length >= 2) return at;
  at = find('gilt-tithe');
  if (at !== -1 && me.hand.length <= 2) return at;
  at = find('rally-horn');
  if (at !== -1 && me.table.length >= 2) return at;

  // 2. The affordable creature with the highest value, small random tie-break.
  let best = -1;
  let bestValue = -Infinity;
  me.hand.forEach((card, index) => {
    if (!affordable.has(index) || card.kind !== 'creature') return;
    const value = card.cost * 2 + card.attack + card.health + (card.guard ? 1 : 0) + random() * 0.5;
    if (value > bestValue) {
      bestValue = value;
      best = index;
    }
  });
  if (best !== -1) return best;

  // 3. Fallback spells when nothing else tempts.
  at = find('cinder-bolt');
  if (at !== -1 && rival.life <= 12) return at;
  at = find('gilt-tithe');
  if (at !== -1) return at;
  return -1;
}

/**
 * Play a whole turn at once. 'greedy' keeps taking nextPlay until it passes
 * (capped at 40 plays); 'passive' plays nothing. Used by the screenshot
 * scenes; the live rival driver calls nextPlay one card at a time instead.
 */
export function autoplayTurn(state, side, policy) {
  if (policy === 'passive') return 0;
  let plays = 0;
  for (let guard = 0; guard < 40; guard += 1) {
    const at = nextPlay(state, side, state.random);
    if (at === -1) break;
    if (!playCard(state, side, at)) break;
    plays += 1;
  }
  return plays;
}
