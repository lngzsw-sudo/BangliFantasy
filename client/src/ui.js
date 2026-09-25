import { EMOTES, ITEMS, RECIPES, SHOPS, WEAPONS, expToNext } from '/shared/constants.js';
import { Minigame } from './minigame.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// DOM overlay above the canvas: HUD, chat, panels and the close-up minigame.
export class UI {
  constructor(net) {
    this.net = net;
    this.me = null;
    this.hp = 0;
    this.maxHp = 1;
    this.panel = null; // { kind, npc }
    this.minigame = new Minigame(net, this);
    this.bindHud();
    this.bindChat();
    net.on('me', (m) => this.setMe(m.me));
    net.on('welcome', (m) => this.setMe(m.me));
    net.on('auto', (m) => this.setAuto(m));
    net.on('toast', (m) => this.toast(m.text));
    net.on('sys', (m) => this.log(`<i>${esc(m.text)}</i>`));
    net.on('chat', (m) => this.log(`<b>${esc(m.name)}:</b> ${esc(m.text)}`));
    net.on('mg', (m) => this.minigame.onMessage(m));
  }

  sceneReady(scene) {
    this.scene = scene;
    this.onSceneReady?.(scene);
  }

  // ---------- HUD ----------

  bindHud() {
    $('#btn-auto').onclick = () => this.net.send('auto', { on: !this.me?.auto.on });
    $('#btn-potion').onclick = () => this.net.send('use', { item: 'oliang' });
    $('#btn-bag').onclick = () => (this.panel?.kind === 'bag' ? this.closePanel() : this.openPanel({ kind: 'bag' }));
    $('#btn-emote').onclick = () => $('#emotes').classList.toggle('open');
    $('#btn-game').onclick = () => this.openMinigame();
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
      if (document.activeElement === $('#chat-input')) return;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        $('#chat-input').focus();
      } else if (ev.key === '1') this.net.send('use', { item: 'oliang' });
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
    $('#potions').textContent = me.inv.oliang ?? 0;
    const need = expToNext(me.level);
    $('#exp-fill').style.width = `${(100 * me.exp) / need}%`;
    $('#exp-text').textContent = `EXP ${me.exp}/${need}`;
    this.drawHp();
    this.setAuto(me.auto);
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
    const send = () => {
      const v = input.value.trim();
      if (v) this.net.send('chat', { text: v });
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
    if (p.kind === 'cafe' || p.kind === 'grocery') {
      title.textContent = p.npc.name;
      const greeting = p.kind === 'cafe' ? 'โอเลี้ยงเย็นๆ ไหมลูก? กินแล้วตีหนูมันส์' : 'ของครบ ราคาเป็นกันเอง เลือกได้เลยเฮีย';
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
        else if (item.slot === 'body') action = equipped ? `<button data-unequip="body">ถอด</button>` : `<button data-equip="${id}">ใส่</button>`;
        else if (item.slot) action = equipped ? '<button disabled>ถืออยู่</button>' : `<button data-equip="${id}">ถือ</button>`;
        return `<div class="row"><span class="icon">${item.icon}</span>
          <span class="info"><b>${esc(item.name)}${item.slot ? '' : ` ×${n}`}</b><small>${esc(item.desc)}</small></span>${action}</div>`;
      }).join('');
      body.innerHTML = `
        <div class="stats">
          <span>Lv.${me.level}</span><span>ATK ${s.atk}</span><span>DEF ${s.def}</span>
          <span>ASPD ${s.aspd}</span><span>CRIT ${Math.round(s.crit * 100)}%</span>
        </div>${coins}
        <label class="bot-cfg">🤖 บอทกินโอเลี้ยงเมื่อ HP ต่ำกว่า <b id="pct-val">${me.auto.pct}%</b>
          <input id="pct" type="range" min="0" max="90" step="5" value="${me.auto.pct}"></label>
        ${items}`;
      $('#pct').oninput = (ev) => ($('#pct-val').textContent = `${ev.target.value}%`);
      $('#pct').onchange = (ev) => this.net.send('auto', { on: me.auto.on, pct: Number(ev.target.value) });
      body.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => this.net.send('use', { item: b.dataset.use })));
      body.querySelectorAll('[data-equip]').forEach((b) => (b.onclick = () => this.net.send('equip', { item: b.dataset.equip })));
      body.querySelectorAll('[data-unequip]').forEach((b) => (b.onclick = () => this.net.send('unequip', { slot: b.dataset.unequip })));
    }
  }

  openMinigame() {
    this.closePanel();
    this.minigame.open();
  }
}
