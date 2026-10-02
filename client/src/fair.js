import { BUFF_LABELS, EMOTES, ITEMS, STARS } from '/shared/constants.js';
import { ROOMS } from '/shared/maps.js';

const $ = (sel) => document.querySelector(sel);

// Room 05 (the temple fair): the สอยดาว close-up board, the เซียมซี card and
// the DJ's dance-off calls.
export class Fair {
  constructor(net, ui) {
    this.net = net;
    this.ui = ui;
    this.results = null; // last dance-off results, for the DJ panel
    $('#stars-price').textContent = STARS.price;
    $('#stars-close').onclick = () => ($('#stars').hidden = true);
    $('#stars-reset').onclick = () => this.resetBoard();
    $('#fortune-ok').onclick = () => ($('#fortune').hidden = true);
    const rare = STARS.prizes.filter((p) => p.rare).map((p) => `${ITEMS[p.item].icon} ${ITEMS[p.item].name}`);
    $('#stars-prizes').textContent = `รางวัล: เหรียญ, โอเลี้ยง, ชาเย็น, เศษขยะ และของหายาก ${rare.join(', ')}`;
    net.on('stars', (m) => this.onStar(m));
    net.on('fortune', (m) => this.showFortune(m));
    net.on('stage', (m) => this.onStage(m));
    this.resetBoard();
  }

  // ---------- สอยดาว ----------

  openStars() {
    $('#stars').hidden = false;
    this.updateCoins();
  }

  updateCoins() {
    $('#stars-coins').textContent = this.ui.me?.coins ?? 0;
  }

  resetBoard() {
    const grid = $('#stars-grid');
    grid.innerHTML = '';
    for (let i = 0; i < STARS.count; i++) {
      const b = document.createElement('button');
      b.className = 'star';
      b.textContent = '⭐';
      b.onclick = () => this.pick(i, b);
      grid.append(b);
    }
    $('#stars-status').textContent = 'เลือกดาวที่ชอบ แล้วลุ้นรางวัล!';
  }

  pick(i, b) {
    if (this.pending || b.classList.contains('open')) return;
    this.pending = i;
    b.textContent = '✨';
    this.net.send('stars_pick', { i });
    // Not enough coins etc. come back as a toast: let the player try again.
    clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => {
      if (this.pending !== i) return;
      this.pending = null;
      if (!b.classList.contains('open')) b.textContent = '⭐';
    }, 1500);
  }

  onStar(m) {
    this.pending = null;
    this.ui.sound.sfx(m.rare ? 'quest' : 'star');
    const b = $('#stars-grid').children[m.i];
    if (b) {
      b.classList.add('open');
      b.classList.toggle('rare', !!m.rare);
      b.textContent = m.text;
    }
    $('#stars-status').textContent = m.rare ? `🎉 ของหายาก! ${m.text}` : `ได้ ${m.text}`;
    if ([...$('#stars-grid').children].every((c) => c.classList.contains('open'))) {
      setTimeout(() => this.resetBoard(), 1500);
    }
  }

  // ---------- เซียมซี ----------

  showFortune(f) {
    this.ui.sound.sfx('fortune');
    $('#fortune-title').textContent = f.again ? `วันนี้เสี่ยงไปแล้ว: ใบที่ ${f.stick}` : `เซียมซีใบที่ ${f.stick}`;
    $('#fortune-text').textContent = `“${f.text}”`;
    $('#fortune-buff').textContent = `บัฟวันนี้: ${BUFF_LABELS[f.buff]} +${Math.round(f.v * 100)}% ถึงเที่ยงคืน`;
    $('#fortune').hidden = false;
  }

  // Badge under the HP bar while a fortune buff is active.
  showBuff(fortune) {
    const el = $('#buff');
    el.hidden = !fortune;
    if (fortune) el.textContent = `🧧 ${BUFF_LABELS[fortune.buff]} +${Math.round(fortune.v * 100)}%`;
  }

  // ---------- เวทีประชันท่าเต้น ----------

  onStage(m) {
    if (m.ev === 'start') {
      this.ui.toast('🎤 ประชันท่าเต้นเริ่มแล้ว! ขึ้นเวทีแล้วทำท่าตามดีเจ');
    } else if (m.ev === 'call') {
      this.ui.sound.sfx('call');
      const e = EMOTES[m.e];
      $('#stage-step').textContent = `ท่าที่ ${m.i}/${m.n}: ทำท่านี้เลย!`;
      $('#stage-move').textContent = `${e.icon} ${e.label}`;
      const bar = $('#stage-timer');
      bar.classList.remove('run');
      void bar.offsetWidth;
      bar.style.animationDuration = `${m.ms}ms`;
      bar.classList.add('run');
      $('#stage-call').hidden = false;
      clearTimeout(this.callTimer);
      this.callTimer = setTimeout(() => ($('#stage-call').hidden = true), m.ms);
      // On stage? Open the emote menu so the move is one tap away.
      if (this.onStageNow()) $('#emotes').classList.add('open');
    } else if (m.ev === 'hit') {
      this.ui.sound.sfx(m.ok ? 'good' : 'bad');
      this.ui.toast(m.ok ? `✅ ถูก! ${m.score} แต้ม` : '❌ ผิดท่า!');
      $('#emotes').classList.remove('open');
    } else if (m.ev === 'end') {
      this.results = m.results;
      $('#stage-call').hidden = true;
      if (this.ui.panel?.kind === 'dj') this.ui.renderPanel();
    }
  }

  onStageNow() {
    const scene = this.ui.scene;
    const stage = scene?.room && ROOMS[scene.room.id]?.stage;
    const me = scene?.me();
    if (!stage || !me) return false;
    const x = Math.round(me.x);
    const y = Math.round(me.y);
    return x >= stage.x1 && x <= stage.x2 && y >= stage.y1 && y <= stage.y2;
  }
}
