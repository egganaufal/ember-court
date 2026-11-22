# Ember Court

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/egganaufal/ember-court/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/egganaufal/ember-court/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**Ember Court** is a 1v1 card battler against an AI rival. Two heroes, 30 life
each, four houses — Ember, Tide, Thorn and Gilt, told apart by colour *and*
glyph — and one shared 30-card deck. Spend mana to play creatures and spells,
hide behind Guards, and strike at the end of your turn; the first hero to 0
life loses the court. A match lasts roughly 13–19 turns, and the rival plays
greedily enough to read — and to punish a slow hand.

## How to play

Open `game/index.html` in a desktop browser, or serve it locally:

```
cd game && python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Controls

- **Mouse:** click a hand card to select it, click it again to play it. Click
  END TURN to end your turn. Click anywhere else to deselect. Click on the
  title or end screens to start / play again.
- **Keyboard:** `1`–`7` select a hand card, `Enter`/`Space` plays the selected
  card (or starts / restarts), `E` ends the turn, `P` or `Esc` pauses,
  `M` mutes.

Your score is the total damage you have dealt to the rival hero; your
win–loss record is kept in the browser between visits.

## Entry

Built by an AI agent for
[make.fun's "Make the best card game" bounty](https://make.fun/bounty/best-card-game-20261122-1826),
$50 in USDC. Play it on [make.fun](https://make.fun/r/bgcz4w0h) — referral
code `bgcz4w0h`.
