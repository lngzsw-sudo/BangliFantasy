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
  chayen: { name: 'ชาเย็น', icon: '🥤', desc: 'ฟื้น HP 150 — สำหรับริมคลอง', heal: 150, use: true },
  broom: { name: WEAPONS.broom.name, icon: '🧹', desc: WEAPONS.broom.desc, slot: 'weapon' },
  spatula: { name: WEAPONS.spatula.name, icon: '🍳', desc: WEAPONS.spatula.desc, slot: 'weapon' },
  umbrella: { name: WEAPONS.umbrella.name, icon: '⛱️', desc: WEAPONS.umbrella.desc, slot: 'weapon' },
  feather: { name: 'ขนนกพิราบ', icon: '🪶', desc: 'ดรอปจากนกพิราบ — วัตถุดิบหมวก' },
  bone: { name: 'กระดูกแทะเล่น', icon: '🦴', desc: 'ดรอปจากหมาจร — วัตถุดิบหมวก' },
  hyacinth: { name: 'ก้านผักตบชวา', icon: '🌿', desc: 'ดรอปจากผักตบชวากลายพันธุ์ — เอาไปสานของ' },
  scale: { name: 'เกล็ดตัวเงินตัวทอง', icon: '🦎', desc: 'ดรอปจากตัวเงินตัวทอง — ว่ากันว่าเรียกทรัพย์' },
  flood_badge: { name: 'เหรียญกู้ภัยน้ำท่วม', icon: '🏅', desc: 'ได้จากการปราบมวลน้ำท่วม' },
  straw: { name: 'ฟางข้าว', icon: '🌾', desc: 'ดรอปจากหุ่นไล่กา — วัตถุดิบหมวก' },
  stinger: { name: 'เหล็กในแตน', icon: '🐝', desc: 'ดรอปจากฝูงแตน — วัตถุดิบแจ็กเก็ต' },
  horn: { name: 'เขาควายเหล็ก', icon: '🐃', desc: 'ดรอปจากควายเหล็กคลั่ง — วัตถุดิบแจ็กเก็ต' },
  speaker: { name: 'ลำโพงจิ๋วงานวัด', icon: '🔊', desc: 'ได้จากการปราบรถพ่วงข้างแต่งซิ่ง' },
  vest_win: {
    name: 'เสื้อกั๊กวินมอเตอร์ไซค์', icon: '🦺',
    desc: 'ชุดแฟชั่น: เสื้อกั๊กส้มเบอร์ 69 ใส่แล้วดูมีคิว', slot: 'body',
  },
  hat_straw: {
    name: 'หมวกสานเสียบขนนก', icon: '👒',
    desc: 'หมวกแฟชั่น: หมวกสานแม่ค้า เสียบขนนกพิราบเท่ๆ', slot: 'head',
  },
  hat_hyacinth: {
    name: 'หมวกสานผักตบชวา', icon: '🧺',
    desc: 'หมวกแฟชั่น: งานจักสานผักตบชวาฝีมือชุมชนริมคลอง', slot: 'head',
  },
  raincoat: {
    name: 'ชุดกันฝนกู้ภัยน้ำท่วม', icon: '🧥',
    desc: 'ชุดแฟชั่น: เสื้อกันฝนเหลืองสะท้อนแสง สำหรับผู้พิชิตมวลน้ำท่วม', slot: 'body',
  },
  hat_scarecrow: {
    name: 'งอบหุ่นไล่กา', icon: '🎩',
    desc: 'หมวกแฟชั่น: งอบฟางปีกกว้าง สเต็ปเทพเหมือนเจ้าของเดิม', slot: 'head',
  },
  jacket_racer: {
    name: 'แจ็กเก็ตสายซิ่งงานวัด', icon: '🧥',
    desc: 'ชุดแฟชั่น: แจ็กเก็ตหนังปักไฟ LED ของคนที่ล้มรถพ่วงข้างได้', slot: 'body',
  },
};

// Equipment slots that change how a character looks.
export const FASHION_SLOTS = ['body', 'head'];

// NPC shops: what each NPC sells for coins.
export const SHOPS = {
  cafe: { oliang: 10, chayen: 35 },
  grocery: { spatula: 120, umbrella: 100, broom: 30 },
};

// Grind-to-drip: farmed materials + coins -> fashion.
export const RECIPES = {
  vest_win: { coins: 50, items: { junk: 5 } },
  hat_straw: { coins: 80, items: { feather: 6, bone: 2 } },
  hat_hyacinth: { coins: 150, items: { hyacinth: 12 } },
  raincoat: { coins: 300, items: { flood_badge: 1, scale: 4, hyacinth: 5 } },
  hat_scarecrow: { coins: 400, items: { straw: 15 } },
  jacket_racer: { coins: 800, items: { speaker: 1, horn: 3, stinger: 10 } },
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

  // --- ชุมชนริมคลองสองพี่น้อง (Room 03) ---
  // Floats in the shallows and grabs whoever wades too close: hits slow you.
  hyacinth: {
    name: 'ผักตบชวากลายพันธุ์',
    level: 13,
    hp: 160, atk: 16, def: 4, aspd: 0.7, range: 1.4,
    speed: 0.8, exp: 45,
    coins: [8, 16],
    drops: [
      { item: 'hyacinth', chance: 0.6, amount: [1, 2] },
      { item: 'junk', chance: 0.3, amount: [1, 2] },
    ],
    respawnMs: 6000,
    wanderRadius: 2,
    leash: 6,
    aggroRange: 1.5,
    habitat: 's',
    onHit: { slow: { ms: 3000, factor: 0.5 } },
  },
  // Shy until hit; its bite is poisonous. Drops extra coins (it's the "money-gold" lizard).
  monitor: {
    name: 'ตัวเงินตัวทอง',
    level: 17,
    hp: 240, atk: 22, def: 6, aspd: 0.9, range: 1.4,
    speed: 3.0, exp: 75,
    coins: [20, 45],
    drops: [{ item: 'scale', chance: 0.4, amount: [1, 1] }],
    respawnMs: 7000,
    wanderRadius: 4,
    leash: 9,
    habitat: ',',
    onHit: { poison: { ms: 5000, dmg: 4 } },
  },
  // Miniboss: telegraphs a flood wave that hits everyone nearby unless they step
  // away. Loot and EXP go to everyone who did at least 10% of its HP.
  flood: {
    name: 'มวลน้ำท่วม',
    boss: true,
    level: 24,
    hp: 900, atk: 20, def: 6, aspd: 0.6, range: 1.8,
    speed: 1.2, exp: 400,
    coins: [80, 150],
    drops: [
      { item: 'flood_badge', chance: 1, amount: [1, 1] },
      { item: 'hyacinth', chance: 1, amount: [3, 5] },
    ],
    respawnMs: 120000,
    wanderRadius: 2,
    leash: 6,
    aggroRange: 3,
    habitat: 's',
    shareLoot: 0.1,
    wave: { every: 7000, windup: 1200, radius: 3, dmg: 25 },
  },

  // --- ชานเมือง & โกดังร้าง (Room 04) ---
  // Dances out of the way: 30% of attacks against it miss.
  scarecrow: {
    name: 'หุ่นไล่กาสเต็ปเทพ',
    level: 26,
    hp: 380, atk: 30, def: 8, aspd: 0.9, range: 1.4,
    speed: 2.4, exp: 120,
    coins: [25, 50],
    drops: [{ item: 'straw', chance: 0.6, amount: [1, 3] }],
    respawnMs: 6000,
    wanderRadius: 3,
    leash: 8,
    habitat: 'r',
    evade: 0.3,
  },
  // A swarm: fast, aggressive, fights as a flock and stings with poison.
  wasp: {
    name: 'ฝูงแตนแตกรัง',
    level: 30,
    hp: 220, atk: 26, def: 4, aspd: 1.4, range: 1.3,
    speed: 3.6, exp: 110,
    coins: [15, 35],
    drops: [{ item: 'stinger', chance: 0.5, amount: [1, 2] }],
    respawnMs: 5000,
    wanderRadius: 3,
    leash: 9,
    aggroRange: 3,
    flock: 3,
    onHit: { poison: { ms: 4000, dmg: 8 } },
  },
  // Iron hide, and every few seconds it charges from range for double damage.
  buffalo: {
    name: 'ควายเหล็กคลั่ง',
    level: 34,
    hp: 900, atk: 48, def: 18, aspd: 0.6, range: 1.6,
    speed: 2.0, exp: 260,
    coins: [40, 90],
    drops: [
      { item: 'horn', chance: 0.35, amount: [1, 1] },
      { item: 'junk', chance: 0.5, amount: [2, 4] },
    ],
    respawnMs: 9000,
    wanderRadius: 3,
    leash: 10,
    aggroRange: 3.5,
    habitat: '=',
    charge: { every: 6000, minRange: 2.5, speedMult: 3, dmgMult: 2 },
  },
  // World boss (GDD: needs a party, fights on a timetable). Spawns on a
  // schedule announced to every room, drives off if not beaten in time, and
  // shares loot with everyone who did 5% of its HP.
  sidecar: {
    name: 'รถพ่วงข้างแต่งซิ่งติดลำโพงงานวัด',
    boss: true,
    worldBoss: true,
    level: 40,
    hp: 9000, atk: 55, def: 20, aspd: 0.7, range: 2.4,
    speed: 1.6, exp: 3000,
    coins: [300, 600],
    drops: [
      { item: 'speaker', chance: 1, amount: [1, 1] },
      { item: 'horn', chance: 0.5, amount: [1, 2] },
    ],
    respawnMs: 0,
    wanderRadius: 3,
    leash: 8,
    aggroRange: 4,
    shareLoot: 0.05,
    wave: { every: 6000, windup: 1400, radius: 4, dmg: 70, label: '🔊 เบสกระแทก!' },
  },
};

// When the world boss appears (server clock). First spawn a few minutes
// after the server starts, then on a fixed interval. Overridable by env.
export const WORLD_BOSS = {
  firstMs: 5 * 60_000,
  everyMs: 30 * 60_000,
  warnMs: 60_000,
  stayMs: 10 * 60_000,
};

// The auto-farm bot won't start fights with monsters this many levels above you.
export const BOT_LEVEL_MARGIN = 2;

// Daily Bounty Board (GDD §2 Room 01). Everyone sees the same bounties each
// day, picked from this pool by date; progress resets at midnight (Bangkok).
export const BOUNTY_POOL = [
  { id: 'rat10', zone: 'alley', type: 'rat', need: 10, coins: 40, exp: 30 },
  { id: 'rat25', zone: 'alley', type: 'rat', need: 25, coins: 90, exp: 70 },
  { id: 'pigeon8', zone: 'alley', type: 'pigeon', need: 8, coins: 45, exp: 35 },
  { id: 'pigeon20', zone: 'alley', type: 'pigeon', need: 20, coins: 100, exp: 80 },
  { id: 'dog3', zone: 'alley', type: 'dog', need: 3, coins: 70, exp: 60 },
  { id: 'dog8', zone: 'alley', type: 'dog', need: 8, coins: 160, exp: 140 },
  { id: 'hyacinth10', zone: 'canal', type: 'hyacinth', need: 10, coins: 150, exp: 300 },
  { id: 'hyacinth25', zone: 'canal', type: 'hyacinth', need: 25, coins: 350, exp: 700 },
  { id: 'monitor5', zone: 'canal', type: 'monitor', need: 5, coins: 200, exp: 350 },
  { id: 'monitor12', zone: 'canal', type: 'monitor', need: 12, coins: 450, exp: 800 },
  { id: 'flood1', zone: 'canal', type: 'flood', need: 1, coins: 300, exp: 600 },
  { id: 'scarecrow10', zone: 'suburb', type: 'scarecrow', need: 10, coins: 500, exp: 1500 },
  { id: 'wasp15', zone: 'suburb', type: 'wasp', need: 15, coins: 600, exp: 1800 },
  { id: 'buffalo5', zone: 'suburb', type: 'buffalo', need: 5, coins: 800, exp: 2400 },
];
// How many bounties each zone gets per day (each for a different monster).
export const BOUNTY_SLOTS = { alley: 2, canal: 1, suburb: 1 };
const BANGKOK_OFFSET_MS = 7 * 3600 * 1000;

export function bountyDay(now) {
  return new Date(now + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

// Deterministic pick for a day: per zone, a few monster types, one bounty each.
export function bountiesFor(day) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
  const picks = [];
  for (const [zone, slots] of Object.entries(BOUNTY_SLOTS)) {
    const byType = new Map();
    for (const b of BOUNTY_POOL) if (b.zone === zone) byType.set(b.type, [...(byType.get(b.type) ?? []), b]);
    const types = [...byType.keys()];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    for (const type of types.slice(0, slots)) {
      const list = byType.get(type);
      picks.push(list[Math.floor(rnd() * list.length)]);
    }
  }
  return picks;
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
