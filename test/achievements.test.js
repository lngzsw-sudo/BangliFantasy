import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACHIEVEMENTS, ITEMS, expToNext } from '../shared/constants.js';
import { achievementView } from '../server/achievements.js';
import { migrateProfile } from '../server/store.js';
import { join, makeWorld } from './helpers.js';

const last = (c, t) => c.inbox.filter((m) => m.t === t).at(-1);
const has = (p, id) => p.profile.achievements.includes(id);

test('achievement data: unique ids, reward items exist and are wearable', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.title && a.desc && a.icon && a.req, a.id);
    if (a.item) assert.ok(['head', 'body'].includes(ITEMS[a.item]?.slot), a.item);
  }
});

test('100 rats unlock «นักล่าหนูท่อ» and its rat-ear headband; the room hears about it', async () => {
  const { world, now } = makeWorld(3);
  const a = await join(world, 'Ratcatcher');
  const b = await join(world, 'Witness');
  const p = a.player();
  world.transfer(p, 'alley', 5, 5);
  world.transfer(b.player(), 'alley', 6, 5);
  p.profile.stats.kills.rat = 99;
  const alley = world.rooms.get('alley');
  const rat = [...alley.monsters.values()].find((m) => m.type === 'rat');
  alley.damageMonster(rat, p, { n: 9999 }, now());
  assert.equal(p.profile.stats.kills.rat, 100);
  assert.ok(has(p, 'rats'));
  assert.equal(p.profile.inv.hat_ratears, 1);
  assert.deepEqual(last(a, 'achieve'), { t: 'achieve', id: 'rats', item: 'hat_ratears' });
  assert.match(last(b, 'sys').text, /นักล่าหนูท่อ/);
});

test('levels, checkers wins, dance wins, fashion and pets unlock their achievements', async () => {
  const { world } = makeWorld();
  const c = await join(world, 'Allrounder');
  const p = c.player();
  const alley = world.rooms.get('alley');
  while (p.profile.level < 10) alley.grantExp(p, expToNext(p.profile.level));
  assert.ok(has(p, 'lv10'));
  assert.ok(!has(p, 'lv20'));
  for (let i = 0; i < 10; i++) world.achievements.add(p, 'ckWins');
  assert.ok(has(p, 'checkers'));
  assert.equal(p.profile.inv.hat_pakama, 1);
  for (let i = 0; i < 5; i++) world.achievements.add(p, 'danceWins');
  assert.ok(has(p, 'dance'));
  // hat_pakama + shirt_disco + 4 more
  Object.assign(p.profile.inv, { vest_win: 1, hat_straw: 1, raincoat: 1, hat_lion: 1 });
  p.profile.inv.pet_cat = 1;
  world.achievements.check(p);
  assert.ok(has(p, 'fashion'));
  assert.ok(has(p, 'pet'));
  const view = achievementView(p.profile);
  assert.equal(view.list.find((x) => x.id === 'lv20').have, 10);
  assert.equal(view.list.find((x) => x.id === 'rats').need, 100);
});

test('titles: only unlocked ones, shown to the room and to newcomers', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Showoff');
  const b = await join(world, 'Fan');
  const p = a.player();
  a.client.message({ t: 'title_set', id: 'lv40' });
  assert.equal(p.profile.title, null, 'not unlocked');
  p.profile.achievements.push('lv40');
  a.client.message({ t: 'title_set', id: 'lv40' });
  assert.equal(p.profile.title, 'lv40');
  assert.deepEqual(last(b, 'title'), { t: 'title', id: a.id, title: 'ตำนานบางลี่' });
  const c = await join(world, 'Newcomer');
  assert.equal(last(c, 'room').ents.find((e) => e.id === a.id).title, 'ตำนานบางลี่');
  a.client.message({ t: 'title_set', id: null });
  assert.equal(last(b, 'title').title, null);
});

test('the fortune and star counters, and old profiles get empty stats', async () => {
  const { world } = makeWorld();
  const c = await join(world, 'Believer');
  const p = c.player();
  world.transfer(p, 'fair', 16, 5);
  c.client.message({ t: 'fortune_draw' });
  c.client.message({ t: 'fortune_draw' }); // same day: doesn't count twice
  assert.equal(p.profile.stats.fortunes, 1);
  p.profile.coins = 1000;
  world.transfer(p, 'fair', 9, 4);
  c.client.message({ t: 'stars_pick', i: 0 });
  assert.equal(p.profile.stats.stars, 1);
  const old = migrateProfile({ name: 'Old', level: 3, exp: 0, coins: 0, inv: {}, equip: {} });
  assert.deepEqual([old.stats, old.achievements, old.title], [{ kills: {} }, [], null]);
});
