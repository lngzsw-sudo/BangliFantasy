import { TILE } from '/shared/constants.js';
import {
  BODY_OVERLAYS, CHAR_FRAMES, DROP_ART, OUTLINE, RAT_FRAMES, RAT_PALETTE, WEAPON_ART,
  characterPalette, paint, shade,
} from './art.js';

// Every texture is generated at startup from code — no image files to load.

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

function speckle(ctx, rnd, colors, count) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1, 1);
  }
}

const THEMES = {
  market: { wall: '#7a4b3a', mortar: '#5a3328', floor: '#d8c9a8', floorLine: '#c4b28e' },
  alley: { wall: '#5a5d66', mortar: '#44464d', floor: '#a3a7ab', floorLine: '#8d9195' },
};

// Draw one tile variant. `v` picks a noise seed so floors don't look tiled.
function drawTile(ctx, ch, theme, v) {
  const t = THEMES[theme];
  const rnd = seeded(ch.charCodeAt(0) * 131 + v * 977 + 7);
  const S = TILE;
  const fill = (c, x = 0, y = 0, w = S, h = S) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  switch (ch) {
    case '.':
      fill(t.floor);
      ctx.fillStyle = t.floorLine;
      ctx.fillRect(0, 7, S, 1);
      ctx.fillRect(0, 15, S, 1);
      ctx.fillRect(v % 2 ? 4 : 11, 0, 1, 7);
      ctx.fillRect(v % 2 ? 12 : 3, 8, 1, 7);
      speckle(ctx, rnd, [shade(t.floor, 1.05), shade(t.floor, 0.92)], 10);
      break;
    case ',':
      fill('#6fae4b');
      speckle(ctx, rnd, ['#5c9a3c', '#86c35e', '#4f8a33'], 28);
      if (v === 2) fill('#f07ab0', 5, 6, 1, 1), fill('#ffe066', 11, 10, 1, 1);
      break;
    case '=':
      fill(t.floor);
      speckle(ctx, rnd, [shade(t.floor, 0.88), shade(t.floor, 1.08), '#7e8286'], 22);
      if (v === 1) {
        ctx.fillStyle = shade(t.floor, 0.7);
        for (let i = 0; i < 6; i++) ctx.fillRect(3 + i, 4 + ((i * 7) % 3), 1, 1);
      }
      break;
    case '#':
      fill(t.wall);
      ctx.fillStyle = t.mortar;
      for (let y = 3; y < S; y += 4) ctx.fillRect(0, y, S, 1);
      for (let y = 0; y < S; y += 4) ctx.fillRect(((y / 4) % 2) * 4 + 2, y, 1, 3), ctx.fillRect(((y / 4) % 2) * 4 + 10, y, 1, 3);
      speckle(ctx, rnd, [shade(t.wall, 1.15)], 6);
      break;
    case 'A': {
      // Striped market-stall awning with a scalloped edge.
      const cols = v % 2 ? ['#d94f4f', '#fff3d6'] : ['#3b82c4', '#fff3d6'];
      for (let x = 0; x < S; x += 4) fill(cols[(x / 4) % 2], x, 0, 4, 12);
      fill(shade(cols[0], 0.6), 0, 12, S, 1);
      fill('#3b2a20', 0, 13, S, 3);
      for (let x = 0; x < S; x += 4) fill(cols[(x / 4) % 2], x + 1, 12, 2, 2);
      break;
    }
    case 'T':
      fill(t.floor);
      fill('#6b4226', 1, 2, 14, 12);
      fill('#8b5a33', 2, 3, 12, 9);
      fill('#a8703f', 3, 4, 4, 1);
      fill('#4a2c18', 2, 14, 2, 2), fill('#4a2c18', 12, 14, 2, 2);
      break;
    case 't':
      // Round shrub: outlined blob with a highlight.
      fill('#6fae4b');
      fill(OUTLINE, 3, 1, 10, 14), fill(OUTLINE, 1, 3, 14, 10), fill(OUTLINE, 2, 2, 12, 12);
      fill('#2f6b2a', 3, 2, 10, 12), fill('#2f6b2a', 2, 3, 12, 10);
      fill('#3f8a36', 3, 3, 9, 8);
      fill('#5cae4a', 4, 4, 4, 3);
      speckle(ctx, rnd, ['#56a84a', '#2a5e25'], 8);
      break;
    case 'B':
      // ลังโฟม: white styrofoam box.
      fill(t.floor);
      fill(OUTLINE, 1, 3, 14, 12);
      fill('#eef0f2', 2, 4, 12, 10);
      fill('#d4d8dc', 2, 4, 12, 2);
      fill('#c2c7cc', 7, 6, 1, 8);
      break;
    case 'K':
      // รถเข็น: street cart with wheels.
      fill(t.floor);
      fill(OUTLINE, 0, 3, 16, 9);
      fill('#b8bfc6', 1, 4, 14, 7);
      fill('#e0453a', 1, 4, 14, 2);
      fill(OUTLINE, 2, 12, 4, 4), fill(OUTLINE, 10, 12, 4, 4);
      fill('#777', 3, 13, 2, 2), fill('#777', 11, 13, 2, 2);
      break;
    case '~':
      fill('#3a6f8f');
      ctx.fillStyle = '#5b93b3';
      for (let i = 0; i < 3; i++) ctx.fillRect(2 + ((i * 5 + v * 3) % 10), 3 + i * 5, 4, 1);
      speckle(ctx, rnd, ['#2e5c78', '#4a82a2'], 10);
      break;
    case 'P':
      fill('#8e5cc7', 0, 0, S, S);
      fill('#b48ae6', 2, 2, 12, 12);
      fill('#e3cffa', 5, 5, 6, 6);
      break;
    default:
      fill('#f0f');
  }
}

export const TILE_VARIANTS = 3;

export function tileKey(ch, theme, v) {
  return `tile_${theme}_${ch.charCodeAt(0)}_${v}`;
}

export function makeTextures(scene) {
  const tex = scene.textures;
  for (const theme of Object.keys(THEMES)) {
    for (const ch of '.,=#ATtBK~P') {
      for (let v = 0; v < TILE_VARIANTS; v++) {
        const c = canvas(TILE, TILE);
        drawTile(c.getContext('2d'), ch, theme, v);
        tex.addCanvas(tileKey(ch, theme, v), c);
      }
    }
  }
  RAT_FRAMES.forEach((rows, i) => {
    const c = canvas(16, 16);
    paint(c.getContext('2d'), rows, RAT_PALETTE);
    tex.addCanvas(`rat_${i}`, c);
  });
  for (const [id, art] of Object.entries(DROP_ART)) {
    const c = canvas(8, 8);
    paint(c.getContext('2d'), art.rows, art.palette);
    tex.addCanvas(`drop_${id}`, c);
  }
  for (const [id, art] of Object.entries(WEAPON_ART)) {
    const c = canvas(art.rows[0].length, art.rows.length);
    paint(c.getContext('2d'), art.rows, art.palette);
    tex.addCanvas(`weapon_${id}`, c);
  }
  // Soft shadow + selection ring.
  const sh = canvas(12, 4);
  const sctx = sh.getContext('2d');
  sctx.fillStyle = 'rgba(0,0,0,0.28)';
  sctx.fillRect(2, 0, 8, 4);
  sctx.fillRect(0, 1, 12, 2);
  tex.addCanvas('shadow', sh);
}

// Characters are generated per look/outfit combination on first use.
export function characterTexture(scene, look, body) {
  const key = `ch_${look.skin}${look.hair}${look.shirt}_${body ?? 'none'}`;
  if (!scene.textures.exists(`${key}_0`)) {
    const palette = characterPalette(look);
    CHAR_FRAMES.forEach((rows, i) => {
      const c = canvas(16, 16);
      const ctx = c.getContext('2d');
      paint(ctx, rows, palette);
      const overlay = BODY_OVERLAYS[body];
      if (overlay) paint(ctx, overlay.rows, overlay.palette);
      scene.textures.addCanvas(`${key}_${i}`, c);
    });
  }
  return key;
}
