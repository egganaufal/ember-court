// Web Audio tones, no files. The context is created on the first user
// gesture (a browser only lets sound start after one) and every tone is a
// short oscillator blip with a gain envelope. Mute is a plain flag.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, startAt, dur, type = 'sine', volume = 0.12) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + dur + 0.02);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  function glide(from, to, dur, type = 'sine', volume = 0.12) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + dur);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  const SOUNDS = {
    click() { tone(660, 0, 0.05, 'square', 0.05); },
    draw() { glide(440, 660, 0.09, 'sine', 0.07); },
    play() { tone(520, 0, 0.07, 'triangle', 0.1); tone(780, 0.07, 0.09, 'triangle', 0.1); },
    hit() { tone(110, 0, 0.16, 'sine', 0.16); },
    heal() { tone(523, 0, 0.09, 'sine', 0.09); tone(784, 0.09, 0.12, 'sine', 0.09); },
    turn() { tone(440, 0, 0.08, 'sine', 0.08); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.16, 'triangle', 0.11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.13, 0.18, 'triangle', 0.1)); },
  };

  return {
    /** Call once from a user gesture so the browser unlocks sound. */
    unlock() { ensure(); },
    /** Play a named tone; silent when muted or when sound is unavailable. */
    play(name) {
      const sound = SOUNDS[name];
      if (sound) sound();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
