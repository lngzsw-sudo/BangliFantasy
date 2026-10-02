import { TILE } from '/shared/constants.js';
import {
  BODY_OVERLAYS, CHAR_FRAMES, DROP, DROP_ART, HEAD_BOB, MONSTER_ART, OUTLINE, PET_ART, PROP_ART, SPRITE, WEAPON_ART,
  characterPalette, paint, shade,
} from './art.js';
import { makeDecorTextures } from './decor.js';

// Every texture is generated at startup from code — no image files to load.
// Tiles are TILE (32) art pixels square; sprites come from art.js.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function speckle(ctx, rnd, colors, count, x0 = 0, y0 = 0, w = TILE, h = TILE) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.fillRect(x0 + Math.floor(rnd() * w), y0 + Math.floor(rnd() * h), 1, 1);
  }
}

const THEMES = {
  market: { wall: '#7a4b3a', mortar: '#5a3328', floor: '#d8c9a8', floorLine: '#b9a784' },
  alley: { wall: '#5a5d66', mortar: '#40424a', floor: '#a3a7ab', floorLine: '#83878c' },
  canal: { wall: '#5b4a3a', mortar: '#46382b', floor: '#c9b48a', floorLine: '#a8936a' },
  suburb: { wall: '#4a4f57', mortar: '#3a3e45', floor: '#b8a27a', floorLine: '#9a855f' },
  // Night at the temple fair: dark red walls, lamp-lit stone.
  fair: { wall: '#6a2a2a', mortar: '#4a1c1c', floor: '#8a7a74', floorLine: '#6a5c58' },
};

const BULBS = ['#ffe066', '#ff6b8b', '#6dff8a', '#7cc7ff', '#ffb020'];
// Water glint lengths; each animation frame shifts which glint is long.
const GLINT = [6, 4, 2];

// Draw one 32x32 tile variant. `v` picks a noise seed so floors don't look tiled;
// `f` is the animation frame for water, whose glints pulse.
function drawTile(ctx, ch, theme, v, f = 0) {
  const t = THEMES[theme];
  const rnd = seeded(ch.charCodeAt(0) * 131 + v * 977 + 7);
  const S = TILE;
  const fill = (c, x = 0, y = 0, w = S, h = S) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  // A brick/paver with a lit top edge and a shaded bottom edge.
  const block = (x, y, w, h, base) => {
    fill(base, x, y, w, h);
    fill(shade(base, 1.1), x, y, w, 1);
    fill(shade(base, 0.86), x, y + h - 1, w, 1);
  };
  const tuft = (x, y, c, d) => {
    fill(c, x, y, 1, 2), fill(c, x + 2, y, 1, 2), fill(c, x + 1, y + 1, 1, 2);
    if (d) fill(d, x + 1, y + 3, 1, 1);
  };
  switch (ch) {
    case '.': {
      // Paving slabs in running bond.
      fill(t.floorLine);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 8 : 0;
        for (let x = -off; x < S; x += 16) {
          const tone = shade(t.floor, 0.97 + ((row * 3 + x + v * 5) % 4) * 0.02);
          block(Math.max(0, x + 1), row * 8 + 1, Math.min(15, x + 16 - Math.max(0, x + 1)), 7, tone);
        }
      }
      speckle(ctx, rnd, [shade(t.floor, 1.07), shade(t.floor, 0.9)], 18);
      break;
    }
    case ',':
      fill('#6fae4b');
      speckle(ctx, rnd, ['#63a243', '#7bba55'], 60);
      for (let i = 0; i < 7; i++) tuft(Math.floor(rnd() * 28) + 1, Math.floor(rnd() * 27) + 1, '#8fcf65', '#4f8a33');
      for (let i = 0; i < 4; i++) tuft(Math.floor(rnd() * 28) + 1, Math.floor(rnd() * 27) + 1, '#4f8a33');
      if (v === 2) {
        fill('#f07ab0', 8, 10, 2, 2), fill('#ffe066', 9, 10, 1, 1);
        fill('#fff3d6', 22, 21, 2, 2), fill('#ffe066', 22, 21, 1, 1);
      }
      break;
    case '=':
      fill(t.floor);
      speckle(ctx, rnd, [shade(t.floor, 0.9), shade(t.floor, 1.08)], 70);
      speckle(ctx, rnd, ['#7e8286', shade(t.floor, 0.75)], 10);
      if (v === 1) {
        // a hairline crack
        ctx.fillStyle = shade(t.floor, 0.68);
        for (let i = 0; i < 12; i++) ctx.fillRect(6 + i, 8 + Math.round(Math.sin(i * 0.9) * 2) + (i >> 2), 1, 1);
      }
      if (v === 2) fill(shade(t.floor, 0.82), 20, 18, 3, 2), fill(shade(t.floor, 1.12), 20, 18, 2, 1);
      break;
    case '#':
      fill(t.mortar);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 8 : 0;
        for (let x = -off; x < S; x += 16) {
          const tone = shade(t.wall, 0.94 + ((row * 5 + x + v * 3) % 5) * 0.03);
          block(Math.max(0, x), row * 8, Math.min(15, x + 15 - Math.max(0, x)), 7, tone);
        }
      }
      speckle(ctx, rnd, [shade(t.wall, 1.18), shade(t.wall, 0.8)], 10);
      break;
    case 'A': {
      // Striped market-stall awning, lighter at the top, scalloped edge, wooden beam.
      const cols = v % 2 ? ['#d94f4f', '#fff3d6'] : ['#3b82c4', '#fff3d6'];
      for (let x = 0; x < S; x += 8) {
        const c = cols[(x / 8) % 2];
        fill(shade(c, 1.06), x, 0, 8, 8);
        fill(c, x, 8, 8, 12);
        fill(shade(c, 0.88), x, 20, 8, 4);
        // scallop
        fill(c, x + 1, 24, 6, 1), fill(c, x + 2, 25, 4, 1);
        fill(shade(c, 0.6), x + 1, 25, 1, 1), fill(shade(c, 0.6), x + 6, 25, 1, 1), fill(shade(c, 0.6), x + 2, 26, 4, 1);
      }
      fill(shade(cols[0], 0.55), 0, 23, S, 1);
      fill('#3b2a20', 0, 27, S, 5);
      fill('#5a3d2a', 0, 27, S, 1);
      break;
    }
    case 'T':
      // Wooden table seen from above, planks and legs.
      fill(t.floor);
      fill(OUTLINE, 2, 4, 28, 22);
      fill('#8b5a33', 3, 5, 26, 19);
      for (let y = 5; y < 24; y += 5) fill('#6b4226', 3, y + 4, 26, 1);
      fill('#a8703f', 4, 6, 10, 1), fill('#a8703f', 16, 11, 8, 1), fill('#a8703f', 6, 16, 12, 1);
      fill('#4a2c18', 4, 26, 3, 5), fill('#4a2c18', 25, 26, 3, 5);
      fill('#6b4226', 3, 24, 26, 2);
      break;
    case 't':
      // Round shrub: outlined blob with leaf clusters and a highlight.
      fill('#6fae4b');
      speckle(ctx, rnd, ['#63a243'], 30);
      fill('rgba(0,0,0,0.18)', 6, 26, 22, 4);
      fill(OUTLINE, 7, 2, 18, 26), fill(OUTLINE, 4, 5, 24, 20), fill(OUTLINE, 5, 3, 22, 24), fill(OUTLINE, 3, 8, 26, 14);
      fill('#2f6b2a', 8, 3, 16, 24), fill('#2f6b2a', 5, 6, 22, 18), fill('#2f6b2a', 6, 4, 20, 22), fill('#2f6b2a', 4, 9, 24, 12);
      fill('#3f8a36', 7, 5, 16, 16), fill('#3f8a36', 6, 8, 18, 10);
      fill('#5cae4a', 9, 6, 7, 5), fill('#5cae4a', 8, 8, 4, 5);
      fill('#86cf6a', 10, 7, 3, 2);
      speckle(ctx, rnd, ['#56a84a', '#2a5e25', '#4a9a3e'], 30, 6, 6, 20, 18);
      break;
    case 'B':
      // ลังโฟม: white styrofoam box with a lid and packing tape.
      fill(t.floor);
      fill('rgba(0,0,0,0.18)', 4, 27, 26, 3);
      fill(OUTLINE, 2, 6, 28, 22);
      fill('#dfe3e7', 3, 11, 26, 16);
      fill('#f4f6f8', 3, 7, 26, 5);
      fill('#c4c9ce', 3, 11, 26, 1);
      fill('#b9d8ee', 14, 7, 4, 20);
      fill('#c2c7cc', 3, 25, 26, 2);
      speckle(ctx, rnd, ['#cfd4d9'], 12, 4, 13, 24, 12);
      break;
    case 'K':
      // รถเข็น: street food cart with a glass case, red trim and wheels.
      fill(t.floor);
      fill('rgba(0,0,0,0.18)', 2, 28, 28, 3);
      fill(OUTLINE, 1, 4, 30, 21);
      fill('#b8bfc6', 2, 13, 28, 11);
      fill('#dfe7ee', 3, 5, 26, 8);
      fill('#ffffff', 5, 6, 6, 2), fill('#a9c9e0', 3, 11, 26, 1);
      fill('#e0453a', 2, 13, 28, 3), fill('#ff8a7a', 2, 13, 28, 1);
      fill('#8d949e', 2, 22, 28, 2);
      fill(OUTLINE, 4, 23, 7, 7), fill(OUTLINE, 21, 23, 7, 7);
      fill('#6e7682', 5, 24, 5, 5), fill('#6e7682', 22, 24, 5, 5);
      fill('#c9ced6', 7, 26, 1, 1), fill('#c9ced6', 24, 26, 1, 1);
      break;
    case 'N':
      // กระดานรับงาน: wooden notice board with pinned papers.
      fill(t.floor);
      fill('#4a2c18', 4, 22, 4, 10), fill('#4a2c18', 24, 22, 4, 10);
      fill(OUTLINE, 0, 1, 32, 23);
      fill('#8b5a33', 1, 2, 30, 21);
      fill('#a8703f', 1, 2, 30, 1), fill('#6b4226', 1, 22, 30, 1);
      fill('#fff3d6', 3 + (v % 2), 5, 9, 9), fill('#ffe066', 15, 4, 11, 7), fill('#fff3d6', 9, 14, 11, 7);
      ctx.fillStyle = '#b9a784';
      for (const [x, y, w] of [[5 + (v % 2), 8, 5], [5 + (v % 2), 10, 4], [17, 7, 7], [11, 17, 7], [11, 19, 5]]) ctx.fillRect(x, y, w, 1);
      fill('#d94f4f', 7 + (v % 2), 5, 1, 1), fill('#3b82c4', 20, 4, 1, 1), fill('#d94f4f', 14, 14, 1, 1);
      break;
    case 'W':
      // สะพานไม้: planks over water, with gaps and nails.
      fill('#2e5c78');
      for (let y = 0; y < S; y += 8) {
        const off = ((y / 8 + v) % 3) * 5;
        fill('#8b5a33', 0, y, S, 7);
        fill('#a8703f', 0, y, S, 1);
        fill('#6b4226', 0, y + 6, S, 1);
        fill('#6b4226', (off + 13) % S, y + 1, 1, 5);
        fill('#3b2a20', (off + 3) % S, y + 3, 1, 1), fill('#3b2a20', (off + 23) % S, y + 3, 1, 1);
        fill('#9a6a3c', (off + 6) % 26, y + 2, 5, 1);
      }
      break;
    case 's':
      // น้ำตื้น: lighter, greener water you can wade through.
      fill('#5f9ea0');
      speckle(ctx, rnd, ['#56918f', '#6aabab'], 40);
      ctx.fillStyle = '#8cc6c4';
      for (let i = 0; i < 4; i++) {
        const len = GLINT[(i + f) % GLINT.length];
        ctx.fillRect(2 + ((i * 9 + v * 5) % 24) + ((6 - len) >> 1), 3 + i * 8, len, 1);
      }
      ctx.fillStyle = '#4f8e90';
      for (let i = 0; i < 4; i++) ctx.fillRect(4 + ((i * 11 + v * 7) % 24) + f, 5 + i * 8, 5, 1);
      if (v === 1) fill('#6a9a3e', 20, 20, 5, 3), fill('#7ab04a', 21, 20, 3, 1), fill('#5f9ea0', 22, 21, 1, 2);
      break;
    case 'H':
      // บ้านริมน้ำ: wooden plank wall, tin roof edge, a window.
      fill('#7a5230');
      for (let x = 0; x < S; x += 6) fill('#5e3e22', x, 0, 1, S), fill('#8a6038', x + 1, 0, 1, S);
      speckle(ctx, rnd, ['#6a4526'], 14);
      fill('#9aa3ad', 0, 0, S, 6);
      for (let x = 0; x < S; x += 4) fill('#c9ced6', x, 0, 1, 5);
      fill('#6e7682', 0, 5, S, 2);
      if (v !== 1) {
        fill(OUTLINE, 9, 11, 14, 13);
        fill('#ffe8a3', 10, 12, 12, 11);
        fill('#fff6d0', 11, 13, 4, 3);
        fill('#7a5230', 15, 12, 2, 11), fill('#7a5230', 10, 17, 12, 1);
        fill('#5e3e22', 8, 24, 16, 2);
      }
      break;
    case 'G':
      // โกดังสังกะสี: corrugated metal with rust streaks.
      fill('#7a8088');
      for (let x = 0; x < S; x += 4) fill('#8d949e', x, 0, 1, S), fill('#5f656d', x + 2, 0, 1, S);
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(rnd() * 28);
        const h = 6 + Math.floor(rnd() * 14);
        fill('#8b4513', x, 0, 1, h), fill('#a0522d', x + 1, 0, 1, Math.floor(h * 0.6));
      }
      speckle(ctx, rnd, ['#a0522d', '#9aa3ad'], 16);
      fill('#5f656d', 0, 15, S, 1), fill('#9aa3ad', 0, 16, S, 1);
      if (v === 2) fill('#5f656d', 6, 4, 20, 1), fill('#9aa3ad', 6, 5, 20, 1); // a roof seam; doors come from the edge overlay
      break;
    case 'r':
      // นาข้าว: rows of rice in muddy water.
      fill('#7aa45a');
      speckle(ctx, rnd, ['#6d9a4c', '#86b066'], 40);
      for (let y = 2; y < S; y += 8) {
        for (let x = ((y >> 3) + v) % 2 ? 2 : 6; x < S; x += 8) {
          fill('#4f7a2e', x, y + 2, 1, 5), fill('#9ccf5a', x + 1, y, 1, 7), fill('#6fae3e', x + 2, y + 1, 1, 6), fill('#b8e070', x + 1, y, 1, 2);
        }
      }
      break;
    case '~':
      fill('#3a6f8f');
      speckle(ctx, rnd, ['#33658a', '#4279a0'], 50);
      ctx.fillStyle = '#6aa3c4';
      for (let i = 0; i < 4; i++) {
        const len = GLINT[(i + f) % GLINT.length];
        const x = 2 + ((i * 11 + v * 7) % 22) + ((6 - len) >> 1);
        ctx.fillRect(x, 4 + i * 8, len, 1);
        if (len > 3) ctx.fillRect(x + 1, 3 + i * 8, len - 3, 1);
      }
      ctx.fillStyle = '#2e5c78';
      for (let i = 0; i < 3; i++) ctx.fillRect(6 + ((i * 13 + v * 5) % 20) + f, 8 + i * 9, 7, 1);
      break;
    case 'F':
      // ซุ้มงานวัด: string of coloured bulbs over a shelf of prizes.
      fill('#2c2226');
      fill('#3a2a30', 0, 6, S, 26);
      for (let x = 1; x < S; x += 4) {
        const c = BULBS[((x >> 2) + v) % BULBS.length];
        fill('#1f1a24', x - 1, 1, 4, 1);
        fill(shade(c, 0.45), x - 1, 2, 3, 3);
        fill(c, x, 2, 1, 2);
      }
      for (const y of [16, 29]) {
        fill('#8b5a33', 0, y, S, 2);
        fill('#6b4226', 0, y + 2, S, 1);
      }
      for (let k = 0; k < 4; k++) {
        const c = BULBS[(k * 2 + v) % BULBS.length];
        const x = 2 + k * 8;
        // a doll on the top shelf, a bottle on the bottom one
        fill(OUTLINE, x, 8, 5, 8), fill(c, x + 1, 9, 3, 7), fill('#fff3d6', x + 1, 9, 3, 2), fill(OUTLINE, x + 1, 10, 1, 1), fill(OUTLINE, x + 3, 10, 1, 1);
        const b = BULBS[(k * 3 + v + 1) % BULBS.length];
        fill(OUTLINE, x + 1, 20, 3, 9), fill(shade(b, 0.8), x + 2, 23, 1, 6), fill(b, x + 2, 21, 1, 2);
      }
      break;
    case 'C':
      // เคาน์เตอร์ซุ้ม: wooden counter top over a red skirt with white stripes.
      fill('#2c2226');
      fill('#a8703f', 0, 2, S, 4);
      fill('#c88a50', 0, 2, S, 1);
      fill('#6b4226', 0, 6, S, 1);
      fill('#d94f4f', 0, 7, S, 21);
      for (let x = 0; x < S; x += 8) fill('#fff3d6', x + 2, 7, 4, 21), fill('#e8dcc0', x + 5, 7, 1, 21);
      fill('#b0342b', 0, 26, S, 2);
      fill('rgba(0,0,0,0.3)', 0, 28, S, 4);
      if (v === 1) fill(OUTLINE, 12, 0, 7, 3), fill('#ffe066', 13, 0, 5, 2); // a tin of tickets
      break;
    case 'R':
      // หลังคาศาลเจ้า: green-glazed tiles above a gold eave.
      fill('#205a36');
      for (let y = 0; y < 22; y += 5) {
        for (let x = (y / 5) % 2 ? 2 : 0; x < S; x += 4) fill('#3f9a5e', x, y, 3, 4), fill('#5fc07e', x, y, 1, 1);
      }
      fill('#ffd23f', 0, 22, S, 3);
      fill('#c99a1a', 0, 25, S, 1);
      fill('#8a2323', 0, 26, S, 6);
      for (let x = 2; x < S; x += 8) fill('#ffd23f', x, 27, 4, 2);
      break;
    case 'S':
      // ผนังศาลเจ้า: red wall and pillars; a door, a lantern or a gold plaque.
      fill('#8a2323');
      speckle(ctx, rnd, ['#7a1e1e', '#962a2a'], 30);
      fill('#6a1a1a', 1, 0, 4, S), fill('#6a1a1a', 27, 0, 4, S);
      fill('#a83232', 2, 0, 1, S), fill('#a83232', 28, 0, 1, S);
      if (v === 0) fill(OUTLINE, 10, 6, 12, 26), fill('#4a1212', 11, 7, 10, 25), fill('#ffd23f', 15, 18, 2, 2), fill('#6a1a1a', 16, 7, 1, 25);
      if (v === 1) {
        fill('#4a1212', 15, 0, 2, 5);
        fill(OUTLINE, 10, 5, 12, 14), fill('#e0453a', 11, 6, 10, 12), fill('#ff8a7a', 12, 7, 2, 9);
        fill('#ffd23f', 11, 5, 10, 1), fill('#ffd23f', 11, 18, 10, 1), fill('#ffd23f', 15, 19, 2, 4);
      }
      if (v === 2) fill(OUTLINE, 9, 8, 14, 12), fill('#ffd23f', 10, 9, 12, 10), fill('#c99a1a', 12, 11, 8, 1), fill('#c99a1a', 12, 14, 8, 1), fill('#c99a1a', 12, 17, 8, 1);
      break;
    case 'J':
      // โต๊ะธูป: red altar table with a gold incense pot and smoke.
      fill(t.floor);
      speckle(ctx, rnd, [shade(t.floor, 0.9), shade(t.floor, 1.08)], 30);
      fill(OUTLINE, 1, 10, 30, 16);
      fill('#b0342b', 2, 11, 28, 14);
      fill('#ffd23f', 2, 11, 28, 2);
      fill('#7a2020', 2, 22, 28, 3);
      fill('#4a1212', 4, 26, 3, 5), fill('#4a1212', 25, 26, 3, 5);
      if (v !== 1) {
        fill(OUTLINE, 11, 4, 10, 8), fill('#e0a040', 12, 5, 8, 6), fill('#ffd23f', 12, 5, 8, 1);
        for (const x of [13, 16, 18]) fill('#8a3a2a', x, 0, 1, 5), fill('#ff6b3b', x, 0, 1, 1);
        fill('rgba(255,255,255,0.35)', 14, 0, 1, 2), fill('rgba(255,255,255,0.3)', 17, 1, 1, 2);
      } else {
        // offerings: fruit and flowers
        fill('#ff8a3a', 6, 7, 5, 4), fill('#ffd23f', 13, 6, 6, 5), fill('#6fbf4a', 21, 7, 5, 4);
        fill(OUTLINE, 6, 11, 20, 1);
      }
      break;
    case 'l':
      // เสาโคมไฟ: wooden pole with a glowing red lantern.
      fill(t.floor);
      speckle(ctx, rnd, [shade(t.floor, 0.9), shade(t.floor, 1.08)], 30);
      fill('rgba(255,120,80,0.18)', 4, 0, 24, 20);
      fill('rgba(255,120,80,0.14)', 8, 20, 16, 8);
      fill('rgba(0,0,0,0.25)', 11, 29, 10, 3);
      fill('#4a2c18', 15, 12, 3, 19);
      fill(OUTLINE, 9, 2, 14, 12);
      fill('#e0453a', 10, 3, 12, 10);
      fill('#ff8a7a', 11, 4, 3, 7);
      fill('#ffe066', 14, 6, 4, 4);
      fill('#ffd23f', 10, 2, 12, 1), fill('#ffd23f', 10, 13, 12, 1);
      break;
    case 'D':
      // เวทีงานวัด: bright stage planks with a neon edge.
      fill('#9a6a3c');
      for (let y = 0; y < S; y += 8) {
        fill('#b88048', 0, y, S, 1);
        fill('#7a5230', 0, y + 7, S, 1);
        fill('#7a5230', ((y / 8) * 11 + v * 5) % S, y + 1, 1, 6);
      }
      speckle(ctx, rnd, ['#fff3d6', '#ffe066'], 4);
      if (v === 2) fill('#ff6b8b', 0, 0, S, 1), fill('#6dff8a', 0, 1, S, 1);
      break;
    case 'Y': {
      // ห้องแถวไม้ชั้นบน: plank wall under a tin eave, fretwork vents and teal shutters.
      fill('#8b5a33');
      for (let y = 6; y < S; y += 4) fill('#6b4226', 0, y + 3, S, 1), fill('#9a6a3c', 0, y, S, 1);
      fill('#5f656d', 0, 0, S, 5);
      for (let x = 0; x < S; x += 3) fill('#9aa3ad', x, 0, 1, 4);
      fill('#3b3f47', 0, 5, S, 1);
      for (let x = 2; x < S; x += 4) fill('#fff3d6', x, 7, 2, 2), fill('#6b4226', x + 1, 8, 1, 1); // ช่องลมฉลุ
      if (v !== 2) {
        fill(OUTLINE, 9, 12, 14, 15);
        fill('#2a1c14', 10, 13, 12, 13);
        fill('#ffe8a3', 11, 14, 4, 5);
        // folded-back shutters either side
        fill(OUTLINE, 4, 12, 5, 15), fill('#3f8a7a', 5, 13, 3, 13), fill('#5fb0a0', 5, 13, 1, 13);
        fill(OUTLINE, 23, 12, 5, 15), fill('#3f8a7a', 24, 13, 3, 13), fill('#2f6a5e', 26, 13, 1, 13);
        fill('#5e3e22', 8, 27, 16, 2);
        if (v === 1) fill('#f07ab0', 11, 20, 4, 6), fill('#3b82c4', 16, 21, 4, 5); // washing on the sill
      } else {
        fill(OUTLINE, 6, 12, 20, 14), fill('#f4f1c0', 7, 13, 18, 12);
        fill('#d94f4f', 9, 15, 6, 2), fill('#d94f4f', 16, 15, 7, 2), fill('#3b82c4', 10, 19, 12, 2);
      }
      break;
    }
    case 'Q': {
      // บานเฟี้ยม: folding plank doors of a wooden shophouse, raised on a step.
      fill('#4a2c18');
      for (let x = 0; x < S; x += 4) {
        fill(x % 8 ? '#a8703f' : '#9a6436', x, 0, 3, 26);
        fill('#c88a50', x, 0, 1, 26);
      }
      fill('#6b4226', 0, 8, S, 1), fill('#6b4226', 0, 18, S, 1);
      fill('#c9c2b4', 0, 26, S, 6), fill('#e6e0d4', 0, 26, S, 1), fill('#9a948a', 0, 31, S, 1);
      if (v === 0) {
        // red paper couplets for good luck
        fill('#d94f4f', 5, 2, 4, 14), fill('#d94f4f', 23, 2, 4, 14);
        for (let y = 4; y < 15; y += 3) fill('#ffd23f', 6, y, 2, 1), fill('#ffd23f', 24, y, 2, 1);
        fill('#d94f4f', 11, 1, 10, 4), fill('#ffd23f', 13, 2, 6, 2);
      } else if (v === 1) {
        // two leaves folded open: a dim shop with jars on a shelf
        fill('#2a1c14', 8, 0, 16, 26);
        fill('#6b4226', 8, 12, 16, 2), fill('#6b4226', 8, 22, 16, 2);
        for (const x of [10, 15, 20]) fill('#c9ced6', x, 7, 3, 5), fill('#e0453a', x, 6, 3, 1), fill('#ffd23f', x - 1, 17, 4, 5);
      } else {
        // a hanging vertical shop sign
        fill(OUTLINE, 12, 1, 9, 22), fill('#f4f1c0', 13, 2, 7, 20);
        for (let y = 4; y < 20; y += 4) fill('#d94f4f', 14, y, 5, 2);
      }
      break;
    }
    case 'P':
      // Portal: glowing violet whirl.
      fill('#6a3fa6');
      fill('#8e5cc7', 2, 2, 28, 28);
      fill('#b48ae6', 6, 6, 20, 20);
      fill('#d9c2ff', 10, 10, 12, 12);
      fill('#f3eaff', 13, 13, 6, 6);
      ctx.fillStyle = '#f3eaff';
      for (let i = 0; i < 6; i++) ctx.fillRect(4 + ((i * 9 + v * 4) % 24), 3 + ((i * 7) % 26), 1, 1);
      break;
    default:
      fill('#f0f');
  }
}

export const TILE_VARIANTS = 3;
export const WATER_FRAMES = 3;

export function tileKey(ch, theme, v, f = 0) {
  return `tile_${theme}_${ch.charCodeAt(0)}_${v}${f ? `_f${f}` : ''}`;
}

export function makeTextures(scene) {
  const tex = scene.textures;
  for (const theme of Object.keys(THEMES)) {
    for (const ch of '.,=#ATtBKN~PWsHGrFCRSJlDYQ') {
      for (let v = 0; v < TILE_VARIANTS; v++) {
        for (let f = 0; f < ('~s'.includes(ch) ? WATER_FRAMES : 1); f++) {
          const c = canvas(TILE, TILE);
          drawTile(c.getContext('2d'), ch, theme, v, f);
          tex.addCanvas(tileKey(ch, theme, v, f), c);
        }
      }
    }
  }
  for (const [type, art] of Object.entries(MONSTER_ART)) {
    art.frames.forEach((rows, i) => {
      const c = canvas(SPRITE, SPRITE);
      paint(c.getContext('2d'), rows, art.palette);
      tex.addCanvas(`${type}_${i}`, c);
    });
  }
  for (const [id, art] of Object.entries(DROP_ART)) {
    const c = canvas(DROP, DROP);
    paint(c.getContext('2d'), art.rows, art.palette);
    tex.addCanvas(`drop_${id}`, c);
  }
  for (const [id, art] of Object.entries(WEAPON_ART)) {
    const c = canvas(art.rows[0].length, art.rows.length);
    paint(c.getContext('2d'), art.rows, art.palette);
    tex.addCanvas(`weapon_${id}`, c);
  }
  for (const [id, art] of Object.entries(PROP_ART)) {
    const c = canvas(art.rows[0].length, art.rows.length);
    paint(c.getContext('2d'), art.rows, art.palette);
    tex.addCanvas(`prop_${id}`, c);
  }
  for (const [id, art] of Object.entries(PET_ART)) {
    art.frames.forEach((rows, i) => {
      const c = canvas(rows[0].length, rows.length);
      paint(c.getContext('2d'), rows, art.palette);
      tex.addCanvas(`${id}_${i}`, c);
    });
  }
  // Soft oval shadow under feet.
  const sh = canvas(24, 8);
  const sctx = sh.getContext('2d');
  sctx.fillStyle = 'rgba(0,0,0,0.26)';
  sctx.fillRect(4, 0, 16, 8);
  sctx.fillRect(2, 1, 20, 6);
  sctx.fillRect(0, 2, 24, 4);
  tex.addCanvas('shadow', sh);
  makeDecorTextures(tex);
}

// Characters are generated per look/outfit combination on first use.
export function characterTexture(scene, look, body, head) {
  const key = `ch_${look.skin}${look.hair}${look.shirt}_${body ?? 'none'}_${head ?? 'none'}`;
  if (!scene.textures.exists(`${key}_0`)) {
    const palette = characterPalette(look);
    CHAR_FRAMES.forEach((rows, i) => {
      const c = canvas(SPRITE, SPRITE);
      const ctx = c.getContext('2d');
      paint(ctx, rows, palette);
      for (const id of [body, head]) {
        const overlay = BODY_OVERLAYS[id];
        if (!overlay) continue;
        // The walk frame's head bobs down, so hats follow it.
        const dy = overlay.followsHead && i === 1 ? HEAD_BOB : 0;
        paint(ctx, overlay.rows, overlay.palette, 0, dy);
      }
      scene.textures.addCanvas(`${key}_${i}`, c);
    });
  }
  return key;
}
