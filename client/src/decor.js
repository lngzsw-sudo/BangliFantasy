import { OUTLINE as K, shade } from './art.js';

// Scenery sprites for room.decor (see DECOR in shared/maps.js), drawn from code
// like the tiles. Each piece stands on the bottom of its tile: `w`×`h` art px,
// `top` = how high above the ground overhead wires attach, `variants` = looks,
// `text` = the box (art px) where a decor entry's text is painted, in what size and colour.
// Also the ground overlays that soften tile edges (wall shadows, grass lips,
// river banks, rice-field bunds) and the soft glow used for night lighting.

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Small drawing kit over one canvas context.
function kit(ctx) {
  const R = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  // Filled ellipse, row by row so the edge stays pixel-crisp.
  const E = (cx, cy, rx, ry, c) => {
    ctx.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const w = ry ? Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)) : rx;
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };
  // Ellipse with a 1px outline.
  const O = (cx, cy, rx, ry, c) => {
    E(cx, cy, rx + 1, ry + 1, K);
    E(cx, cy, rx, ry, c);
  };
  const shadow = (cx, cy, rx, ry = 3) => E(cx, cy, rx, ry, 'rgba(0,0,0,0.22)');
  return { R, E, O, shadow, ctx };
}

const FLOWER_COLS = [
  ['#ff9f1a', '#ffd23f'], // ดาวเรือง
  ['#f07ab0', '#fff3d6'],
];

export const DECOR_ART = {
  // ศาลพระภูมิ: a little gilded house on a white pillar, red soda by its foot.
  spirit: {
    w: 32, h: 58, top: 50,
    draw({ R, shadow }) {
      shadow(16, 54, 12);
      R(7, 47, 18, 7, K), R(8, 48, 16, 5, '#c9c2b4'), R(8, 48, 16, 1, '#e6e0d4');
      R(13, 30, 6, 18, K), R(14, 30, 4, 17, '#f4efe4'), R(14, 30, 1, 17, '#ffffff'), R(17, 30, 1, 17, '#d8d0c0');
      // garlands hanging off the platform
      for (const [x, c] of [[6, '#ffffff'], [8, '#f07ab0'], [23, '#ffd23f'], [25, '#ffffff']]) R(x, 31, 1, 4, c), R(x, 35, 1, 1, '#e0453a');
      R(4, 27, 24, 4, K), R(5, 28, 22, 2, '#ffd23f'), R(5, 29, 22, 1, '#c99a1a');
      R(8, 17, 16, 11, K), R(9, 18, 14, 9, '#b0342b'), R(9, 18, 1, 9, '#d94f4f');
      R(13, 20, 6, 8, K), R(14, 21, 4, 7, '#ffd23f'), R(15, 22, 2, 6, '#7a2020');
      R(5, 14, 22, 4, K), R(6, 15, 20, 1, '#d94f4f'), R(6, 16, 20, 1, '#ffd23f');
      R(9, 9, 14, 6, K), R(10, 10, 12, 3, '#d94f4f'), R(10, 13, 12, 1, '#ffd23f');
      R(12, 4, 8, 6, K), R(13, 5, 6, 4, '#ffd23f'), R(14, 5, 1, 4, '#fff3a0');
      R(15, 0, 2, 5, '#ffd23f'), R(15, 0, 1, 2, '#fff3a0');
      // ช่อฟ้า finials curling up at the eaves
      R(3, 11, 2, 4, '#ffd23f'), R(2, 10, 1, 2, '#ffd23f'), R(27, 11, 2, 4, '#ffd23f'), R(29, 10, 1, 2, '#ffd23f');
      R(7, 7, 2, 3, '#ffd23f'), R(23, 7, 2, 3, '#ffd23f');
      // red soda with straws, and a tiny zebra
      for (const x of [3, 26]) R(x, 45, 4, 9, K), R(x + 1, 47, 2, 6, '#e0453a'), R(x + 1, 46, 2, 1, '#ffffff'), R(x + 2, 41, 1, 5, '#f4f1c0');
      R(20, 44, 4, 3, '#ffffff'), R(21, 44, 1, 3, K), R(23, 44, 1, 3, K), R(20, 47, 1, 1, K), R(23, 47, 1, 1, K);
    },
  },

  // ต้นโพธิ์ wrapped in three-coloured cloth.
  bodhi: {
    w: 104, h: 116, top: 0,
    draw({ R, E, shadow, ctx }) {
      const rnd = seeded(77);
      shadow(52, 110, 34, 5);
      // trunk and root flare
      E(52, 107, 15, 4, K), E(52, 107, 14, 3, '#5a3d2a');
      R(43, 62, 18, 46, K), R(44, 62, 16, 45, '#6b4a32'), R(45, 62, 3, 45, '#8a6646'), R(56, 62, 3, 45, '#4e3524');
      for (let y = 66; y < 104; y += 6) R(49 + (y % 4), y, 1, 3, '#4e3524');
      // branches into the crown
      for (let i = 0; i < 14; i++) R(44 - i, 62 - i, 4, 3, K), R(45 - i, 62 - i, 2, 2, '#6b4a32');
      for (let i = 0; i < 14; i++) R(56 + i, 62 - i, 4, 3, K), R(57 + i, 62 - i, 2, 2, '#6b4a32');
      // ผ้าสามสี
      R(42, 80, 20, 12, K);
      R(43, 81, 18, 3, '#f07ab0'), R(43, 84, 18, 3, '#ffd23f'), R(43, 87, 18, 4, '#6dbf4a');
      R(43, 81, 18, 1, '#ffc2d9'), R(43, 84, 18, 1, '#fff3a0'), R(43, 87, 18, 1, '#a8e08a');
      R(58, 91, 3, 7, K), R(59, 91, 1, 6, '#f07ab0'), R(55, 91, 3, 5, K), R(56, 91, 1, 4, '#ffd23f');
      // crown: outlined lumps, dark underside, lit top-left
      const lumps = [[52, 40, 42, 26], [22, 46, 20, 16], [82, 46, 20, 16], [52, 18, 30, 16], [34, 26, 18, 14], [70, 26, 18, 14], [52, 56, 32, 10]];
      for (const [x, y, rx, ry] of lumps) E(x, y, rx + 1, ry + 1, K);
      for (const [x, y, rx, ry] of lumps) E(x, y, rx, ry, '#2a5e25');
      for (const [x, y, rx, ry] of lumps) E(x - 2, y - 3, rx - 3, ry - 4, '#3f8a36');
      for (const [x, y, rx, ry] of lumps) E(x - 5, y - 6, Math.round(rx * 0.55), Math.round(ry * 0.5), '#56a84a');
      for (const [x, y] of [[40, 14], [24, 38], [56, 26], [74, 36], [36, 46]]) E(x, y, 4, 3, '#86cf6a');
      // leaf texture: little clusters of light and dark
      for (let i = 0; i < 260; i++) {
        const x = 12 + Math.floor(rnd() * 82);
        const y = 4 + Math.floor(rnd() * 62);
        const [r, g, , a] = ctx.getImageData(x, y, 1, 1).data;
        if (!a || r >= g) continue; // only on leaves: skip outline, bark, cloth and air
        R(x, y, 2, 1, rnd() < 0.5 ? '#2f6b2a' : '#6fbf55');
      }
    },
  },

  // Painted street lamp with a hanging lantern-bulb.
  lamp: {
    w: 22, h: 74, top: 64,
    draw({ R, shadow }) {
      shadow(10, 71, 7, 2);
      R(5, 66, 11, 7, K), R(6, 67, 9, 5, '#3e5547'), R(6, 67, 9, 1, '#5a7a66');
      R(8, 6, 5, 61, K), R(9, 6, 3, 61, '#4f6b5a'), R(9, 6, 1, 61, '#6f8f7a');
      R(8, 4, 12, 4, K), R(9, 5, 10, 2, '#4f6b5a');
      R(14, 8, 8, 7, K), R(15, 9, 6, 4, '#2f3a33'), R(15, 13, 6, 1, '#fff6c8'), R(16, 14, 4, 1, '#ffe066');
      R(8, 30, 5, 1, '#3e5547'), R(8, 50, 5, 1, '#3e5547');
    },
  },

  // Potted plant: a spiky palm or a pink bougainvillea.
  pot: {
    w: 24, h: 32, top: 0, variants: 2,
    draw({ R, E, shadow }, v) {
      shadow(12, 29, 9, 2);
      if (v === 0) {
        const leaves = [[12, 18, -1, -1, 12], [12, 18, 1, -1, 12], [12, 18, -1, -0.4, 10], [12, 18, 1, -0.4, 10], [12, 18, 0, -1, 14], [12, 18, -0.4, -1, 13], [12, 18, 0.4, -1, 13]];
        for (const [x0, y0, dx, dy, n] of leaves) {
          for (let i = 0; i < n; i++) R(Math.round(x0 + dx * i) - 1, Math.round(y0 + dy * i) - 1, 3, 3, K);
        }
        for (const [x0, y0, dx, dy, n] of leaves) {
          for (let i = 0; i < n; i++) R(Math.round(x0 + dx * i), Math.round(y0 + dy * i), 1 + (i < n - 3 ? 1 : 0), 1, i % 3 ? '#3f8a36' : '#6fbf55');
        }
      } else {
        E(12, 11, 10, 8, K), E(12, 11, 9, 7, '#2f6b2a'), E(10, 9, 6, 5, '#3f8a36');
        for (const [x, y] of [[6, 8], [11, 5], [16, 7], [8, 13], [14, 12], [18, 11], [12, 9], [5, 12]]) R(x, y, 2, 2, '#f07ab0'), R(x, y, 1, 1, '#ffc2d9');
      }
      R(3, 18, 18, 4, K), R(4, 19, 16, 2, '#c0623a'), R(4, 19, 16, 1, '#e08050');
      R(5, 21, 14, 9, K), R(6, 22, 12, 7, '#a84f2e'), R(7, 22, 2, 7, '#c0623a'), R(15, 22, 2, 7, '#8a3a20');
    },
  },

  // แผงผลไม้: a wooden crate heaped with mango, watermelon, dragon fruit or durian.
  fruit: {
    w: 32, h: 30, top: 0, variants: 4,
    draw({ R, E, O, shadow }, v) {
      shadow(16, 28, 14, 2);
      const fruit = [
        (x, y) => { O(x, y, 3, 2, '#ffd23f'); R(x - 2, y + 1, 4, 1, '#e0a040'); R(x + 2, y - 2, 1, 1, '#6dbf4a'); },
        (x, y) => { O(x, y, 3, 2, '#2f8a3a'); R(x - 2, y - 1, 1, 3, '#1f5a26'); R(x + 1, y - 1, 1, 3, '#1f5a26'); },
        (x, y) => { O(x, y, 3, 2, '#e0457a'); R(x - 1, y - 1, 1, 1, '#ff9ac0'); R(x + 3, y - 2, 1, 1, '#6dbf4a'); R(x - 3, y, 1, 1, '#6dbf4a'); },
        (x, y) => { O(x, y, 3, 2, '#8aa03a'); R(x - 2, y - 1, 1, 1, '#4a5a1a'); R(x, y, 1, 1, '#4a5a1a'); R(x + 2, y - 1, 1, 1, '#4a5a1a'); R(x - 1, y + 1, 1, 1, '#4a5a1a'); },
      ][v];
      for (const x of [6, 12, 18, 24]) fruit(x, 15);
      for (const x of [9, 15, 21]) fruit(x, 11);
      for (const x of [12, 18]) fruit(x, 7);
      if (v === 1) E(24, 8, 4, 3, K), E(24, 8, 3, 2, '#e0453a'), R(22, 8, 5, 1, '#1f5a26'), R(23, 7, 1, 1, K), R(25, 8, 1, 1, K);
      R(1, 16, 30, 13, K), R(2, 17, 28, 11, '#a8703f'), R(2, 17, 28, 1, '#c88a50');
      R(2, 21, 28, 1, '#8b5a33'), R(2, 25, 28, 1, '#8b5a33');
      R(21, 19, 8, 5, K), R(22, 20, 6, 3, '#fff3d6'), R(23, 21, 4, 1, '#d94f4f');
    },
  },

  // Red (and blue) plastic stools.
  stools: {
    w: 32, h: 24, top: 0, variants: 2,
    draw({ R, E, shadow }, v) {
      const stool = (x, c) => {
        shadow(x, 21, 6, 1);
        R(x - 6, 10, 2, 11, K), R(x + 5, 10, 2, 11, K), R(x - 2, 11, 1, 9, K), R(x + 2, 11, 1, 9, K);
        R(x - 5, 10, 1, 10, shade(c, 0.8)), R(x + 5, 10, 1, 10, shade(c, 0.8));
        E(x, 9, 7, 3, K), E(x, 8, 6, 2, c), E(x, 8, 3, 1, shade(c, 1.25)), R(x - 1, 8, 3, 1, shade(c, 0.75));
      };
      stool(9, '#e0453a');
      stool(23, v ? '#3b82c4' : '#e0453a');
    },
  },

  // วินมอเตอร์ไซค์: a red scooter with an orange win vest over the seat.
  moto: {
    w: 60, h: 40, top: 0,
    draw({ R, E, O, shadow }) {
      shadow(30, 37, 26, 2);
      for (const x of [12, 48]) O(x, 30, 6, 6, '#2a2a2a'), E(x, 30, 3, 3, '#5a5f66'), E(x, 30, 1, 1, '#c9ced6');
      R(16, 27, 28, 5, K), R(17, 28, 26, 3, '#3a3a3a');
      O(44, 22, 12, 6, '#d6403a'), E(42, 19, 7, 2, '#ff7a6a'), R(32, 25, 24, 2, '#a83028');
      // front shield and handlebar
      R(11, 12, 9, 18, K), R(12, 13, 7, 16, '#d6403a'), R(12, 13, 2, 16, '#ff7a6a');
      R(9, 9, 13, 4, K), R(10, 10, 11, 2, '#3a3a3a'), R(6, 10, 4, 2, K);
      R(8, 14, 4, 4, K), R(9, 15, 2, 2, '#fff3d6');
      R(18, 5, 1, 5, K), R(17, 4, 3, 2, '#c9ced6');
      // seat and vest
      R(33, 13, 23, 4, K), R(34, 14, 21, 2, '#2a2a2a'), R(34, 14, 21, 1, '#4a4a4a');
      R(38, 11, 11, 14, K), R(39, 12, 9, 12, '#ff7a1a'), R(39, 12, 2, 12, '#ffa04a'), R(46, 12, 2, 12, '#c85a0a');
      R(41, 15, 5, 4, '#fff3d6'), R(42, 16, 1, 2, K), R(44, 16, 1, 2, K);
      R(52, 26, 6, 2, '#8d949e');
    },
  },

  // Bangkok's green wheelie bin.
  bin: {
    w: 24, h: 32, top: 0,
    draw({ R, shadow }) {
      shadow(12, 30, 9, 2);
      R(3, 4, 18, 5, K), R(4, 5, 16, 3, '#3fa54a'), R(4, 5, 16, 1, '#6fd07a');
      R(4, 8, 16, 21, K), R(5, 9, 14, 19, '#2f8a3a'), R(6, 9, 2, 19, '#3fa54a'), R(16, 9, 3, 19, '#22692b');
      R(5, 14, 14, 4, '#f4f1c0'), R(7, 15, 2, 2, '#2f8a3a'), R(10, 15, 4, 1, '#2f8a3a'), R(15, 15, 2, 2, '#2f8a3a');
      R(5, 27, 4, 3, K), R(15, 27, 4, 3, K);
      R(9, 2, 6, 3, K), R(10, 3, 4, 1, '#9aa3ad');
    },
  },

  // Concrete power pole with a transformer and the famous tangle of cables.
  pole: {
    w: 36, h: 100, top: 86,
    draw({ R, E, shadow, ctx }) {
      shadow(18, 97, 8, 2);
      R(15, 10, 7, 88, K), R(16, 10, 5, 87, '#b9bcc0'), R(16, 10, 1, 87, '#d6d8db'), R(20, 10, 1, 87, '#8d9196');
      for (let y = 20; y < 94; y += 9) R(16, y, 5, 1, '#9aa0a6');
      R(2, 11, 33, 4, K), R(3, 12, 31, 2, '#6e7682');
      for (const x of [4, 10, 26, 32]) R(x - 1, 7, 3, 5, K), R(x, 8, 1, 3, '#e6e0d4');
      // transformer
      R(22, 26, 12, 19, K), R(23, 27, 10, 17, '#9aa3ad'), R(23, 27, 10, 2, '#c9ced6');
      for (const y of [31, 35, 39]) R(23, y, 10, 1, '#7a8088');
      R(21, 30, 2, 3, K), R(21, 40, 2, 3, K);
      // cable tangle: loose loops around the pole
      ctx.strokeStyle = K;
      ctx.lineWidth = 1;
      for (const [cx, cy, rx, ry] of [[14, 52, 7, 4], [20, 56, 9, 5], [16, 60, 6, 3], [22, 50, 5, 3], [12, 58, 4, 4]]) {
        ctx.beginPath();
        ctx.ellipse(cx + 0.5, cy + 0.5, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      E(18, 55, 2, 2, K);
      R(15, 66, 7, 6, K), R(16, 67, 5, 4, '#ffffff'), R(16, 68, 5, 2, '#d94f4f');
    },
  },

  // โอ่งมังกร: glazed brown water jar with a yellow dragon, a lid and a dipper.
  jar: {
    w: 28, h: 34, top: 0,
    draw({ R, E, O, shadow }) {
      shadow(14, 31, 11, 2);
      O(14, 20, 11, 10, '#7a3a20');
      E(14, 22, 10, 8, '#6a3018'), E(12, 18, 9, 8, '#8a4a28'), E(9, 15, 3, 4, '#a8603a');
      for (const [x, y] of [[5, 21], [6, 20], [7, 19], [8, 19], [9, 20], [10, 21], [11, 22], [12, 22], [13, 21], [14, 20], [15, 19], [16, 19], [17, 20], [18, 21], [19, 22], [20, 22], [21, 21], [22, 20]]) R(x, y, 1, 2, '#e3c16f');
      R(16, 17, 2, 2, '#e3c16f'), R(21, 18, 1, 2, '#e3c16f');
      R(7, 7, 14, 4, K), R(8, 8, 12, 2, '#6a3018');
      R(4, 5, 20, 4, K), R(5, 6, 18, 2, '#a8703f'), R(5, 6, 18, 1, '#c88a50');
      O(14, 3, 4, 1, '#c9ced6'), R(12, 2, 3, 1, '#ffffff');
    },
  },

  // ลอมฟาง: a conical rice-straw stack with a pole through the top.
  hay: {
    w: 34, h: 42, top: 0,
    draw({ R, shadow }) {
      shadow(17, 39, 15, 2);
      for (let y = 6; y < 39; y++) {
        const half = Math.round(Math.min(15, 2 + (y - 6) * 0.55));
        R(17 - half - 1, y, half * 2 + 3, 1, K);
      }
      for (let y = 7; y < 38; y++) {
        const half = Math.round(Math.min(14, 1 + (y - 6) * 0.55));
        R(17 - half, y, half * 2 + 1, 1, '#e3c16f');
        R(17 - half, y, Math.max(1, half >> 1), 1, '#f4dc8a');
        R(17 + half - 2, y, 2, 1, '#b8923f');
        for (let x = 17 - half + ((y * 3) % 5); x < 17 + half; x += 5) R(x, y, 1, 1, '#c9a24f');
      }
      R(16, 0, 2, 9, K), R(16, 1, 1, 7, '#8b5a33');
      R(3, 36, 28, 2, '#b8923f');
    },
  },

  // Wooden sign on two posts.
  sign: {
    w: 30, h: 36, top: 0, variants: 2,
    draw({ R, shadow }, v) {
      shadow(15, 34, 12, 2);
      R(5, 14, 4, 21, K), R(6, 14, 2, 20, '#6b4226'), R(21, 14, 4, 21, K), R(22, 14, 2, 20, '#6b4226');
      R(1, 4, 28, 15, K);
      R(2, 5, 26, 13, v ? '#f4f1c0' : '#a8703f'), R(2, 5, 26, 1, v ? '#ffffff' : '#c88a50');
      const ink = v ? '#3b82c4' : '#fff3d6';
      R(5, 8, 7, 2, ink), R(14, 8, 10, 2, ink), R(7, 12, 14, 2, ink), R(23, 12, 2, 2, '#d94f4f');
    },
  },

  // A stack of old tyres.
  tires: {
    w: 30, h: 30, top: 0,
    draw({ R, E, shadow }) {
      shadow(15, 27, 14, 2);
      for (let i = 0; i < 3; i++) {
        const y = 21 - i * 6;
        E(15, y, 13, 5, K), E(15, y, 12, 4, '#2e2e2e');
        for (let x = 4; x < 27; x += 3) R(x, y + 1, 1, 3, '#222222');
        R(5, y - 1, 20, 1, '#4a4a4a');
      }
      E(15, 9, 12, 4, '#3a3a3a'), E(15, 9, 6, 2, K), E(15, 10, 5, 1, '#151515');
    },
  },

  // Two oil drums, one blue and one red, rusting at the seams.
  drums: {
    w: 32, h: 32, top: 0,
    draw({ R, E, shadow }) {
      shadow(16, 30, 15, 2);
      for (const [x, c] of [[2, '#3b6fb0'], [16, '#c0392b']]) {
        R(x, 7, 14, 22, K), R(x + 1, 8, 12, 20, c), R(x + 2, 8, 2, 20, shade(c, 1.25)), R(x + 10, 8, 3, 20, shade(c, 0.75));
        R(x + 1, 14, 12, 1, shade(c, 0.6)), R(x + 1, 21, 12, 1, shade(c, 0.6));
        E(x + 7, 7, 6, 2, K), E(x + 7, 7, 5, 1, shade(c, 1.15)), R(x + 9, 6, 2, 1, K);
        R(x + 4, 24, 2, 3, '#8b4513'), R(x + 9, 10, 1, 3, '#8b4513');
      }
    },
  },

  // A balloon seller's bunch.
  balloons: {
    w: 32, h: 72, top: 0, variants: 2,
    draw({ R, O, shadow, ctx }, v) {
      shadow(16, 69, 8, 2);
      R(13, 56, 6, 14, K), R(14, 57, 4, 12, '#8b5a33');
      R(10, 66, 12, 4, K), R(11, 67, 10, 2, '#6b4226');
      const cols = ['#f07ab0', '#ffd23f', '#3b82c4', '#6dbf4a', '#e0453a', '#9b6bd6', '#2fb3b3'];
      const spots = [[8, 12], [16, 7], [24, 12], [11, 22], [21, 22], [16, 16], [6, 30], [26, 30]];
      ctx.strokeStyle = 'rgba(230,224,212,0.9)';
      for (const [x, y] of spots) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y + 6);
        ctx.lineTo(16.5, 57);
        ctx.stroke();
      }
      spots.forEach(([x, y], i) => {
        const c = cols[(i + v * 3) % cols.length];
        O(x, y, 4, 5, c);
        R(x - 2, y - 3, 2, 2, shade(c, 1.4));
        R(x, y + 6, 1, 1, shade(c, 0.7));
      });
    },
  },

  // Stage speaker stack.
  speaker: {
    w: 28, h: 48, top: 44,
    draw({ R, E, O, shadow }) {
      shadow(14, 46, 13, 2);
      R(1, 2, 26, 44, K), R(2, 3, 24, 42, '#2a2a30'), R(2, 3, 24, 1, '#4a4a52'), R(2, 21, 24, 1, '#111116');
      O(14, 11, 5, 4, '#3a3a42'), E(14, 11, 2, 1, '#8d949e');
      O(14, 33, 9, 9, '#3a3a42'), E(14, 33, 6, 6, '#2a2a30'), E(14, 33, 2, 2, '#8d949e'), E(12, 30, 1, 1, '#6e7682');
      R(22, 5, 2, 1, '#6dff8a');
    },
  },

  // เรือหางยาว: long-tail boat, ribbons on the prow, engine and shaft at the stern.
  boat: {
    w: 66, h: 34, top: 0, variants: 4,
    draw(k, v) {
      const { R, E, O } = k;
      // v3 is ก๋วยเตี๋ยวเรือ: a noodle seller in a งอบ hat with a steaming pot.
      if (v === 3) {
        R(30, 0, 1, 4, 'rgba(255,255,255,0.5)'), R(33, 1, 1, 4, 'rgba(255,255,255,0.4)');
        O(31, 13, 7, 6, '#9aa3ad'), R(25, 8, 13, 2, '#c9ced6'), R(28, 7, 7, 1, K);
        R(14, 14, 6, 8, K), R(15, 14, 4, 8, '#3b82c4');
        E(17, 12, 3, 3, K), E(17, 12, 2, 2, '#c68b5e');
        for (let i = 0; i < 6; i++) R(17 - i, 6 + i, 1 + i * 2, 1, i === 5 ? K : '#e3c16f');
        R(16, 5, 2, 1, K);
      }
      k.ctx.translate(0, 6);
      const stripe = ['#2fb3b3', '#d94f4f', '#ffd23f', '#2fb3b3'][v];
      R(3, 26, 58, 2, 'rgba(207,232,239,0.55)');
      // hull: sweeps up into a pointed prow on the left
      for (let x = 0; x < 58; x++) {
        const top = x < 12 ? 6 + Math.round(x * 0.7) : 14;
        const bot = x < 6 ? 16 : x > 52 ? 22 - (x - 52) : 24;
        R(x + 2, top - 1, 1, bot - top + 2, K);
      }
      for (let x = 1; x < 57; x++) {
        const top = x < 12 ? 6 + Math.round(x * 0.7) : 14;
        const bot = x < 6 ? 15 : x > 52 ? 21 - (x - 52) : 23;
        R(x + 2, top, 1, bot - top + 1, '#6b4226');
        R(x + 2, top, 1, 1, '#a8703f');
        if (x > 4) R(x + 2, top + 4, 1, 1, stripe);
      }
      R(14, 15, 42, 1, '#4a2c18');
      // ribbons tied to the prow
      R(1, 2, 2, 6, '#f07ab0'), R(3, 3, 2, 6, '#ffd23f'), R(5, 4, 2, 5, '#6dbf4a'), R(2, 1, 4, 2, K);
      // engine and the long tail
      R(50, 6, 10, 8, K), R(51, 7, 8, 6, '#8d949e'), R(51, 7, 8, 1, '#c9ced6');
      for (let i = 0; i < 6; i++) R(59 + i, 13 + i, 2, 1, K);
      R(64, 18, 2, 4, '#c9ced6');
    },
  },

  puddle: {
    w: 32, h: 32, flat: true, variants: 2,
    draw({ R, E }, v) {
      const [x, y, rx, ry] = v ? [12, 12, 8, 4] : [17, 19, 11, 5];
      E(x, y + 1, rx, ry, 'rgba(40,40,50,0.25)');
      E(x, y, rx, ry, 'rgba(70,105,140,0.55)');
      E(x - 1, y, rx - 3, ry - 2, 'rgba(150,200,230,0.45)');
      R(x - rx + 4, y - 2, 5, 1, 'rgba(235,248,255,0.85)'), R(x + 2, y + 1, 3, 1, 'rgba(235,248,255,0.6)');
    },
  },

  lotus: {
    w: 32, h: 32, flat: true, variants: 2,
    draw({ R, E }, v) {
      for (const [x, y, r] of [[10, 20, 6], [22, 12, 4], [21, 25, 4]]) {
        E(x, y, r + 1, Math.round(r * 0.7) + 1, '#1f4a2a');
        E(x, y, r, Math.round(r * 0.7), '#3f8a36');
        R(x, y - Math.round(r * 0.7), 1, Math.round(r * 0.7), '#1f4a2a');
        R(x - r + 2, y - 1, 2, 1, '#6fbf55');
      }
      if (v) {
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 1]]) R(22 + dx, 11 + dy, 2, 2, '#fff3f6');
        R(22, 11, 2, 1, '#ffd23f');
      } else {
        R(21, 6, 3, 5, K), R(22, 6, 1, 4, '#f07ab0'), R(23, 7, 1, 3, '#ffc2d9'), R(22, 10, 1, 3, '#3f8a36');
      }
    },
  },

  flowers: {
    w: 32, h: 32, flat: true, variants: 2,
    draw({ R }, v) {
      const [a, b] = FLOWER_COLS[v];
      for (const [x, y] of [[6, 9], [12, 6], [19, 9], [25, 7], [9, 17], [16, 15], [23, 18], [13, 24], [20, 25], [5, 23]]) {
        R(x - 1, y + 2, 3, 2, '#2f6b2a'), R(x - 2, y + 3, 1, 1, '#4f8a33'), R(x + 2, y + 3, 1, 1, '#4f8a33');
        R(x - 1, y - 1, 3, 3, a), R(x, y - 2, 1, 1, a), R(x, y, 1, 1, b);
      }
    },
  },

  // Outdoor air-con unit bolted to a wall.
  ac: {
    w: 32, h: 32, flat: true, variants: 2,
    draw({ R, E }, v) {
      const body = v ? '#c9c2b4' : '#dfe3e7';
      R(3, 5, 26, 21, K), R(4, 6, 24, 19, body), R(4, 6, 24, 1, '#ffffff'), R(25, 6, 3, 19, shade(body, 0.85));
      E(13, 15, 7, 7, K), E(13, 15, 6, 6, '#6e7682'), R(7, 15, 13, 1, '#9aa3ad'), R(13, 9, 1, 13, '#9aa3ad'), E(13, 15, 1, 1, '#c9ced6');
      for (let y = 9; y < 23; y += 2) R(22, y, 3, 1, shade(body, 0.7));
      R(5, 26, 3, 2, '#40424a'), R(24, 26, 3, 2, '#40424a');
      if (v) R(8, 21, 3, 3, '#a0522d'), R(20, 8, 2, 4, '#a0522d');
      R(27, 18, 1, 13, '#9aa3ad');
    },
  },

  // Roller-shutter shopfront in a wall: a painted sign above on some.
  shutter: {
    w: 32, h: 32, flat: true, variants: 2,
    draw({ R }, v) {
      R(2, 9, 28, 23, K), R(3, 10, 26, 22, '#8d949e');
      for (let y = 11; y < 32; y += 3) R(3, y, 26, 1, '#6e7682'), R(3, y + 1, 26, 1, '#b4bac2');
      R(3, 29, 26, 1, '#5a5f66'), R(14, 28, 4, 2, '#3a3e45');
      if (v) {
        R(1, 1, 30, 8, K), R(2, 2, 28, 6, '#d94f4f'), R(2, 2, 28, 1, '#ff7a6a');
        R(5, 4, 6, 2, '#fff3d6'), R(13, 4, 9, 2, '#fff3d6'), R(24, 4, 3, 2, '#ffd23f');
      } else {
        R(4, 15, 9, 6, 'rgba(240,122,176,0.75)'), R(6, 17, 6, 2, 'rgba(255,224,102,0.8)'), R(18, 20, 8, 2, 'rgba(47,179,179,0.8)');
      }
    },
  },

  // Round iron drain cover.
  manhole: {
    w: 32, h: 32, flat: true,
    draw({ R, E }) {
      E(16, 17, 10, 6, 'rgba(0,0,0,0.25)');
      E(16, 16, 10, 6, '#4a4d55'), E(16, 16, 8, 4, '#5f636b');
      for (const y of [13, 15, 17, 19]) R(9, y, 15, 1, '#4a4d55');
      R(10, 12, 8, 1, '#7e8288');
    },
  },
};

// Painted signs. Their words come from the decor entry (see DECOR in shared/maps.js).
Object.assign(DECOR_ART, {
  // The market's name board, hung on the upper floor of the shophouses.
  signboard: {
    w: 128, h: 32, flat: true,
    text: { x: 64, y: 15, size: 13, size2: 6, color: '#ffd23f', color2: '#fff3d6', gap: 1 },
    draw({ R }) {
      R(0, 1, 128, 30, K), R(1, 2, 126, 28, '#c99a1a'), R(3, 4, 122, 24, K), R(4, 5, 120, 22, '#7a1e1e');
      R(4, 5, 120, 1, '#a83232'), R(4, 26, 120, 1, '#5a1414');
      for (const x of [6, 120]) R(x, 7, 2, 2, '#ffd23f'), R(x, 23, 2, 2, '#ffd23f');
      R(20, 0, 2, 2, '#4a2c18'), R(106, 0, 2, 2, '#4a2c18');
    },
  },
  // A wide wooden name sign on two posts.
  board: {
    w: 64, h: 40, top: 0,
    text: { x: 32, y: 14, size: 8, color: '#fff3d6' },
    draw({ R, shadow }) {
      shadow(32, 38, 26, 2);
      R(8, 22, 4, 17, K), R(9, 22, 2, 16, '#6b4226'), R(52, 22, 4, 17, K), R(53, 22, 2, 16, '#6b4226');
      R(1, 4, 62, 21, K), R(2, 5, 60, 19, '#3f6b4a'), R(2, 5, 60, 1, '#5f9a6a'), R(3, 7, 58, 15, '#2f5a3a');
      R(2, 23, 60, 1, '#25452d');
    },
  },
  // ยายบัว's cart: a big pot of บัวลอย, coconuts and bowls.
  bualoy: {
    w: 36, h: 44, top: 0,
    text: { x: 18, y: 31, size: 6, color: '#d94f4f' },
    draw({ R, E, O, shadow }) {
      shadow(18, 42, 16, 2);
      R(0, 6, 2, 30, '#8b5a33'), R(34, 6, 2, 30, '#8b5a33'), R(0, 4, 36, 4, K), R(1, 5, 34, 2, '#d94f4f');
      R(2, 22, 32, 15, K), R(3, 23, 30, 13, '#a8703f'), R(3, 23, 30, 1, '#c88a50');
      R(5, 27, 26, 8, '#fff3d6');
      for (const x of [6, 30]) O(x, 39, 3, 3, '#3a3a3a'), R(x, 39, 1, 1, '#c9ced6');
      // pot with steam, coconuts, a stack of bowls
      R(6, 13, 14, 10, K), R(7, 14, 12, 8, '#c9ced6'), R(8, 14, 3, 8, '#e6e8eb'), E(13, 13, 7, 2, K), E(13, 13, 6, 1, '#e6e8eb');
      R(10, 7, 1, 4, 'rgba(255,255,255,0.65)'), R(14, 8, 1, 4, 'rgba(255,255,255,0.55)');
      O(25, 19, 3, 3, '#5a8a3a'), O(30, 19, 3, 3, '#7a5a3a'), R(24, 17, 2, 1, '#8fcf65');
      R(22, 12, 8, 2, K), R(23, 10, 6, 2, '#ffffff'), R(23, 12, 6, 1, '#d9e0e6');
    },
  },
});

export function decorKey(kind, v = 0) {
  return `decor_${kind}_${v}`;
}

// ---------- ground overlays ----------

// Tiles that stand tall enough to throw a shadow on the floor below/right.
export const SHADOW_CASTERS = '#AGHRSFCYQ';
export const GRASS = ',t';
export const WATER = '~s';

function overlay(name, draw) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  draw(kit(c.getContext('2d')), seeded(name.length * 97 + name.charCodeAt(name.length - 1)));
  return c;
}

// Rotates a top-edge drawing to the other three sides.
function sides(name, drawTop) {
  const top = overlay(name, drawTop);
  const out = {};
  for (const [dir, turn] of [['t', 0], ['r', 1], ['b', 2], ['l', 3]]) {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.translate(16, 16);
    ctx.rotate((turn * Math.PI) / 2);
    ctx.drawImage(top, -16, -16);
    out[`${name}_${dir}`] = c;
  }
  return out;
}

function overlays() {
  const out = {
    fx_shade_t: overlay('shade', ({ R }) => {
      for (let y = 0; y < 12; y++) R(0, y, 32, 1, `rgba(20,10,30,${(0.34 * (1 - y / 12)).toFixed(3)})`);
    }),
    fx_shade_l: overlay('shadel', ({ R }) => {
      for (let x = 0; x < 6; x++) R(x, 0, 1, 32, `rgba(20,10,30,${(0.18 * (1 - x / 6)).toFixed(3)})`);
    }),
  };
  // Grass spilling over onto the neighbouring floor (drawn on the floor tile).
  for (const v of [0, 1]) {
    Object.assign(out, sides(`fx_grass${v}`, ({ R }, rnd) => {
      for (let x = 0; x < 32; x++) {
        const h = 1 + Math.floor(rnd() * 3) + (x % 7 === v * 3 ? 2 : 0);
        R(x, 0, 1, h, '#6fae4b');
        R(x, h, 1, 1, '#4f8a33');
      }
      for (let i = 0; i < 3; i++) {
        const x = 3 + Math.floor(rnd() * 26);
        R(x, 2, 1, 3, '#8fcf65'), R(x + 2, 2, 1, 3, '#8fcf65'), R(x + 1, 3, 1, 3, '#4f8a33');
      }
    }));
  }
  // River bank above water, foam along the other edges (drawn on the water tile).
  Object.assign(out, sides('fx_bank', ({ R }, rnd) => {
    for (let x = 0; x < 32; x++) {
      const h = 3 + Math.floor(rnd() * 2);
      R(x, 0, 1, h, '#7a5a3a');
      R(x, 0, 1, 1, '#9a7a50');
      R(x, h, 1, 1, 'rgba(0,0,0,0.28)');
      if ((x + Math.floor(rnd() * 3)) % 4) R(x, h + 1, 1, 1, 'rgba(225,240,245,0.75)');
    }
  }));
  Object.assign(out, sides('fx_foam', ({ R }, rnd) => {
    for (let x = 0; x < 32; x++) if ((x + Math.floor(rnd() * 3)) % 5) R(x, 0, 1, 1 + Math.floor(rnd() * 2), 'rgba(225,240,245,0.7)');
  }));
  // Deep water showing through at the edge of the shallows (drawn on the shallows).
  Object.assign(out, sides('fx_deep', ({ R }) => {
    for (let x = 0; x < 32; x++) {
      R(x, 0, 1, 2, 'rgba(58,111,143,0.85)');
      if (x % 2) R(x, 2, 1, 1, 'rgba(58,111,143,0.6)');
      if (x % 4 === 1) R(x, 3, 1, 1, 'rgba(58,111,143,0.4)');
    }
  }));
  // Rolling door at the foot of a warehouse wall.
  out.fx_gdoor = overlay('gdoor', ({ R }) => {
    R(3, 8, 26, 24, K), R(4, 9, 24, 23, '#3b3f47');
    for (let y = 10; y < 32; y += 3) R(4, y, 24, 1, '#5f656d');
    R(4, 9, 24, 1, '#8d949e'), R(2, 6, 28, 3, '#c9a24f'), R(2, 6, 28, 1, '#e3c16f');
  });
  // คันนา: an earth bund round the rice field (drawn on the rice tile).
  Object.assign(out, sides('fx_bund', ({ R }) => {
    R(0, 0, 32, 3, '#8a6a3a'), R(0, 0, 32, 1, '#a8885a'), R(0, 3, 32, 1, '#5f7a3a');
  }));
  // Soft round light, tinted and added for lanterns at night.
  const glow = document.createElement('canvas');
  glow.width = 64;
  glow.height = 64;
  const g = glow.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  out.fx_glow = glow;
  return out;
}

export function makeDecorTextures(tex) {
  for (const [kind, art] of Object.entries(DECOR_ART)) {
    for (let v = 0; v < (art.variants ?? 1); v++) {
      const c = document.createElement('canvas');
      c.width = art.w;
      c.height = art.h;
      art.draw(kit(c.getContext('2d', { willReadFrequently: true })), v);
      tex.addCanvas(decorKey(kind, v), c);
    }
  }
  for (const [key, c] of Object.entries(overlays())) tex.addCanvas(key, c);
}
