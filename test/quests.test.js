import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECIPES, TUTORIAL, expToNext } from '../shared/constants.js';
import { migrateProfile } from '../server/store.js';
import { questView } from '../server/quests.js';
import { join, makeWorld } from './helpers.js';

const step = (p) => p.profile.quest.step;
const done = (c) => c.inbox.filter((m) => m.t === 'quest').map((m) => m.id);

test('the tutorial chain, step by step, with rewards', async () => {
  const { world, now, run } = makeWorld(3);
  const c = await join(world, 'Newbie');
  const p = c.player();
  assert.deepEqual(questView(p.profile), { step: 0, total: TUTORIAL.length, have: 0, need: 1 });

  world.transfer(p, 'market', 3, 3);
  c.client.message({ t: 'buy', npc: 'cafe', item: 'oliang' });
  assert.equal(step(p), 1);
  assert.equal(p.profile.coins, 20 - 10 + TUTORIAL[0].reward.coins);

  const oliang = p.profile.inv.oliang;
  world.transfer(p, 'alley', 5, 5);
  assert.equal(step(p), 2);
  assert.equal(p.profile.inv.oliang, oliang + 2);

  const alley = world.rooms.get('alley');
  for (let i = 0; i < 5; i++) {
    const rat = [...alley.monsters.values()].find((m) => m.type === 'rat');
    alley.damageMonster(rat, p, { n: 9999 }, now());
  }
  assert.equal(step(p), 3);

  // Step 4 is a bag check: picking up the 5th junk completes it.
  p.profile.inv.junk = 4;
  const d = alley.spawnDrop('junk', 1, { x: 5, y: 5 }, p, now());
  alley.pickup(p, d);
  assert.equal(step(p), 4);

  world.transfer(p, 'market', 12, 3);
  p.profile.coins = Math.max(p.profile.coins, RECIPES.vest_win.coins);
  c.client.message({ t: 'craft', id: 'vest_win' });
  assert.equal(step(p), 5);

  world.transfer(p, 'alley', 5, 5);
  c.client.message({ t: 'auto', on: true });
  assert.equal(step(p), 6);
  c.client.message({ t: 'auto', on: false });

  const toNext = (lvl) => expToNext(lvl) - (lvl === p.profile.level ? p.profile.exp : 0);
  while (p.profile.level < 5) alley.grantExp(p, toNext(p.profile.level));
  assert.equal(step(p), 7);

  world.quests.event(p, 'bounty');
  assert.equal(step(p), 8);

  world.transfer(p, 'fair', 16, 5);
  c.client.message({ t: 'fortune_draw' });
  assert.equal(step(p), TUTORIAL.length);
  assert.equal(questView(p.profile), null);
  run(200);
  assert.deepEqual(done(c), TUTORIAL.map((s) => s.id));
  assert.equal(c.inbox.filter((m) => m.t === 'quest').at(-1).last, true);
});

test('events for a later step do not count early; state steps complete on their own', async () => {
  const { world } = makeWorld();
  const c = await join(world, 'Eager');
  const p = c.player();
  world.quests.event(p, 'kill', 'rat');
  assert.deepEqual([step(p), p.profile.quest.n], [0, 0]);
  // Skip ahead to the junk step while already holding 5 junk: it completes at once.
  p.profile.quest = { step: 3, n: 0 };
  p.profile.inv.junk = 6;
  world.quests.check(p);
  assert.equal(step(p), 4);
});

test('skipping the tutorial; older accounts past the basics skip it', async () => {
  const { world } = makeWorld();
  const c = await join(world, 'Veteran');
  c.client.message({ t: 'quest_skip' });
  assert.equal(questView(c.player().profile), null);
  const base = { name: 'Old', exp: 0, coins: 0, inv: {}, equip: {} };
  assert.equal(migrateProfile({ ...base, level: 7 }).quest.step, TUTORIAL.length);
  assert.equal(migrateProfile({ ...base, level: 2 }).quest.step, 0);
});
