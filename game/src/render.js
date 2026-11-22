// Drawing only: the game's state and the current view in, pixels out. The
// 1280x720 table is scaled to fit the window and centred, the margin filled
// with the backdrop colour. The table scene shakes with the action; the
// overlays (title, pause, end screens) never do.

import { FIELD, FONT, HOUSES, PALETTE } from './config.js';
import { affordablePlays, SIDE_PLAYER } from './engine.js';
import { currentLayout } from './layout.js';
import { blinkOn, shakeOffset, slideFor } from './anim.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width <= maxWidth || line === '') line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** Shrink a font from `start` until the text fits `maxWidth`, never below `min`. */
function fitFont(ctx, text, start, maxWidth, min, weight) {
  let size = start;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

/** A house glyph: flame, drop, leaf or diamond, drawn in the given colour. */
function drawGlyph(ctx, glyph, x, y, size, color) {
  const s = size;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (glyph === 'flame') {
    ctx.moveTo(x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.32, y - s * 0.1, x + s * 0.42, y + s * 0.18, x, y + s * 0.5);
    ctx.bezierCurveTo(x - s * 0.42, y + s * 0.18, x - s * 0.32, y - s * 0.1, x, y - s * 0.5);
    ctx.fill();
    ctx.fillStyle = HOUSES.ember.light;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.22);
    ctx.bezierCurveTo(x + s * 0.16, y - s * 0.02, x + s * 0.2, y + s * 0.14, x, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.2, y + s * 0.14, x - s * 0.16, y - s * 0.02, x, y - s * 0.22);
    ctx.fill();
  } else if (glyph === 'drop') {
    ctx.moveTo(x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.36, y - s * 0.05, x + s * 0.4, y + s * 0.2, x, y + s * 0.5);
    ctx.bezierCurveTo(x - s * 0.4, y + s * 0.2, x - s * 0.36, y - s * 0.05, x, y - s * 0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(x - s * 0.12, y - s * 0.08, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.26, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = HOUSES.thorn.dark;
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.lineTo(0, s * 0.42);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.moveTo(x, y - s * 0.5);
    ctx.lineTo(x + s * 0.42, y);
    ctx.lineTo(x, y + s * 0.5);
    ctx.lineTo(x - s * 0.42, y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHeart(ctx, x, y, size, color) {
  const s = size;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.1, x - s * 0.3, y - s * 0.5, x, y - s * 0.12);
  ctx.bezierCurveTo(x + s * 0.3, y - s * 0.5, x + s * 0.55, y - s * 0.1, x, y + s * 0.35);
  ctx.fill();
}

function drawSword(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-size * 0.07, -size * 0.5, size * 0.14, size * 0.62);
  ctx.beginPath();
  ctx.moveTo(-size * 0.07, -size * 0.5);
  ctx.lineTo(size * 0.07, -size * 0.5);
  ctx.lineTo(0, -size * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-size * 0.24, size * 0.12, size * 0.48, size * 0.09);
  ctx.fillRect(-size * 0.07, size * 0.21, size * 0.14, size * 0.26);
  ctx.restore();
}

function drawShield(ctx, x, y, size, color) {
  const s = size;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y - s * 0.4);
  ctx.lineTo(x + s * 0.42, y - s * 0.4);
  ctx.lineTo(x + s * 0.42, y + s * 0.05);
  ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.38, x, y + s * 0.5);
  ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.38, x - s * 0.42, y + s * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,18,31,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.stroke();
}

function drawClock(ctx, x, y, size) {
  ctx.fillStyle = '#f2ead8';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3128';
  ctx.lineWidth = Math.max(1, size * 0.16);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - size * 0.55);
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.5, y);
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let layout = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  /** One card face, drawn at rect (already lifted for selection/hover). */
  function drawCard(card, rect, opts) {
    const { x, y, w, h } = rect;
    const sx = w / 112;
    const sy = h / 152;
    const house = HOUSES[card.house];
    if (opts.selected || opts.hovered) {
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = opts.selected ? 20 : 12;
    }
    roundRectPath(ctx, x, y, w, h, 10 * sx);
    ctx.fillStyle = PALETTE.cardFace;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 10 * sx);
    ctx.clip();
    ctx.fillStyle = house.color;
    ctx.fillRect(x, y, w, 30 * sy);
    ctx.restore();
    // Cost gem.
    ctx.fillStyle = PALETTE.mana;
    ctx.beginPath();
    ctx.arc(x + 16 * sx, y + 15 * sy, 13 * sx, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(15 * sx)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.cost), x + 16 * sx, y + 16 * sy);
    // Name, auto-fitted into the band right of the gem.
    const nameSize = fitFont(ctx, card.name.toUpperCase(), 0.115 * w, w - 36 * sx, 8, 'bold');
    ctx.font = `bold ${nameSize}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(card.name.toUpperCase(), x + 30 * sx, y + 15 * sy);
    // Emblem disc + house glyph.
    const emblemX = x + w / 2;
    const emblemY = y + 0.44 * h;
    ctx.fillStyle = house.light;
    ctx.beginPath();
    ctx.arc(emblemX, emblemY, 30 * sx, 0, Math.PI * 2);
    ctx.fill();
    drawGlyph(ctx, house.glyph, emblemX, emblemY, 34 * sx, house.color);
    if (card.guard) drawShield(ctx, emblemX + 33 * sx, emblemY, 18 * sx, PALETTE.gold);
    // Flavour text, wrapped, centred at ~66% height.
    ctx.font = `italic ${Math.max(8, Math.round(9.5 * sx))}px ${FONT}`;
    ctx.fillStyle = '#6b5d4f';
    ctx.textAlign = 'center';
    const lines = wrapText(ctx, card.text, w - 16 * sx);
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, emblemX, y + 0.66 * h + i * 11 * sy);
    });
    if (card.kind === 'creature') {
      // Attack bottom-left, health bottom-right.
      drawSword(ctx, x + 14 * sx, y + h - 14 * sy, 14 * sx, PALETTE.attack);
      ctx.font = `bold ${Math.round(15 * sx)}px ${FONT}`;
      ctx.fillStyle = PALETTE.attack;
      ctx.textAlign = 'left';
      ctx.fillText(String(card.attack + card.bonus), x + 26 * sx, y + h - 13 * sy);
      drawHeart(ctx, x + w - 14 * sx, y + h - 14 * sy, 14 * sx, PALETTE.health);
      ctx.fillStyle = PALETTE.health;
      ctx.textAlign = 'right';
      ctx.fillText(String(card.health), x + w - 26 * sx, y + h - 13 * sy);
      if (card.bonus > 0) {
        ctx.font = `bold ${Math.round(11 * sx)}px ${FONT}`;
        ctx.fillStyle = PALETTE.attack;
        ctx.textAlign = 'center';
        ctx.fillText(`+${card.bonus}`, emblemX, y + h - 30 * sy);
      }
    } else {
      ctx.font = `bold ${Math.round(10 * sx)}px ${FONT}`;
      ctx.fillStyle = house.dark;
      ctx.textAlign = 'center';
      ctx.fillText('— SPELL —', emblemX, y + h - 14 * sy);
    }
    if (opts.drowsy) {
      roundRectPath(ctx, x, y, w, h, 10 * sx);
      ctx.fillStyle = 'rgba(20,18,31,0.45)';
      ctx.fill();
      drawClock(ctx, emblemX - 30 * sx, emblemY, 8 * sx);
    }
    if (opts.dimmed) {
      roundRectPath(ctx, x, y, w, h, 10 * sx);
      ctx.fillStyle = 'rgba(20,18,31,0.5)';
      ctx.fill();
    }
  }

  function drawCardBack(rect) {
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fillStyle = PALETTE.cardBack;
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawGlyph(ctx, 'diamond', rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.5, PALETTE.gold);
  }

  function drawHeroPanel(rect, label, side, state, view) {
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(label, rect.x + 12, rect.y + 18);
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillStyle = PALETTE.text;
    const lifeText = String(side.life);
    ctx.fillText(lifeText, rect.x + 12, rect.y + 52);
    const lifeWidth = ctx.measureText(lifeText).width;
    drawHeart(ctx, rect.x + 24 + lifeWidth, rect.y + 52, 20, PALETTE.danger);
    const barW = rect.w - 20;
    const frac = Math.max(0, side.life / 30);
    roundRectPath(ctx, rect.x + 10, rect.y + rect.h - 14, barW, 8, 4);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fill();
    if (frac > 0) {
      roundRectPath(ctx, rect.x + 10, rect.y + rect.h - 14, barW * frac, 8, 4);
      ctx.fillStyle = frac > 0.5 ? PALETTE.heal : frac > 0.2 ? PALETTE.gold : PALETTE.danger;
      ctx.fill();
    }
    if (label === 'RIVAL') {
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillStyle = PALETTE.mana;
      ctx.textAlign = 'right';
      ctx.fillText(`◆ ${side.mana}/${side.maxMana}`, rect.x + rect.w - 10, rect.y + 18);
    }
    if (view.aiThinking && label === 'RIVAL') {
      ctx.font = `italic 14px ${FONT}`;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'left';
      ctx.fillText('Rival is thinking…', rect.x + rect.w + 14, rect.y + 52);
    }
  }

  function drawDeckPile(rect, count) {
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    if (count > 0) {
      ctx.fillStyle = PALETTE.cardBack;
      ctx.fill();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      drawGlyph(ctx, 'diamond', rect.x + rect.w / 2, rect.y + 26, 18, PALETTE.gold);
      ctx.font = 'bold 22px ' + FONT;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(count), rect.x + rect.w / 2, rect.y + 62);
      ctx.font = 'bold 9px ' + FONT;
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText('DECK', rect.x + rect.w / 2, rect.y + 88);
    } else {
      ctx.fillStyle = PALETTE.table;
      ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = 'bold 18px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('0', rect.x + rect.w / 2, rect.y + 44);
      ctx.font = 'bold 9px ' + FONT;
      ctx.fillText('DECK', rect.x + rect.w / 2, rect.y + 88);
    }
  }

  function drawButton(state, view) {
    const rect = layout.endTurn;
    const myTurn = view.screen === SCREEN_PLAY && state.phase === 'player';
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    if (myTurn) {
      ctx.fillStyle = PALETTE.gold;
      ctx.fill();
      ctx.font = 'bold 18px ' + FONT;
      ctx.fillStyle = '#14121f';
    } else {
      ctx.fillStyle = PALETTE.panelEdge;
      ctx.fill();
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(myTurn ? 'END TURN' : "RIVAL'S TURN…", rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  }

  function drawManaCrystals(state) {
    const rect = layout.manaBox;
    const me = state.players[SIDE_PLAYER];
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MANA', rect.x, rect.y + rect.h / 2);
    for (let i = 0; i < me.maxMana; i += 1) {
      const cx = rect.x + 46 + i * 12.5;
      const cy = rect.y + rect.h / 2;
      ctx.fillStyle = i < me.mana ? PALETTE.mana : PALETTE.panelEdge;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx, cy + 6);
      ctx.lineTo(cx - 5, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawScoreBox(state, view) {
    const rect = layout.scoreBox;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`SCORE ${state.score} · TURN ${state.turn}`, rect.x, rect.y + 16);
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    const record = `W ${view.record.wins} – L ${view.record.losses}`;
    ctx.fillText(view.muted ? `${record} · MUTED [M]` : record, rect.x, rect.y + 38);
  }

  function drawTableScene(state, view) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRectPath(ctx, 8, 8, FIELD.width - 16, FIELD.height - 16, 18);
    ctx.fillStyle = PALETTE.table;
    ctx.fill();
    ctx.strokeStyle = PALETTE.goldDim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(640, 300, 430, 150, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.felt;
    ctx.fill();
    ctx.strokeStyle = PALETTE.feltLine;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    drawGlyph(ctx, 'diamond', 640, 300, 46, PALETTE.gold);
    ctx.globalAlpha = 1;

    drawHeroPanel(layout.rivalHero, 'RIVAL', state.players[1], state, view);
    drawHeroPanel(layout.playerHero, 'YOU', state.players[0], state, view);
    drawDeckPile(layout.rivalDeck, state.players[1].deck.length);
    drawDeckPile(layout.playerDeck, state.players[0].deck.length);
    for (const rect of layout.rivalHand) drawCardBack(rect);

    const playable = view.screen === SCREEN_PLAY && state.phase === 'player'
      ? new Set(affordablePlays(state, SIDE_PLAYER)) : new Set();
    const drawTable = (cards, rects, isPlayer) => {
      cards.forEach((card, index) => {
        const slot = rects[index];
        if (!slot) return;
        const slide = slideFor(view.anim, card.uid);
        let rect = slot;
        if (slide !== null) {
          const at = cards.findIndex((c) => c.uid === card.uid);
          const target = rects[at] ?? slot;
          const t = Math.min(1, slide.age / slide.life);
          const eased = 1 - (1 - t) * (1 - t);
          rect = {
            x: slide.fromX + (target.x - slide.fromX) * eased,
            y: slide.fromY + (target.y - slide.fromY) * eased,
            w: target.w,
            h: target.h,
          };
        }
        drawCard(card, rect, { drowsy: !card.canAttack, dimmed: false, selected: false, hovered: false });
      });
    };
    drawTable(state.players[1].table, layout.rivalTable, false);
    drawTable(state.players[0].table, layout.playerTable, true);

    state.players[0].hand.forEach((card, index) => {
      const rect = layout.playerHand[index];
      if (!rect) return;
      const dimmed = view.screen === SCREEN_PLAY && (state.phase !== 'player' || !playable.has(index));
      drawCard(card, rect, {
        drowsy: false,
        dimmed,
        selected: index === view.selected,
        hovered: index === view.hover && playable.has(index),
      });
    });

    drawButton(state, view);
    drawManaCrystals(state);
    drawScoreBox(state, view);

    const lastLog = state.log[state.log.length - 1];
    if (lastLog) {
      ctx.font = 'italic 15px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lastLog, 640, 512);
    }

    const banner = view.anim.banner;
    if (banner !== null) {
      const fadeIn = Math.min(1, banner.age / 0.2);
      const fadeOut = Math.min(1, (banner.life - banner.age) / 0.4);
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
      roundRectPath(ctx, 320, 270, 640, 60, 12);
      ctx.fillStyle = 'rgba(35,40,56,0.92)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 40px ' + FONT;
      ctx.fillStyle = PALETTE.gold;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(banner.text, 640, 302);
      ctx.globalAlpha = 1;
    }

    for (const floater of view.anim.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - floater.age / floater.life);
      ctx.font = 'bold 24px ' + FONT;
      ctx.fillStyle = floater.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(floater.text, floater.x, floater.y - floater.age * 50);
    }
    ctx.globalAlpha = 1;
  }

  function dimTable() {
    ctx.fillStyle = 'rgba(20,18,31,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitleScreen(view) {
    dimTable();
    roundRectPath(ctx, 340, 104, 600, 512, 16);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px ' + FONT;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('EMBER COURT', 640, 178);
    ctx.font = 'italic 18px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('A duel of cinder cards', 640, 210);
    for (let i = 0; i < 5; i += 1) {
      ctx.save();
      ctx.translate(640 + (i - 2) * 48, 300);
      ctx.rotate((i - 2) * 0.12);
      drawCardBack({ x: -28, y: -39, w: 56, h: 78 });
      ctx.restore();
    }
    ctx.font = '15px ' + FONT;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('Play cards with mana. Creatures strike at the end of your turn.', 640, 392);
    ctx.fillText('Guards must fall first. Spells turn the tide.', 640, 414);
    ctx.fillText('First hero to 0 life loses the court.', 640, 436);
    ctx.globalAlpha = blinkOn(view.anim);
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('— PRESS ENTER OR CLICK TO PLAY —', 640, 486);
    ctx.globalAlpha = 1;
    ctx.font = '14px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`Court record: ${view.record.wins} wins – ${view.record.losses} losses`, 640, 522);
  }

  function drawEndScreen(state, view) {
    dimTable();
    const won = state.winner === SIDE_PLAYER;
    roundRectPath(ctx, 360, 210, 560, 300, 16);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = won ? PALETTE.gold : PALETTE.danger;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 48px ' + FONT;
    ctx.fillStyle = won ? PALETTE.gold : PALETTE.danger;
    ctx.fillText(won ? 'VICTORY' : 'DEFEAT', 640, 300);
    ctx.font = 'italic 18px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(won ? 'The court is yours.' : 'The rival takes the court.', 640, 340);
    ctx.font = '15px ' + FONT;
    ctx.fillStyle = PALETTE.text;
    const rivalLife = state.players[1].life;
    const yourLife = state.players[0].life;
    ctx.fillText(`Turns ${state.turn} · Damage dealt ${state.score} · Rival life ${rivalLife} — Your life ${yourLife}`, 640, 384);
    ctx.globalAlpha = blinkOn(view.anim);
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('— PRESS ENTER TO PLAY AGAIN —', 640, 440);
    ctx.globalAlpha = 1;
  }

  function drawPausedScreen() {
    dimTable();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 56px ' + FONT;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('PAUSED', 640, 330);
    ctx.font = '18px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Press P to resume', 640, 374);
  }

  function drawConfetti(view) {
    for (const piece of view.anim.confetti) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  return {
    /** Draw one frame, and remember the layout the input reads this frame. */
    draw(state, view) {
      resize();
      const ratio = window.devicePixelRatio || 1;
      const cssW = canvas.width / ratio;
      const cssH = canvas.height / ratio;
      const scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
      const ox = (cssW - FIELD.width * scale) / 2;
      const oy = (cssH - FIELD.height * scale) / 2;
      const base = currentLayout(state);
      const playable = view.screen === SCREEN_PLAY && state.phase === 'player'
        ? new Set(affordablePlays(state, SIDE_PLAYER)) : new Set();
      const hand = base.playerHand.map((rect, index) => {
        let lift = 0;
        if (index === view.selected) lift = 16;
        else if (index === view.hover && playable.has(index)) lift = 8;
        return { ...rect, y: rect.y - lift };
      });
      layout = { ...base, playerHand: hand };
      const shake = shakeOffset(view.anim);
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * (ox + shake.x), ratio * (oy + shake.y));
      drawTableScene(state, view);
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * ox, ratio * oy);
      if (view.screen === SCREEN_TITLE) drawTitleScreen(view);
      else if (view.screen === SCREEN_PAUSED) drawPausedScreen();
      else if (view.screen === SCREEN_OVER) drawEndScreen(state, view);
      drawConfetti(view);
    },
    /** The layout the last draw computed, with selection lifts applied. */
    layout() {
      return layout;
    },
  };
}
