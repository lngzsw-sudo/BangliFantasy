import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ITEMS, MONSTERS, RECIPES, SHOPS, expToNext, lookFromName, playerStats, newProfile } from '../shared/constants.js';
import { ROOMS, TILES, buildBlockedGrid, portalAt, tileAt } from '../shared/maps.js';
import { findPath, isBlocked, nearestOpen } from '../shared/pathfinding.js';

test('every map is rectangular and uses known tiles', () => {
  for (const room of Object.values(ROOMS)) {
    const w = room.tiles[0].length;
    room.tiles.forEach((row, y) => {
      assert.equal(row.length, w, `${room.id} row ${y} has width ${row.length}, expected ${w}`);
      for (const ch of row) assert.ok(TILES[ch], `${room.id} unknown tile '${ch}'`);
    });
  }
});

test('portals sit on portal tiles and lead to walkable, non-portal tiles', () => {
  for (const room of Object.values(ROOMS)) {
    for (const p of room.portals) {
      for (let y = p.y; y < p.y + p.h; y++) {
        for (let x = p.x; x < p.x + p.w; x++) assert.equal(tileAt(room, x, y), 'P', `${room.id} portal at ${x},${y}`);
      }
      const dest = ROOMS[p.to];
      assert.ok(dest, `portal target ${p.to} exists`);
      assert.equal(isBlocked(buildBlockedGrid(dest), p.tx, p.ty), false);
      assert.equal(portalAt(dest, p.tx, p.ty), null, 'arrival must not be another portal');
    }
  }
});

test('spawn, NPC-adjacent tiles and every portal are reachable from spawn', () => {
  for (const room of Object.values(ROOMS)) {
    const grid = buildBlockedGrid(room);
    const { x, y } = room.spawn;
    assert.equal(isBlocked(grid, x, y), false, `${room.id} spawn blocked`);
    for (const p of room.portals) assert.ok(findPath(grid, x, y, p.x, p.y), `${room.id} → portal ${p.to}`);
    for (const npc of room.npcs) {
      const near = nearestOpen(grid, npc.x, npc.y + 1, 1);
      assert.ok(near && findPath(grid, x, y, near.x, near.y), `${room.id} → ${npc.id}`);
    }
  }
});

test('findPath avoids walls and refuses corner cutting', () => {
  const grid = [
    [false, true, false],
    [false, true, false],
    [false, false, false],
  ].map((r) => r.slice());
  const path = findPath(grid, 0, 0, 2, 0);
  assert.deepEqual(path.at(-1), { x: 2, y: 0 });
  for (const s of path) assert.equal(grid[s.y][s.x], false);
  // Diagonal (0,1)->(1,2)... must not squeeze between two blocked corners.
  const pinch = [
    [false, true],
    [true, false],
  ];
  assert.equal(findPath(pinch, 0, 0, 1, 1), null);
});

test('shop and recipe entries reference real items', () => {
  for (const shop of Object.values(SHOPS)) for (const id of Object.keys(shop)) assert.ok(ITEMS[id], id);
  for (const [id, r] of Object.entries(RECIPES)) {
    assert.ok(ITEMS[id]?.slot, id);
    for (const k of Object.keys(r.items)) assert.ok(ITEMS[k], k);
  }
  for (const m of Object.values(MONSTERS)) for (const d of m.drops) assert.ok(ITEMS[d.item], d.item);
});

test('stats and exp curve grow with level', () => {
  const p = newProfile('ทดสอบ');
  const s1 = playerStats(p);
  p.level = 5;
  const s5 = playerStats(p);
  assert.ok(s5.maxHp > s1.maxHp && s5.atk > s1.atk);
  assert.ok(expToNext(2) > expToNext(1));
  assert.deepEqual(lookFromName('abc'), lookFromName('abc'));
});
