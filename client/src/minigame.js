import { MINIGAME } from '/shared/constants.js';

const $ = (sel) => document.querySelector(sel);

// Close-up overlay (GDD §3.2): a top-down view of the café table. The world
// keeps running underneath — the server-side bot keeps farming meanwhile.
export class Minigame {
  constructor(net, ui) {
    this.net = net;
    this.ui = ui;
    this.cards = [];
    this.hideTimer = null;
    this.pendingHide = null;
    $('#mg-close').onclick = () => this.close();
    $('#mg-again').onclick = () => this.net.send('mg_open');
  }

  open() {
    $('#closeup').hidden = false;
    this.net.send('mg_open');
    this.status();
  }

  close() {
    $('#closeup').hidden = true;
    this.net.send('mg_close');
    clearTimeout(this.hideTimer);
  }

  get isOpen() {
    return !$('#closeup').hidden;
  }

  onMessage(m) {
    if (m.ev === 'start') this.start(m.size);
    else if (m.ev === 'flip') this.flip(m);
    else if (m.ev === 'error') this.ui.toast(m.text);
  }

  start(size) {
    clearTimeout(this.hideTimer);
    this.pendingHide = null;
    const grid = $('#mg-grid');
    grid.innerHTML = '';
    this.cards = [];
    for (let i = 0; i < size; i++) {
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML = '<span class="back">บางลี่</span><span class="face"></span>';
      card.onclick = () => {
        if (card.classList.contains('up')) return;
        this.flushHide();
        this.net.send('mg_flip', { i });
      };
      grid.append(card);
      this.cards.push(card);
    }
    $('#mg-moves').textContent = '0';
    $('#mg-result').hidden = true;
  }

  flip({ i, sym, moves, match, miss, done, reward }) {
    const card = this.cards[i];
    if (!card) return;
    card.querySelector('.face').textContent = MINIGAME.symbols[sym] ?? '?';
    card.classList.add('up');
    $('#mg-moves').textContent = moves;
    if (match) match.forEach((j) => this.cards[j].classList.add('matched'));
    if (miss) {
      this.pendingHide = miss;
      this.hideTimer = setTimeout(() => this.flushHide(), MINIGAME.mismatchHideMs);
    }
    if (done) {
      $('#mg-reward').textContent = reward;
      $('#mg-result').hidden = false;
    }
  }

  // The server closes a mismatched pair on the next flip; mirror that here.
  flushHide() {
    clearTimeout(this.hideTimer);
    if (this.pendingHide) this.pendingHide.forEach((j) => this.cards[j]?.classList.remove('up'));
    this.pendingHide = null;
  }

  // "Meanwhile in the world" line so players can see the bot still farming.
  status() {
    if (!this.isOpen) return;
    const me = this.ui.me;
    const bot = me?.auto.on ? '🤖 บอทยังฟาร์มอยู่เบื้องหลัง' : '🧍 ตัวละครยืนรออยู่ในแมพ';
    $('#mg-status').textContent = `${bot} · HP ${this.ui.hp}/${this.ui.maxHp}`;
  }
}
