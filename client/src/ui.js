import {
  ACHIEVEMENTS, EMOTES, FASHION_SLOTS, ITEMS, MONSTERS, RECIPES, SHOPS, STAGE, TUTORIAL, WEAPONS, expToNext,
} from '/shared/constants.js';
import { ROOMS } from '/shared/maps.js';
import { Sound } from './audio.js';
import { Checkers } from './checkers.js';
import { Fair } from './fair.js';
import { Minigame } from './minigame.js';

const $ = (sel) => document.querySelector(sel);
const BOUNTY_ICONS = { rat: '🐀', pigeon: '🐦', dog: '🐕' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// DOM overlay above the canvas: HUD, chat, panels and the close-up minigame.
export class UI {
  constructor(net) {
    this.net = net;
    this.me = null;
    this.hp = 0;
    this.maxHp = 1;
    this.panel = null; // { kind, npc }
    this.party = null; // { leader, members: [{ id, name, lvl, hp, maxHp, room, dead }] }
    this.partyIds = new Set();
    this.invites = []; // names of players who invited us, newest last
    this.sound = new Sound();
    // Browsers only start audio from a user gesture.
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => this.sound.unlock(), true);
    this.minigame = new Minigame(net, this);
    this.fair = new Fair(net, this);
    this.checkers = new Checkers(net, this);
    this.bindHud();
    this.bindChat();
    net.on('me', (m) => this.setMe(m.me));
    net.on('welcome', (m) => this.setMe(m.me));
    net.on('auto', (m) => this.setAuto(m));
    net.on('toast', (m) => this.toast(m.text));
    net.on('sys', (m) => this.log(`<i>${esc(m.text)}</i>`));
    // Server-wide news (world boss timetable): chat log + toast wherever you are.
    net.on('announce', (m) => {
      this.sound.sfx('announce');
      this.log(`<b class="announce">${esc(m.text)}</b>`);
      this.toast(m.text);
    });
    net.on('chat', (m) => this.log(m.party
      ? `<span class="party">[ปาร์ตี้] <b>${esc(m.name)}:</b> ${esc(m.text)}</span>`
      : `<b>${esc(m.name)}:</b> ${esc(m.text)}`));
    net.on('party', (m) => this.setParty(m.party));
    net.on('achieve', (m) => {
      const a = ACHIEVEMENTS.find((x) => x.id === m.id);
      if (!a) return;
      this.sound.sfx('quest');
      this.toast(`🏆 ปลดล็อกความสำเร็จ «${a.title}»${m.item ? ` ได้รับ ${ITEMS[m.item].icon} ${ITEMS[m.item].name}!` : ''}`);
      this.log(`<b class="announce">🏆 ปลดล็อก «${esc(a.title)}»</b> ${esc(a.desc)} · ตั้งเป็นฉายาได้ที่ 🏆`);
    });
    net.on('quest', (m) => {
      this.sound.sfx('quest');
      this.toast(`✅ เควสต์: ${m.text} สำเร็จ!${m.reward ? ` รับ ${m.reward}` : ''}`);
      this.log(`<b class="announce">📜 เควสต์มือใหม่: ${esc(m.text)} สำเร็จ!</b> ${esc(m.reward ?? '')}`);
      if (m.last) setTimeout(() => this.toast('🎉 จบเควสต์มือใหม่แล้ว! ต่อไปลองไปริมคลอง (Lv 13+) หรือดวลหมากฮอสกับลุงชมดูนะ'), 1500);
      $('#quest').classList.remove('pop');
      void $('#quest').offsetWidth;
      $('#quest').classList.add('pop');
    });
    $('#quest-skip').onclick = (ev) => {
      ev.stopPropagation();
      if (confirm('ข้ามเควสต์มือใหม่ทั้งหมด? (จะไม่ได้รางวัลที่เหลือ)')) this.net.send('quest_skip');
    };
    $('#quest').onclick = () => $('#quest').classList.toggle('open');
    net.on('party_invite', (m) => {
      this.invites = [...this.invites.filter((n) => n !== m.from), m.from];
      this.showInvite();
    });
    $('#party-invite-yes').onclick = () => this.answerInvite(true);
    $('#party-invite-no').onclick = () => this.answerInvite(false);
    net.on('mg', (m) => this.minigame.onMessage(m));
    net.on('recovery', (m) => this.showRecoveryCode(m.code));
    $('#recovery-copy').onclick = () => {
      navigator.clipboard?.writeText($('#recovery-code').textContent).then(
        () => this.toast('คัดลอกรหัสกู้คืนแล้ว'),
        () => this.toast('คัดลอกไม่ได้ — จดหรือแคปหน้าจอแทนนะ'),
      );
    };
    $('#recovery-ok').onclick = () => ($('#recovery').hidden = true);
  }

  sceneReady(scene) {
    this.scene = scene;
    this.onSceneReady?.(scene);
  }

  // ---------- HUD ----------

  bindHud() {
    $('#btn-auto').onclick = () => this.net.send('auto', { on: !this.me?.auto.on });
    $('#btn-potion').onclick = () => this.net.send('use', { item: 'potion' });
    $('#btn-bag').onclick = () => (this.panel?.kind === 'bag' ? this.closePanel() : this.openPanel({ kind: 'bag' }));
    $('#btn-emote').onclick = () => $('#emotes').classList.toggle('open');
    $('#btn-game').onclick = () => this.openMinigame();
    $('#btn-trophy').onclick = () => (this.panel?.kind === 'trophies' ? this.closePanel() : this.openPanel({ kind: 'trophies' }));
    $('#btn-party').onclick = () => (this.panel?.kind === 'party' ? this.closePanel() : this.openPanel({ kind: 'party' }));
    $('#btn-travel').onclick = () => (this.panel?.kind === 'travel' ? this.closePanel() : this.openPanel({ kind: 'travel' }));
    $('#panel-close').onclick = () => this.closePanel();
    const emotes = $('#emotes');
    for (const [id, e] of Object.entries(EMOTES)) {
      const b = document.createElement('button');
      b.innerHTML = `<span>${e.icon}</span>${e.label}`;
      b.onclick = () => {
        this.net.send('emote', { e: id });
        emotes.classList.remove('open');
      };
      emotes.append(b);
    }
    window.addEventListener('keydown', (ev) => {
      if (document.activeElement?.tagName === 'INPUT') return; // typing somewhere
      if (ev.key === 'Enter') {
        ev.preventDefault();
        $('#chat-input').focus();
      } else if (ev.key === '1') this.net.send('use', { item: 'potion' });
      else if (ev.key === 'Escape') this.closePanel();
    });
  }

  setMe(me) {
    this.me = me;
    this.maxHp = me.stats.maxHp;
    this.hp = me.hp;
    $('#me-name').textContent = me.name;
    $('#me-lvl').textContent = me.level;
    $('#coins').textContent = me.coins;
    $('#junk').textContent = me.inv.junk ?? 0;
    $('#potions').textContent = Object.keys(ITEMS).reduce((n, id) => n + (ITEMS[id].heal ? me.inv[id] ?? 0 : 0), 0);
    const need = expToNext(me.level);
    $('#exp-fill').style.width = `${(100 * me.exp) / need}%`;
    $('#exp-text').textContent = `EXP ${me.exp}/${need}`;
    this.drawHp();
    this.setAuto(me.auto);
    this.fair.showBuff(me.fortune);
    this.showQuest(me.quest);
    const title = ACHIEVEMENTS.find((a) => a.id === me.trophies?.title)?.title;
    $('#me-title').hidden = !title;
    $('#me-title').textContent = title ? `«${title}»` : '';
    this.fair.updateCoins();
    if (this.panel) this.renderPanel();
  }

  onMe({ hp, maxHp }) {
    this.hp = hp;
    this.maxHp = maxHp ?? this.maxHp;
    this.drawHp();
  }

  drawHp() {
    const pct = Math.max(0, Math.min(100, (100 * this.hp) / this.maxHp));
    $('#hp-fill').style.width = `${pct}%`;
    $('#hp-fill').classList.toggle('low', pct < 30);
    $('#hp-text').textContent = `HP ${this.hp}/${this.maxHp}`;
    this.minigame.status();
  }

  setAuto({ on, pct }) {
    if (this.me) this.me.auto = { on, pct };
    $('#btn-auto').classList.toggle('on', !!on);
    $('#btn-auto .label').textContent = on ? 'AUTO ON' : 'AUTO';
    this.minigame.status();
  }

  onRoom(room) {
    $('#room-name').textContent = room.name;
    $('#room-sub').textContent = room.subtitle;
    $('#room-banner').classList.toggle('safe', room.safe);
    const banner = $('#room-toast');
    banner.innerHTML = `<b>${esc(room.name)}</b><small>${esc(room.subtitle)}</small>`;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
    this.closePanel();
  }

  toast(textStr) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = textStr;
    $('#toasts').append(el);
    setTimeout(() => el.remove(), 3200);
  }

  // ---------- chat ----------

  bindChat() {
    const input = $('#chat-input');
    // "/p message" goes to the party only.
    const send = () => {
      const v = input.value.trim();
      const party = /^\/p\s+/i.test(v);
      const text = party ? v.replace(/^\/p\s+/i, '') : v;
      if (text) this.net.send('chat', { text, party: party || undefined });
      input.value = '';
    };
    $('#chat-form').onsubmit = (ev) => {
      ev.preventDefault();
      send();
      if (matchMedia('(pointer: coarse)').matches) input.blur();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') input.blur();
    });
  }

  log(html) {
    const logEl = $('#chat-log');
    const line = document.createElement('div');
    line.innerHTML = html;
    logEl.append(line);
    while (logEl.children.length > 40) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ---------- panels: shops, tailor, bag ----------

  openNpc(npc) {
    this.openPanel({ kind: npc.kind, npc });
  }

  openPanel(p) {
    this.panel = p;
    $('#panel').hidden = false;
    this.renderPanel();
  }

  closePanel() {
    this.panel = null;
    $('#panel').hidden = true;
  }

  renderPanel() {
    const p = this.panel;
    const me = this.me;
    if (!p || !me) return;
    const title = $('#panel-title');
    const body = $('#panel-body');
    const coins = `<div class="wallet">🪙 ${me.coins} · 🥫 เศษขยะ ${me.inv.junk ?? 0}</div>`;
    if (p.kind === 'cafe' || p.kind === 'grocery' || p.kind === 'pets' || p.kind === 'dessert') {
      title.textContent = p.npc.name;
      const greeting = {
        cafe: 'โอเลี้ยงเย็นๆ ไหมลูก? กินแล้วตีหนูมันส์',
        grocery: 'ของครบ ราคาเป็นกันเอง เลือกได้เลยเฮีย',
        pets: 'น้องๆ พร้อมไปอยู่บ้านใหม่จ้ะ รับไปเลี้ยงแล้วเดินตามต้อยๆ เลย',
        dessert: 'บัวลอยมะพร้าวอ่อนร้อนๆ จ้า มาบางลี่ทั้งทีต้องกินให้ได้สักถ้วย',
      }[p.kind];
      body.innerHTML = `<p class="npc-say">“${greeting}”</p>${coins}` + Object.entries(SHOPS[p.kind]).map(([id, price]) => {
        const item = ITEMS[id];
        const owned = item.slot && me.inv[id];
        const extra = WEAPONS[id] ? ` · ATK +${WEAPONS[id].atk}` : '';
        return `<div class="row">
          <span class="icon">${item.icon}</span>
          <span class="info"><b>${esc(item.name)}</b><small>${esc(item.desc)}${extra}${item.use ? ` · มี ${me.inv[id] ?? 0}` : ''}</small></span>
          <button data-buy="${id}" ${owned || me.coins < price ? 'disabled' : ''}>${owned ? 'มีแล้ว' : `🪙 ${price}`}</button>
        </div>`;
      }).join('');
      body.querySelectorAll('[data-buy]').forEach((b) => {
        b.onclick = () => this.net.send('buy', { npc: p.kind, item: b.dataset.buy });
      });
    } else if (p.kind === 'tailor') {
      title.textContent = p.npc.name;
      body.innerHTML = `<p class="npc-say">“เอาขยะมา เดี๋ยวพี่ตัดเป็นชุดเท่ๆ ให้ — ฟาร์มมาแต่งตัว!”</p>${coins}` +
        Object.entries(RECIPES).map(([id, r]) => {
          const item = ITEMS[id];
          const owned = !!me.inv[id];
          const mats = Object.entries(r.items).map(([k, n]) => {
            const have = me.inv[k] ?? 0;
            return `<span class="${have >= n ? 'ok' : 'miss'}">${ITEMS[k].icon} ${ITEMS[k].name} ${have}/${n}</span>`;
          }).join(' ');
          const can = !owned && me.coins >= r.coins && Object.entries(r.items).every(([k, n]) => (me.inv[k] ?? 0) >= n);
          return `<div class="row craft">
            <span class="icon big">${item.icon}</span>
            <span class="info"><b>${esc(item.name)}</b><small>${esc(item.desc)}</small>
              <small class="mats">${mats} <span class="${me.coins >= r.coins ? 'ok' : 'miss'}">🪙 ${r.coins}</span></small></span>
            <button data-craft="${id}" ${can ? '' : 'disabled'}>${owned ? 'ตัดแล้ว' : 'ตัดชุด'}</button>
          </div>`;
        }).join('');
      body.querySelectorAll('[data-craft]').forEach((b) => {
        b.onclick = () => this.net.send('craft', { id: b.dataset.craft });
      });
    } else if (p.kind === 'bag') {
      title.textContent = '🎒 กระเป๋า & ตัวละคร';
      const s = me.stats;
      const items = Object.entries(me.inv).filter(([, n]) => n > 0).map(([id, n]) => {
        const item = ITEMS[id];
        if (!item) return '';
        const equipped = item.slot && me.equip[item.slot] === id;
        let action = '';
        if (item.use) action = `<button data-use="${id}">ใช้</button>`;
        else if (FASHION_SLOTS.includes(item.slot)) {
          const [on, off] = { prop: ['ถือ', 'เก็บ'], pet: ['พาไปด้วย', 'ให้อยู่บ้าน'] }[item.slot] ?? ['ใส่', 'ถอด'];
          action = equipped ? `<button data-unequip="${item.slot}">${off}</button>` : `<button data-equip="${id}">${on}</button>`;
        }
        else if (item.slot) action = equipped ? '<button disabled>ถืออยู่</button>' : `<button data-equip="${id}">ถือ</button>`;
        return `<div class="row"><span class="icon">${item.icon}</span>
          <span class="info"><b>${esc(item.name)}${item.slot ? '' : ` ×${n}`}</b><small>${esc(item.desc)}</small></span>${action}</div>`;
      }).join('');
      body.innerHTML = `
        <div class="stats">
          <span>Lv.${me.level}</span><span>ATK ${s.atk}</span><span>DEF ${s.def}</span>
          <span>ASPD ${s.aspd}</span><span>CRIT ${Math.round(s.crit * 100)}%</span>
        </div>${coins}
        <div class="sound-cfg">
          <label><input id="cfg-music" type="checkbox" ${this.sound.musicOn ? 'checked' : ''}> 🎵 เพลง</label>
          <label><input id="cfg-sfx" type="checkbox" ${this.sound.sfxOn ? 'checked' : ''}> 🔊 เสียงเอฟเฟกต์</label>
        </div>
        <label class="bot-cfg">🤖 บอทกินโอเลี้ยงเมื่อ HP ต่ำกว่า <b id="pct-val">${me.auto.pct}%</b>
          <input id="pct" type="range" min="0" max="90" step="5" value="${me.auto.pct}"></label>
        ${items}
        <div class="account">
          <b>🔐 บัญชี</b>
          <form id="recovery-form" class="row-form">
            <input id="recovery-pass" type="password" placeholder="รหัสผ่านปัจจุบัน" autocomplete="current-password" aria-label="รหัสผ่านปัจจุบัน">
            <button type="submit">ขอรหัสกู้คืนใหม่</button>
          </form>
          <small>ทำรหัสกู้คืนหาย? ขอรหัสใหม่ได้ รหัสเดิมจะใช้ไม่ได้อีก</small>
          <button id="btn-logout" type="button" class="danger">ออกจากระบบ</button>
        </div>`;
      $('#cfg-music').onchange = (ev) => this.sound.setMusic(ev.target.checked);
      $('#cfg-sfx').onchange = (ev) => this.sound.setSfx(ev.target.checked);
      $('#pct').oninput = (ev) => ($('#pct-val').textContent = `${ev.target.value}%`);
      $('#pct').onchange = (ev) => this.net.send('auto', { on: me.auto.on, pct: Number(ev.target.value) });
      body.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => this.net.send('use', { item: b.dataset.use })));
      body.querySelectorAll('[data-equip]').forEach((b) => (b.onclick = () => this.net.send('equip', { item: b.dataset.equip })));
      body.querySelectorAll('[data-unequip]').forEach((b) => (b.onclick = () => this.net.send('unequip', { slot: b.dataset.unequip })));
      $('#recovery-form').onsubmit = (ev) => {
        ev.preventDefault();
        this.net.send('recovery_new', { password: $('#recovery-pass').value });
        $('#recovery-pass').value = '';
      };
      $('#btn-logout').onclick = () => this.onLogout?.();
    } else if (p.kind === 'travel') {
      const room = this.scene?.room;
      title.textContent = '🗺️ เดินทาง';
      body.innerHTML = `<p class="npc-say">ตอนนี้อยู่ที่ <b>${esc(room.name)}</b> (${esc(room.subtitle)}) — เลือกทางออก แล้วตัวละครจะเดินไปให้เอง</p>` +
        room.portals.map((portal, i) => {
          const to = ROOMS[portal.to];
          return `<div class="row">
            <span class="icon">${to.safe ? '🏪' : '⚔️'}</span>
            <span class="info"><b>${esc(to.name)}</b><small>${esc(to.subtitle)}</small></span>
            <button data-portal="${i}">ไปเลย</button>
          </div>`;
        }).join('');
      body.querySelectorAll('[data-portal]').forEach((b) => {
        b.onclick = () => {
          this.scene.walkToPortal(room.portals[Number(b.dataset.portal)]);
          this.closePanel();
        };
      });
    } else if (p.kind === 'party') {
      this.renderPartyPanel(title, body);
    } else if (p.kind === 'trophies') {
      title.textContent = '🏆 ตู้โชว์ความสำเร็จ';
      const t = me.trophies;
      const byId = new Map(t.list.map((x) => [x.id, x]));
      const unlocked = t.list.filter((x) => x.done).length;
      const current = ACHIEVEMENTS.find((a) => a.id === t.title);
      body.innerHTML = `
        <div class="trophy-head"><span>ปลดล็อกแล้ว <b>${unlocked}/${t.list.length}</b> · ฉายา: <b>${current ? esc(current.title) : 'ไม่มี'}</b></span>
          ${current ? '<button data-title="">ไม่ใช้ฉายา</button>' : ''}</div>
        <p class="party-hint">ปลดล็อกแล้วตั้งเป็นฉายาได้ ฉายาจะขึ้นเหนือชื่อให้ทุกคนเห็น บางอย่างได้ชุดพิเศษที่หาที่อื่นไม่ได้</p>` +
        ACHIEVEMENTS.map((a) => {
          const s = byId.get(a.id);
          const reward = a.item ? `<small class="reward">ได้ ${ITEMS[a.item].icon} ${esc(ITEMS[a.item].name)}</small>` : '';
          const action = !s.done ? '' : t.title === a.id ? '<button disabled>ใช้อยู่</button>' : `<button data-title="${a.id}">ใช้ฉายา</button>`;
          return `<div class="row trophy${s.done ? '' : ' locked'}">
            <span class="icon">${a.icon}</span>
            <span class="info"><b>${esc(a.title)}</b><small>${esc(a.desc)}</small>${reward}
              ${s.done ? '' : `<span class="progress"><span style="width:${(100 * s.have) / s.need}%"></span><em>${s.have}/${s.need}</em></span>`}</span>
            ${action}
          </div>`;
        }).join('');
      body.querySelectorAll('[data-title]').forEach((b) => {
        b.onclick = () => this.net.send('title_set', { id: b.dataset.title || null });
      });
    } else if (p.kind === 'checkers') {
      const nearby = [...(this.scene?.ents.values() ?? [])]
        .filter((e) => e.data.k === 'p' && e.data.id !== me.id)
        .map((e) => ({ name: e.data.name, lvl: e.data.lvl }));
      this.checkers.renderPanel(title, body, me, nearby, esc);
    } else if (p.kind === 'dj') {
      title.textContent = `🎤 ${p.npc.name}`;
      const res = this.fair.results;
      const last = res?.length
        ? res.map((r) => `<div class="row"><span class="icon">${r.win ? '🏆' : '👏'}</span>
            <span class="info"><b>${esc(r.name)}</b><small>${r.score}/${STAGE.calls} ท่า · 🪙 ${r.coins}</small></span></div>`).join('')
        : '<p class="npc-say">รอบที่แล้วยังไม่มีใครได้แต้ม</p>';
      body.innerHTML = `
        <p class="npc-say">“ขึ้นเวทีมาเลย! ดีเจจะเรียกท่าทีละท่า ทำตามให้ทันภายใน ${STAGE.windowMs / 1000} วินาที”</p>
        <p class="party-hint">รอบละ ${STAGE.calls} ท่า เริ่มทุก ${STAGE.everyMs / 1000} วินาทีเมื่อมีคนอยู่บนเวที ·
          ใช้ปุ่ม 😄 ท่าทาง (เวลาอยู่บนเวทีเมนูท่าทางจะเปิดให้เอง) · ท่าแรกที่ทำในแต่ละรอบเรียกเท่านั้นที่นับ ·
          คนได้แต้มสูงสุด (อย่างน้อย ${STAGE.minTop} ท่า) รับ 🪙 ${STAGE.prizeTop} คนอื่นได้ท่าละ 🪙 ${STAGE.perPoint}</p>
        <h3 class="sub">ผลรอบล่าสุด</h3>${last}`;
    } else if (p.kind === 'bounty') {
      title.textContent = '📋 กระดานรับงานชุมชน';
      body.innerHTML = `<p class="npc-say">“ช่วยกันกำจัดตัวป่วนในซอยหลังตลาดหน่อย! งานเปลี่ยนทุกเที่ยงคืน”</p>` +
        me.bounty.list.map((b) => {
          const m = MONSTERS[b.type];
          const done = b.have >= b.need;
          const button = b.claimed ? '<button disabled>รับแล้ว ✓</button>'
            : `<button data-claim="${b.id}" ${done ? '' : 'disabled'}>รับรางวัล</button>`;
          return `<div class="row">
            <span class="icon">${BOUNTY_ICONS[b.type] ?? '🎯'}</span>
            <span class="info"><b>ปราบ${esc(m.name)} (Lv.${m.level})</b>
              <span class="progress"><span style="width:${(100 * b.have) / b.need}%"></span><em>${b.have}/${b.need}</em></span>
              <small>รางวัล 🪙 ${b.coins} · EXP ${b.exp}</small></span>
            ${button}
          </div>`;
        }).join('');
      body.querySelectorAll('[data-claim]').forEach((b) => {
        b.onclick = () => this.net.send('bounty_claim', { id: b.dataset.claim });
      });
    }
  }

  // Tracker under the character card: the current tutorial step.
  showQuest(q) {
    $('#quest').hidden = !q;
    if (!q) return;
    const s = TUTORIAL[q.step];
    $('#quest-step').textContent = `${q.step + 1}/${q.total}`;
    $('#quest-text').innerHTML = `${esc(s.text)}${q.need > 1 ? ` <em>${q.have}/${q.need}</em>` : ''}`;
    $('#quest-hint').textContent = s.hint;
  }

  // ---------- party ----------

  setParty(party) {
    this.party = party;
    this.partyIds = new Set(party?.members.map((m) => m.id) ?? []);
    const list = $('#party-list');
    list.hidden = !party;
    $('#chat-input').placeholder = party ? 'พิมพ์แชต… (/p = คุยในปาร์ตี้)' : 'พิมพ์แชต… (Enter)';
    if (party) {
      const here = this.scene?.room?.id;
      list.innerHTML = party.members.filter((m) => m.id !== this.me?.id).map((m) => `
        <div class="pm${m.dead ? ' dead' : ''}">
          <span class="name">${m.id === party.leader ? '👑' : '👤'} Lv.${m.lvl} ${esc(m.name)}
            ${m.room !== here ? `<small>· ${esc(ROOMS[m.room]?.name ?? '')}</small>` : ''}</span>
          <div class="bar"><div style="width:${(100 * m.hp) / m.maxHp}%"></div></div>
        </div>`).join('');
    }
    this.scene?.refreshParty();
    if (this.panel?.kind === 'party') this.renderPanel();
  }

  showInvite() {
    const from = this.invites.at(-1);
    $('#party-invite').hidden = !from;
    if (from) $('#party-invite-from').textContent = from;
  }

  answerInvite(yes) {
    const from = this.invites.pop();
    if (from) this.net.send(yes ? 'party_accept' : 'party_decline', { from });
    if (yes) this.invites = [];
    this.showInvite();
  }

  renderPartyPanel(title, body) {
    const party = this.party;
    const me = this.me;
    const lead = !party || party.leader === me.id;
    title.textContent = '👥 ปาร์ตี้';
    // HP updates re-render this panel often: keep a half-typed name.
    const typing = $('#party-invite-name');
    const draft = typing?.value ?? '';
    const focused = typing && document.activeElement === typing;
    const members = party ? party.members.map((m) => `
      <div class="row">
        <span class="icon lead">${m.id === party.leader ? '👑' : '👤'}</span>
        <span class="info"><b>${esc(m.name)}${m.id === me.id ? ' (คุณ)' : ''}</b>
          <small>Lv.${m.lvl} · HP ${m.hp}/${m.maxHp} · ${esc(ROOMS[m.room]?.name ?? '')}</small></span>
        ${lead && m.id !== me.id ? `<button class="danger" data-kick="${esc(m.name)}">เชิญออก</button>` : ''}
      </div>`).join('') : '';
    const nearby = [...(this.scene?.ents.values() ?? [])]
      .filter((e) => e.data.k === 'p' && e.data.id !== me.id && !this.partyIds.has(e.data.id))
      .map((e) => `
        <div class="row">
          <span class="icon lead">🙂</span>
          <span class="info"><b>${esc(e.data.name)}</b><small>Lv.${e.data.lvl}</small></span>
          <button data-invite="${esc(e.data.name)}">ชวน</button>
        </div>`).join('');
    body.innerHTML = `
      <p class="party-hint">ตีมอนสเตอร์ใกล้ๆ กันแล้ว EXP กับงานกระดานจะนับให้ทุกคน (ได้โบนัสด้วย)
        เก็บของดรอปของเพื่อนได้ และช่วยกันตีบอสจะนับดาเมจรวมทั้งปาร์ตี้ · พิมพ์ <b>/p ข้อความ</b> เพื่อคุยในปาร์ตี้</p>
      ${members || '<p class="npc-say">ยังไม่มีปาร์ตี้ — ชวนเพื่อนด้านล่างได้เลย</p>'}
      ${party ? '<button id="party-leave" type="button" class="danger">ออกจากปาร์ตี้</button>' : ''}
      ${lead ? `
        <h3 class="sub">ชวนเพื่อน</h3>
        <form id="party-invite-form" class="row-form">
          <input id="party-invite-name" maxlength="16" placeholder="ชื่อตัวละคร" aria-label="ชื่อตัวละครที่จะชวน" autocomplete="off">
          <button type="submit">ชวน</button>
        </form>
        ${nearby ? `<h3 class="sub">คนที่อยู่แถวนี้</h3>${nearby}` : ''}` : '<p class="party-hint">หัวหน้าปาร์ตี้ (👑) เป็นคนชวนสมาชิกเพิ่ม</p>'}`;
    const invite = (name) => name && this.net.send('party_invite', { name });
    body.querySelectorAll('[data-invite]').forEach((b) => (b.onclick = () => invite(b.dataset.invite)));
    body.querySelectorAll('[data-kick]').forEach((b) => (b.onclick = () => this.net.send('party_kick', { name: b.dataset.kick })));
    if ($('#party-leave')) $('#party-leave').onclick = () => this.net.send('party_leave');
    if ($('#party-invite-form')) {
      $('#party-invite-name').value = draft;
      if (focused) $('#party-invite-name').focus();
      $('#party-invite-form').onsubmit = (ev) => {
        ev.preventDefault();
        invite($('#party-invite-name').value.trim());
        $('#party-invite-name').value = '';
      };
    }
  }

  // Shown once: after registering, resetting a password, or asking for a new code.
  showRecoveryCode(code) {
    $('#recovery-code').textContent = code;
    $('#recovery').hidden = false;
  }

  openMinigame() {
    this.closePanel();
    this.minigame.open();
  }
}
