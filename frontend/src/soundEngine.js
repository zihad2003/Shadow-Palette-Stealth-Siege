// Web Audio API Synthesizer — Tactical Sci-Fi Game Audio Engine

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.5;
    this.muted = false;
    this.initialized = false;
    this._ambientBed = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
      }
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

  // ─── Sound Generators ───────────────────────────────────────────────

  // 1. Crisp UI Button Click
  playClickSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 2. Tactical View / Tab Switch Sound
  playTabSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 3. Structure Build / Placement Thud
  playBuildSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  startRebuildHum() {
    this.ensureContext();
    if (!this.ctx || this.muted || this._rebuildHum) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    this._rebuildHum = { osc, gain };
  }

  stopRebuildHum() {
    if (!this._rebuildHum || !this.ctx) return;
    const { osc, gain } = this._rebuildHum;
    const now = this.ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.stop(now + 0.1);
    } catch (e) {
      try {
        osc.stop();
      } catch (e2) {
        /* already stopped */
      }
    }
    this._rebuildHum = null;
  }

  // 4. Color Swatch Paint Chime
  playPaintSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 5. Gate Wall Hit Crunch (Spacebar Action)
  playHitSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;

    // Noise buffer for impact crunch
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  playWallBreakSound(final = false) {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const dur = final ? 0.55 : 0.22;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(final ? 1400 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + dur);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(final ? 0.85 : 0.55, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + dur);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + dur);

    const boom = this.ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(final ? 70 : 110, now);
    boom.frequency.exponentialRampToValueAtTime(40, now + dur);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(final ? 0.55 : 0.28, now);
    bg.gain.exponentialRampToValueAtTime(0.01, now + dur);
    boom.connect(bg);
    bg.connect(this.masterGain);
    boom.start(now);
    boom.stop(now + dur);
  }

  playGateSlamSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const clang = this.ctx.createOscillator();
    clang.type = 'square';
    clang.frequency.setValueAtTime(220, now);
    clang.frequency.exponentialRampToValueAtTime(70, now + 0.28);
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.28, now);
    cg.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
    clang.connect(cg);
    cg.connect(this.masterGain);
    clang.start(now);
    clang.stop(now + 0.32);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, now);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.35, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.22);
  }

  // 5b. Soft clay footstep (alternates pitch per foot)
  playFootstepSound(sprinting = false) {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    this._stepSide = !this._stepSide;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const base = this._stepSide ? 520 : 440;
    filter.frequency.setValueAtTime(base + (sprinting ? 160 : 0), now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(sprinting ? 0.16 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  // 6. Stealth Alarm Siren
  playAlarmSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.2);
    osc.frequency.linearRampToValueAtTime(900, now + 0.4);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // 7. Raid Complete / Victory Chime
  playSuccessSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  /** Cinematic: enter raid — low whoosh, gate clang, soft footsteps. */
  playRaidEnterSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const whooshLen = Math.floor(this.ctx.sampleRate * 0.55);
    const whooshBuf = this.ctx.createBuffer(1, whooshLen, this.ctx.sampleRate);
    const wd = whooshBuf.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) wd[i] = (Math.random() * 2 - 1) * (1 - i / whooshLen);
    const whoosh = this.ctx.createBufferSource();
    whoosh.buffer = whooshBuf;
    const wf = this.ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.setValueAtTime(280, now);
    wf.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
    const wg = this.ctx.createGain();
    wg.gain.setValueAtTime(0.01, now);
    wg.gain.linearRampToValueAtTime(0.32, now + 0.08);
    wg.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    whoosh.connect(wf);
    wf.connect(wg);
    wg.connect(this.masterGain);
    whoosh.start(now);
    whoosh.stop(now + 0.55);

    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(90, now);
    drone.frequency.linearRampToValueAtTime(140, now + 0.7);
    const dg = this.ctx.createGain();
    dg.gain.setValueAtTime(0.22, now);
    dg.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
    drone.connect(dg);
    dg.connect(this.masterGain);
    drone.start(now);
    drone.stop(now + 0.85);

    window.setTimeout(() => this.playGateSlamSound(), 380);
    window.setTimeout(() => this.playFootstepSound(false), 700);
    window.setTimeout(() => this.playFootstepSound(false), 920);
    window.setTimeout(() => this.playFootstepSound(true), 1140);
  }

  /** Cinematic: leave raid successfully — rising whoosh + victory. */
  playRaidExitSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.55);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.65);

    window.setTimeout(() => this.playSuccessSound(), 420);
  }

  /** Cinematic: caught — alarm sting + low thud. */
  playRaidCaughtSound() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    this.playAlarmSound();
    window.setTimeout(() => this.playBuildSound(), 220);
    window.setTimeout(() => this.playAlarmSound(), 480);
  }

  // ─── Ambient Music Beds ─────────────────────────────────────────────

  playAmbient(type) {
    this.ensureContext();
    if (!this.ctx) return;

    if (this._ambientBed) {
      try {
        const now = this.ctx.currentTime;
        this._ambientBed.gain.gain.cancelScheduledValues(now);
        this._ambientBed.gain.gain.setValueAtTime(0, now);
        this._ambientBed.osc1.stop();
        this._ambientBed.osc2.stop();
      } catch (e) {}
      this._ambientBed = null;
    }
    return;

    const now = this.ctx.currentTime;

    // Crossfade out existing
    if (this._ambientBed) {
      const old = this._ambientBed;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 1.5);
      window.setTimeout(() => {
        try {
          old.osc1.stop();
          old.osc2.stop();
          if (old.osc3) old.osc3.stop();
        } catch (e) {}
      }, 1600);
    }

    if (this.muted || type === 'none') {
      this._ambientBed = null;
      return;
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 2.0);
    gain.connect(this.masterGain);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    let osc3 = null;

    if (type === 'menu') {
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, now); // A2
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(164.81, now); // E3
    } else if (type === 'base') {
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(130.81, now); // C3
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(196.00, now); // G3
      osc3 = this.ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(261.63, now); // C4
      osc3.connect(gain);
      osc3.start(now);
    } else if (type === 'raid') {
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65.41, now); // C2
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(98.00, now); // G2
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      // slowly modulate filter
      filter.frequency.linearRampToValueAtTime(400, now + 4);
      filter.frequency.linearRampToValueAtTime(200, now + 8);
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
    }

    if (type !== 'raid') {
      osc1.connect(gain);
      osc2.connect(gain);
    }
    
    osc1.start(now);
    osc2.start(now);

    this._ambientBed = { type, osc1, osc2, osc3, gain };
  }
}

export const soundEngine = new SoundEngine();
