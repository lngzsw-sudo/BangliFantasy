import {
  CHAT_COOLDOWN_MS, CHAT_MAX, EMOTES, FASHION_SLOTS, ITEMS, NAME_RE, NPC_RANGE, PLAYER_SPEED, RECIPES, RESPAWN_ROOM, SHOPS,
  TICK_MS, newProfile, playerStats,
} from '../shared/constants.js';
import { ROOMS } from '../shared/maps.js';
import { MemoryMatch } from './minigame.js';
import { GameRoom, dist, newId, selfView } from './room.js';
import { claimBounty } from './bounty.js';
import { LoginLimiter, PASSWORD_MAX, PASSWORD_MIN, hashPassword, verifyPassword } from './auth.js';
import { migrateProfile } from './store.js';

const SAVE_EVERY_MS = 30000;

export function cleanChat(text) {
  return String(text ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX);
}

// Owns every room plus the connected sessions; routes client messages.
export class World {
  constructor({ store, rng = Math.random, now = () => Date.now() }) {
    this.store = store;
    this.rng = rng;
    this.now = now;
    this.rooms = new Map(Object.values(ROOMS).map((def) => [def.id, new GameRoom(def, this, rng)]));
    this.online = new Map(); // lower-case name -> player
    this.saving = new Map(); // lower-case name -> pending write
    this.limiter = new LoginLimiter({ now });
    this.lastTick = now();
    this.lastSave = now();
  }

  // ---------- lifecycle ----------

  start() {
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  async stop() {
    clearInterval(this.interval);
    await Promise.all([...this.online.values()].map((p) => this.save(p)));
    await this.store.close();
  }

  tick(now = this.now()) {
    const dt = Math.min(0.5, (now - this.lastTick) / 1000);
    this.lastTick = now;
    for (const room of this.rooms.values()) room.tick(now, dt);
    if (now - this.lastSave > SAVE_EVERY_MS) {
      this.lastSave = now;
      for (const p of this.online.values()) this.save(p);
    }
  }

  // ---------- sessions ----------

  // `send` delivers one message object to this client; `close` ends the socket.
  connect(send, close = () => {}) {
    const conn = { send, close, player: null, closed: false, loggingIn: false };
    return {
      message: (msg) => this.handle(conn, msg),
      disconnect: () => this.disconnect(conn),
    };
  }

  // hello { name, password, mode: 'login' | 'register' }
  async login(conn, { name, password, mode }) {
    const fail = (text) => conn.send({ t: 'error', text });
    name = String(name ?? '').trim();
    if (!NAME_RE.test(name)) return fail('ชื่อต้องยาว 2–16 ตัว (ไทย/อังกฤษ/ตัวเลข/_)');
    if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return fail(`รหัสผ่านต้องยาว ${PASSWORD_MIN}–${PASSWORD_MAX} ตัว`);
    }
    if (conn.loggingIn) return;
    conn.loggingIn = true;
    try {
      const key = name.toLowerCase();
      if (this.limiter.blocked(key)) return fail('ลองผิดหลายครั้งเกินไป รอ 5 นาทีแล้วลองใหม่');
      await this.saving.get(key); // a just-closed session may still be writing
      let rec = await this.store.get(key);
      if (mode === 'register') {
        if (rec) return fail('ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ');
        rec = { key, passHash: await hashPassword(password), profile: newProfile(name) };
        if (!(await this.store.create(rec))) return fail('ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ');
      } else {
        if (!rec) return fail('ไม่พบชื่อนี้ — กด "สมัครใหม่" ก่อนนะ');
        if (!(await verifyPassword(password, rec.passHash))) {
          this.limiter.fail(key);
          return fail('รหัสผ่านไม่ถูกต้อง');
        }
      }
      this.limiter.succeed(key);
      if (conn.closed) return;

      // Same account logging in again: kick the old session and keep its
      // in-memory profile, which is newer than anything in the store.
      const old = this.online.get(key);
      if (old) {
        old.send({ t: 'error', text: 'บัญชีนี้ล็อกอินจากที่อื่น' });
        old.conn.close();
        rec.profile = old.profile;
        this.disconnect(old.conn);
      }
      this.enter(conn, rec);
    } finally {
      conn.loggingIn = false;
    }
  }

  enter(conn, rec) {
    const profile = migrateProfile(rec.profile);
    const stats = playerStats(profile);
    const p = {
      id: newId('p'), conn, send: conn.send, profile, stats, key: rec.key, passHash: rec.passHash,
      hp: profile.hp == null ? stats.maxHp : Math.min(stats.maxHp, Math.max(1, profile.hp)),
      dir: 1, speed: PLAYER_SPEED, path: [], target: null, dead: false,
      auto: { on: false, pct: 40 }, nextAttackAt: 0, lastChatAt: 0, mg: null,
    };
    conn.player = p;
    this.online.set(p.key, p);
    p.send({ t: 'welcome', id: p.id, me: selfView(p, this.now()) });
    const room = this.rooms.get(RESPAWN_ROOM);
    const at = room.scatter(room.def.spawn);
    room.addPlayer(p, at.x, at.y);
    room.broadcast({ t: 'sys', text: `${profile.name} เข้ามาในตลาด` }, p.id);
  }

  disconnect(conn) {
    conn.closed = true;
    const p = conn.player;
    if (!p) return;
    conn.player = null;
    this.rooms.get(p.roomId)?.removePlayer(p);
    this.save(p);
    if (this.online.get(p.key) === p) this.online.delete(p.key);
  }

  // Writes are chained per account so they land in order.
  save(p) {
    p.profile.hp = p.dead ? null : Math.round(p.hp);
    const rec = { key: p.key, passHash: p.passHash, profile: structuredClone(p.profile) };
    const prev = this.saving.get(p.key) ?? Promise.resolve();
    const next = prev
      .then(() => this.store.save(rec))
      .catch((err) => console.error(`[store] saving ${p.key} failed:`, err.message))
      .finally(() => {
        if (this.saving.get(p.key) === next) this.saving.delete(p.key);
      });
    this.saving.set(p.key, next);
    return next;
  }

  // Portal / respawn: leave one room, join another (GDD §4 leave_room/join_room).
  transfer(p, roomId, x, y) {
    const from = this.rooms.get(p.roomId);
    const to = this.rooms.get(roomId);
    if (!to) return;
    from?.removePlayer(p);
    if (p.auto.on && to.safe) {
      p.auto.on = false;
      p.send({ t: 'auto', on: false, pct: p.auto.pct });
    }
    to.addPlayer(p, x, y);
  }

  respawn(p) {
    p.dead = false;
    p.hp = Math.ceil(p.stats.maxHp / 2);
    const room = this.rooms.get(RESPAWN_ROOM);
    const at = room.scatter(room.def.spawn);
    this.transfer(p, room.id, at.x, at.y);
  }

  // ---------- message routing ----------

  handle(conn, msg) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    if (msg.t === 'ping') return conn.send({ t: 'pong', c: msg.c });
    if (!conn.player) {
      if (msg.t === 'hello') {
        this.login(conn, msg).catch((err) => {
          console.error('[login]', err);
          conn.send({ t: 'error', text: 'เซิร์ฟเวอร์มีปัญหา ลองใหม่อีกครั้ง' });
        });
      }
      return;
    }
    const p = conn.player;
    const room = this.rooms.get(p.roomId);
    const now = this.now();
    if (Object.hasOwn(HANDLERS, msg.t)) HANDLERS[msg.t].call(this, p, room, msg, now);
  }

  refresh(p) {
    p.stats = playerStats(p.profile);
    p.hp = Math.min(p.hp, p.stats.maxHp);
    p.profileDirty = true;
  }

  nearNpc(p, room, kind) {
    const npc = room.def.npcs.find((n) => n.kind === kind);
    if (!npc) return null;
    if (dist(p, npc) > NPC_RANGE) {
      p.send({ t: 'toast', text: `เดินเข้าไปใกล้ ${npc.name} ก่อนนะ` });
      return null;
    }
    return npc;
  }

  nearObject(p, room, kind) {
    const o = room.def.objects.find((x) => x.kind === kind);
    if (!o) return null;
    const center = { x: o.x + (o.w - 1) / 2, y: o.y + (o.h - 1) / 2 };
    if (dist(p, center) > NPC_RANGE + 0.5) {
      p.send({ t: 'toast', text: `เดินเข้าไปใกล้${o.name}ก่อนนะ` });
      return null;
    }
    return o;
  }

  broadcastLook(p, room) {
    const { body, head, weapon } = p.profile.equip;
    room.broadcast({ t: 'look', id: p.id, body, head, weapon });
  }
}

const int = (v) => (Number.isFinite(v) ? Math.round(v) : null);

const HANDLERS = {
  move(p, room, { x, y }) {
    x = int(x);
    y = int(y);
    if (x == null || y == null) return;
    if (p.auto.on) {
      p.auto.on = false;
      p.send({ t: 'auto', on: false, pct: p.auto.pct });
    }
    room.moveTo(p, x, y);
  },

  attack(p, room, { id }) {
    if (typeof id === 'string') room.attack(p, id);
  },

  chat(p, room, { text }, now) {
    text = cleanChat(text);
    if (!text || now - p.lastChatAt < CHAT_COOLDOWN_MS) return;
    p.lastChatAt = now;
    room.broadcast({ t: 'chat', id: p.id, name: p.profile.name, text });
  },

  emote(p, room, { e }) {
    if (!Object.hasOwn(EMOTES, e) || p.dead) return;
    room.broadcast({ t: 'emote', id: p.id, e });
  },

  auto(p, room, { on, pct }) {
    if (Number.isFinite(pct)) p.auto.pct = Math.max(0, Math.min(90, Math.round(pct)));
    if (on && room.safe) {
      p.send({ t: 'toast', text: 'Safe Zone ไม่มีมอนสเตอร์ — ไปซอยแคบหลังตลาดก่อนนะ →' });
      on = false;
    }
    p.auto.on = !!on && !p.dead;
    if (!p.auto.on) p.target = null;
    p.send({ t: 'auto', on: p.auto.on, pct: p.auto.pct });
  },

  use(p, room, { item }, now) {
    if (item === 'oliang' && !room.usePotion(p, now)) {
      p.send({ t: 'toast', text: p.profile.inv.oliang > 0 ? 'ยังดื่มไม่ทัน รอแป๊บ' : 'โอเลี้ยงหมด! ซื้อที่ร้านป้าศรี' });
    }
  },

  buy(p, room, { npc: kind, item }) {
    const shop = Object.hasOwn(SHOPS, kind) ? SHOPS[kind] : null;
    const price = shop && Object.hasOwn(shop, item) ? shop[item] : null;
    if (!price || !this.nearNpc(p, room, kind)) return;
    const gear = !!ITEMS[item].slot;
    if (gear && p.profile.inv[item]) return p.send({ t: 'toast', text: 'มีชิ้นนี้อยู่แล้ว' });
    if (p.profile.coins < price) return p.send({ t: 'toast', text: 'เหรียญไม่พอ ไปฟาร์มหนูท่อก่อน!' });
    p.profile.coins -= price;
    p.profile.inv[item] = (p.profile.inv[item] ?? 0) + 1;
    p.profileDirty = true;
    p.send({ t: 'toast', text: `ซื้อ ${ITEMS[item].name} แล้ว` });
  },

  craft(p, room, { id }) {
    const recipe = Object.hasOwn(RECIPES, id) ? RECIPES[id] : null;
    if (!recipe || !this.nearNpc(p, room, 'tailor')) return;
    const inv = p.profile.inv;
    if (inv[id]) return p.send({ t: 'toast', text: 'ตัดชุดนี้ไปแล้ว' });
    const missing = Object.entries(recipe.items).some(([k, n]) => (inv[k] ?? 0) < n);
    if (missing || p.profile.coins < recipe.coins) {
      return p.send({ t: 'toast', text: 'วัตถุดิบหรือเหรียญยังไม่พอ' });
    }
    p.profile.coins -= recipe.coins;
    for (const [k, n] of Object.entries(recipe.items)) inv[k] -= n;
    inv[id] = 1;
    HANDLERS.equip.call(this, p, room, { item: id });
    p.send({ t: 'toast', text: `ตัด ${ITEMS[id].name} เสร็จแล้ว! ใส่ให้เลย ✨` });
  },

  equip(p, room, { item }) {
    const def = Object.hasOwn(ITEMS, item) ? ITEMS[item] : null;
    if (!def?.slot || !p.profile.inv[item]) return;
    p.profile.equip[def.slot] = item;
    this.refresh(p);
    this.broadcastLook(p, room);
  },

  unequip(p, room, { slot }) {
    if (!FASHION_SLOTS.includes(slot)) return;
    p.profile.equip[slot] = null;
    this.refresh(p);
    this.broadcastLook(p, room);
  },

  bounty_claim(p, room, { id }, now) {
    if (!this.nearObject(p, room, 'bounty')) return;
    const res = claimBounty(p.profile, id, now);
    if (res.error) return p.send({ t: 'toast', text: res.error });
    p.profile.coins += res.bounty.coins;
    room.grantExp(p, res.bounty.exp);
    p.send({ t: 'toast', text: `รับรางวัลแล้ว! 🪙 +${res.bounty.coins} · EXP +${res.bounty.exp}` });
  },

  mg_open(p) {
    p.mg = new MemoryMatch(this.rng);
    p.send({ t: 'mg', ev: 'start', size: p.mg.size });
  },

  mg_flip(p, room, { i }) {
    if (!p.mg) return;
    const res = p.mg.flip(i);
    if (res.error) return p.send({ t: 'mg', ev: 'error', text: res.error });
    p.send({ t: 'mg', ev: 'flip', ...res });
    if (res.done) {
      p.profile.coins += res.reward;
      p.profileDirty = true;
      p.mg = null;
    }
  },

  mg_close(p) {
    p.mg = null;
  },
};
