// Boot and the one loop: input is drained once a frame, the game advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and game over. The rival drives
// on a clock (~0.55 s per play, ~0.7 s pause before ending its turn), and
// every event from a synchronous rules call is fed to the animator (slides,
// floaters, shake, banner, confetti, sounds).
//
// ?seed=N fixes the deal. ?shot=title|play|win|loss&seed=N stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.

import { RECORD_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { autoplayTurn, nextPlay } from './ai.js';
import { createAnim, addFloater, addShake, addSlide, resetClock, showBanner, spawnConfetti, stepAnim } from './anim.js';
import { createAudio } from './audio.js';
import { createGame, drainEvents, endTurn, playCard, SIDE_PLAYER, SIDE_RIVAL } from './engine.js';
import { ACTION_CONFIRM, ACTION_END, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { hit } from './layout.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AI_PLAY_DELAY = 0.55;
const AI_END_DELAY = 0.7;
const OVER_DELAY = 0.9;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

function readRecord() {
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    const parsed = raw === null ? null : JSON.parse(raw);
    if (parsed && Number.isInteger(parsed.wins) && Number.isInteger(parsed.losses)) return parsed;
  } catch {
    // Storage can be off: the record then lasts this visit only.
  }
  return { wins: 0, losses: 0 };
}

function saveRecord(record) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage can be off: the record then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, seed);
  const state = scene.state;
  drainEvents(state);
  const anim = createAnim();
  const view = {
    screen: scene.screen, selected: -1, hover: -1,
    mouse: { x: -1, y: -1 }, anim, aiThinking: false, muted: false, record: readRecord(),
  };
  if (name === 'win') {
    spawnConfetti(anim);
    for (let i = 0; i < 48; i += 1) stepAnim(anim, STEP);
    resetClock(anim);
  }
  let painted = 0;
  function paint() {
    renderer.draw(state, view);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const anim = createAnim();
  const audio = createAudio();
  let record = readRecord();
  let state = createGame(seed);
  // The title shows a live table a few turns already dealt, dimmed behind.
  for (let i = 0; i < 5; i += 1) {
    if (state.phase === 'over') break;
    const side = state.phase === 'player' ? SIDE_PLAYER : SIDE_RIVAL;
    autoplayTurn(state, side, 'greedy');
    endTurn(state);
  }
  drainEvents(state);
  let screen = SCREEN_TITLE;
  let selected = -1;
  let hover = -1;
  let aiTimer = AI_PLAY_DELAY;
  let aiWaiting = false;
  let pendingOver = null;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function heroCentre(side) {
    const layout = renderer.layout();
    if (layout === null) return { x: 640, y: 360 };
    const rect = side === SIDE_PLAYER ? layout.playerHero : layout.rivalHero;
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  function creatureCentre(side, uid) {
    const layout = renderer.layout();
    if (layout === null) return heroCentre(side);
    const table = state.players[side].table;
    const rects = side === SIDE_PLAYER ? layout.playerTable : layout.rivalTable;
    const index = table.findIndex((card) => card.uid === uid);
    if (index === -1 || !rects[index]) return heroCentre(side);
    const rect = rects[index];
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  function deckCentre(side) {
    const layout = renderer.layout();
    if (layout === null) return { x: 640, y: 360 };
    const rect = side === SIDE_PLAYER ? layout.playerDeck : layout.rivalDeck;
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  function feedEvents(events) {
    for (const event of events) {
      if (event.type === 'draw') {
        audio.play('draw');
      } else if (event.type === 'play') {
        audio.play('play');
        if (!event.spell) {
          const from = deckCentre(event.side);
          const table = state.players[event.side].table;
          const slotIndex = table.findIndex((card) => card.uid === event.uid);
          if (slotIndex !== -1) addSlide(anim, event.uid, from.x, from.y, slotIndex, event.side);
        }
      } else if (event.type === 'attack') {
        addShake(anim, 2 + event.amount);
        audio.play('hit');
      } else if (event.type === 'damage') {
        const at = event.hero ? heroCentre(event.side) : creatureCentre(event.side, event.uid);
        addFloater(anim, at.x, at.y, `-${event.amount}`, '#e5534b');
        if (event.kind === 'spell' || event.kind === 'breath') {
          addShake(anim, 4);
          audio.play('hit');
        }
      } else if (event.type === 'heal') {
        const at = heroCentre(event.side);
        addFloater(anim, at.x, at.y, `+${event.amount}`, '#58d68d');
        audio.play('heal');
      } else if (event.type === 'rally') {
        const at = event.side === SIDE_PLAYER ? { x: 640, y: 400 } : { x: 640, y: 200 };
        addFloater(anim, at.x, at.y, '+2 ATK', '#c9a227');
      } else if (event.type === 'win') {
        anim.banner = null;
        pendingOver = { winner: event.side, timer: OVER_DELAY };
        if (event.side === SIDE_PLAYER) {
          spawnConfetti(anim);
          audio.play('win');
        } else {
          audio.play('lose');
        }
      }
    }
  }

  function startMatch() {
    const matchSeed = Number.isInteger(seedParam) ? seedParam : Math.floor(createRandom(Math.floor(Math.random() * 4294967296))() * 4294967296);
    state = createGame(matchSeed);
    drainEvents(state);
    selected = -1;
    aiTimer = AI_PLAY_DELAY;
    aiWaiting = false;
    pendingOver = null;
    screen = SCREEN_PLAY;
    showBanner(anim, 'YOUR TURN');
    audio.play('turn');
    announce('Your turn. Play a card or end your turn.');
  }

  function tryPlaySelected() {
    if (selected < 0 || selected >= state.players[SIDE_PLAYER].hand.length) return;
    if (playCard(state, SIDE_PLAYER, selected)) {
      feedEvents(drainEvents(state));
      selected = -1;
    } else {
      // A selected card that cannot be played stays selected, with a soft click.
      audio.play('click');
    }
  }

  function endTurnPlayer() {
    selected = -1;
    const events = endTurn(state);
    feedEvents(events);
    if (state.phase === 'ai') {
      showBanner(anim, "RIVAL'S TURN");
      audio.play('turn');
      aiTimer = AI_PLAY_DELAY;
      aiWaiting = false;
    }
  }

  function handleInput() {
    const actions = input.takeActions();
    const clicks = input.takeClicks();
    const picked = input.takeSelect();
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startMatch();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY) tryPlaySelected();
    }
    if (actions & ACTION_END && screen === SCREEN_PLAY && state.phase === 'player' && pendingOver === null) {
      endTurnPlayer();
    }
    if (picked !== -1 && screen === SCREEN_PLAY && state.phase === 'player' && picked < state.players[SIDE_PLAYER].hand.length) {
      selected = picked;
      audio.play('click');
    }
    const layout = renderer.layout();
    for (const click of clicks) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startMatch();
        break;
      }
      if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        continue;
      }
      if (screen !== SCREEN_PLAY || layout === null) continue;
      if (state.phase === 'player' && pendingOver === null) {
        if (hit(layout.endTurn, click.x, click.y)) {
          endTurnPlayer();
          continue;
        }
        let onCard = -1;
        layout.playerHand.forEach((rect, index) => {
          if (hit(rect, click.x, click.y)) onCard = index;
        });
        if (onCard !== -1) {
          if (onCard === selected) tryPlaySelected();
          else {
            selected = onCard;
            audio.play('click');
          }
        } else {
          selected = -1;
        }
      }
    }
  }

  function step(dt) {
    stepAnim(anim, dt);
    if (pendingOver !== null) {
      pendingOver.timer -= dt;
      if (pendingOver.timer <= 0) {
        const winner = pendingOver.winner;
        pendingOver = null;
        if (winner === SIDE_PLAYER) record.wins += 1;
        else record.losses += 1;
        saveRecord(record);
        screen = SCREEN_OVER;
        announce(winner === SIDE_PLAYER ? 'Victory. The court is yours.' : 'Defeat. The rival takes the court.');
      }
      return;
    }
    if (screen === SCREEN_PLAY && state.phase === 'ai') {
      aiTimer -= dt;
      if (aiTimer <= 0) {
        const at = nextPlay(state, SIDE_RIVAL, state.random);
        if (at !== -1) {
          playCard(state, SIDE_RIVAL, at);
          feedEvents(drainEvents(state));
          aiTimer = AI_PLAY_DELAY;
          aiWaiting = false;
        } else if (!aiWaiting) {
          aiWaiting = true;
          aiTimer = AI_END_DELAY;
        } else {
          const events = endTurn(state);
          feedEvents(events);
          aiWaiting = false;
          aiTimer = AI_PLAY_DELAY;
          if (state.phase === 'player') {
            selected = -1;
            showBanner(anim, 'YOUR TURN');
            audio.play('turn');
            announce('Your turn.');
          }
        }
      }
    }
    const mouse = input.mousePos();
    const layout = renderer.layout();
    hover = -1;
    if (screen === SCREEN_PLAY && state.phase === 'player' && layout !== null && mouse.x >= 0) {
      layout.playerHand.forEach((rect, index) => {
        if (hit(rect, mouse.x, mouse.y)) hover = index;
      });
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleInput();
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
    renderer.draw(state, {
      screen, selected, hover, mouse: input.mousePos(), anim,
      aiThinking: screen === SCREEN_PLAY && state.phase === 'ai',
      muted: audio.isMuted(), record,
    });
  }

  // Leaving the tab pauses a running game rather than letting the rival play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  // A handle for automated checks: a plain summary of the match and the layout.
  window.__ember = {
    state() {
      return {
        screen,
        phase: state.phase,
        winner: state.winner,
        playerLife: state.players[SIDE_PLAYER].life,
        rivalLife: state.players[SIDE_RIVAL].life,
        playerMana: state.players[SIDE_PLAYER].mana,
        playerMaxMana: state.players[SIDE_PLAYER].maxMana,
        playerHand: state.players[SIDE_PLAYER].hand.map((card) => card.name),
        rivalHand: state.players[SIDE_RIVAL].hand.length,
        playerTable: state.players[SIDE_PLAYER].table.map((card) => card.name),
        rivalTable: state.players[SIDE_RIVAL].table.map((card) => card.name),
        playerDeck: state.players[SIDE_PLAYER].deck.length,
        rivalDeck: state.players[SIDE_RIVAL].deck.length,
        score: state.score,
        turn: state.turn,
        log: state.log.slice(),
        record: { ...record },
      };
    },
    screen() {
      return screen;
    },
    layout() {
      return renderer.layout();
    },
    selected() {
      return selected;
    },
  };

  announce('Ember Court. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
