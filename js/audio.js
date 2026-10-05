'use strict';

/* ------------------------------ AUDIO ------------------------------ */
const Sound = {
  ctx: null, master: null, musicGain: null, muted: false, noiseBuf: null, music: { on: false, step: 0, next: 0, timer: null, speed: 1 },
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.28; this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + 0.05);
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },
  tone(freq, dur, type = 'square', vol = 0.15, slide = 0, when = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when; const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.12, when = 0, hp = 800, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when; const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  sfx(name, arg) {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(880, 0.04, 'square', 0.06); break;
      case 'deny': this.tone(160, 0.12, 'square', 0.1); this.tone(120, 0.15, 'square', 0.1, 0, 0.1); break;
      case 'honk': { const p = arg || 1; this.tone(330 * p, 0.12, 'square', 0.09); this.tone(415 * p, 0.14, 'square', 0.07, 0, 0.13); break; }
      case 'coin': this.tone(988, 0.06, 'square', 0.08); this.tone(1319, 0.18, 'square', 0.08, 0, 0.06); break;
      case 'bigcoin': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, 0, i * 0.06)); break;
      case 'blip': this.tone(300 + (arg || 0) * 110, 0.07, 'triangle', 0.12); break;
      case 'grawlix': this.noise(0.18, 0.14, 0, 1200); this.tone(90, 0.12, 'sawtooth', 0.06); break;
      case 'whistle': this.tone(1800, 0.12, 'square', 0.06, 2400); this.tone(2400, 0.25, 'square', 0.06, 1500, 0.14); break;
      case 'rotor': this.noise(0.06, 0.05, 0, 500); this.tone(55, 0.05, 'square', 0.03); break;
      case 'engine': this.tone(70 + Math.random() * 20, 0.05, 'square', 0.025); break;
      case 'door': this.noise(0.05, 0.06, 0, 2000); break;
      case 'power': [523, 659, 784].forEach((f, i) => this.tone(f, 0.08, 'square', 0.07, 0, i * 0.05)); break;
      case 'star': this.tone(1047, 0.08, 'triangle', 0.1); this.tone(1568, 0.16, 'triangle', 0.1, 0, 0.08); break;
      case 'steal': this.tone(600, 0.25, 'sawtooth', 0.06, 200); break;
      case 'fired': [392, 370, 349, 330, 262].forEach((f, i) => this.tone(f, i === 4 ? 0.6 : 0.2, 'square', 0.1, 0, i * 0.22)); break;
      case 'shiftover': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'square', 0.08, 0, i * 0.12)); break;
      case 'heat': this.tone(220, 0.08, 'square', 0.05, 180); break;
      case 'gala': [392, 523, 659, 784, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, 0, i * 0.1)); break;
    }
  },
  // ---- music: 8-bit lounge jazz, ii-V-I-VI in F, swung eighths ----
  startMusic() { if (!this.ctx || this.music.on) return; this.music.on = true; this.music.step = 0; this.music.next = this.ctx.currentTime + 0.1; this.music.timer = setInterval(() => this.schedule(), 40); },
  stopMusic() { this.music.on = false; if (this.music.timer) clearInterval(this.music.timer); this.music.timer = null; },
  schedule() {
    if (!this.ctx || !this.music.on) return; const M = this.music; const bpm = CONFIG.fx.musicBpm * M.speed;
    const beat = 60 / bpm; const mf = m => 440 * Math.pow(2, (m - 69) / 12);
    const bass = [43, 46, 50, 49, 48, 52, 55, 42, 41, 45, 48, 49, 50, 54, 57, 44];
    const mel = [70, 69, 67, -1, 65, 67, -1, -1, 64, 67, 70, 72, 70, -1, 67, -1, 69, -1, 72, -1, 76, 77, 76, 72, 74, -1, 72, 69, 66, -1, 62, -1];
    const chords = [[58, 62, 65], [58, 64, 67], [57, 60, 64], [57, 60, 66]];
    while (M.next < this.ctx.currentTime + 0.2) {
      const s = M.step % 32; const t = M.next - this.ctx.currentTime; const bar = Math.floor(s / 8);
      if (s % 2 === 0) this.tone(mf(bass[s / 2]), beat * 0.9, 'triangle', 0.22, 0, t, this.musicGain);
      const m = mel[s]; if (m > 0) this.tone(mf(m), beat * 0.45, 'square', 0.05, 0, t, this.musicGain);
      if (s % 4 === 2) { for (const n of chords[bar]) this.tone(mf(n), beat * 0.3, 'square', 0.025, 0, t, this.musicGain); this.noise(0.04, 0.03, t, 6000, this.musicGain); }
      if (s % 2 === 1) this.noise(0.02, 0.015, t, 8000, this.musicGain);
      M.next += (s % 2 === 0 ? beat * 0.6 : beat * 0.4); M.step++;
    }
  },
};
