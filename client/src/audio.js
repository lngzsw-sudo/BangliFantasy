import { SONGS, noteFreq, steps } from './music.js';

const LOOKAHEAD_S = 0.2;
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v === '1';
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v ? '1' : '0');
    } catch {}
  },
};

// All sound is synthesised with Web Audio: chiptune loops per room and short
// effects. Browsers only allow audio after a user gesture, so nothing plays
// until unlock() is called from one.
export class Sound {
  constructor() {
    this.ctx = null;
    this.musicOn = store.get('bangli.music', true);
    this.sfxOn = store.get('bangli.sfx', true);
    this.theme = null;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });
  }

  unlock() {
    if (this.ctx) return void this.ctx.resume();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.gain(0.5, this.ctx.destination);
    this.musicBus = this.gain(this.musicOn ? 0.16 : 0, this.master);
    this.sfxBus = this.gain(this.sfxOn ? 0.45 : 0, this.master);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    if (this.theme) this.startMusic(this.theme);
  }

  gain(v, to) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(to);
    return g;
  }

  setMusic(on) {
    this.musicOn = on;
    store.set('bangli.music', on);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.1);
  }

  setSfx(on) {
    this.sfxOn = on;
    store.set('bangli.sfx', on);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.45 : 0, this.ctx.currentTime, 0.05);
  }

  // ---------- building blocks ----------

  tone(freq, { at = 0, dur = 0.1, type = 'square', vol = 0.5, to = freq, bus = this.sfxBus, attack = 0.005 } = {}) {
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  hiss({ at = 0, dur = 0.08, vol = 0.4, freq = 2000, q = 1, type = 'bandpass', bus = this.sfxBus } = {}) {
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------- effects ----------

  sfx(name) {
    if (!this.ctx || !this.sfxOn || document.hidden) return;
    const n = (note) => noteFreq(note);
    switch (name) {
      case 'hit':
        this.hiss({ dur: 0.07, freq: 1800, vol: 0.5 });
        this.tone(160, { dur: 0.08, to: 70, vol: 0.4 });
        break;
      case 'crit':
        this.hiss({ dur: 0.1, freq: 2600, vol: 0.6 });
        this.tone(n('E6'), { dur: 0.12, to: n('A6'), vol: 0.25 });
        break;
      case 'hurt':
        this.tone(220, { dur: 0.14, to: 90, type: 'sawtooth', vol: 0.35 });
        break;
      case 'miss':
        this.hiss({ dur: 0.15, freq: 900, vol: 0.25, q: 0.6 });
        break;
      case 'coin':
        this.tone(n('B5'), { dur: 0.06, vol: 0.3 });
        this.tone(n('E6'), { at: 0.06, dur: 0.14, vol: 0.3 });
        break;
      case 'pickup':
        this.tone(n('A5'), { dur: 0.1, type: 'triangle', to: n('E6'), vol: 0.4 });
        break;
      case 'level':
        ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((x, i) => this.tone(n(x), { at: i * 0.07, dur: 0.18, vol: 0.3 }));
        break;
      case 'heal':
        this.tone(n('G4'), { dur: 0.12, type: 'sine', to: n('C4'), vol: 0.5 });
        this.tone(n('E5'), { at: 0.1, dur: 0.12, type: 'sine', to: n('G5'), vol: 0.3 });
        break;
      case 'die':
        ['G4', 'E4', 'C4', 'G3'].forEach((x, i) => this.tone(n(x), { at: i * 0.12, dur: 0.2, vol: 0.3 }));
        break;
      case 'portal':
        this.tone(200, { dur: 0.45, type: 'sine', to: 1200, vol: 0.35 });
        this.hiss({ dur: 0.4, freq: 3000, vol: 0.15, q: 0.4 });
        break;
      case 'quest':
        ['G5', 'C6', 'E6', 'G6'].forEach((x, i) => this.tone(n(x), { at: i * 0.09, dur: i === 3 ? 0.35 : 0.12, vol: 0.28 }));
        break;
      case 'announce':
        this.tone(n('G3'), { dur: 1.4, type: 'sine', vol: 0.5, attack: 0.01 });
        this.tone(n('D5'), { dur: 0.9, type: 'sine', vol: 0.15 });
        break;
      case 'star':
        ['E6', 'B6', 'E7'].forEach((x, i) => this.tone(n(x), { at: i * 0.05, dur: 0.2, type: 'triangle', vol: 0.25 }));
        break;
      case 'fortune':
        for (let i = 0; i < 4; i++) this.hiss({ at: i * 0.09, dur: 0.06, freq: 3500, vol: 0.4, q: 3 });
        this.tone(n('C6'), { at: 0.4, dur: 0.4, type: 'triangle', vol: 0.3 });
        break;
      case 'call':
        this.tone(n('A5'), { dur: 0.1, vol: 0.3 });
        this.tone(n('E6'), { at: 0.12, dur: 0.16, vol: 0.3 });
        break;
      case 'good':
        this.tone(n('C6'), { dur: 0.08, vol: 0.3 });
        this.tone(n('G6'), { at: 0.08, dur: 0.14, vol: 0.3 });
        break;
      case 'bad':
        this.tone(n('C4'), { dur: 0.25, type: 'sawtooth', to: n('A3'), vol: 0.25 });
        break;
      case 'click':
        this.hiss({ dur: 0.03, freq: 4000, vol: 0.35, type: 'highpass' });
        this.tone(900, { dur: 0.03, type: 'triangle', vol: 0.2 });
        break;
      case 'ui':
        this.tone(n('E6'), { dur: 0.04, type: 'triangle', vol: 0.15 });
        break;
      default:
    }
  }

  // ---------- music ----------

  music(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    if (this.ctx) this.startMusic(theme);
  }

  startMusic(theme) {
    this.stopMusic();
    const song = SONGS[theme];
    if (!song) return;
    const tracks = Object.fromEntries(Object.entries(song.tracks).map(([k, v]) => [k, steps(v)]));
    const len = tracks.lead.length;
    const stepS = 60 / song.bpm / 2;
    const bus = this.gain(0, this.musicBus);
    bus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4);
    const run = { bus, nodes: [], next: this.ctx.currentTime + 0.1, i: 0 };
    // A sustained แคน drone under the fair's tune.
    for (const note of song.drone ?? []) {
      const o = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = noteFreq(note);
      f.type = 'lowpass';
      f.frequency.value = 900;
      g.gain.value = 0.12;
      o.connect(f).connect(g).connect(bus);
      o.start();
      run.nodes.push(o);
    }
    const length = (track, i) => {
      let k = 1;
      while (k < len && track[(i + k) % len] === '~') k++;
      return k;
    };
    const tick = () => {
      while (run.next < this.ctx.currentTime + LOOKAHEAD_S) {
        const at = run.next - this.ctx.currentTime;
        const i = run.i % len;
        for (const [name, wave, vol] of [['lead', song.lead, 0.32], ['bass', song.bass, 0.45]]) {
          const note = tracks[name][i];
          const f = noteFreq(note);
          if (f) this.tone(f, { at, dur: stepS * length(tracks[name], i) * 0.95, type: wave, vol, bus, attack: 0.01 });
        }
        const d = tracks.drums[i];
        if (d === 'k') this.tone(120, { at, dur: 0.12, type: 'sine', to: 45, vol: 0.9, bus });
        if (d === 's') this.hiss({ at, dur: 0.12, freq: 1500, vol: 0.45, q: 0.7, bus });
        if (d === 'h') this.hiss({ at, dur: 0.04, freq: 7000, vol: 0.25, type: 'highpass', bus });
        if (d === 'c') {
          this.tone(2637, { at, dur: 0.18, type: 'sine', vol: 0.12, bus });
          this.tone(3951, { at, dur: 0.12, type: 'sine', vol: 0.08, bus });
        }
        run.next += stepS;
        run.i++;
      }
    };
    tick();
    run.timer = setInterval(tick, 50);
    this.run = run;
  }

  stopMusic() {
    const run = this.run;
    if (!run) return;
    clearInterval(run.timer);
    const t = this.ctx.currentTime;
    run.bus.gain.setTargetAtTime(0, t, 0.15);
    for (const o of run.nodes) o.stop(t + 0.8);
    setTimeout(() => run.bus.disconnect(), 1000);
    this.run = null;
  }
}
