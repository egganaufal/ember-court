// Every rectangle on the 1280x720 table, in one place. The renderer and the
// input read the same layout, so a click lands where the card was drawn.

import { FIELD } from './config.js';

export const RIVAL_HERO = { x: 24, y: 20, w: 150, h: 96 };
export const PLAYER_HERO = { x: 24, y: 604, w: 150, h: 96 };
export const RIVAL_DECK = { x: 1184, y: 20, w: 72, h: 100 };
export const PLAYER_DECK = { x: 1184, y: 600, w: 72, h: 100 };
export const END_TURN = { x: 1084, y: 316, w: 172, h: 56 };
export const MANA_BOX = { x: 1084, y: 384, w: 172, h: 28 };
export const SCORE_BOX = { x: 1084, y: 424, w: 172, h: 52 };
export const LOG_Y = 512;
export const FELT = { x: 640, y: 300, rx: 430, ry: 150 };

export const RIVAL_HAND_CARD = { w: 56, h: 78, y: 8, gap: 8 };
export const RIVAL_TABLE_CARD = { w: 104, h: 140, y: 128, gap: 14 };
export const PLAYER_TABLE_CARD = { w: 104, h: 140, y: 330, gap: 14 };
export const PLAYER_HAND_CARD = { w: 112, h: 152, y: 548, gap: 10 };

/** A centred row of cards: the rectangles for `count` cards of this size. */
export function rowRects(count, card, y) {
  const total = count * card.w + Math.max(0, count - 1) * card.gap;
  const x0 = (FIELD.width - total) / 2;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ x: x0 + i * (card.w + card.gap), y, w: card.w, h: card.h });
  }
  return out;
}

/** Every rectangle the table needs for this state, keyed by what it is. */
export function currentLayout(state) {
  return {
    rivalHero: { ...RIVAL_HERO },
    playerHero: { ...PLAYER_HERO },
    rivalDeck: { ...RIVAL_DECK },
    playerDeck: { ...PLAYER_DECK },
    endTurn: { ...END_TURN },
    manaBox: { ...MANA_BOX },
    scoreBox: { ...SCORE_BOX },
    rivalHand: rowRects(state.players[1].hand.length, RIVAL_HAND_CARD, RIVAL_HAND_CARD.y),
    rivalTable: rowRects(state.players[1].table.length, RIVAL_TABLE_CARD, RIVAL_TABLE_CARD.y),
    playerTable: rowRects(state.players[0].table.length, PLAYER_TABLE_CARD, PLAYER_TABLE_CARD.y),
    playerHand: rowRects(state.players[0].hand.length, PLAYER_HAND_CARD, PLAYER_HAND_CARD.y),
  };
}

/** True when a point in logical coordinates falls inside a rectangle. */
export function hit(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}
