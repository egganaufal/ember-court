// The card catalog: 12 creatures and 5 spells. A creature shows cost, attack
// and health; a spell shows its effect as its text line and `— SPELL —` at the
// bottom. `guard` marks a creature the rival must strike first. `lastBreath`
// is the damage an Ash Phoenix deals to the rival hero when it dies.

export const CREATURES = [
  { id: 'cinder-imp', name: 'Cinder Imp', house: 'ember', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'It laughs in sparks.' },
  { id: 'flame-hound', name: 'Flame Hound', house: 'ember', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'It hunts what the fire leaves.' },
  { id: 'ash-phoenix', name: 'Ash Phoenix', house: 'ember', kind: 'creature', cost: 4, attack: 5, health: 4, text: 'Even dying, it burns.', lastBreath: 2 },
  { id: 'ripple-sprite', name: 'Ripple Sprite', house: 'tide', kind: 'creature', cost: 1, attack: 1, health: 3, guard: true, text: 'Still water, sharp teeth.' },
  { id: 'tide-serpent', name: 'Tide Serpent', house: 'tide', kind: 'creature', cost: 3, attack: 4, health: 3, text: 'The river keeps its own.' },
  { id: 'leviathan', name: 'Leviathan', house: 'tide', kind: 'creature', cost: 6, attack: 7, health: 7, text: 'The deep does not hurry.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', house: 'thorn', kind: 'creature', cost: 1, attack: 1, health: 2, guard: true, text: 'Small, sharp, patient.' },
  { id: 'thorn-wolf', name: 'Thorn Wolf', house: 'thorn', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'It runs where roots run.' },
  { id: 'briar-giant', name: 'Briar Giant', house: 'thorn', kind: 'creature', cost: 5, attack: 6, health: 5, guard: true, text: 'The forest, standing up.' },
  { id: 'pebble-golem', name: 'Pebble Golem', house: 'gilt', kind: 'creature', cost: 2, attack: 1, health: 4, guard: true, text: 'Slow. Unmoved. Unbroken.' },
  { id: 'gilt-knight', name: 'Gilt Knight', house: 'gilt', kind: 'creature', cost: 3, attack: 3, health: 4, guard: true, text: 'Gold buys a steady sword.' },
  { id: 'stone-king', name: 'Stone King', house: 'gilt', kind: 'creature', cost: 6, attack: 8, health: 6, text: 'His crown is the mountain.' },
];

export const SPELLS = [
  { id: 'cinder-bolt', name: 'Cinder Bolt', house: 'ember', kind: 'spell', cost: 2, text: 'Deal 3 damage to the rival hero.' },
  { id: 'tide-mend', name: 'Tide Mend', house: 'tide', kind: 'spell', cost: 2, text: 'Restore 6 of your life.' },
  { id: 'thorn-snare', name: 'Thorn Snare', house: 'thorn', kind: 'spell', cost: 1, text: 'Deal 2 damage to every rival creature.' },
  { id: 'gilt-tithe', name: 'Gilt Tithe', house: 'gilt', kind: 'spell', cost: 1, text: 'Draw 2 cards.' },
  { id: 'rally-horn', name: 'Rally Horn', house: 'ember', kind: 'spell', cost: 3, text: 'Your creatures gain +2 attack.' },
];

export const CATALOG = [...CREATURES, ...SPELLS];

const BY_ID = new Map(CATALOG.map((card) => [card.id, card]));

/** The catalog entry for an id, or undefined when there is none. */
export function cardById(id) {
  return BY_ID.get(id);
}

/**
 * The 30-card list both sides play from: two copies of each creature (24)
 * plus two Cinder Bolts, one Tide Mend, one Thorn Snare, one Gilt Tithe and
 * one Rally Horn (6).
 */
export const DECK_LIST = [
  ...CREATURES.flatMap((card) => [card.id, card.id]),
  'cinder-bolt', 'cinder-bolt',
  'tide-mend',
  'thorn-snare',
  'gilt-tithe',
  'rally-horn',
];
