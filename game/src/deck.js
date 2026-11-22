// Building and drawing from a deck. A deck is an array of catalog copies;
// the top of the deck is the end of the array, so drawing is a pop.

import { DECK_LIST, cardById } from './cards.js';
import { shuffle } from './random.js';

/** A fresh shuffled deck: one plain copy of each card in the 30-card list. */
export function buildDeck(random) {
  return shuffle(random, DECK_LIST).map((id) => ({ ...cardById(id) }));
}

/** The top card of a deck, or null when it is empty. */
export function drawFrom(deck) {
  return deck.length === 0 ? null : deck.pop();
}
