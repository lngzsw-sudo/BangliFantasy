import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ITEMS, MONSTERS, PLAYER_SPEED, RECIPES, playerStats } from '../shared/constants.js';
import { tileAt } from '../shared/maps.js';
import { nearestOpen } from '../shared/pathfinding.js';
import { dist } from '../server/room.js';
import { join, makeWorld } from './helpers.js';

async function inCanal(seed = 4, name = 'Paddler', level = 18) {
  const env = makeWorld(seed);
  const a = await join(env.world, name);
  const p = a.player();
  p.profile.level = level;
  p.stats = playerStats(p.profile);
  p.hp = p.stats.maxHp;
  env.world.transfer(p, 'canal', 1, 5);
  return { ...env, a, p, canal: env.world.rooms.get('canal') };
}

const ofType = (room, type) => [...room.monsters.values()].filter((m) => m.type === type);
const standNear = (room, p, m, dx = 1) => {
  const spot = nearestOpen(room.playerGrid, Math.round(m.x) + dx, Math.round(m.y));
  Object.assign(p, { x: spot.x, y: spot.y, path: [] });
};

test('the alley portal leads to the canal and back', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Traveller');
  const p = a.player();
  world.transfer(p, 'alley', 37, 3);
  a.client.message({ t: 'move', x: 39, y: 3 });
  run(3000);
  assert.equal(p.roomId, 'canal');
  a.client.message({ t: 'move', x: 0, y: 5 });
  run(3000);
  assert.equal(p.roomId, 'alley');
});

test('canal monsters live in their habitats', async () => {
  const { canal } = await inCanal();
  for (const type of ['hyacinth', 'monitor', 'flood']) {
    const list = ofType(canal, type);
    assert.ok(list.length > 0, type);
    for (const m of list) assert.equal(tileAt(canal.def, m.x, m.y), MONSTERS[type].habitat, `${type} on its habitat`);
  }
});

test('hyacinth hits slow you down; the slow wears off', async () => {
  const { canal, p, now, run } = await inCanal();
  const h = ofType(canal, 'hyacinth')[0];
  canal.applyOnHit(h, p, now());
  run(100);
  assert.equal(p.speed, PLAYER_SPEED * MONSTERS.hyacinth.onHit.slow.factor);
  run(3200);
  assert.equal(p.speed, PLAYER_SPEED);
});

test('monitor bites poison you for damage over time', async () => {
  const { canal, p, a, now, run } = await inCanal();
  const m = ofType(canal, 'monitor')[0];
  p.x = 1;
  p.y = 5; // far from everything so only the poison hurts
  canal.applyOnHit(m, p, now());
  const hp = p.hp;
  run(5500);
  const ticks = a.inbox.filter((x) => x.t === 'hit' && x.poison && x.d === p.id).length;
  assert.equal(ticks, 5);
  assert.ok(p.hp <= hp - 5 * MONSTERS.monitor.onHit.poison.dmg + 5, 'poison damage applied (minus a little regen)');
  assert.equal(p.poison, null);
});

test('the flood telegraphs its wave; only players who stay inside get hit', async () => {
  const { world, canal, p, a, run } = await inCanal(4, 'Tank');
  const b = await join(world, 'Runner');
  const q = b.player();
  world.transfer(q, 'canal', 1, 5);
  const boss = ofType(canal, 'flood')[0];
  for (const x of [p, q]) Object.assign(x.stats, { maxHp: 9999 }), (x.hp = 9999);
  standNear(canal, p, boss, 1);
  boss.aggro = p.id;
  standNear(canal, q, boss, -1);
  const w = MONSTERS.flood.wave;
  run(w.every + 100);
  assert.ok(a.inbox.some((m) => m.t === 'fx' && m.fx === 'wave' && m.id === boss.id), 'wave telegraphed');
  q.x = 1;
  q.y = 5; // Runner steps out during the wind-up
  run(w.windup + 200);
  const waveHits = a.inbox.filter((m) => m.t === 'hit' && m.wave);
  assert.ok(waveHits.some((m) => m.d === p.id), 'Tank got soaked');
  assert.ok(!waveHits.some((m) => m.d === q.id), 'Runner dodged');
});

test('boss loot and EXP go to everyone who pulled their weight', async () => {
  const { world, canal, p, now } = await inCanal(4, 'Leader');
  const b = await join(world, 'Helper');
  const c = await join(world, 'Leecher');
  const [q, r] = [b.player(), c.player()];
  world.transfer(q, 'canal', 2, 5);
  world.transfer(r, 'canal', 3, 5);
  const boss = ofType(canal, 'flood')[0];
  const expBefore = [p, q, r].map((x) => x.profile.exp + x.profile.level * 1e6);
  canal.damageMonster(boss, q, { n: 200 }, now());
  canal.damageMonster(boss, r, { n: 5 }, now());
  canal.damageMonster(boss, p, { n: 9999 }, now());
  const badges = [...canal.drops.values()].filter((d) => d.item === 'flood_badge');
  assert.deepEqual(new Set(badges.map((d) => d.owner)), new Set([p.id, q.id]));
  const gained = [p, q, r].map((x, i) => x.profile.exp + x.profile.level * 1e6 > expBefore[i]);
  assert.deepEqual(gained, [true, true, false]);
});

test('the bot drinks the best potion for the HP it is missing', async () => {
  const { canal, p, now } = await inCanal();
  p.profile.inv.oliang = 5;
  p.profile.inv.chayen = 5;
  p.hp = p.stats.maxHp - 60;
  canal.usePotion(p, now());
  assert.equal(p.profile.inv.oliang, 4, 'small wound: oliang');
  p.hp = p.stats.maxHp - ITEMS.chayen.heal - 10;
  p.potionReadyAt = 0;
  canal.usePotion(p, now());
  assert.equal(p.profile.inv.chayen, 4, 'big wound: chayen');
});

test('canal fashion: hyacinth hat and flood-rescue raincoat are craftable', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Weaver');
  const p = a.player();
  const tailor = world.rooms.get('market').def.npcs.find((n) => n.kind === 'tailor');
  Object.assign(p, { x: tailor.x, y: tailor.y + 1 });
  for (const id of ['hat_hyacinth', 'raincoat']) {
    const r = RECIPES[id];
    for (const [k, n] of Object.entries(r.items)) p.profile.inv[k] = (p.profile.inv[k] ?? 0) + n;
    p.profile.coins += r.coins;
    a.client.message({ t: 'craft', id });
    assert.equal(p.profile.equip[ITEMS[id].slot], id);
  }
  assert.ok(dist(p, tailor) < 3);
});
