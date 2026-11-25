// Dapur Kilat — sound. One clear job: tiny synthesized effects with the
// Web Audio API, no audio files, no network. Silent until the first gesture.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sizzleNodes = [];
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, when = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0);
  }

  pickup() { this.tone(520, 0.08, 'triangle', 0.1, 0, 760); }
  place() { this.tone(300, 0.07, 'triangle', 0.1, 0, 220); }
  chop() { this.noise(0.09, 0.16); }
  chopDone() { this.tone(660, 0.1, 'triangle', 0.12, 0, 880); }
  cookDone() { this.tone(880, 0.12, 'sine', 0.14); this.tone(1320, 0.14, 'sine', 0.1, 0.1); }
  serve() {
    this.tone(523, 0.1, 'triangle', 0.12);
    this.tone(659, 0.1, 'triangle', 0.12, 0.09);
    this.tone(784, 0.16, 'triangle', 0.14, 0.18);
  }
  coin() { this.tone(988, 0.09, 'square', 0.05, 0, 1319); }
  error() { this.tone(160, 0.16, 'sawtooth', 0.08, 0, 110); }
  expire() { this.tone(220, 0.3, 'sawtooth', 0.08, 0, 110); }
  levelUp() {
    this.tone(523, 0.1, 'triangle', 0.12);
    this.tone(659, 0.1, 'triangle', 0.12, 0.1);
    this.tone(784, 0.1, 'triangle', 0.12, 0.2);
    this.tone(1047, 0.22, 'triangle', 0.14, 0.3);
  }
  over() {
    this.tone(392, 0.2, 'triangle', 0.12);
    this.tone(330, 0.2, 'triangle', 0.12, 0.18);
    this.tone(262, 0.4, 'triangle', 0.12, 0.36);
  }
  tick() { this.tone(1200, 0.04, 'square', 0.04); }
}
