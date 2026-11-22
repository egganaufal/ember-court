// Mouse and keyboard as a per-frame queue. One-shot presses (start, play,
// end turn, pause, mute) are bit flags taken once by the loop, so a press
// between two frames is never lost and never counted twice. Clicks are
// queued as points in logical 1280x720 coordinates.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END = 4;
export const ACTION_MUTE = 8;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  let actions = 0;
  let select = -1;
  const clicks = [];
  let mouse = { x: -1, y: -1 };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code.startsWith('Digit')) {
      const digit = Number(event.code.slice(5));
      if (digit >= 1 && digit <= 7 && !event.repeat) select = digit - 1;
      else return;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyE') {
      if (!event.repeat) actions |= ACTION_END;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(event));
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse = toLogical(event);
  });
  canvas.addEventListener('pointerleave', () => {
    mouse = { x: -1, y: -1 };
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The hand index a digit key picked since the last call, or -1. */
    takeSelect() {
      const taken = select;
      select = -1;
      return taken;
    },
    /** The clicks since the last call, as logical points. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    /** The pointer's current logical position (off-table when it left). */
    mousePos() {
      return mouse;
    },
  };
}
