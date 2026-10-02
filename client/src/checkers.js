import { CHECKERS } from '/shared/constants.js';
import { isKing } from '/shared/checkers.js';

const $ = (sel) => document.querySelector(sel);
const SIDE = { w: 'ฝาแดง', b: 'ฝาเขียว' };
const REASON = {
  mate: 'อีกฝ่ายไม่มีทางเดินแล้ว', resign: 'มีคนยอมแพ้', timeout: 'หมดเวลาเดิน', left: 'อีกฝ่ายออกจากเกม', draw: 'ไม่มีใครกินกันนานเกินไป',
};

// Close-up หมากฮอส table (GDD §3.2): bottle caps on a wooden board, seen from
// above. The server owns the game; this only shows it and sends moves.
export class Checkers {
  constructor(net, ui) {
    this.net = net;
    this.ui = ui;
    this.state = null;
    this.you = null;
    this.selected = null;
    this.invites = [];
    $('#ck-close').onclick = () => ($('#ck').hidden = true);
    $('#ck-resign').onclick = () => {
      if (this.active && confirm('ยอมแพ้กระดานนี้?')) this.net.send('ck_resign');
    };
    $('#ck-again').onclick = () => this.net.send('ck_bot');
    $('#ck-done').onclick = () => ($('#ck').hidden = true);
    $('#ck-invite-yes').onclick = () => this.answer(true);
    $('#ck-invite-no').onclick = () => this.answer(false);
    net.on('ck', (m) => this.onMessage(m));
    net.on('ck_invite', (m) => {
      this.invites = [...this.invites.filter((n) => n !== m.from), m.from];
      this.showInvite();
    });
    setInterval(() => this.tickTimer(), 250);
  }

  get active() {
    return !!this.you && !this.ended;
  }

  open() {
    $('#ck').hidden = false;
  }

  onMessage(m) {
    if (m.ev === 'start') {
      Object.assign(this, { you: m.you, opp: m.opp, bot: m.bot, ended: false, selected: null, state: null });
      $('#ck-title').textContent = `♟️ หมากฮอส · คุณ (${SIDE[m.you]}) vs ${m.opp}`;
      $('#ck-result').hidden = true;
      this.open();
      this.ui.closePanel();
    } else if (m.ev === 'state') {
      if (m.last && JSON.stringify(m.last) !== JSON.stringify(this.state?.last)) this.ui.sound.sfx('click');
      const myTurnNow = m.turn === this.you && this.state?.turn !== this.you;
      this.state = m;
      this.deadline = Date.now() + m.ms;
      this.selected = m.mustFrom ? [...m.mustFrom] : null;
      this.render();
      if (myTurnNow && $('#ck').hidden) this.ui.toast('♟️ ถึงตาคุณเดินหมากฮอสแล้ว (กดที่โต๊ะหมากฮอสเพื่อกลับไปที่กระดาน)');
    } else if (m.ev === 'bad') {
      this.ui.toast('เดินแบบนั้นไม่ได้นะ');
    } else if (m.ev === 'end') {
      this.ended = true;
      const won = m.winner === m.you;
      this.ui.sound.sfx(won ? 'quest' : m.winner === 'draw' ? 'good' : 'bad');
      const text = m.winner === 'draw' ? '🤝 เสมอ!' : won ? '🏆 คุณชนะ!' : `😵 ${m.winnerName} ชนะ`;
      $('#ck-result-text').innerHTML = `${text}<small>${REASON[m.reason] ?? ''}${m.reward ? ` · รับ 🪙 ${m.reward}` : won ? ' · (วันนี้รับรางวัลครบแล้ว)' : ''}</small>`;
      $('#ck-again').hidden = !this.bot;
      $('#ck-result').hidden = false;
      this.open();
      this.render();
    }
  }

  // Screen square -> board square: the board is turned so your caps are at the bottom.
  toBoard(dr, dc) {
    return this.you === 'b' ? [7 - dr, 7 - dc] : [dr, dc];
  }

  render() {
    const s = this.state;
    const grid = $('#ck-board');
    grid.innerHTML = '';
    if (!s) return;
    const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
    const moves = this.ended ? [] : s.moves;
    const movable = moves.map((m) => m.from);
    const targets = this.selected ? moves.filter((m) => same(m.from, this.selected)).map((m) => m.to) : [];
    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const [r, c] = this.toBoard(dr, dc);
        const sq = document.createElement('button');
        sq.className = `sq ${(r + c) % 2 ? 'dark' : 'light'}`;
        sq.setAttribute('aria-label', `${r},${c}`);
        if (s.last && (same(s.last.from, [r, c]) || same(s.last.to, [r, c]))) sq.classList.add('last');
        if (targets.some((t) => same(t, [r, c]))) sq.classList.add('target');
        const p = s.board[r][c];
        if (p !== '.') {
          const cap = document.createElement('span');
          cap.className = `cap ${p.toLowerCase()}${isKing(p) ? ' king' : ''}`;
          if (s.captured.some((x) => same(x, [r, c]))) cap.classList.add('taken');
          if (movable.some((f) => same(f, [r, c]))) sq.classList.add('movable');
          if (same(this.selected, [r, c])) sq.classList.add('selected');
          sq.append(cap);
        }
        sq.onclick = () => this.click([r, c], movable, targets);
        grid.append(sq);
      }
    }
    const status = this.ended ? 'จบกระดาน'
      : s.turn !== this.you ? (this.bot ? `${this.opp} กำลังคิด…` : `รอ ${this.opp} เดิน`)
        : s.mustFrom ? 'กินต่อเลย! (ต้องกินให้สุด)' : s.capture ? 'ตาคุณ: มีตัวให้กิน ต้องกิน!' : 'ตาคุณ: เลือกฝาแล้วเลือกช่อง';
    $('#ck-status').textContent = status;
    $('#ck-resign').disabled = !this.active;
  }

  click(sq, movable, targets) {
    if (!this.active || this.state.turn !== this.you) return;
    const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
    if (this.selected && targets.some((t) => same(t, sq))) {
      this.net.send('ck_move', { from: this.selected, to: sq });
      return;
    }
    if (movable.some((f) => same(f, sq)) && !this.state.mustFrom) {
      this.selected = sq;
      this.render();
    }
  }

  tickTimer() {
    const el = $('#ck-timer');
    if (!this.state || !this.active) return void (el.textContent = '');
    const left = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
    el.textContent = `⏱ ${left} วิ`;
    el.classList.toggle('low', left <= 10);
  }

  // ---------- challenges ----------

  showInvite() {
    const from = this.invites.at(-1);
    $('#ck-invite').hidden = !from;
    if (from) $('#ck-invite-from').textContent = from;
  }

  answer(yes) {
    const from = this.invites.pop();
    if (from) this.net.send(yes ? 'ck_accept' : 'ck_decline', { from });
    if (yes) this.invites = [];
    this.showInvite();
  }

  // Lobby panel at the table.
  renderPanel(title, body, me, nearby, esc) {
    title.textContent = '♟️ โต๊ะหมากฮอส';
    const wins = me.checkersWins ?? 0;
    body.innerHTML = `
      <p class="npc-say">“มาๆ ดวลกันสักตา ใช้ฝาขวดแทนหมาก แพ้ห้ามงอนนะ” ลุงชมว่า</p>
      <p class="party-hint">หมากฮอสไทย: เดินเฉียงไปข้างหน้า <b>บังคับกิน</b> และกินต่อได้ต้องกินให้สุด เดินถึงแถวสุดท้ายได้เป็น <b>ฮอส</b> 👑
        เดินได้ไกลตามแนวทแยง เวลากินต้องลงช่องถัดจากตัวที่กินทันที · ตาละ ${CHECKERS.turnMs / 1000} วินาที ·
        ชนะลุงชมได้ 🪙 ${CHECKERS.reward.bot} ชนะคนได้ 🪙 ${CHECKERS.reward.player} (วันละ ${CHECKERS.dailyWins} ครั้ง: วันนี้ ${wins}/${CHECKERS.dailyWins})</p>
      ${this.active ? '<button id="ck-back" type="button" class="wide">กลับไปที่กระดาน</button>' : `
        <button id="ck-bot" type="button" class="wide">🧓 เล่นกับลุงชม</button>
        <h3 class="sub">ท้าดวลผู้เล่น</h3>
        <form id="ck-form" class="row-form">
          <input id="ck-name" maxlength="16" placeholder="ชื่อตัวละคร" aria-label="ชื่อตัวละครที่จะท้าดวล" autocomplete="off">
          <button type="submit">ท้าดวล</button>
        </form>
        ${nearby.map((n) => `<div class="row"><span class="icon lead">🙂</span><span class="info"><b>${esc(n.name)}</b><small>Lv.${n.lvl}</small></span>
          <button data-ck="${esc(n.name)}">ท้าดวล</button></div>`).join('')}`}`;
    if (this.active) $('#ck-back').onclick = () => this.open();
    else {
      $('#ck-bot').onclick = () => this.net.send('ck_bot');
      $('#ck-form').onsubmit = (ev) => {
        ev.preventDefault();
        const name = $('#ck-name').value.trim();
        if (name) this.net.send('ck_challenge', { name });
      };
      body.querySelectorAll('[data-ck]').forEach((b) => (b.onclick = () => this.net.send('ck_challenge', { name: b.dataset.ck })));
    }
  }
}
