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
};

export const ROOMS = {
  market: {
    id: 'market',
    name: 'ลานกลางตลาดสดบางลี่',
    subtitle: 'Safe Zone',
    safe: true,
    theme: 'market',
    spawn: { x: 15, y: 9 },
    tiles: [
      '################################',
      '#AAAAAA#AAAAAAAA####AAAAAAAA####',
      '#......#........####........####',
      '#.................NN...........#',
      '#..TT..........................#',
      '#..TT......,,,,,,,,,.......KK..#',
      '#..........,.......,...........#',
      '#..........,..ttt..,...........#',
      '#..........,..ttt..,...........P',
      '#..........,.......,...........P',
      '#..........,,,,,,,,,...........#',
      '#..BB..........................#',
      '#..............................#',
      '#AAAAAA......AAAAAA......AAAAAA#',
      '################################',
    ],
    portals: [
      { x: 31, y: 8, w: 1, h: 2, to: 'alley', tx: 1, ty: 6, label: 'ซอยแคบหลังตลาด →' },
    ],
    npcs: [
      { id: 'npc_cafe', kind: 'cafe', name: 'ป้าศรี ร้านกาแฟโบราณ', x: 3, y: 2, look: { skin: '#e0ac7e', hair: '#d9d9d9', shirt: '#b0463c' } },
      { id: 'npc_tailor', kind: 'tailor', name: 'ช่างเจี๊ยบ ร้านตัดเสื้อ', x: 12, y: 2, look: { skin: '#f2c9a0', hair: '#2b1d16', shirt: '#6a4fb3' } },
      { id: 'npc_grocery', kind: 'grocery', name: 'เฮียเล้ง ร้านโชห่วย', x: 24, y: 2, look: { skin: '#f2c9a0', hair: '#1b1b2a', shirt: '#ffffff' } },
    ],
    objects: [
      { id: 'obj_cafe_table', kind: 'minigame', name: 'โต๊ะหน้าร้านกาแฟ (การ์ดจับคู่)', x: 3, y: 4, w: 2, h: 2 },
      { id: 'obj_bounty', kind: 'bounty', name: 'กระดานรับงานชุมชน', x: 18, y: 3, w: 2, h: 1 },
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
      'P..........................................#',
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
    ],
    npcs: [],
    objects: [],
    spawns: [
      { type: 'hyacinth', count: 8, area: { x1: 9, y1: 7, x2: 35, y2: 11 } },
      { type: 'monitor', count: 6, area: { x1: 2, y1: 12, x2: 34, y2: 13 } },
      // The flood lurks in the lagoon at the east end of the canal.
      { type: 'flood', count: 1, area: { x1: 36, y1: 11, x2: 41, y2: 13 } },
    ],
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
  return grid;
}

export function portalAt(room, x, y) {
  const tx = Math.round(x);
  const ty = Math.round(y);
  return room.portals.find((p) => tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) ?? null;
}
