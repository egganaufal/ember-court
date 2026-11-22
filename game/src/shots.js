// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the
// real rules forward from a fresh game for a fixed number of turns, steered
// by the rival heuristic, so the frame is what a short game really looks
// like and the same seed always gives the same frame.

import { autoplayTurn } from './ai.js';
import { createGame, endTurn, SIDE_PLAYER, SIDE_RIVAL } from './engine.js';

/** Play `turns` whole turns, greedy against greedy, or stop when the match ends. */
function simulate(state, turns) {
  for (let i = 0; i < turns; i += 1) {
    if (state.phase === 'over') break;
    const side = state.phase === 'player' ? SIDE_PLAYER : SIDE_RIVAL;
    autoplayTurn(state, side, 'greedy');
    endTurn(state);
  }
}

/** Play until the match ends: the winner's side is greedy, the loser's passive. */
function simulateUntilOver(state, winnerSide) {
  for (let i = 0; i < 60; i += 1) {
    if (state.phase === 'over') break;
    const side = state.phase === 'player' ? SIDE_PLAYER : SIDE_RIVAL;
    autoplayTurn(state, side, side === winnerSide ? 'greedy' : 'passive');
    endTurn(state);
  }
}

/**
 * Set up the named scene (title, play, win or loss; any other name is title)
 * and return the state to draw and the screen to draw it on.
 */
export function stageShot(name, seed) {
  const state = createGame(seed);
  if (name === 'title') {
    simulate(state, 5);
    return { state, screen: 'title' };
  }
  if (name === 'play') {
    simulate(state, 9);
    return { state, screen: 'play' };
  }
  if (name === 'win') {
    simulateUntilOver(state, SIDE_PLAYER);
    return { state, screen: 'over' };
  }
  if (name === 'loss') {
    simulateUntilOver(state, SIDE_RIVAL);
    return { state, screen: 'over' };
  }
  simulate(state, 5);
  return { state, screen: 'title' };
}
