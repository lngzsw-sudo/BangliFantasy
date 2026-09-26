// Game data shared by server (authoritative) and client (display only).
// Everything the server trusts lives here so both sides agree on names/prices.

export const TICK_RATE = 10; // server ticks per second (GDD: 5–10)
export const TICK_MS = 1000 / TICK_RATE;
export const TILE = 16; // pixels per tile (pixel-art base resolution)

export const PLAYER_SPEED = 4; // tiles per second
export const CHAT_MAX = 80;
export const CHAT_COOLDOWN_MS = 600;
export const NAME_RE = /^[\p{L}\p{M}\p{N}_]{2,16}$/u;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

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
  feather: { name: 'ขนนกพิราบ', icon: '🪶', desc: 'ดรอปจากนกพิราบ — วัตถุดิบหมวก' },
  bone: { name: 'กระดูกแทะเล่น', icon: '🦴', desc: 'ดรอปจากหมาจร — วัตถุดิบหมวก' },
  vest_win: {
    name: 'เสื้อกั๊กวินมอเตอร์ไซค์', icon: '🦺',
    desc: 'ชุดแฟชั่น: เสื้อกั๊กส้มเบอร์ 69 ใส่แล้วดูมีคิว', slot: 'body',
  },
  hat_straw: {
    name: 'หมวกสานเสียบขนนก', icon: '👒',
    desc: 'หมวกแฟชั่น: หมวกสานแม่ค้า เสียบขนนกพิราบเท่ๆ', slot: 'head',
  },
};

// Equipment slots that change how a character looks.
export const FASHION_SLOTS = ['body', 'head'];

// NPC shops: what each NPC sells for coins.
export const SHOPS = {
  cafe: { oliang: 10 },
  grocery: { spatula: 120, umbrella: 100, broom: 30 },
};

// Grind-to-drip: farmed materials + coins -> fashion.
export const RECIPES = {
  vest_win: { coins: 50, items: { junk: 5 } },
  hat_straw: { coins: 80, items: { feather: 6, bone: 2 } },
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
  // Flock: hitting one pigeon makes the others close by join in.
  pigeon: {
    name: 'นกพิราบแย่งข้าว',
    level: 3,
    hp: 20, atk: 3, def: 0, aspd: 0.8, range: 1.3,
    speed: 3.2, exp: 6,
    coins: [1, 4],
    drops: [{ item: 'feather', chance: 0.5, amount: [1, 2] }],
    respawnMs: 4000,
    wanderRadius: 4,
    leash: 10,
    flock: 2.5,
  },
  // Aggressive: bites anyone who walks too close.
  dog: {
    name: 'หมาจรจัดประจำซอย',
    level: 6,
    hp: 70, atk: 9, def: 2, aspd: 0.8, range: 1.3,
    speed: 2.8, exp: 22,
    coins: [5, 12],
    drops: [
      { item: 'junk', chance: 0.5, amount: [1, 3] },
      { item: 'bone', chance: 0.35, amount: [1, 1] },
    ],
    respawnMs: 8000,
    wanderRadius: 3,
    leash: 8,
    aggroRange: 2.5,
  },
};

// The auto-farm bot won't start fights with monsters this many levels above you.
export const BOT_LEVEL_MARGIN = 2;

// Daily Bounty Board (GDD §2 Room 01). Everyone sees the same few bounties
// each day, picked from this pool by date; progress resets at midnight (Bangkok).
export const BOUNTY_POOL = [
  { id: 'rat10', type: 'rat', need: 10, coins: 40, exp: 30 },
  { id: 'rat25', type: 'rat', need: 25, coins: 90, exp: 70 },
  { id: 'pigeon8', type: 'pigeon', need: 8, coins: 45, exp: 35 },
  { id: 'pigeon20', type: 'pigeon', need: 20, coins: 100, exp: 80 },
  { id: 'dog3', type: 'dog', need: 3, coins: 70, exp: 60 },
  { id: 'dog8', type: 'dog', need: 8, coins: 160, exp: 140 },
];
export const BOUNTIES_PER_DAY = 3;
const BANGKOK_OFFSET_MS = 7 * 3600 * 1000;

export function bountyDay(now) {
  return new Date(now + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

// Deterministic pick for a day: one bounty per monster type.
export function bountiesFor(day) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  const byType = new Map();
  for (const b of BOUNTY_POOL) byType.set(b.type, [...(byType.get(b.type) ?? []), b]);
  const picks = [...byType.values()].map((list) => list[Math.floor(rnd() * list.length)]);
  return picks.slice(0, BOUNTIES_PER_DAY);
}

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
    equip: { weapon: 'broom', body: null, head: null },
    look: lookFromName(name),
    bounty: null, // { day, progress: { id: n }, claimed: [id] }
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
