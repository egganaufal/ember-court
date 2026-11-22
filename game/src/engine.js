// The rules, pure and synchronous: no drawing, no sound, no waiting. Every
// call appends events (for the animator) and short log lines (the last three
// are shown on the table). A match is a state object:
//
//   { seed, random, nextUid, turn, turnsTaken: [0, 0],
//     phase: 'player' | 'ai' | 'over', winner: null | 0 | 1,
//     players: [side, side], events: [], log: [], score }
//
// A side is { life, mana, maxMana, deck, hand, table }; a card in a hand or
// on a table is a catalog copy plus { uid, bonus, canAttack, justPlayed }.

import { HAND_LIMIT, MAX_MANA, START_HAND, START_LIFE, TABLE_LIMIT } from './config.js';
import { createRandom } from './random.js';
import { buildDeck, drawFrom } from './deck.js';

export const SIDE_PLAYER = 0;
export const SIDE_RIVAL = 1;

function newSide() {
  return { life: START_LIFE, mana: 0, maxMana: 0, deck: [], hand: [], table: [] };
}

function sideName(side) {
  return side === SIDE_PLAYER ? 'You' : 'Rival';
}

/** A catalog copy turned into a live card with its own identity. */
function instantiate(state, def) {
  const card = { ...def, uid: state.nextUid, bonus: 0, canAttack: false, justPlayed: false };
  state.nextUid += 1;
  return card;
}

function pushEvent(state, event) {
  state.events.push(event);
}

function pushLog(state, line) {
  state.log.push(line);
  if (state.log.length > 3) state.log.splice(0, state.log.length - 3);
}

/** Take every pending event out of the state and hand them back. */
export function drainEvents(state) {
  return state.events.splice(0, state.events.length);
}

/** A fresh match: two shuffled decks, three cards each, player to move. */
export function createGame(seed) {
  const random = createRandom(seed);
  const state = {
    seed,
    random,
    nextUid: 1,
    turn: 0,
    turnsTaken: [0, 0],
    phase: 'player',
    winner: null,
    players: [newSide(), newSide()],
    events: [],
    log: [],
    score: 0,
  };
  state.players[SIDE_PLAYER].deck = buildDeck(random).map((def) => instantiate(state, def));
  state.players[SIDE_RIVAL].deck = buildDeck(random).map((def) => instantiate(state, def));
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(state, SIDE_PLAYER);
    drawCard(state, SIDE_RIVAL);
  }
  startTurn(state, SIDE_PLAYER);
  return state;
}

/** The top card of a side's deck into its hand; lost with a log line when full. */
export function drawCard(state, side) {
  const me = state.players[side];
  const card = drawFrom(me.deck);
  if (card === null) {
    pushLog(state, `${sideName(side)} ${side === SIDE_PLAYER ? 'have' : 'has'} no cards left to draw.`);
    return null;
  }
  if (me.hand.length >= HAND_LIMIT) {
    pushLog(state, `${sideName(side)} drew ${card.name}, but the hand was full — it is lost.`);
    pushEvent(state, { type: 'draw-lost', side, uid: card.uid });
    return null;
  }
  me.hand.push(card);
  pushEvent(state, { type: 'draw', side, uid: card.uid });
  return card;
}

/** Open a side's turn: mana grows to its turn count (capped at 10), creatures wake, draw one. */
export function startTurn(state, side) {
  const me = state.players[side];
  state.turnsTaken[side] += 1;
  state.turn += 1;
  me.maxMana = Math.min(state.turnsTaken[side], MAX_MANA);
  me.mana = me.maxMana;
  for (const card of me.table) {
    card.canAttack = true;
    card.justPlayed = false;
  }
  state.phase = side === SIDE_PLAYER ? 'player' : 'ai';
  pushEvent(state, { type: 'turn', side });
  drawCard(state, side);
}

/** Hand indexes the side can play right now (mana, and a free table slot for creatures). */
export function affordablePlays(state, side) {
  const me = state.players[side];
  const out = [];
  me.hand.forEach((card, index) => {
    if (card.cost > me.mana) return;
    if (card.kind === 'creature' && me.table.length >= TABLE_LIMIT) return;
    out.push(index);
  });
  return out;
}

/** Play a card from a side's hand. False when the rules refuse it. */
export function playCard(state, side, handIndex) {
  if (state.phase === 'over') return false;
  if (side === SIDE_PLAYER && state.phase !== 'player') return false;
  if (side === SIDE_RIVAL && state.phase !== 'ai') return false;
  const me = state.players[side];
  const card = me.hand[handIndex];
  if (!card) return false;
  if (card.cost > me.mana) return false;
  if (card.kind === 'creature' && me.table.length >= TABLE_LIMIT) return false;
  me.mana -= card.cost;
  me.hand.splice(handIndex, 1);
  if (card.kind === 'creature') {
    card.canAttack = false;
    card.justPlayed = true;
    me.table.push(card);
    pushEvent(state, { type: 'play', side, uid: card.uid, name: card.name });
    pushLog(state, `${sideName(side)} played ${card.name}.`);
  } else {
    applySpell(state, side, card);
    pushEvent(state, { type: 'play', side, uid: card.uid, name: card.name, spell: true });
    pushLog(state, `${sideName(side)} cast ${card.name}.`);
  }
  return true;
}

function applySpell(state, side, card) {
  const me = state.players[side];
  const rival = state.players[1 - side];
  switch (card.id) {
    case 'cinder-bolt':
      damageHero(state, 1 - side, 3, side, 'spell');
      break;
    case 'tide-mend': {
      const healed = Math.min(6, START_LIFE - me.life);
      me.life += healed;
      pushEvent(state, { type: 'heal', side, amount: healed });
      break;
    }
    case 'thorn-snare':
      for (const target of rival.table.slice()) {
        if (state.phase === 'over') break;
        damageCreature(state, 1 - side, target, 2, side, 'spell');
      }
      break;
    case 'gilt-tithe':
      drawCard(state, side);
      drawCard(state, side);
      break;
    case 'rally-horn':
      for (const creature of me.table) creature.bonus += 2;
      pushEvent(state, { type: 'rally', side });
      break;
    default:
      break;
  }
}

/**
 * Damage a hero. `kind` is 'strike' for a creature's blow, 'spell' for a
 * spell or snare, 'breath' for a dying phoenix. Counts the player's damage
 * to the rival hero for the score, and ends the match at 0 life.
 */
export function damageHero(state, side, amount, bySide, kind = 'strike') {
  const hero = state.players[side];
  const dealt = Math.min(amount, hero.life);
  hero.life -= dealt;
  if (bySide === SIDE_PLAYER && side === SIDE_RIVAL) state.score += dealt;
  pushEvent(state, { type: 'damage', side, amount: dealt, hero: true, kind });
  if (hero.life <= 0) {
    hero.life = 0;
    state.winner = bySide;
    state.phase = 'over';
    pushEvent(state, { type: 'win', side: bySide });
  }
  return dealt;
}

/** Damage a creature on a side's table; it dies at 0 health or less. */
export function damageCreature(state, side, card, amount, bySide, kind = 'strike') {
  card.health -= amount;
  pushEvent(state, { type: 'damage', side, uid: card.uid, amount, kind });
  if (card.health <= 0) killCreature(state, side, card, bySide);
}

function killCreature(state, side, card, bySide) {
  const table = state.players[side].table;
  const at = table.indexOf(card);
  if (at !== -1) table.splice(at, 1);
  pushEvent(state, { type: 'die', side, uid: card.uid, name: card.name });
  pushLog(state, `${card.name} falls.`);
  if (card.id === 'ash-phoenix') {
    // Last breath: deal 2 to the rival hero when it dies.
    damageHero(state, 1 - side, 2, side, 'breath');
  }
}

/** The rival's leftmost Guard creature, or null when it has none. */
function firstGuard(side) {
  for (const card of side.table) {
    if (card.guard) return card;
  }
  return null;
}

/**
 * End the side to move's turn: each ready creature strikes in table order,
 * then rally bonuses fade and the other side's turn starts. Returns the
 * events the turn produced.
 */
export function endTurn(state) {
  if (state.phase === 'over') return [];
  const side = state.phase === 'player' ? SIDE_PLAYER : SIDE_RIVAL;
  const me = state.players[side];
  const rival = state.players[1 - side];
  for (const attacker of me.table.slice()) {
    if (state.phase === 'over') break;
    if (!attacker.canAttack) continue;
    if (!me.table.includes(attacker)) continue;
    const attack = attacker.attack + attacker.bonus;
    const target = firstGuard(rival);
    pushEvent(state, {
      type: 'attack', side, uid: attacker.uid, amount: attack,
      targetUid: target === null ? null : target.uid, hero: target === null,
    });
    if (target !== null) {
      damageCreature(state, 1 - side, target, attack, side, 'strike');
      // A target that survives the blow answers it.
      if (state.phase !== 'over' && rival.table.includes(target) && target.health > 0 && me.table.includes(attacker)) {
        damageCreature(state, side, attacker, target.attack + target.bonus, 1 - side, 'strike');
      }
    } else {
      damageHero(state, 1 - side, attack, side, 'strike');
    }
  }
  for (const card of me.table) card.bonus = 0;
  if (state.phase !== 'over') startTurn(state, 1 - side);
  return drainEvents(state);
}
