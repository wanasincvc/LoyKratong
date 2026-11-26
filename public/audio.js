/**
 * Loy Krathong Web Audio Sound Synthesizer
 * Generates pure synthesizer sounds (bell chime, fireworks explosion, ambient water)
 * with zero external audio assets required.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambientNode = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.gainNode = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(0.6, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  preparePlayback() {
    if (!this.enabled) return false;
    this.ensureStarted();
    return Boolean(this.ctx);
  }

  ensureStarted() {
    if (!this.enabled) return false;
    const maybeResume = this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'running') {
      this.startAmbientWater();
      return true;
    }
    if (maybeResume && typeof maybeResume.then === 'function') {
      maybeResume.then(() => {
        if (this.enabled && this.ctx && this.ctx.state === 'running') {
          this.startAmbientWater();
        }
      });
    }
    return false;
  }

  toggle() {
    this.init();
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.playChime();
      this.startAmbientWater();
    } else {
      this.stopAmbientWater();
    }
    return this.enabled;
  }

  // Play peaceful Thai Buddhist / festival chime
  playChime() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;
      // Multi-tone chime (G4, C5, E5, G5 pentatonic arpeggio)
      const freqs = [392.00, 523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12 / (idx + 1), start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);

        osc.connect(gain);
        gain.connect(this.gainNode);

        osc.start(start);
        osc.stop(start + 1.9);
      });
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Play gentle rising whoosh when releasing a sky lantern
  playLantern() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.45);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio lantern error:', e);
    }
  }

  // Play warm bell sparkle when sending encouragement
  playLike() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 987.77].forEach((freq, idx) => {
        const start = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

        osc.connect(gain);
        gain.connect(this.gainNode);

        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch (e) {
      console.warn('Audio like error:', e);
    }
  }

  // Play gentle water splash / float sound
  playSplash() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;
      // Filtered noise splash
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.35);
      filter.Q.value = 2.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.gainNode);

      noise.start(now);
      noise.stop(now + 0.4);

      // Play soft high water droplet plop
      const plopOsc = this.ctx.createOscillator();
      const plopGain = this.ctx.createGain();
      plopOsc.type = 'sine';
      plopOsc.frequency.setValueAtTime(800, now + 0.05);
      plopOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);

      plopGain.gain.setValueAtTime(0.1, now + 0.05);
      plopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      plopOsc.connect(plopGain);
      plopGain.connect(this.gainNode);

      plopOsc.start(now + 0.05);
      plopOsc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio splash error:', e);
    }
  }

  // Play Firework explosion sound
  playFirework() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;
      
      // 1. Whistle rocket launch
      const whistle = this.ctx.createOscillator();
      const whistleGain = this.ctx.createGain();
      whistle.type = 'triangle';
      whistle.frequency.setValueAtTime(400, now);
      whistle.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

      whistleGain.gain.setValueAtTime(0.08, now);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      whistle.connect(whistleGain);
      whistleGain.connect(this.gainNode);
      whistle.start(now);
      whistle.stop(now + 0.35);

      // 2. Boom burst
      const burstTime = now + 0.32;
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.2));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, burstTime);
      filter.frequency.exponentialRampToValueAtTime(80, burstTime + 0.7);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, burstTime);
      gain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.8);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.gainNode);

      noise.start(burstTime);
      noise.stop(burstTime + 0.85);
    } catch (e) {
      console.warn('Audio firework error:', e);
    }
  }

  // Play Airplane crash sequence: Siren alarm + falling whistle + explosion
  playPlaneCrash() {
    if (!this.preparePlayback()) return;
    try {
      const now = this.ctx.currentTime;

      // 1. Dual-tone Emergency Siren alarm
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const t = now + i * 0.22;
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, t);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, t);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.gainNode);

        osc.start(t);
        osc.stop(t + 0.21);
      }

      // 2. Falling dive whistle (pitch drop)
      const whistle = this.ctx.createOscillator();
      const whistleGain = this.ctx.createGain();
      whistle.type = 'sine';
      whistle.frequency.setValueAtTime(950, now + 0.45);
      whistle.frequency.exponentialRampToValueAtTime(120, now + 2.0);

      whistleGain.gain.setValueAtTime(0.0001, now + 0.45);
      whistleGain.gain.exponentialRampToValueAtTime(0.18, now + 0.7);
      whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      whistle.connect(whistleGain);
      whistleGain.connect(this.gainNode);
      whistle.start(now + 0.45);
      whistle.stop(now + 2.05);

      // 3. Final Crash Explosion (after 1.8 seconds)
      setTimeout(() => {
        this.playFirework();
      }, 1750);
    } catch (e) {
      console.warn('Audio plane crash error:', e);
    }
  }

  // Ambient gentle river flow
  startAmbientWater() {
    if (!this.ctx || this.ambientNode) return;
    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.1;
      }

      this.ambientSource = this.ctx.createBufferSource();
      this.ambientSource.buffer = buffer;
      this.ambientSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

      this.ambientSource.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.gainNode);

      this.ambientSource.start();
      this.ambientNode = this.ambientSource;
    } catch (e) {
      console.warn('Ambient water sound error:', e);
    }
  }

  stopAmbientWater() {
    if (this.ambientNode) {
      try {
        this.ambientNode.stop();
        this.ambientNode.disconnect();
      } catch (e) {}
      this.ambientNode = null;
      this.ambientSource = null;
      this.ambientGain = null;
    }
  }
}

window.soundEngine = new SoundEngine();
