// Web Audio synth — clay / stealth SFX plus quiet scene beds.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.5;
    this.muted = false;
    this.initialized = false;
    this._ambientBed = null;
    this._rebuildHum = null;
    this._stepSide = false;
    this._noiseBuf = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 18;
      comp.ratio.value = 3.2;
      comp.attack.value = 0.004;
      comp.release.value = 0.16;
      this.masterGain.connect(comp);
      comp.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported in this browser environment.', e);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _alive() {
    this.ensureContext();
    return !!(this.ctx && this.masterGain && !this.muted);
  }

  _noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const len = Math.floor(this.ctx.sampleRate * 0.8);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.65 + white * 0.35;
      data[i] = last;
    }
    this._noiseBuf = buffer;
    return buffer;
  }

  _tone({ type = 'sine', freq = 440, to = null, dur = 0.12, gain = 0.18, delay = 0, dest = null } = {}) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (to != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(dest || this.masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  _burst({ dur = 0.1, gain = 0.22, type = 'lowpass', freq = 700, to = 140, q = 0.8, delay = 0 } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime + delay;
    filter.frequency.setValueAtTime(Math.max(40, freq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), now + dur);
    g.gain.setValueAtTime(Math.max(0.0002, gain), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.muted;
  }

  playClickSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 920, to: 540, dur: 0.045, gain: 0.16 });
    this._tone({ type: 'triangle', freq: 1840, to: 1100, dur: 0.03, gain: 0.05 });
  }

  playTabSound() {
    if (!this._alive()) return;
    this._tone({ type: 'triangle', freq: 420, to: 880, dur: 0.1, gain: 0.16 });
    this._tone({ type: 'sine', freq: 840, to: 1320, dur: 0.12, gain: 0.08, delay: 0.03 });
  }

  playBuildSound() {
    if (!this._alive()) return;
    this._burst({ dur: 0.16, gain: 0.32, freq: 420, to: 80 });
    this._tone({ type: 'sine', freq: 160, to: 48, dur: 0.2, gain: 0.34 });
    this._tone({ type: 'triangle', freq: 240, to: 90, dur: 0.14, gain: 0.1 });
  }

  startRebuildHum() {
    this.ensureContext();
    if (!this.ctx || this.muted || this._rebuildHum) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(86, now);
    osc.frequency.linearRampToValueAtTime(128, now + 0.5);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(172, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.08);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc2.start(now);
    this._rebuildHum = { osc, osc2, gain };
  }

  stopRebuildHum() {
    if (!this._rebuildHum || !this.ctx) return;
    const { osc, osc2, gain } = this._rebuildHum;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.stop(now + 0.1);
      osc2?.stop(now + 0.1);
    } catch {
      try {
        osc.stop();
        osc2?.stop();
      } catch {
        /* already stopped */
      }
    }
    this._rebuildHum = null;
  }

  playPaintSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 660, to: 1180, dur: 0.08, gain: 0.14 });
    this._tone({ type: 'triangle', freq: 990, to: 1540, dur: 0.1, gain: 0.07, delay: 0.02 });
    this._burst({ dur: 0.05, gain: 0.08, type: 'highpass', freq: 1800, to: 900 });
  }

  playHitSound() {
    if (!this._alive()) return;
    this._burst({ dur: 0.12, gain: 0.42, freq: 900, to: 90 });
    this._tone({ type: 'square', freq: 90, to: 40, dur: 0.1, gain: 0.12 });
  }

  playWallHitSound() {
    this.playHitSound();
  }

  playWallBreakSound(final = false) {
    if (!this._alive()) return;
    const dur = final ? 0.5 : 0.2;
    this._burst({ dur, gain: final ? 0.55 : 0.32, freq: final ? 1500 : 860, to: 70 });
    this._tone({ type: 'sine', freq: final ? 72 : 118, to: 38, dur, gain: final ? 0.4 : 0.2 });
    if (final) this._tone({ type: 'triangle', freq: 220, to: 70, dur: 0.28, gain: 0.12, delay: 0.04 });
  }

  playGateSlamSound() {
    if (!this._alive()) return;
    this._tone({ type: 'square', freq: 210, to: 64, dur: 0.26, gain: 0.16 });
    this._burst({ dur: 0.2, gain: 0.28, type: 'highpass', freq: 1100, to: 280 });
    this._tone({ type: 'sine', freq: 80, to: 42, dur: 0.3, gain: 0.22 });
  }

  playFootstepSound(sprinting = false) {
    if (!this._alive()) return;
    this._stepSide = !this._stepSide;
    const base = this._stepSide ? 500 : 400;
    this._burst({
      dur: sprinting ? 0.07 : 0.055,
      gain: sprinting ? 0.14 : 0.08,
      freq: base + (sprinting ? 140 : 0),
      to: 110,
    });
    this._tone({
      type: 'sine',
      freq: this._stepSide ? 92 : 78,
      to: 46,
      dur: 0.05,
      gain: sprinting ? 0.08 : 0.045,
    });
  }

  playAlarmSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sawtooth', freq: 780, to: 420, dur: 0.18, gain: 0.12 });
    this._tone({ type: 'sawtooth', freq: 420, to: 780, dur: 0.18, gain: 0.1, delay: 0.18 });
    this._tone({ type: 'sine', freq: 1560, to: 840, dur: 0.16, gain: 0.04 });
  }

  playSuccessSound() {
    if (!this._alive()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this._tone({ type: 'sine', freq, dur: 0.22, gain: 0.16, delay: idx * 0.07 });
      this._tone({ type: 'triangle', freq: freq * 2, dur: 0.16, gain: 0.04, delay: idx * 0.07 });
    });
  }

  playCoinSound() {
    if (!this._alive()) return;
    this._tone({ type: 'square', freq: 980, to: 1320, dur: 0.07, gain: 0.08 });
    this._tone({ type: 'sine', freq: 1480, to: 1960, dur: 0.12, gain: 0.14, delay: 0.03 });
    this._tone({ type: 'triangle', freq: 1960, dur: 0.16, gain: 0.06, delay: 0.07 });
  }

  playInkSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 420, to: 720, dur: 0.14, gain: 0.14 });
    this._tone({ type: 'triangle', freq: 280, to: 520, dur: 0.18, gain: 0.08, delay: 0.04 });
    this._burst({ dur: 0.1, gain: 0.1, type: 'bandpass', freq: 600, to: 900, q: 2 });
  }

  playLootSound() {
    if (!this._alive()) return;
    this.playCoinSound();
    this._tone({ type: 'sine', freq: 240, to: 180, dur: 0.16, gain: 0.1, delay: 0.02 });
  }

  playCoinTickSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 880, to: 640, dur: 0.05, gain: 0.07 });
  }

  playSleepSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 392, to: 262, dur: 0.35, gain: 0.14 });
    this._tone({ type: 'triangle', freq: 262, to: 196, dur: 0.45, gain: 0.08, delay: 0.12 });
    this._tone({ type: 'sine', freq: 196, dur: 0.5, gain: 0.06, delay: 0.22 });
  }

  playCamoSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 540, to: 860, dur: 0.12, gain: 0.12 });
    this._tone({ type: 'triangle', freq: 720, to: 1080, dur: 0.16, gain: 0.07, delay: 0.05 });
    this._burst({ dur: 0.08, gain: 0.07, type: 'bandpass', freq: 1200, to: 700, q: 1.4 });
  }

  playPatrolOnSound() {
    if (!this._alive()) return;
    this._tone({ type: 'square', freq: 180, to: 320, dur: 0.14, gain: 0.1 });
    this._tone({ type: 'sine', freq: 520, to: 780, dur: 0.18, gain: 0.12, delay: 0.06 });
    this._burst({ dur: 0.12, gain: 0.12, freq: 500, to: 160 });
  }

  playPatrolOffSound() {
    if (!this._alive()) return;
    this._tone({ type: 'sine', freq: 420, to: 160, dur: 0.2, gain: 0.12 });
    this._tone({ type: 'triangle', freq: 220, to: 90, dur: 0.22, gain: 0.08, delay: 0.04 });
  }

  playKickSound() {
    if (!this._alive()) return;
    this._burst({ dur: 0.09, gain: 0.38, freq: 700, to: 80 });
    this._tone({ type: 'sine', freq: 140, to: 50, dur: 0.14, gain: 0.28 });
    this._tone({ type: 'triangle', freq: 320, to: 90, dur: 0.1, gain: 0.08, delay: 0.02 });
  }

  playCatchSound() {
    if (!this._alive()) return;
    this.playGateSlamSound();
    this._tone({ type: 'sine', freq: 180, to: 90, dur: 0.28, gain: 0.18, delay: 0.05 });
  }

  playErrorSound() {
    if (!this._alive()) return;
    this._tone({ type: 'square', freq: 220, to: 140, dur: 0.12, gain: 0.08 });
    this._tone({ type: 'sine', freq: 160, to: 110, dur: 0.14, gain: 0.08, delay: 0.05 });
  }

  playRaidEnterSound() {
    if (!this._alive()) return;
    this._burst({ dur: 0.5, gain: 0.22, type: 'bandpass', freq: 260, to: 1400, q: 0.7 });
    this._tone({ type: 'sine', freq: 86, to: 140, dur: 0.7, gain: 0.16 });
    window.setTimeout(() => this.playGateSlamSound(), 360);
    window.setTimeout(() => this.playFootstepSound(false), 680);
    window.setTimeout(() => this.playFootstepSound(false), 900);
    window.setTimeout(() => this.playFootstepSound(true), 1120);
  }

  playRaidExitSound() {
    if (!this._alive()) return;
    this._tone({ type: 'triangle', freq: 160, to: 520, dur: 0.5, gain: 0.18 });
    this._burst({ dur: 0.4, gain: 0.12, type: 'bandpass', freq: 400, to: 1200, q: 0.6 });
    window.setTimeout(() => this.playSuccessSound(), 380);
  }

  playRaidCaughtSound() {
    if (!this._alive()) return;
    this.playAlarmSound();
    window.setTimeout(() => this.playBuildSound(), 200);
    window.setTimeout(() => this.playAlarmSound(), 460);
  }

  _stopAmbient(fade = 0.6) {
    if (!this._ambientBed || !this.ctx) return;
    const old = this._ambientBed;
    this._ambientBed = null;
    const now = this.ctx.currentTime;
    try {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      try {
        old.nodes.forEach((n) => n.stop());
      } catch {
        /* already stopped */
      }
    }, fade * 1000 + 40);
  }

  playAmbient(_type) {
    this.ensureContext();
    if (!this.ctx) return;
    this._stopAmbient(this._ambientBed ? 0.25 : 0.01);
  }
}

export const soundEngine = new SoundEngine();
