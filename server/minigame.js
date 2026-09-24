import { MINIGAME } from '../shared/constants.js';

// Server-authoritative memory match ("การ์ดจับคู่"). The client only ever
// learns a card's symbol by flipping it, so the board can't be read ahead.
export class MemoryMatch {
  constructor(rng = Math.random, pairs = MINIGAME.pairs) {
    this.pairs = pairs;
    this.deck = [];
    for (let i = 0; i < pairs; i++) this.deck.push(i, i);
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    this.matched = new Set();
    this.open = [];
    this.moves = 0;
    this.done = false;
  }

  get size() {
    return this.deck.length;
  }

  flip(i) {
    if (this.done) return { error: 'เกมจบแล้ว' };
    if (!Number.isInteger(i) || i < 0 || i >= this.deck.length) return { error: 'การ์ดไม่ถูกต้อง' };
    // A mismatched pair stays face-up until the next flip.
    if (this.open.length === 2) this.open = [];
    if (this.matched.has(i) || this.open.includes(i)) return { error: 'เปิดการ์ดใบนี้แล้ว' };

    this.open.push(i);
    const res = { i, sym: this.deck[i], moves: this.moves };
    if (this.open.length < 2) return res;

    const [a, b] = this.open;
    this.moves++;
    res.moves = this.moves;
    if (this.deck[a] === this.deck[b]) {
      this.matched.add(a).add(b);
      this.open = [];
      res.match = [a, b];
      if (this.matched.size === this.deck.length) {
        this.done = true;
        res.done = true;
        res.reward = this.reward();
      }
    } else {
      res.miss = [a, b];
    }
    return res;
  }

  reward() {
    const extra = Math.max(0, this.moves - this.pairs);
    return Math.max(MINIGAME.rewardMin, MINIGAME.rewardMax - extra * 2);
  }
}
