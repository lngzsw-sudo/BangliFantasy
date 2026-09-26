import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MONSTERS, playerStats } from '../shared/constants.js';
import { tileAt } from '../shared/maps.js';
import { nearestOpen } from '../shared/pathfinding.js';
import { rollDamage } from '../server/combat.js';
import { join, makeWorld } from './helpers.js';

const TIMING = { firstMs: 60_000, everyMs: 120_000, warnMs: 30_000, stayMs: 60_000 };
const ofType = (room, type) => [...room.monsters.values()].filter((m) => m.type === type);

async function inSuburb(name = 'Veteran', level = 35, worldBoss = TIMING) {
  const env = makeWorld(6, { worldBoss });
  const a = await join(env.world, name);
  const p = a.player();
  p.profile.level = level;
  p.stats = playerStats(p.profile);
  p.hp = p.stats.maxHp;
  env.world.transfer(p, 'suburb', 1, 8);
  return { ...env, a, p, suburb: env.world.rooms.get('suburb') };
}

test('the canal portal leads to the suburb and back', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Wanderer');
  const p = a.player();
  world.transfer(p, 'canal', 41, 5);
  a.client.message({ t: 'move', x: 43, y: 5 });
  run(2000);
  assert.equal(p.roomId, 'suburb');
  a.client.message({ t: 'move', x: 0, y: 8 });
  run(2000);
  assert.equal(p.roomId, 'canal');
});

test('suburb monsters spawn on their habitats; the world boss waits for its timetable', async () => {
  const { suburb } = await inSuburb();
  for (const type of ['scarecrow', 'wasp', 'buffalo']) assert.ok(ofType(suburb, type).length > 0, type);
  for (const m of ofType(suburb, 'scarecrow')) assert.equal(tileAt(suburb.def, m.x, m.y), 'r');
  for (const m of ofType(suburb, 'buffalo')) assert.equal(tileAt(suburb.def, m.x, m.y), '=');
  assert.equal(ofType(suburb, 'sidecar').length, 0);
});

test('scarecrows dodge: evasion turns hits into misses', () => {
  assert.equal(rollDamage({ atk: 100 }, { evade: 1 }, () => 0.5).miss, true);
  assert.equal(rollDamage({ atk: 100 }, { evade: 0 }, () => 0.5).miss, undefined);
});

test('iron buffalo charges from range and its charged hit lands harder', async () => {
  const { suburb, p, a, run } = await inSuburb();
  const bull = ofType(suburb, 'buffalo')[0];
  // Open yard road, 4 tiles apart: far enough that the buffalo charges.
  Object.assign(bull, { x: 44, y: 13, path: [] });
  Object.assign(p, { x: 40, y: 13, path: [] });
  Object.assign(p.stats, { maxHp: 99999 });
  p.hp = 99999;
  bull.aggro = p.id;
  run(3000);
  assert.ok(a.inbox.some((m) => m.t === 'fx' && m.fx === 'charge' && m.id === bull.id), 'charge announced');
  const hits = a.inbox.filter((m) => m.t === 'hit' && m.a === bull.id && m.n > 0);
  assert.ok(hits.length > 0, 'the buffalo connected');
  // atk 48 × 2 on the charge vs a Lv35 player's def 17: comfortably above a normal hit's ceiling.
  assert.ok(hits[0].n > MONSTERS.buffalo.atk * 1.15 - p.stats.def, `charged hit ${hits[0].n}`);
  assert.equal(bull.charging, false);
});

test('world boss: warned server-wide, spawns on time, drives off if not beaten', async () => {
  const { world, suburb, run } = await inSuburb('Watcher');
  const market = await join(world, 'FarAway'); // in the market, far from the boss
  run(TIMING.firstMs - TIMING.warnMs + 200);
  assert.ok(market.inbox.some((m) => m.t === 'announce' && m.text.includes('อีก')), 'warning reaches other rooms');
  assert.equal(ofType(suburb, 'sidecar').length, 0);
  run(TIMING.warnMs);
  assert.equal(ofType(suburb, 'sidecar').length, 1, 'spawned on schedule');
  assert.ok(market.inbox.some((m) => m.t === 'announce' && m.text.includes('บุก')));
  run(TIMING.stayMs + 200);
  assert.equal(ofType(suburb, 'sidecar').length, 0, 'drove off');
  assert.ok(market.inbox.some((m) => m.t === 'announce' && m.text.includes('ขับหนี')));
  run(TIMING.everyMs);
  assert.equal(ofType(suburb, 'sidecar').length, 1, 'back on the next slot');
});

test('world boss: loot for every contributor, and it keeps fighting when its target falls', async () => {
  const { world, suburb, p, run, now } = await inSuburb('Tank');
  const b = await join(world, 'Healer');
  const q = b.player();
  world.transfer(q, 'suburb', 2, 8);
  for (const x of [p, q]) Object.assign(x.stats, { maxHp: 99999 }), (x.hp = 99999);
  run(TIMING.firstMs + 200);
  const boss = ofType(suburb, 'sidecar')[0];
  const near = (x, dx) => {
    const s = nearestOpen(suburb.playerGrid, Math.round(boss.x) + dx, Math.round(boss.y));
    Object.assign(x, { x: s.x, y: s.y, path: [] });
  };
  near(p, 1);
  near(q, -1);
  suburb.damageMonster(boss, p, { n: 1000 }, now());
  suburb.damageMonster(boss, q, { n: 800 }, now());
  assert.equal(boss.aggro, p.id);
  suburb.killPlayer(p, now());
  run(200);
  assert.equal(boss.aggro, q.id, 'turned on the next player');
  assert.ok(boss.hp <= MONSTERS.sidecar.hp - 1800, `no free heal (hp ${boss.hp})`);
  suburb.damageMonster(boss, q, { n: 99999 }, now());
  const speakers = [...suburb.drops.values()].filter((d) => d.item === 'speaker');
  assert.deepEqual(new Set(speakers.map((d) => d.owner)), new Set([p.id, q.id]));
  assert.ok(b.inbox.some((m) => m.t === 'announce' && m.text.includes('🎉')));
});
