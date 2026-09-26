// Hand-made pixel art as ASCII rows. '.' is transparent; other characters are
// looked up in the palette passed to paint(). Keeping art as data means no
// binary assets are needed and a test can check every sprite's dimensions.

export const OUTLINE = '#1f1a24';

// 16x16 character, front view. h=hair s=skin e=eye r=mouth c/C=shirt p=pants b=shoes
export const CHAR_FRAMES = [
  [
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khsssssshk...',
    '...ksessssesk...',
    '...kssssssssk...',
    '....kssrrssk....',
    '.....kkkkkk.....',
    '....kcccccck....',
    '...kcccccccck...',
    '..ksccccccccsk..',
    '..kkCCCCCCCCkk..',
    '....kppppppk....',
    '....kpk..kpk....',
    '....kbk..kbk....',
  ],
  [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khsssssshk...',
    '...ksessssesk...',
    '...kssssssssk...',
    '....kssrrssk....',
    '....kcccccck....',
    '...kcccccccck...',
    '..ksccccccccsk..',
    '..kkCCCCCCCCkk..',
    '....kppppppk....',
    '...kpk....kpk...',
    '...kbk....kbk...',
  ],
];

// Fashion overlays, drawn on top of the matching character frame.
export const BODY_OVERLAYS = {
  // เสื้อกั๊กวินมอเตอร์ไซค์: orange vest, reflective stripe, open front.
  vest_win: {
    palette: { o: '#ff7a1a', O: '#c85a0a', y: '#f4f1c0' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.....oo..oo.....',
      '....ooo..ooo....',
      '....yyy..yyy....',
      '....OOO..OOO....',
      '................',
      '................',
      '................',
    ],
  },
};

// Hats sit on the head, which bobs down one pixel in the walk frame.
BODY_OVERLAYS.hat_straw = {
  followsHead: true,
  palette: { b: '#d9b56e', B: '#8a5a2b', f: '#9aa3ad' },
  rows: [
    '.....kkkkkk.f...',
    '....kbbbbbbkff..',
    '...kbbbbbbbbkf..',
    '..kBBBBBBBBBBk..',
    ...Array(12).fill('................'),
  ],
};

BODY_OVERLAYS.hat_hyacinth = {
  followsHead: true,
  palette: { g: '#7a9a4a', G: '#556b30', v: '#9b6bd6' },
  rows: [
    '....kkkkkkkk.v..',
    '...kgGgGgGgGkv..',
    '..kGgGgGgGgGgk..',
    '.kkkkkkkkkkkkkk.',
    ...Array(12).fill('................'),
  ],
};

// Wide-brimmed straw ngob hat.
BODY_OVERLAYS.hat_scarecrow = {
  followsHead: true,
  palette: { y: '#e3c16f', Y: '#b8923f' },
  rows: [
    '......kkkk......',
    '....kkyYyykk....',
    '..kkyyyYyyyykk..',
    'kkYYYYYYYYYYYYkk',
    ...Array(12).fill('................'),
  ],
};

// Black racer jacket with festival LED trim.
BODY_OVERLAYS.jacket_racer = {
  palette: { j: '#2a2331', J: '#4a3f55', n: '#6dff8a', p: '#f07ab0' },
  rows: [
    ...Array(9).fill('................'),
    '....kjjjjjjk....',
    '...kjnjjjjpjk...',
    '..kJjjjjjjjjJk..',
    '..kkpnpnpnpnkk..',
    ...Array(3).fill('................'),
  ],
};

// Yellow flood-rescue raincoat with a reflective band and hood.
BODY_OVERLAYS.raincoat = {
  palette: { y: '#ffd23f', Y: '#c99a1a', r: '#f4f1c0' },
  rows: [
    ...Array(8).fill('................'),
    '....kyyyyyyk....',
    '....kyyyyyyk....',
    '...kyyyyyyyyk...',
    '..kyrrrrrrrryk..',
    '..kYYYYYYYYYYk..',
    '....kYYYYYYk....',
    '................',
    '................',
  ],
};

// Held weapons (drawn at the character's right hand).
export const WEAPON_ART = {
  broom: {
    palette: { w: '#8a5a2b', y: '#e3c16f', Y: '#b8923f' },
    rows: [
      '.k..',
      '.w..',
      '.w..',
      '.w..',
      '.w..',
      '.w..',
      'kyyk',
      'yYyy',
      'yyYy',
      'y.yy',
    ],
  },
  spatula: {
    palette: { w: '#5a3a1b', g: '#c9ced6', G: '#8d949e' },
    rows: [
      '.w..',
      '.w..',
      '.w..',
      '.w..',
      '.k..',
      'kggk',
      'gGgg',
      'ggGg',
      'kggk',
    ],
  },
  umbrella: {
    palette: { r: '#e0453a', w: '#fff3d6', s: '#5a3a1b' },
    rows: [
      '..kkk..',
      '.krwrk.',
      'krwrwrk',
      'kkkkkkk',
      '...s...',
      '...s...',
      '...s...',
      '...s...',
      '..ks...',
    ],
  },
};

// หนูท่อลมปราณ, side view facing right. g/G fur, p pink, e glowing eye.
export const RAT_PALETTE = { g: '#7d838c', G: '#b9bec6', p: '#f3a0b0', e: '#ff4455' };
export const RAT_FRAMES = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........kk....',
    '.....kkkkkpk....',
    '....kgggggggkk..',
    '...kggggggggek..',
    '..kggggggggggpk.',
    'k.kgggGGGgggkk..',
    '.kkgggGGGggk....',
    '...kkggggkk.....',
    '....kk..kk......',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........kk....',
    '.....kkkkkpk....',
    '....kgggggggkk..',
    '...kggggggggek..',
    '..kggggggggggpk.',
    '.kkgggGGGgggkk..',
    'k.kgggGGGggk....',
    '...kkggggkk.....',
    '.....kk..kk.....',
    '................',
  ],
];

// นกพิราบแย่งข้าว, side view facing right.
export const PIGEON_PALETTE = { g: '#6e7682', G: '#aab2bd', i: '#4f9e84', e: '#e84a3a', y: '#e0a040' };
export const PIGEON_FRAMES = [
  [
    ...Array(7).fill('................'),
    '.........kkk....',
    '........kgggk...',
    '........kgegyk..',
    '...kkkkkkiiik...',
    '..kGGGGGGGiik...',
    '.kGGgggggGGGk...',
    'kGGgggggGGGk....',
    '.kkkkkkkkkkk....',
    '......y..y......',
  ],
  [
    ...Array(8).fill('................'),
    '.........kkk....',
    '........kgggk...',
    '...kkkkkkgegyk..',
    '..kGGGGGGGiik...',
    '.kGGgggggGGGk...',
    'kGGgggggGGGk....',
    '.kkkkkkkkkkk....',
    '.....y....y.....',
  ],
];

// หมาจรจัดประจำซอย, side view facing right.
export const DOG_PALETTE = { b: '#c8924e', B: '#8a5a2b', e: '#ffffff', p: '#e86a7a' };
export const DOG_FRAMES = [
  [
    ...Array(4).fill('................'),
    '..........kk....',
    '.........kbbk...',
    '.........kbbbk..',
    '..k......kbebbkk',
    '..kk.....kbbbbbk',
    '...kkkkkkkbbbpk.',
    '...kbbbbbbbbbk..',
    '...kbBBbbbbBbk..',
    '...kbbbbbbbbbk..',
    '...kbkkkkkkkbk..',
    '...kbk.....kbk..',
    '...kk......kk...',
  ],
  [
    ...Array(4).fill('................'),
    '..........kk....',
    '.........kbbk...',
    '.........kbbbk..',
    '.k.......kbebbkk',
    '..kk.....kbbbbbk',
    '...kkkkkkkbbbpk.',
    '...kbbbbbbbbbk..',
    '...kbBBbbbbBbk..',
    '...kbbbbbbbbbk..',
    '...kbkkkkkkkbk..',
    '..kbk.......kbk.',
    '..kk.........kk.',
  ],
];

// ผักตบชวากลายพันธุ์: floating clump with a purple flower and angry eyes.
export const HYACINTH_PALETTE = { g: '#3f8a36', G: '#6fbf4a', v: '#9b6bd6', V: '#d9c2ff', w: '#5b93b3', e: '#ffe066' };
export const HYACINTH_FRAMES = [
  [
    ...Array(3).fill('................'),
    '.......kk.......',
    '......kvVk......',
    '.....kvVvVk.....',
    '......kvvk......',
    '...kk..kk..kk...',
    '..kGGk.kk.kGGk..',
    '..kGgGkggkGgGk..',
    '...kgGgggggGgk..',
    '..kggekggkegggk.',
    '..kgggggggggggk.',
    '.wkkggggggggkkw.',
    'wwwwkkkkkkkkwwww',
    '.ww..wwww..ww...',
  ],
  [
    ...Array(4).fill('................'),
    '.......kk.......',
    '......kvVk......',
    '.....kvVvVk.....',
    '...kk.kvvk.kk...',
    '..kGGk.kk.kGGk..',
    '..kGgGkggkGgGk..',
    '...kgGgggggGgk..',
    '..kggekggkegggk.',
    '..kgggggggggggk.',
    'wwkkggggggggkkww',
    '.wwwkkkkkkkkwww.',
    'ww..wwwwww..ww..',
  ],
];

// ตัวเงินตัวทอง: long dark monitor lizard with yellow spots, facing right.
export const MONITOR_PALETTE = { d: '#3b3a2e', D: '#5a5840', y: '#e3c16f', e: '#ffcf3f', t: '#e86a7a' };
export const MONITOR_FRAMES = [
  [
    ...Array(8).fill('................'),
    '..........kkkk..',
    '.........kDDDekk',
    'kk....kkkDdDDDDk',
    'kDkkkkDyDDyDDkkt',
    '.kDDyDDDDDDyDk..',
    '..kkkDkkkkDkk...',
    '....kDk...kDk...',
    '....kk.....kk...',
  ],
  [
    ...Array(8).fill('................'),
    '..........kkkk..',
    '.........kDDDekk',
    '......kkkDdDDDDk',
    'kkkkkkDyDDyDDkk.',
    'kDDDyDDDDDDyDk..',
    '.kkkkDkkkkDkk...',
    '...kDk.....kDk..',
    '...kk.......kk..',
  ],
];

// มวลน้ำท่วม: a muddy wave with furious eyes. Drawn at double size.
export const FLOOD_PALETTE = { b: '#6b5a3a', B: '#8a7450', w: '#5b93b3', W: '#9cc8e0', f: '#e8f4ff', e: '#ff4455' };
export const FLOOD_FRAMES = [
  [
    ...Array(3).fill('................'),
    '.........kkkk...',
    '.......kkWWffk..',
    '.....kkwWWWWfk..',
    '....kwwwkkwwWk..',
    '...kwwbekbwekwk.',
    '..kwwbbbbbbbbwk.',
    '..kwbBBbbbbBbbwk',
    '.kwbbbbBBbbbbbwk',
    '.kwbbkkkkkkbbbwk',
    'kwwbbbbbbbbbbwwk',
    'kWwwbbbbbbbwwwWk',
    'fWWwwwwwwwwwwWWf',
    '.ffWWffWWffWWff.',
  ],
  [
    ...Array(2).fill('................'),
    '..........kkkk..',
    '........kkWWffk.',
    '......kkwWWWWfk.',
    '.....kwwwkkwwWk.',
    '....kwwbekbwekwk',
    '...kwwbbbbbbbbwk',
    '..kwwbBBbbbbBbbk',
    '..kwbbbbBBbbbbwk',
    '.kwwbbkkkkkkbbwk',
    'kwwbbbbbbbbbbwwk',
    'kWwwbbbbbbbwwwWk',
    'fWWwwwwwwwwwwWWf',
    'ffWWffWWffWWffWf',
    '.f..f..f..f..f..',
  ],
];

// หุ่นไล่กาสเต็ปเทพ: straw scarecrow on a pole, arms out, mid dance step.
export const SCARECROW_PALETTE = { y: '#e3c16f', Y: '#b8923f', c: '#d94f4f', w: '#8a5a2b', e: '#1f1a24' };
export const SCARECROW_FRAMES = [
  [
    '......kkkk......',
    '....kkYYYYkk....',
    '...kYYYYYYYYk...',
    '.....kyyyyk.....',
    '.....kyeyek.....',
    '.....kyyyyk.....',
    'kk..kkcccckk..kk',
    'kykkccccccccckyk',
    '.kyccwccccwcccyk',
    '..kkcccccccckkk.',
    '....kcccccck....',
    '.....kkwwkk.....',
    '......kwwk......',
    '.....kkwwkk.....',
    '....kyk..kyk....',
    '....kk....kk....',
  ],
  [
    '.......kkkk.....',
    '.....kkYYYYkk...',
    '....kYYYYYYYYk..',
    '......kyyyyk....',
    '......kyeyek....',
    '......kyyyyk....',
    '.kk..kkcccckk.kk',
    '.kykkccccccccky.',
    '..kyccwccccwcck.',
    '...kkcccccccck..',
    '.....kcccccck...',
    '......kkwwkk....',
    '......kwwk......',
    '.....kkwwkk.....',
    '...kyk....kyk...',
    '...kk......kk...',
  ],
];

// ฝูงแตนแตกรัง: three wasps buzzing together.
export const WASP_PALETTE = { y: '#ffd23f', b: '#1f1a24', w: '#e8f4ff', r: '#ff4455' };
export const WASP_FRAMES = [
  [
    ...Array(4).fill('................'),
    '..ww......ww....',
    '.kwwk....kwwk...',
    'kyybyk..kyybyk..',
    'kbyybrk.kbyybrk.',
    '.kkkk....kkkk...',
    '.....ww.........',
    '....kwwk........',
    '...kyybyk.......',
    '...kbyybrk......',
    '....kkkk........',
    '................',
    '................',
  ],
  [
    ...Array(4).fill('................'),
    '...ww......ww...',
    '..kwwk....kwwk..',
    '.kyybyk..kyybyk.',
    '.kbyybrk.kbyybrk',
    '..kkkk....kkkk..',
    '......ww........',
    '.....kwwk.......',
    '....kyybyk......',
    '....kbyybrk.....',
    '.....kkkk.......',
    '................',
    '................',
  ],
];

// ควายเหล็กคลั่ง: riveted iron buffalo with big horns, facing right.
export const BUFFALO_PALETTE = { i: '#6e7682', I: '#9aa3ad', h: '#e8e0c8', e: '#ff4455', d: '#3b3f47' };
export const BUFFALO_FRAMES = [
  [
    ...Array(3).fill('................'),
    '..........hh..hh',
    '..........khkkh.',
    '.........kIIIIk.',
    '..kkkkkkkIIeIIk.',
    '.kIIiiIiiiIIIIk.',
    'kIiiiiiiiiiiidk.',
    'kiIiiIiiiIiiik..',
    'kiiiiiiiiiiiik..',
    '.kiiiiiiiiiiik..',
    '.kdk.kdk.kdk.kdk',
    '.kdk.kdk.kdk.kdk',
    '.kk..kk..kk..kk.',
    '................',
  ],
  [
    ...Array(3).fill('................'),
    '..........hh..hh',
    '..........khkkh.',
    '.........kIIIIk.',
    '..kkkkkkkIIeIIk.',
    '.kIIiiIiiiIIIIk.',
    'kIiiiiiiiiiiidk.',
    'kiIiiIiiiIiiik..',
    'kiiiiiiiiiiiik..',
    '.kiiiiiiiiiiik..',
    'kdk..kdk.kdk..kd',
    'kdk..kdk.kdk..kd',
    'kk....kk.kk...kk',
    '................',
  ],
];

// รถพ่วงข้างแต่งซิ่ง: neon sidecar motorbike with a festival speaker stack.
// Drawn at triple size as the world boss.
export const SIDECAR_PALETTE = { r: '#e0453a', R: '#9c2b24', s: '#3b3f47', S: '#6e7682', n: '#6dff8a', p: '#f07ab0', w: '#e8e8e8', y: '#ffd23f' };
export const SIDECAR_FRAMES = [
  [
    '..kkkk..........',
    '.kSSSSk.........',
    '.kSsSsk....kk...',
    '.kSSSSk...kyyk..',
    '.kSsSsk..kkrrk..',
    '.kSSSSkkkrrrrrk.',
    'kkkkkkkrrrrrrrrk',
    'krrrrrrrRRRRRRrk',
    'krnnnnnrrrrrrrrk',
    'kRRRRRRRRRRRRRRk',
    '.kkkkkkkkkkkkkk.',
    '.kssk....kssk...',
    'kswwsk..kswwsk..',
    'kswwsk..kswwsk..',
    '.kssk....kssk...',
    '..kk......kk....',
  ],
  [
    '..kkkk..........',
    '.kSSSSk.........',
    '.kSsSsk....kk...',
    '.kSSSSk...kyyk..',
    '.kSsSsk..kkrrk..',
    '.kSSSSkkkrrrrrk.',
    'kkkkkkkrrrrrrrrk',
    'krrrrrrrRRRRRRrk',
    'krpppppprrrrrrrk',
    'kRRRRRRRRRRRRRRk',
    '.kkkkkkkkkkkkkk.',
    '.kssk....kssk...',
    'kswsk...kswsk...',
    'ksswk...ksswk...',
    '.kssk....kssk...',
    '..kk......kk....',
  ],
];

// Every monster type's sprite frames, palette, head height (pixels above feet)
// and optional display scale.
export const MONSTER_ART = {
  rat: { frames: RAT_FRAMES, palette: RAT_PALETTE, headY: 11 },
  pigeon: { frames: PIGEON_FRAMES, palette: PIGEON_PALETTE, headY: 9 },
  dog: { frames: DOG_FRAMES, palette: DOG_PALETTE, headY: 12 },
  hyacinth: { frames: HYACINTH_FRAMES, palette: HYACINTH_PALETTE, headY: 13 },
  monitor: { frames: MONITOR_FRAMES, palette: MONITOR_PALETTE, headY: 8 },
  flood: { frames: FLOOD_FRAMES, palette: FLOOD_PALETTE, headY: 13, scale: 2 },
  scarecrow: { frames: SCARECROW_FRAMES, palette: SCARECROW_PALETTE, headY: 16 },
  wasp: { frames: WASP_FRAMES, palette: WASP_PALETTE, headY: 12 },
  buffalo: { frames: BUFFALO_FRAMES, palette: BUFFALO_PALETTE, headY: 13 },
  sidecar: { frames: SIDECAR_FRAMES, palette: SIDECAR_PALETTE, headY: 16, scale: 3 },
};

export const DROP_ART = {
  coin: {
    palette: { y: '#ffd23f', Y: '#c99a1a', w: '#fff8d0' },
    rows: [
      '..kkkk..',
      '.kyyyyk.',
      'kyywyyyk',
      'kywyyyYk',
      'kyyyyyYk',
      'kyyyyYYk',
      '.kyYYYk.',
      '..kkkk..',
    ],
  },
  feather: {
    palette: { g: '#aab2bd', G: '#6e7682' },
    rows: [
      '......kk',
      '.....kgk',
      '....kgGk',
      '...kgGk.',
      '..kgGk..',
      '.kgGk...',
      '.kkk....',
      'k.......',
    ],
  },
  bone: {
    palette: { w: '#f4efe0', W: '#cfc6ad' },
    rows: [
      '.kk..kk.',
      'kwwkkwwk',
      'kwwwwwwk',
      '.kwWWWk.',
      '.kwWWWk.',
      'kwwwwwwk',
      'kwwkkwwk',
      '.kk..kk.',
    ],
  },
  hyacinth: {
    palette: { g: '#3f8a36', G: '#6fbf4a', v: '#9b6bd6' },
    rows: [
      '...kvk..',
      '..kvvk..',
      '...kGk..',
      '..kGgk..',
      '.kGgk...',
      '.kgGk...',
      'kgGk....',
      'kkk.....',
    ],
  },
  scale: {
    palette: { d: '#5a5840', y: '#e3c16f', Y: '#fff0a0' },
    rows: [
      '..kkkk..',
      '.kyYyyk.',
      'kyYdyyyk',
      'kyddyydk',
      'kyyyddyk',
      '.kyyyyk.',
      '..kyyk..',
      '...kk...',
    ],
  },
  flood_badge: {
    palette: { y: '#ffd23f', Y: '#c99a1a', r: '#d94f4f', b: '#3b82c4' },
    rows: [
      '.rrbbrr.',
      '..rbbr..',
      '..kkkk..',
      '.kyyyyk.',
      'kyyYYyyk',
      'kyYyyYyk',
      '.kyyyyk.',
      '..kkkk..',
    ],
  },
  straw: {
    palette: { y: '#e3c16f', Y: '#b8923f', r: '#d94f4f' },
    rows: [
      '.y..y..y',
      '.yY.yY.y',
      '..yY.yYy',
      '...yyYY.',
      '...rrrr.',
      '...yYyy.',
      '..yY.yY.',
      '.y...y.y',
    ],
  },
  stinger: {
    palette: { y: '#ffd23f', b: '#1f1a24', r: '#ff4455' },
    rows: [
      '......kk',
      '.....kyk',
      '....kyyk',
      '...kbyk.',
      '..kyyk..',
      '.kbyk...',
      'krk.....',
      'r.......',
    ],
  },
  horn: {
    palette: { h: '#e8e0c8', H: '#b8ad90' },
    rows: [
      'kk......',
      'khk.....',
      'khHk....',
      '.khHk...',
      '..khHk..',
      '...khhkk',
      '....khhk',
      '.....kk.',
    ],
  },
  speaker: {
    palette: { s: '#3b3f47', S: '#6e7682', n: '#6dff8a' },
    rows: [
      '.kkkkkk.',
      'kSSSSSSk',
      'kSksskSk',
      'kSsnnsSk',
      'kSsnnsSk',
      'kSksskSk',
      'kSSSSSSk',
      '.kkkkkk.',
    ],
  },
  junk: {
    palette: { a: '#c0c4c8', A: '#8a8f98', r: '#d04a3a', w: '#ffffff' },
    rows: [
      '..kkkk..',
      '.kaaaak.',
      '.kAAAAk.',
      '.krrrrk.',
      '.krwrrk.',
      '.krrrrk.',
      '.kaaaak.',
      '..kkkk..',
    ],
  },
};

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
}

export function characterPalette(look) {
  return {
    k: OUTLINE,
    h: look.hair,
    s: look.skin,
    e: OUTLINE,
    r: shade(look.skin, 0.75),
    c: look.shirt,
    C: shade(look.shirt, 0.7),
    p: '#3a3f5c',
    b: '#2a2a2a',
  };
}

// Draw ASCII rows onto a 2D context.
export function paint(ctx, rows, palette, ox = 0, oy = 0) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = ch === 'k' ? palette.k ?? OUTLINE : palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}
