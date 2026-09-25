// Game data shared by server (authoritative) and client (display only).
// Everything the server trusts lives here so both sides agree on names/prices.

export const TICK_RATE = 10; // server ticks per second (GDD: 5–10)
export const TICK_MS = 1000 / TICK_RATE;
export const TILE = 16; // pixels per tile (pixel-art base resolution)

export const PLAYER_SPEED = 4; // tiles per second
export const CHAT_MAX = 80;
export const CHAT_COOLDOWN_MS = 600;
export const NAME_RE = /^[\p{L}\p{M}\p{N}_]{2,16}$/u;

export const RESPAWN_ROOM = 'market';
export const DEATH_RESPAWN_MS = 3000;
export const DROP_LIFETIME_MS = 30000;
export const DROP_OWNER_LOCK_MS = 10000;
export const PICKUP_RANGE = 0.9; // tiles
export const NPC_RANGE = 2.5; // tiles, max distance to trade with an NPC
export const POTION_COOLDOWN_MS = 1000;

export const EMOTES = {
  wai: { label: 'ไหว้', icon: '🙏' },
  squat: { label: 'นั่งยอง', icon: '🧎' },
  vroom: { label: 'ท่าแว้น', icon: '🏍️' },
  dance: { label: 'เต้น', icon: '💃' },
};

export const WEAPONS = {
  fist: { name: 'มือเปล่า', atk: 0, aspd: 1.0, range: 1.5 },
  broom: {
    name: 'ไม้กวาดทางมะพร้าว',
    desc: 'กวาดดาเมจหมู่ — ศัตรูรอบเป้าหมายโดน 50%',
    atk: 3, aspd: 1.0, range: 1.6, splash: 0.5,
  },
  spatula: {
    name: 'ตะหลิวเหล็ก',
    desc: 'โอกาสคริติคอล +25%',
    atk: 6, aspd: 1.2, range: 1.5, crit: 0.25,
  },
  umbrella: {
    name: 'ร่มแม่ค้า',
    desc: 'โอกาส 30% บล็อกดาเมจทั้งหมด',
    atk: 2, aspd: 0.9, range: 1.7, block: 0.3,
  },
};

export const CRIT_MULT = 1.8;
export const BASE_CRIT = 0.05;
export const MISS_CHANCE = 0.05;

// Inventory items. Weapons/fashion are items too (count 1).
export const ITEMS = {
  junk: { name: 'เศษขยะ', icon: '🥫', desc: 'วัตถุดิบคราฟต์ชุดแฟชั่น' },
  oliang: { name: 'โอเลี้ยง', icon: '🧋', desc: 'ฟื้น HP 45', heal: 45, use: true },
  broom: { name: WEAPONS.broom.name, icon: '🧹', desc: WEAPONS.broom.desc, slot: 'weapon' },
  spatula: { name: WEAPONS.spatula.name, icon: '🍳', desc: WEAPONS.spatula.desc, slot: 'weapon' },
  umbrella: { name: WEAPONS.umbrella.name, icon: '⛱️', desc: WEAPONS.umbrella.desc, slot: 'weapon' },
  vest_win: {
    name: 'เสื้อกั๊กวินมอเตอร์ไซค์', icon: '🦺',
    desc: 'ชุดแฟชั่น: เสื้อกั๊กส้มเบอร์ 69 ใส่แล้วดูมีคิว', slot: 'body',
  },
};

// NPC shops: what each NPC sells for coins.
export const SHOPS = {
  cafe: { oliang: 10 },
  grocery: { spatula: 120, umbrella: 100, broom: 30 },
};

// Grind-to-drip: farmed materials + coins -> fashion.
export const RECIPES = {
  vest_win: { coins: 50, items: { junk: 5 } },
};

export const MONSTERS = {
  rat: {
    name: 'หนูท่อลมปราณ',
    level: 2,
    hp: 28, atk: 5, def: 0, aspd: 0.7, range: 1.3,
    speed: 2.2, exp: 7,
    coins: [2, 6],
    drops: [{ item: 'junk', chance: 0.6, amount: [1, 2] }],
    respawnMs: 5000,
    wanderRadius: 3,
    leash: 9,
  },
};

export const MINIGAME = {
  pairs: 8,
  symbols: ['🥭', '🍌', '🐟', '🌶️', '🥥', '🍉', '🧄', '🦐'],
  // Reward for clearing the board: best case = max, minus per extra move.
  rewardMax: 30,
  rewardMin: 5,
  mismatchHideMs: 700,
};

export function expToNext(level) {
  return Math.round(15 * level ** 1.6);
}

export function playerStats(profile) {
  const lvl = profile.level;
  const w = WEAPONS[profile.equip?.weapon] ?? WEAPONS.fist;
  return {
    maxHp: 60 + (lvl - 1) * 12,
    atk: 6 + (lvl - 1) * 2 + w.atk,
    def: Math.floor(lvl / 2),
    aspd: w.aspd,
    range: w.range,
    crit: BASE_CRIT + (w.crit ?? 0),
    splash: w.splash ?? 0,
    block: w.block ?? 0,
  };
}

export function newProfile(name) {
  return {
    name,
    level: 1,
    exp: 0,
    coins: 20,
    hp: null, // null = full
    inv: { oliang: 3, broom: 1 },
    equip: { weapon: 'broom', body: null },
    look: lookFromName(name),
  };
}

const SKINS = ['#f2c9a0', '#e0ac7e', '#c68b5e', '#9c6a46'];
const HAIRS = ['#2b1d16', '#4a2f1f', '#1b1b2a', '#7a4a2a', '#b33a3a'];
const SHIRTS = ['#3b82c4', '#d94f4f', '#4caf6a', '#e0b030', '#8e5cc7', '#f07ab0', '#2fb3b3'];

export function lookFromName(name) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 4) % HAIRS.length],
    shirt: SHIRTS[(h >>> 9) % SHIRTS.length],
  };
}
