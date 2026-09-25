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
