import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BODY_OVERLAYS, CHAR_FRAMES, DROP_ART, MONSTER_ART, WEAPON_ART } from '../client/src/art.js';
import { FASHION_SLOTS, ITEMS, MONSTERS } from '../shared/constants.js';

const rect = (name, rows, w, h) => {
  assert.equal(rows.length, h ?? rows.length, `${name} height`);
  rows.forEach((r, i) => assert.equal(r.length, w, `${name} row ${i}: "${r}"`));
};

test('pixel art rows have consistent dimensions', () => {
  CHAR_FRAMES.forEach((f, i) => rect(`char ${i}`, f, 16, 16));
  for (const [type, art] of Object.entries(MONSTER_ART)) art.frames.forEach((f, i) => rect(`${type} ${i}`, f, 16, 16));
  for (const [id, o] of Object.entries(BODY_OVERLAYS)) rect(id, o.rows, 16, 16);
  for (const [id, a] of Object.entries(DROP_ART)) rect(id, a.rows, 8, 8);
  for (const [id, a] of Object.entries(WEAPON_ART)) rect(id, a.rows, a.rows[0].length);
});

test('every monster type has sprites', () => {
  for (const type of Object.keys(MONSTERS)) assert.ok(MONSTER_ART[type], type);
});

test('every wearable item has art', () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    if (FASHION_SLOTS.includes(item.slot)) assert.ok(BODY_OVERLAYS[id], id);
    if (!item.slot && id !== 'oliang') assert.ok(DROP_ART[id], `${id} can drop, needs ground art`);
    if (item.slot === 'weapon') assert.ok(WEAPON_ART[id], id);
  }
});
