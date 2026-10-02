// Game data shared by server (authoritative) and client (display only).
// Everything the server trusts lives here so both sides agree on names/prices.

export const TICK_RATE = 10; // server ticks per second (GDD: 5–10)
export const TICK_MS = 1000 / TICK_RATE;
export const TILE = 32; // art pixels per tile (pixel-art base resolution)

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
  bualoy: { name: 'บัวลอยมะพร้าวอ่อน', icon: '🥥', desc: 'ฟื้น HP 400 — ของขึ้นชื่อตลาดบางลี่ หอมกะทิ เนื้อมะพร้าวอ่อนเต็มถ้วย', heal: 400, use: true },
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
  // Only from the สอยดาว booth at the temple fair.
  hat_lion: {
    name: 'หัวสิงโตเชิด', icon: '🦁',
    desc: 'หมวกแฟชั่นหายาก: หัวสิงโตเชิดหน้าศาลเจ้า ได้จากซุ้มสอยดาวเท่านั้น', slot: 'head',
  },
  shirt_flower: {
    name: 'เสื้อลายดอกงานวัด', icon: '🌺',
    desc: 'ชุดแฟชั่นหายาก: เสื้อเชิ้ตลายดอกสีสด ได้จากซุ้มสอยดาวเท่านั้น', slot: 'body',
  },
  // Only from achievements (ตู้โชว์).
  hat_ratears: { name: 'ที่คาดผมหูหนู', icon: '🐭', desc: 'หมวกแฟชั่นจากความสำเร็จ "นักล่าหนูท่อ"', slot: 'head' },
  hat_pakama: { name: 'ผ้าขาวม้าโพกหัว', icon: '🎗️', desc: 'หมวกแฟชั่นจากความสำเร็จ "เซียนหมากฮอส"', slot: 'head' },
  shirt_disco: { name: 'เสื้อเลื่อมดิสโก้', icon: '🪩', desc: 'ชุดแฟชั่นจากความสำเร็จ "ราชาเวทีงานวัด"', slot: 'body' },
  // Props: held in the other hand, just for looks.
  prop_oliang: { name: 'ถุงโอเลี้ยง', icon: '🛍️', desc: 'พร็อพถือ: โอเลี้ยงใส่ถุงมัดหนังยาง ถือแล้วดูเป็นคนตลาดตัวจริง', slot: 'prop' },
  prop_fan: { name: 'พัดลมมือถือ', icon: '🌀', desc: 'พร็อพถือ: พัดลมจิ๋วสู้แดดบางลี่', slot: 'prop' },
  prop_basket: { name: 'ตะกร้าหวาย', icon: '🧺', desc: 'พร็อพถือ: ตะกร้าจ่ายตลาดสานจากก้านผักตบ', slot: 'prop' },
  // Pets: follow you around, just for looks.
  pet_chick: { name: 'ไก่แจ้', icon: '🐓', desc: 'สัตว์เลี้ยง: ไก่แจ้ตัวจิ๋ว เดินตามต้อยๆ', slot: 'pet' },
  pet_cat: { name: 'แมวส้ม', icon: '🐈', desc: 'สัตว์เลี้ยง: แมวส้มจอมกวน ขาประจำตลาด', slot: 'pet' },
  pet_dog: { name: 'หมาไทยหลังอาน', icon: '🐕', desc: 'สัตว์เลี้ยง: หมาไทยหลังอาน ขนเป็นสันกลางหลัง', slot: 'pet' },
};

// Equipment slots that change how a character looks.
export const FASHION_SLOTS = ['body', 'head', 'prop', 'pet'];

// NPC shops: what each NPC sells for coins.
export const SHOPS = {
  cafe: { oliang: 10, chayen: 35, prop_oliang: 60 },
  grocery: { spatula: 120, umbrella: 100, broom: 30, prop_fan: 150 },
  pets: { pet_chick: 350, pet_cat: 500, pet_dog: 800 },
  dessert: { bualoy: 90 },
};

// Grind-to-drip: farmed materials + coins -> fashion.
export const RECIPES = {
  vest_win: { coins: 50, items: { junk: 5 } },
  hat_straw: { coins: 80, items: { feather: 6, bone: 2 } },
  hat_hyacinth: { coins: 150, items: { hyacinth: 12 } },
  raincoat: { coins: 300, items: { flood_badge: 1, scale: 4, hyacinth: 5 } },
  hat_scarecrow: { coins: 400, items: { straw: 15 } },
  jacket_racer: { coins: 800, items: { speaker: 1, horn: 3, stinger: 10 } },
  prop_basket: { coins: 100, items: { hyacinth: 8 } },
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

// Parties: members in the same room within `range` tiles of a kill share its
// EXP (split evenly, plus `bonus` per extra member) and its bounty credit,
// may loot each other's drops, and pool their damage towards boss loot.
export const PARTY = { max: 5, range: 12, bonus: 0.2, inviteMs: 60_000 };

// เควสต์มือใหม่: a chain that walks new players through the game. `on` is
// what counts: buy/craft/kill/enter (with `target`), auto, bounty, fortune
// events, or a state check: 'have' (items in the bag) and 'level'.
export const TUTORIAL = [
  { id: 'buy_oliang', on: 'buy', target: 'oliang', n: 1, text: 'ซื้อโอเลี้ยงจากป้าศรี', hint: 'ป้าศรีอยู่ร้านกาแฟมุมซ้ายบนของตลาด แตะที่ป้าเพื่อเปิดร้าน', reward: { coins: 10 } },
  { id: 'go_alley', on: 'enter', target: 'alley', n: 1, text: 'ไปซอยแคบหลังตลาด', hint: 'กด 🗺️ เดินทาง แล้วเลือกซอยแคบหลังตลาด', reward: { items: { oliang: 2 } } },
  { id: 'rats', on: 'kill', target: 'rat', n: 5, text: 'ปราบหนูท่อลมปราณ', hint: 'แตะที่หนูเพื่อล็อกเป้าแล้วตี', reward: { coins: 30, exp: 20 } },
  { id: 'junk', on: 'have', target: 'junk', n: 5, text: 'เก็บเศษขยะให้ครบ', hint: 'หนูดรอปเศษขยะ 🥫 เดินไปเก็บได้เลย', reward: { exp: 15 } },
  { id: 'vest', on: 'craft', target: 'vest_win', n: 1, text: 'ตัดเสื้อกั๊กวินกับช่างเจี๊ยบ', hint: 'ช่างเจี๊ยบอยู่ร้านตัดเสื้อแถวบนของตลาด', reward: { coins: 50 } },
  { id: 'auto', on: 'auto', n: 1, text: 'ลองเปิดบอท 🤖 AUTO', hint: 'กดปุ่ม AUTO ตอนอยู่นอกตลาด บอทจะตีและเก็บของให้เอง', reward: { items: { oliang: 3 } } },
  { id: 'level5', on: 'level', n: 5, text: 'ฝึกจนถึงเลเวล 5', hint: 'ตีหนู นกพิราบ หรือหมาในซอย', reward: { items: { chayen: 1 } } },
  { id: 'bounty', on: 'bounty', n: 1, text: 'รับรางวัลจากกระดานรับงาน', hint: 'ดูงานที่กระดานในตลาด ทำให้ครบแล้วกลับไปกดรับ', reward: { coins: 60 } },
  { id: 'fortune', on: 'fortune', n: 1, text: 'ไปเสี่ยงเซียมซีที่งานวัด', hint: 'ออกประตูซ้ายของตลาด แล้วไปที่โต๊ะธูปหน้าศาลเจ้า', reward: { coins: 50, exp: 30 } },
];

// ตู้โชว์: achievements. Each unlocks a title to show over your name, and a
// few also give a fashion item you can't get anywhere else. `req` is one of:
// { kill: type, n } (lifetime kills), { level }, { stat, n } (a counter in
// profile.stats), { quest: true } (tutorial done), { fashion: n } (fashion
// items owned), { pet: true }.
export const ACHIEVEMENTS = [
  { id: 'newbie', icon: '🎓', title: 'บัณฑิตตลาดบางลี่', desc: 'ทำเควสต์มือใหม่ครบ', req: { quest: true } },
  { id: 'lv10', icon: '⭐', title: 'เด็กตลาด', desc: 'ถึงเลเวล 10', req: { level: 10 } },
  { id: 'lv20', icon: '🌟', title: 'ขาใหญ่ตลาด', desc: 'ถึงเลเวล 20', req: { level: 20 } },
  { id: 'lv30', icon: '💫', title: 'เจ้าถิ่นบางลี่', desc: 'ถึงเลเวล 30', req: { level: 30 } },
  { id: 'lv40', icon: '👑', title: 'ตำนานบางลี่', desc: 'ถึงเลเวล 40', req: { level: 40 } },
  { id: 'rats', icon: '🐀', title: 'นักล่าหนูท่อ', desc: 'ปราบหนูท่อลมปราณ 100 ตัว', req: { kill: 'rat', n: 100 }, item: 'hat_ratears' },
  { id: 'pigeons', icon: '🐦', title: 'ผู้ไล่นกพิราบ', desc: 'ปราบนกพิราบแย่งข้าว 50 ตัว', req: { kill: 'pigeon', n: 50 } },
  { id: 'dogs', icon: '🐕', title: 'ขาประจำซอย', desc: 'ปราบหมาจรจัดประจำซอย 30 ตัว', req: { kill: 'dog', n: 30 } },
  { id: 'hyacinth', icon: '🌿', title: 'ผู้พิทักษ์คลอง', desc: 'ปราบผักตบชวากลายพันธุ์ 50 ตัว', req: { kill: 'hyacinth', n: 50 } },
  { id: 'flood', icon: '🌊', title: 'ฮีโร่กู้ภัย', desc: 'ปราบมวลน้ำท่วม 3 ครั้ง', req: { kill: 'flood', n: 3 } },
  { id: 'sidecar', icon: '🔊', title: 'ตำนานงานวัด', desc: 'ปราบรถพ่วงข้างแต่งซิ่งติดลำโพงงานวัด', req: { kill: 'sidecar', n: 1 } },
  { id: 'checkers', icon: '♟️', title: 'เซียนหมากฮอส', desc: 'ชนะหมากฮอส 10 ครั้ง', req: { stat: 'ckWins', n: 10 }, item: 'hat_pakama' },
  { id: 'dance', icon: '💃', title: 'ราชาเวทีงานวัด', desc: 'ชนะประชันท่าเต้น 5 ครั้ง', req: { stat: 'danceWins', n: 5 }, item: 'shirt_disco' },
  { id: 'stars', icon: '✨', title: 'มือสอยดาว', desc: 'สอยดาว 30 ดวง', req: { stat: 'stars', n: 30 } },
  { id: 'fortune', icon: '🧧', title: 'สายมู', desc: 'เสี่ยงเซียมซี 7 วัน', req: { stat: 'fortunes', n: 7 } },
  { id: 'fashion', icon: '👗', title: 'แฟชั่นนิสต้าบางลี่', desc: 'มีชุดแฟชั่น (เสื้อหรือหมวก) 6 ชิ้น', req: { fashion: 6 } },
  { id: 'pet', icon: '🐾', title: 'ทาสหมาทาสแมว', desc: 'รับสัตว์เลี้ยงมาเลี้ยง', req: { pet: true } },
];

// หมากฮอสไทย at the market table: against ลุงชม (the bot) or another player.
// Wins pay coins, for the first `dailyWins` wins of each Bangkok day.
export const CHECKERS = {
  turnMs: 60_000, botDelayMs: 800, inviteMs: 60_000,
  reward: { bot: 20, player: 40 }, dailyWins: 5,
};

// ---------- room 05: the temple fair ----------

// ซุ้มสอยดาว: pay for a star, win what's behind it. `w` weights are relative.
// It pays back less than it costs on average, so it drains coins from the game.
export const STARS = {
  price: 50,
  count: 12,
  prizes: [
    { w: 30, coins: 20 },
    { w: 18, coins: 60 },
    { w: 6, coins: 150 },
    { w: 16, item: 'oliang', n: 2 },
    { w: 12, item: 'chayen', n: 1 },
    { w: 10, item: 'junk', n: 3 },
    { w: 5, item: 'hat_lion', n: 1, rare: true },
    { w: 3, item: 'shirt_flower', n: 1, rare: true },
  ],
  duplicateCoins: 250, // a rare fashion item you already own pays this instead
};

// เซียมซี: one stick a day (Bangkok time) gives a buff until midnight.
// Stick n reads FORTUNES[(n - 1) % FORTUNES.length].
export const FORTUNE_STICKS = 28;
export const FORTUNES = [
  { buff: 'exp', v: 0.2, text: 'การงานรุ่งเรือง ขยันวันนี้ได้ผลเกินคาด' },
  { buff: 'coins', v: 0.2, text: 'โชคลาภไหลมาเทมา ค้าขายกำไรงาม' },
  { buff: 'drop', v: 0.25, text: 'ของหายได้คืน ของที่อยากได้จะวิ่งมาหา' },
  { buff: 'heal', v: 0.3, text: 'สุขภาพแข็งแรง กินอะไรก็เป็นยา' },
  { buff: 'exp', v: 0.2, text: 'ผู้ใหญ่เมตตา มีคนชี้ทางให้ก้าวหน้า' },
  { buff: 'coins', v: 0.2, text: 'เงินทองไม่ขาดมือ มีคนนำโชคมาให้' },
  { buff: 'drop', v: 0.25, text: 'ดวงเด่นเรื่องสะสม ของดีเข้ากระเป๋า' },
  { buff: 'heal', v: 0.3, text: 'พักผ่อนพอ ร่างกายฟื้นไว' },
];
export const BUFF_LABELS = {
  exp: 'EXP จากมอนสเตอร์', coins: 'เหรียญที่ดรอป', drop: 'โอกาสดรอปวัตถุดิบ', heal: 'HP จากเครื่องดื่ม',
};

// เวทีประชันท่าเต้น: every round the DJ calls `calls` emotes, one at a time.
// Doing the called emote on stage within `windowMs` scores a point. The top
// scorer(s) with at least `minTop` points win `prizeTop` coins; everyone else
// gets `perPoint` coins per point.
export const STAGE = {
  everyMs: 45_000, leadMs: 3000, calls: 5, windowMs: 4000, gapMs: 1200,
  prizeTop: 120, perPoint: 10, minTop: 3,
};

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
    equip: { weapon: 'broom', body: null, head: null, prop: null, pet: null },
    look: lookFromName(name),
    bounty: null, // { day, progress: { id: n }, claimed: [id] }
    quest: { step: 0, n: 0 }, // เควสต์มือใหม่: TUTORIAL[step], n counted so far
    stats: { kills: {} }, // lifetime counters for achievements
    achievements: [], // unlocked ACHIEVEMENTS ids
    title: null, // the achievement id shown as a title over your name
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
