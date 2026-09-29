import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BODY_OVERLAYS, CHAR_FRAMES, DROP, DROP_ART, MONSTER_ART, SPRITE, WEAPON_ART, characterPalette,
} from '../client/src/art.js';
import { FASHION_SLOTS, ITEMS, MONSTERS } from '../shared/constants.js';

const rect = (name, rows, w, h) => {
  assert.equal(rows.length, h ?? rows.length, `${name} height`);
  rows.forEach((r, i) => assert.equal(r.length, w, `${name} row ${i}: "${r}"`));
};

test('pixel art rows have consistent dimensions', () => {
  CHAR_FRAMES.forEach((f, i) => rect(`char ${i}`, f, SPRITE, SPRITE));
  for (const [type, art] of Object.entries(MONSTER_ART)) art.frames.forEach((f, i) => rect(`${type} ${i}`, f, SPRITE, SPRITE));
  for (const [id, o] of Object.entries(BODY_OVERLAYS)) rect(id, o.rows, SPRITE, SPRITE);
  for (const [id, a] of Object.entries(DROP_ART)) rect(id, a.rows, DROP, DROP);
  for (const [id, a] of Object.entries(WEAPON_ART)) rect(id, a.rows, a.rows[0].length);
});

test('every monster type has sprites', () => {
  for (const type of Object.keys(MONSTERS)) assert.ok(MONSTER_ART[type], type);
});

test('every wearable item has art', () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    if (FASHION_SLOTS.includes(item.slot)) assert.ok(BODY_OVERLAYS[id], id);
    if (!item.slot && !item.use) assert.ok(DROP_ART[id], `${id} can drop, needs ground art`);
    if (item.slot === 'weapon') assert.ok(WEAPON_ART[id], id);
  }
});

test('every palette letter used in a sprite has a colour', () => {
  const uses = (name, rows, palette) => {
    for (const row of rows) {
      for (const ch of row) if (ch !== '.' && ch !== 'k') assert.ok(palette[ch], `${name}: '${ch}' has no colour`);
    }
  };
  const look = characterPalette({ skin: '#f2c9a0', hair: '#2b1d16', shirt: '#3b82c4' });
  CHAR_FRAMES.forEach((f, i) => uses(`char ${i}`, f, look));
  for (const [type, art] of Object.entries(MONSTER_ART)) art.frames.forEach((f, i) => uses(`${type} ${i}`, f, art.palette));
  for (const [id, o] of Object.entries({ ...BODY_OVERLAYS, ...DROP_ART, ...WEAPON_ART })) uses(id, o.rows, o.palette);
});
