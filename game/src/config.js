// Every tuning number, house and colour in one place. The table is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const START_LIFE = 30;
export const START_HAND = 3;
export const HAND_LIMIT = 7;
export const TABLE_LIMIT = 5;
export const MAX_MANA = 10;

/** The four houses. Colour AND glyph tell them apart, never text alone. */
export const HOUSES = {
  ember: { name: 'Ember', color: '#e4572e', dark: '#7e2a12', light: '#ffb08a', glyph: 'flame' },
  tide: { name: 'Tide', color: '#2e86de', dark: '#144a7d', light: '#9cc8f5', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#27ae60', dark: '#145c33', light: '#8edfb2', glyph: 'leaf' },
  gilt: { name: 'Gilt', color: '#d4a017', dark: '#7a5c08', light: '#f5d76e', glyph: 'diamond' },
};

export const PALETTE = {
  backdrop: '#14121f',
  table: '#1d2b3a',
  felt: '#22444f',
  feltLine: '#2e5a68',
  gold: '#c9a227',
  goldDim: '#8a6d1f',
  panel: '#232838',
  panelEdge: '#39415c',
  text: '#f2ead8',
  muted: '#9aa3b5',
  danger: '#e5534b',
  heal: '#58d68d',
  mana: '#5aa9e6',
  cardBack: '#7e2a12',
  cardFace: '#f2ead8',
  attack: '#b03a2e',
  health: '#1e8449',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the session record (wins-losses) is kept between visits (this browser only). */
export const RECORD_KEY = 'ember-court.record';
