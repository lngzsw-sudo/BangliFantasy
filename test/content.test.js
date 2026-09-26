import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECIPES, bountiesFor, bountyDay } from '../shared/constants.js';
import { bountyView, claimBounty, recordKill } from '../server/bounty.js';
import { dist } from '../server/room.js';
import { nearestOpen } from '../shared/pathfinding.js';
import { join, makeWorld } from './helpers.js';

const DAY = 24 * 3600 * 1000;

async function inAlley(seed = 3, name = 'Tester') {
  const env = makeWorld(seed);
  const a = await join(env.world, name);
  const p = a.player();
  env.world.transfer(p, 'alley', 1, 6);
  return { ...env, a, p, alley: env.world.rooms.get('alley') };
}

const ofType = (room, type) => [...room.monsters.values()].filter((m) => m.type === type);

test('the alley has rats, pigeons and stray dogs', async () => {
  const { alley } = await inAlley();
  for (const type of ['rat', 'pigeon', 'dog']) assert.ok(ofType(alley, type).length > 0, type);
});

test('stray dogs bite players who walk too close', async () => {
  const { alley, p, run } = await inAlley();
  const dog = ofType(alley, 'dog')[0];
  const spot = nearestOpen(alley.grid, Math.round(dog.x) + 2, Math.round(dog.y));
  p.x = spot.x;
  p.y = spot.y;
  const hp = p.hp;
  run(3000);
  assert.equal(dog.aggro, p.id);
  assert.ok(p.hp < hp || p.lastCombatAt, 'dog attacked');
});

test('hitting one pigeon brings its flock', async () => {
  const { alley, p, now } = await inAlley();
  const [a, b] = ofType(alley, 'pigeon');
  Object.assign(b, { x: a.x, y: a.y, home: { ...a.home }, aggro: null });
  alley.damageMonster(a, p, { n: 1 }, now());
  assert.equal(a.aggro, p.id);
  assert.equal(b.aggro, p.id);
});

test('auto-farm leaves monsters far above your level alone unless they attack', async () => {
  const { alley, p, now } = await inAlley();
  const dog = ofType(alley, 'dog')[0];
  alley.monsters = new Map([[dog.id, dog]]);
  p.auto.on = true;
  alley.botThink(p, now());
  assert.equal(p.target, null, 'Lv.1 bot ignores a Lv.6 dog');
  dog.aggro = p.id;
  alley.botThink(p, now());
  assert.equal(p.target, dog.id, 'but fights back when bitten');
  dog.aggro = null;
  p.target = null;
  p.profile.level = 5;
  alley.botThink(p, now());
  assert.equal(p.target, dog.id, 'Lv.5 bot hunts dogs');
});

test('daily bounties: same for everyone, progress, claim once, reset next day', () => {
  const t0 = Date.UTC(2026, 8, 26, 3);
  const today = bountiesFor(bountyDay(t0));
  assert.equal(today.length, 3);
  assert.deepEqual(new Set(today.map((b) => b.type)), new Set(['rat', 'pigeon', 'dog']));

  const profile = { bounty: null };
  const b = today[0];
  assert.match(claimBounty(profile, b.id, t0).error, /ไม่ครบ/);
  let completed = [];
  for (let i = 0; i < b.need; i++) completed = recordKill(profile, b.type, t0);
  assert.deepEqual(completed.map((x) => x.id), [b.id], 'completion reported on the last kill');
  assert.deepEqual(recordKill(profile, b.type, t0), [], 'extra kills do not overflow');
  assert.equal(claimBounty(profile, b.id, t0).bounty.id, b.id);
  assert.match(claimBounty(profile, b.id, t0).error, /ไปแล้ว/);

  const tomorrow = bountyView(profile, t0 + DAY);
  assert.ok(tomorrow.list.every((x) => x.have === 0 && !x.claimed), 'fresh board the next day');
  // Midnight is Bangkok time (UTC+7).
  assert.equal(bountyDay(Date.UTC(2026, 8, 26, 16, 59)), '2026-09-26');
  assert.equal(bountyDay(Date.UTC(2026, 8, 26, 17, 0)), '2026-09-27');
});

test('killing monsters advances bounties; rewards are claimed at the board', async () => {
  const { world, alley, p, a, now } = await inAlley(5, 'Hunter');
  const b = bountiesFor(bountyDay(now())).find((x) => x.type === 'rat');
  const rat = ofType(alley, 'rat')[0];
  alley.killMonster(rat, p, now());
  assert.equal(bountyView(p.profile, now()).list.find((x) => x.id === b.id).have, 1);

  for (let i = 1; i < b.need; i++) recordKill(p.profile, 'rat', now());
  const market = world.rooms.get('market');
  world.transfer(p, 'market', 25, 10);
  a.client.message({ t: 'bounty_claim', id: b.id });
  assert.ok(a.inbox.some((m) => m.t === 'toast' && /ใกล้/.test(m.text)), 'must stand at the board');

  const board = market.def.objects.find((o) => o.kind === 'bounty');
  Object.assign(p, { x: board.x + board.w, y: board.y });
  assert.ok(dist(p, board) < 3);
  const coins = p.profile.coins;
  a.client.message({ t: 'bounty_claim', id: b.id });
  assert.equal(p.profile.coins, coins + b.coins);
  a.client.message({ t: 'bounty_claim', id: b.id });
  assert.equal(p.profile.coins, coins + b.coins, 'second claim refused');
});

test('grind-to-drip: craft the straw hat from pigeon feathers and dog bones', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Hatter');
  const b = await join(world, 'Friend');
  const p = a.player();
  const tailor = world.rooms.get('market').def.npcs.find((n) => n.kind === 'tailor');
  Object.assign(p, { x: tailor.x, y: tailor.y + 1 });
  const r = RECIPES.hat_straw;
  Object.assign(p.profile.inv, r.items);
  p.profile.coins = r.coins;
  a.client.message({ t: 'craft', id: 'hat_straw' });
  assert.equal(p.profile.equip.head, 'hat_straw');
  assert.equal(p.profile.inv.feather, 0);
  assert.ok(b.inbox.some((m) => m.t === 'look' && m.id === p.id && m.head === 'hat_straw'));
  a.client.message({ t: 'unequip', slot: 'head' });
  assert.equal(p.profile.equip.head, null);
  a.client.message({ t: 'unequip', slot: 'weapon' });
  assert.equal(p.profile.equip.weapon, 'broom', 'weapons are not unequippable');
});
