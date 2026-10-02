// Room-based world (GDD §2). Each room is a small tilemap connected by portals.
// Maps are ASCII so they can be edited without tooling; see TILES for the legend.

export const TILES = {
  '#': { name: 'wall', block: true },
  'A': { name: 'awning', block: true }, // market stall roof
  'T': { name: 'table', block: true },
  't': { name: 'tree', block: true },
  'B': { name: 'crate', block: true }, // ลังโฟม
  'N': { name: 'notice board', block: true }, // กระดานรับงาน
  'K': { name: 'cart', block: true }, // รถเข็น
  '~': { name: 'water', block: true },
  '.': { name: 'paving' },
  ',': { name: 'grass' },
  '=': { name: 'concrete' },
  'P': { name: 'portal' },
  'W': { name: 'boardwalk' }, // สะพานไม้
  's': { name: 'shallows' }, // น้ำตื้น เดินลุยได้
  'H': { name: 'stilt house', block: true }, // บ้านริมน้ำ
  'G': { name: 'warehouse', block: true }, // โกดังสังกะสี
  'r': { name: 'rice field' }, // นาข้าว
  'F': { name: 'fair booth shelf', block: true }, // ชั้นวางของรางวัลในซุ้มงานวัด
  'C': { name: 'booth counter', block: true }, // เคาน์เตอร์ซุ้ม
  'R': { name: 'shrine roof', block: true }, // หลังคาศาลเจ้า
  'S': { name: 'shrine wall', block: true }, // ผนังศาลเจ้า
  'J': { name: 'incense altar', block: true }, // โต๊ะธูปหน้าศาลเจ้า
  'l': { name: 'lantern post', block: true }, // เสาโคมไฟ
  'D': { name: 'stage' }, // เวทีงานวัด
  'Y': { name: 'shophouse upper floor', block: true }, // ห้องแถวไม้ชั้นบน
  'Q': { name: 'folding plank doors', block: true }, // บานเฟี้ยมหน้าห้องแถว
};

// Scenery placed on top of the tiles: room.decor is a list of [kind, x, y, variant?, text?]
// (text is painted on signs; '\n' starts a smaller second line).
// `block` pieces stop players and monsters like a wall, `flat` ones lie on the
// ground under everyone, the rest stand up and are depth-sorted with entities.
// `w` is the footprint width in tiles (default 1). Sprites live in client/src/decor.js.
export const DECOR = {
  spirit: { name: 'ศาลพระภูมิ', block: true },
  bodhi: { name: 'ต้นโพธิ์ผูกผ้าสามสี', block: true, fade: true },
  lamp: { name: 'เสาไฟ', block: true },
  pot: { name: 'กระถางต้นไม้', block: true },
  fruit: { name: 'แผงผลไม้', block: true },
  stools: { name: 'เก้าอี้พลาสติก' },
  moto: { name: 'วินมอเตอร์ไซค์', block: true, w: 2 },
  bin: { name: 'ถังขยะ', block: true },
  pole: { name: 'เสาไฟฟ้า', block: true, fade: true },
  jar: { name: 'โอ่งมังกร', block: true },
  hay: { name: 'ลอมฟาง', block: true },
  sign: { name: 'ป้ายไม้', block: true },
  tires: { name: 'กองยางเก่า', block: true },
  drums: { name: 'ถังน้ำมัน', block: true },
  balloons: { name: 'ลูกโป่ง', block: true },
  speaker: { name: 'ลำโพง', block: true },
  boat: { name: 'เรือหางยาว', w: 2, bob: true }, // floats on water, which already blocks
  puddle: { name: 'แอ่งน้ำ', flat: true },
  lotus: { name: 'บัว', flat: true },
  flowers: { name: 'ดอกไม้', flat: true },
  ac: { name: 'แอร์', flat: true }, // hung on a wall tile
  signboard: { name: 'ป้ายตลาด', flat: true }, // on the shophouse upper floor
  board: { name: 'ป้ายชื่อ', block: true, w: 2 },
  bualoy: { name: 'รถเข็นบัวลอย', block: true },
  shutter: { name: 'ประตูเหล็กม้วน', flat: true }, // on a wall tile
  manhole: { name: 'ฝาท่อ', flat: true },
};

export const ROOMS = {
  market: {
    id: 'market',
    name: 'ลานกลางตลาดสดบางลี่',
    subtitle: 'Safe Zone · ตลาดร้อยปี',
    safe: true,
    theme: 'market',
    spawn: { x: 15, y: 9 },
    tiles: [
      '#YYYYYYYYYYYYYYYYYYYYYYYYYYYYYY#',
      '#AAAAAAYAAAAAAAAYYYYAAAAAAAAYYY#',
      '#......Q........QQQQ........QQQ#',
      '#.................NN...........#',
      '#..TT..........................#',
      '#..TT......,,,,,,,,,.......KK..#',
      '#..........,,,,,,,,,...........#',
      '#..........,,,,,,,,,...........#',
      'P..........,,,,,,,,,...........P',
      'P..........,,,,,,,,,...........P',
      '#..........,,,,,,,,,...........#',
      '#..BB....TT....................#',
      '#........TT....................#',
      '#AAAAAA......AAAAAA......AAAAAA#',
      '################################',
    ],
    portals: [
      { x: 31, y: 8, w: 1, h: 2, to: 'alley', tx: 1, ty: 6, label: 'ซอยแคบหลังตลาด →' },
      { x: 0, y: 8, w: 1, h: 2, to: 'fair', tx: 32, ty: 7, label: '← ซุ้มงานวัด' },
    ],
    npcs: [
      { id: 'npc_cafe', kind: 'cafe', name: 'ป้าศรี ร้านกาแฟโบราณ', x: 3, y: 2, look: { skin: '#e0ac7e', hair: '#d9d9d9', shirt: '#b0463c' } },
      { id: 'npc_tailor', kind: 'tailor', name: 'ช่างเจี๊ยบ ร้านตัดเสื้อ', x: 12, y: 2, look: { skin: '#f2c9a0', hair: '#2b1d16', shirt: '#6a4fb3' } },
      { id: 'npc_grocery', kind: 'grocery', name: 'เฮียเล้ง ร้านโชห่วย', x: 24, y: 2, look: { skin: '#f2c9a0', hair: '#1b1b2a', shirt: '#ffffff' } },
      { id: 'npc_bualoy', kind: 'dessert', name: 'ยายบัว บัวลอยมะพร้าวอ่อน', x: 8, y: 8, look: { skin: '#e0ac7e', hair: '#e8e8e8', shirt: '#2fb3b3' } },
    ],
    objects: [
      { id: 'obj_cafe_table', kind: 'minigame', name: 'โต๊ะหน้าร้านกาแฟ (การ์ดจับคู่)', x: 3, y: 4, w: 2, h: 2 },
      { id: 'obj_bounty', kind: 'bounty', name: 'กระดานรับงานชุมชน', x: 18, y: 3, w: 2, h: 1 },
      { id: 'obj_checkers', kind: 'checkers', name: 'โต๊ะหมากฮอส', x: 9, y: 11, w: 2, h: 2 },
    ],
    decor: [
      ['bodhi', 15, 7], ['spirit', 30, 3],
      // The market's own sign on the old wooden shophouses, and ยายบัว's cart.
      ['signboard', 16, 1, 0, 'ตลาดบางลี่\nตลาดร้อยปี · สองพี่น้อง'],
      ['bualoy', 7, 8, 0, 'บัวลอย'], ['stools', 7, 9, 1],
      ['flowers', 12, 6], ['flowers', 18, 6, 1], ['flowers', 12, 10, 1], ['flowers', 18, 10],
      ['lamp', 10, 4], ['lamp', 20, 4], ['lamp', 20, 11],
      ['pot', 8, 2], ['pot', 15, 2, 1], ['pot', 27, 2],
      ['fruit', 14, 12, 0], ['fruit', 16, 12, 1], ['fruit', 18, 12, 2], ['fruit', 26, 12, 3], ['fruit', 28, 12, 0],
      ['stools', 2, 5], ['stools', 5, 5, 1], ['stools', 8, 12],
      ['moto', 26, 9], ['moto', 23, 4], ['bin', 30, 12], ['pot', 1, 12, 1],
    ],
    // Overhead lines between two decor pieces (or lantern tiles), drawn above everyone.
    wires: [
      { kind: 'flags', from: [10, 4], to: [20, 4] },
    ],
    spawns: [],
  },

  alley: {
    id: 'alley',
    name: 'ซอยแคบหลังตลาด',
    subtitle: 'Lv 1–15',
    safe: false,
    theme: 'alley',
    spawn: { x: 1, y: 6 },
    tiles: [
      '########################################',
      '##########========######=========#######',
      '##########==B=====######===K=====#######',
      '######============######=========###===P',
      '######==BB========================B===##',
      '#=====================K==============###',
      'P==========B=======================BB=##',
      'P=================================~~~=##',
      '#####===K=========B================~~=##',
      '#####=============######=============###',
      '#####====BB=======######======K======###',
      '#####=============######=============###',
      '########################################',
    ],
    portals: [
      { x: 0, y: 6, w: 1, h: 2, to: 'market', tx: 30, ty: 8, label: '← ลานกลางตลาด' },
      { x: 39, y: 3, w: 1, h: 1, to: 'canal', tx: 1, ty: 5, label: 'ริมคลอง (Lv 13+) →' },
    ],
    npcs: [],
    objects: [],
    decor: [
      ['pole', 12, 4], ['pole', 27, 4], ['pole', 6, 9], ['pole', 31, 9],
      ['ac', 2, 4], ['ac', 20, 1], ['ac', 19, 10], ['ac', 22, 9], ['ac', 35, 1, 1],
      ['bin', 16, 1], ['bin', 36, 10], ['drums', 32, 2], ['tires', 27, 11],
      ['puddle', 8, 6], ['puddle', 20, 6, 1], ['puddle', 28, 10], ['puddle', 14, 11, 1],
      ['shutter', 14, 0, 1], ['shutter', 28, 0], ['shutter', 7, 2], ['shutter', 4, 4, 1], ['shutter', 19, 3], ['shutter', 22, 3, 1], ['shutter', 34, 3],
      ['manhole', 17, 7], ['manhole', 30, 6], ['pot', 10, 2], ['pot', 31, 1, 1], ['pot', 5, 11],
    ],
    wires: [
      { kind: 'power', from: [12, 4], to: [27, 4] },
      { kind: 'power', from: [6, 9], to: [12, 4] },
      { kind: 'power', from: [27, 4], to: [31, 9] },
    ],
    spawns: [
      // Difficulty rises from the market entrance (west) to the far end (east).
      { type: 'rat', count: 7, area: { x1: 5, y1: 3, x2: 18, y2: 11 } },
      { type: 'pigeon', count: 7, area: { x1: 12, y1: 1, x2: 28, y2: 8 } },
      { type: 'dog', count: 3, area: { x1: 26, y1: 3, x2: 37, y2: 11 } },
    ],
  },

  canal: {
    id: 'canal',
    name: 'ชุมชนริมคลองสองพี่น้อง',
    subtitle: 'Lv 13–35',
    safe: false,
    theme: 'canal',
    spawn: { x: 1, y: 5 },
    tiles: [
      '############################################',
      '#tt,,,,,,,,,,,tt,,,,,,,,,,,,,,,,tt,,,,,,,tt#',
      '#,,,HHHH,,,,,,,,,,,,,HHHH,,,,,,,,,,,,HHHH,,#',
      '#,,,HHHH,,,,,,,,,,,,,HHHH,,,,,,,,,,,,HHHH,,#',
      '#,,,,WW,,,,,,,,,,,,,,,WW,,,,,,,,,,,,,,WW,,,#',
      'P..........................................P',
      '#,,,,WW,,,,,,,,,,,,,,,WW,,,,,,,,,,,,,,WW,,,#',
      '#~~~~WW~~~ssssss~~~~~~WW~~~~~~~~~~~~~~WW~~~#',
      '#~~~~WW~~ssssssss~~~~~WW~~~~ssssss~~~~WWss~#',
      '#~~~~WW~~~ssssss~~~~~~WW~~~ssssssss~~~WWss~#',
      '#~~~~WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWss~#',
      '#~~~~~~~~~sssss~~~~~~~~~~~~~ssssss~~~ssssss#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,ssssss~#',
      '#tt,,,,,,,tt,,,,,,,,,,tt,,,,,,,,,,,,ssssss~#',
      '############################################',
    ],
    portals: [
      { x: 0, y: 5, w: 1, h: 1, to: 'alley', tx: 38, ty: 3, label: '← ซอยหลังตลาด' },
      { x: 43, y: 5, w: 1, h: 1, to: 'suburb', tx: 1, ty: 8, label: 'ชานเมือง (Lv 26+) →' },
    ],
    npcs: [],
    objects: [],
    decor: [
      ['board', 2, 4, 0, 'คลองสองพี่น้อง'],
      ['boat', 2, 8], ['boat', 17, 8, 1], ['boat', 24, 11, 2], ['boat', 10, 9, 3],
      ['lotus', 8, 9], ['lotus', 19, 7, 1], ['lotus', 30, 7], ['lotus', 3, 11, 1], ['lotus', 35, 9],
      ['jar', 8, 3], ['jar', 25, 3], ['jar', 36, 3], ['jar', 3, 2],
      ['flowers', 10, 12], ['flowers', 18, 13, 1], ['flowers', 29, 12], ['flowers', 5, 1, 1],
    ],
    wires: [
      { kind: 'laundry', from: [9, 3], to: [12, 3] },
      { kind: 'laundry', from: [27, 3], to: [31, 3] },
    ],
    spawns: [
      { type: 'hyacinth', count: 8, area: { x1: 9, y1: 7, x2: 35, y2: 11 } },
      { type: 'monitor', count: 6, area: { x1: 2, y1: 12, x2: 34, y2: 13 } },
      // The flood lurks in the lagoon at the east end of the canal.
      { type: 'flood', count: 1, area: { x1: 36, y1: 11, x2: 41, y2: 13 } },
    ],
  },

  suburb: {
    id: 'suburb',
    name: 'ชานเมือง & โกดังร้าง',
    subtitle: 'Lv 26–50',
    safe: false,
    theme: 'suburb',
    spawn: { x: 1, y: 8 },
    tiles: [
      '##############################################',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,rrrrrrrrrrrrrr.,,t,,,,,,t,,,==GGGGGG==GGGGG#',
      '#,rrrrrrrrrrrrrr.,,,,,t,,,,,,,==GGGGGG==GGGGG#',
      '#,rrrrrrrrrrrrrr.,,,,,,,,,,t,,==GGGGGG==GGGGG#',
      '#,rrrrrrrrrrrrrr.,,,t,,,,,,,,,==GGGGGG==GGGGG#',
      '#,rrrrrrrrrrrrrr.,,,,,,,t,,,,,===============#',
      '#,,,,,,,,,,,,,,,.,,,,,,,,,,,,,===============#',
      'P.............................===============#',
      '#,,,,,,,,,,,,,,,.,,,,,,,,,,,,,=B=============#',
      '#,rrrrrrrrrrrrrr.,,,,,,t,,,,,,=========BB=K==#',
      '#,rrrrrrrrrrrrrr.,,t,,,,,,,,,,===============#',
      '#,rrrrrrrrrrrrrr.,,,,,,,,,t,,,==GGGGG======B=#',
      '#,rrrrrrrrrrrrrr.,,,,,,,,,,,t,==GGGGG=B======#',
      '#,rrrrrrrrrrrrrr.,,,,t,,,,,,,,==GGGGG====K===#',
      '#,rrrrrrrrrrrrrr.,,,,,,,,t,,,,==GGGGG========#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,===============#',
      '##############################################',
    ],
    portals: [
      { x: 0, y: 8, w: 1, h: 1, to: 'canal', tx: 42, ty: 5, label: '← ริมคลอง' },
    ],
    npcs: [],
    objects: [],
    decor: [
      ['hay', 18, 2], ['hay', 24, 13], ['hay', 3, 16],
      ['sign', 15, 9], ['tires', 41, 11], ['tires', 44, 16], ['drums', 38, 12],
      ['pole', 5, 7], ['pole', 17, 7], ['pole', 29, 9],
      ['flowers', 20, 1], ['flowers', 10, 16, 1], ['flowers', 27, 15], ['flowers', 22, 10, 1],
      ['puddle', 35, 9], ['puddle', 40, 15, 1],
    ],
    wires: [
      { kind: 'power', from: [5, 7], to: [17, 7] },
      { kind: 'power', from: [17, 7], to: [29, 9] },
    ],
    spawns: [
      { type: 'scarecrow', count: 8, area: { x1: 2, y1: 2, x2: 15, y2: 15 } },
      { type: 'wasp', count: 9, area: { x1: 17, y1: 1, x2: 29, y2: 16 } },
      { type: 'buffalo', count: 4, area: { x1: 30, y1: 12, x2: 44, y2: 16 } }, // south yard, clear of the boss arena
      // The world boss only appears on the WORLD_BOSS timetable.
      { type: 'sidecar', count: 1, scheduled: true, area: { x1: 33, y1: 7, x2: 43, y2: 10 } },
    ],
  },

  fair: {
    id: 'fair',
    name: 'ซุ้มงานวัด & หน้าศาลเจ้า',
    subtitle: 'Safe Zone · งานวัด',
    safe: true,
    theme: 'fair',
    spawn: { x: 31, y: 7 },
    tiles: [
      '##################################',
      '#AAAAAAAA##RRRRRRRRRRRR##AAAAAAAA#',
      '#FFFFFFFF..SSSSSSSSSSSS..FFFFFFFF#',
      '#CCCCCCCC..SSSSSSSSSSSS..CCCCCCCC#',
      '#..............JJJJ..............#',
      '#.........l............l.........#',
      '#................................#',
      '#...........,,,,,,...............P',
      '#...........,,,,,,...............P',
      '#....l.................DDDDDDDDDD#',
      '#.................l....DDDDDDDDDD#',
      '#......................DDDDDDDDDD#',
      '#,,,,..................DDDDDDDDDD#',
      '#,,,,.....l............DDDDDDDDDD#',
      '#tt,,..................DDDDDDDDDD#',
      '##################################',
    ],
    portals: [
      { x: 33, y: 7, w: 1, h: 2, to: 'market', tx: 1, ty: 8, label: 'ตลาด →' },
    ],
    npcs: [
      { id: 'npc_dj', kind: 'dj', name: 'ดีเจโจ้ เวทีงานวัด', x: 28, y: 9, look: { skin: '#c68b5e', hair: '#1b1b2a', shirt: '#f07ab0' } },
      { id: 'npc_pets', kind: 'pets', name: 'ป้าแดง ซุ้มสัตว์เลี้ยง', x: 28, y: 4, look: { skin: '#e0ac7e', hair: '#7a4a2a', shirt: '#e0b030' } },
    ],
    objects: [
      { id: 'obj_stars', kind: 'stars', name: 'ซุ้มสอยดาว', x: 6, y: 3, w: 3, h: 1 },
      { id: 'obj_fortune', kind: 'fortune', name: 'โต๊ะเซียมซีหน้าศาลเจ้า', x: 15, y: 4, w: 4, h: 1 },
    ],
    // Players standing here take part in the dance-off.
    stage: { x1: 23, y1: 9, x2: 32, y2: 14 },
    night: true, // dark sky, glowing lanterns
    decor: [
      ['speaker', 23, 9], ['speaker', 32, 9],
      ['balloons', 20, 13], ['balloons', 3, 10, 1],
      ['jar', 10, 2], ['jar', 23, 2],
      ['flowers', 12, 7], ['flowers', 17, 8, 1], ['flowers', 2, 12], ['flowers', 3, 14, 1],
    ],
    wires: [
      { kind: 'bulbs', from: [5, 9], to: [10, 5] },
      { kind: 'bulbs', from: [10, 5], to: [23, 5] },
      { kind: 'bulbs', from: [23, 5], to: [18, 10] },
      { kind: 'bulbs', from: [18, 10], to: [10, 13] },
      { kind: 'bulbs', from: [23, 9], to: [32, 9], sag: 0.02 },
    ],
    spawns: [],
  },
};

export function tileAt(room, x, y) {
  const row = room.tiles[y];
  if (!row || x < 0 || x >= row.length) return '#';
  return row[x];
}

export function roomSize(room) {
  return { w: room.tiles[0].length, h: room.tiles.length };
}

// Blocked grid (true = cannot walk). NPCs occupy their tile.
export function buildBlockedGrid(room) {
  const { w, h } = roomSize(room);
  const grid = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) row.push(!!TILES[tileAt(room, x, y)]?.block);
    grid.push(row);
  }
  for (const npc of room.npcs) grid[npc.y][npc.x] = true;
  for (const [kind, x, y] of room.decor ?? []) {
    const d = DECOR[kind];
    if (d.block) for (let i = 0; i < (d.w ?? 1); i++) grid[y][x + i] = true;
  }
  return grid;
}

export function portalAt(room, x, y) {
  const tx = Math.round(x);
  const ty = Math.round(y);
  return room.portals.find((p) => tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) ?? null;
}
