import {
  CHAT_COOLDOWN_MS, CHAT_MAX, EMOTES, ITEMS, NAME_RE, NPC_RANGE, PLAYER_SPEED, RECIPES, RESPAWN_ROOM, SHOPS,
  TICK_MS, newProfile, playerStats,
} from '../shared/constants.js';
import { ROOMS } from '../shared/maps.js';
import { MemoryMatch } from './minigame.js';
import { GameRoom, dist, newId, selfView } from './room.js';
import { hashToken, migrateProfile } from './store.js';

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
    this.lastTick = now();
    this.lastSave = now();
  }

  // ---------- lifecycle ----------

  start() {
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    clearInterval(this.interval);
    for (const p of this.online.values()) this.save(p);
    this.store.flush();
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
    const conn = { send, close, player: null };
    return {
      message: (msg) => this.handle(conn, msg),
      disconnect: () => this.disconnect(conn),
    };
  }

  login(conn, { name, token }) {
    name = String(name ?? '').trim();
    if (!NAME_RE.test(name)) {
      return conn.send({ t: 'error', text: 'ชื่อต้องยาว 2–16 ตัว (ไทย/อังกฤษ/ตัวเลข/_)' });
    }
    if (typeof token !== 'string' || token.length < 16 || token.length > 128) {
      return conn.send({ t: 'error', text: 'token ไม่ถูกต้อง' });
    }
    const key = name.toLowerCase();
    const tokenHash = hashToken(token);
    if ((this.store.get(key)?.tokenHash ?? tokenHash) !== tokenHash) {
      return conn.send({ t: 'error', text: 'ชื่อนี้มีเจ้าของแล้ว ลองชื่ออื่นนะ' });
    }
    // Same owner logging in again: kick (and save) the old session first.
    const old = this.online.get(key);
    if (old) {
      old.send({ t: 'error', text: 'บัญชีนี้ล็อกอินจากที่อื่น' });
      old.conn.close();
      this.disconnect(old.conn);
    }
    let rec = this.store.get(key);
    if (!rec) {
      rec = { tokenHash, profile: newProfile(name) };
      this.store.put(rec);
    }

    const profile = migrateProfile(rec.profile);
    const stats = playerStats(profile);
    const p = {
      id: newId('p'), conn, send: conn.send, profile, stats,
      hp: profile.hp == null ? stats.maxHp : Math.min(stats.maxHp, Math.max(1, profile.hp)),
      dir: 1, speed: PLAYER_SPEED, path: [], target: null, dead: false,
      auto: { on: false, pct: 40 }, nextAttackAt: 0, lastChatAt: 0, mg: null,
      tokenHash,
    };
    conn.player = p;
    this.online.set(key, p);
    p.send({ t: 'welcome', id: p.id, me: selfView(p) });
    const room = this.rooms.get(RESPAWN_ROOM);
    const at = room.scatter(room.def.spawn);
    room.addPlayer(p, at.x, at.y);
    room.broadcast({ t: 'sys', text: `${name} เข้ามาในตลาด` }, p.id);
  }

  disconnect(conn) {
    const p = conn.player;
    if (!p) return;
    conn.player = null;
    this.rooms.get(p.roomId)?.removePlayer(p);
    this.save(p);
    if (this.online.get(p.profile.name.toLowerCase()) === p) this.online.delete(p.profile.name.toLowerCase());
  }

  save(p) {
    p.profile.hp = p.dead ? null : Math.round(p.hp);
    this.store.put({ tokenHash: p.tokenHash, profile: p.profile });
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
      if (msg.t === 'hello') this.login(conn, msg);
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
    room.broadcast({ t: 'look', id: p.id, body: p.profile.equip.body, weapon: p.profile.equip.weapon });
  },

  unequip(p, room, { slot }) {
    if (slot !== 'body') return;
    p.profile.equip.body = null;
    this.refresh(p);
    room.broadcast({ t: 'look', id: p.id, body: null, weapon: p.profile.equip.weapon });
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
