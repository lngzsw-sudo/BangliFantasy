import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORTUNES, FORTUNE_STICKS, ITEMS, MONSTERS, STAGE, STARS, bountyDay, playerStats } from '../shared/constants.js';
import { activeFortune, drawFortune, pickStar, rollStar } from '../server/fair.js';
import { join, makeWorld } from './helpers.js';

const last = (c, t) => c.inbox.filter((m) => m.t === t).at(-1);

async function atFair(world, name, x, y) {
  const c = await join(world, name);
  world.transfer(c.player(), 'fair', x, y);
  return c;
}

test('the market has a west exit to the temple fair and back; the fair is a safe zone', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Visitor');
  const p = a.player();
  world.transfer(p, 'market', 2, 8);
  a.client.message({ t: 'move', x: 0, y: 8 });
  run(2000);
  assert.equal(p.roomId, 'fair');
  const fair = world.rooms.get('fair');
  assert.equal(fair.safe, true);
  assert.equal(fair.monsters.size, 0);
  a.client.message({ t: 'move', x: 33, y: 7 });
  run(3000);
  assert.equal(p.roomId, 'market');
});

test('เซียมซี: one stick a day, same stick if you draw again, a new one tomorrow', () => {
  const profile = { fortune: null };
  const day1 = Date.UTC(2026, 8, 1, 3);
  const f = drawFortune(profile, day1, () => 0.5);
  assert.equal(f.stick, 1 + Math.floor(0.5 * FORTUNE_STICKS));
  assert.equal(f.buff, FORTUNES[(f.stick - 1) % FORTUNES.length].buff);
  const again = drawFortune(profile, day1 + 3600_000, () => 0);
  assert.equal(again.again, true);
  assert.equal(again.stick, f.stick);
  assert.equal(activeFortune(profile, day1 + 24 * 3600_000), null, 'expires at Bangkok midnight');
  const next = drawFortune(profile, day1 + 24 * 3600_000, () => 0);
  assert.equal(next.stick, 1);
  assert.equal(profile.fortune.day, bountyDay(day1 + 24 * 3600_000));
});

test('เซียมซี at the shrine: must stand at the altar; the fortune shows in the profile', async () => {
  const { world, now, run } = makeWorld();
  const far = await atFair(world, 'FarAway', 30, 12);
  far.client.message({ t: 'fortune_draw' });
  assert.ok(!far.inbox.some((m) => m.t === 'fortune'));
  const c = await atFair(world, 'Believer', 16, 5);
  c.client.message({ t: 'fortune_draw' });
  const f = last(c, 'fortune');
  assert.ok(f.stick >= 1 && f.stick <= FORTUNE_STICKS);
  run(200);
  assert.equal(last(c, 'me').me.fortune.stick, f.stick);
  assert.deepEqual(activeFortune(c.player().profile, now()).buff, f.buff);
});

test('fortune buffs: EXP from kills and HP from drinks', async () => {
  const { world, now } = makeWorld(3);
  const c = await join(world, 'Lucky');
  const p = c.player();
  const alley = world.rooms.get('alley');
  const rat = [...alley.monsters.values()].find((m) => m.type === 'rat');
  Object.assign(p.profile, { level: MONSTERS.rat.level, exp: 0 });
  p.stats = playerStats(p.profile);
  world.transfer(p, 'alley', Math.round(rat.x), Math.round(rat.y));
  const expStick = 1 + FORTUNES.findIndex((f) => f.buff === 'exp');
  p.profile.fortune = { day: bountyDay(now()), stick: expStick };
  alley.damageMonster(rat, p, { n: 99999 }, now());
  assert.equal(p.profile.exp, Math.round(MONSTERS.rat.exp * (1 + FORTUNES[expStick - 1].v)));

  const healStick = 1 + FORTUNES.findIndex((f) => f.buff === 'heal');
  p.profile.fortune = { day: bountyDay(now()), stick: healStick };
  p.stats.maxHp = 1000;
  p.hp = 100;
  p.profile.inv.oliang = 1;
  alley.usePotion(p, now(), 'oliang');
  assert.equal(p.hp, 100 + Math.round(ITEMS.oliang.heal * (1 + FORTUNES[healStick - 1].v)));
});

test('สอยดาว: costs coins, pays back less than it costs on average, rare repeats become coins', () => {
  const total = STARS.prizes.reduce((n, p) => n + p.w, 0);
  const price = (id) => ({ oliang: 10, chayen: 35, junk: 2 })[id] ?? 0;
  const ev = STARS.prizes.filter((p) => !p.rare).reduce((n, p) => n + (p.w / total) * (p.coins ?? price(p.item) * p.n), 0);
  assert.ok(ev < STARS.price * 0.8, `average non-rare payout ${ev.toFixed(1)}`);
  for (const p of STARS.prizes) if (p.item) assert.ok(ITEMS[p.item], p.item);

  const poor = { coins: STARS.price - 1, inv: {} };
  assert.ok(pickStar(poor, () => 0).error);
  assert.equal(poor.coins, STARS.price - 1);

  // rng -> the last prize (the rarest)
  const top = () => 0.9999;
  assert.equal(rollStar(top).item, 'shirt_flower');
  const fan = { coins: 1000, inv: {} };
  const first = pickStar(fan, top);
  assert.equal(first.item, 'shirt_flower');
  assert.equal(fan.inv.shirt_flower, 1);
  assert.equal(fan.coins, 1000 - STARS.price);
  const dupe = pickStar(fan, top);
  assert.equal(dupe.coins, STARS.duplicateCoins);
  assert.equal(fan.inv.shirt_flower, 1);
  assert.equal(fan.coins, 1000 - 2 * STARS.price + STARS.duplicateCoins);
});

test('สอยดาว at the booth: needs to be near it, announces rare wins', async () => {
  const { world } = makeWorld();
  const c = await atFair(world, 'Gambler', 8, 4);
  const p = c.player();
  p.profile.coins = 500;
  c.client.message({ t: 'stars_pick', i: 3 });
  const res = last(c, 'stars');
  assert.equal(res.i, 3);
  assert.ok(res.text);
  assert.equal(p.profile.coins, 500 - STARS.price + (res.coins ?? 0), 'paid for the star');
  c.client.message({ t: 'stars_pick', i: 99 });
  assert.equal(c.inbox.filter((m) => m.t === 'stars').length, 1, 'bad star index ignored');
  world.transfer(p, 'fair', 30, 12);
  c.client.message({ t: 'stars_pick', i: 1 });
  assert.equal(c.inbox.filter((m) => m.t === 'stars').length, 1, 'too far from the booth');
});

test('dance stage: copy the DJ on stage to score; the best dancer wins coins', async () => {
  const { world, run } = makeWorld(5);
  const fair = world.rooms.get('fair');
  const star = await atFair(world, 'Dancer', 25, 11);
  const sloppy = await atFair(world, 'Sloppy', 26, 12);
  const crowd = await atFair(world, 'Watcher', 10, 8);
  const coins = [star, sloppy].map((c) => c.player().profile.coins);
  let calls = 0;
  for (let t = 0; t < 60_000 && !star.inbox.some((m) => m.t === 'stage' && m.ev === 'end'); t += 100) {
    run(100);
    const call = star.inbox.filter((m) => m.t === 'stage' && m.ev === 'call').at(-1);
    if (call && call.i > calls) {
      calls = call.i;
      star.client.message({ t: 'emote', e: call.e });
      sloppy.client.message({ t: 'emote', e: call.e === 'wai' ? 'dance' : 'wai' });
      crowd.client.message({ t: 'emote', e: call.e });
      star.client.message({ t: 'emote', e: call.e }); // a second emote in the same call doesn't count again
    }
  }
  assert.equal(calls, STAGE.calls);
  const hits = star.inbox.filter((m) => m.t === 'stage' && m.ev === 'hit');
  assert.equal(hits.length, STAGE.calls);
  assert.ok(hits.every((h) => h.ok));
  assert.ok(sloppy.inbox.filter((m) => m.ev === 'hit').every((h) => !h.ok));
  assert.ok(!crowd.inbox.some((m) => m.ev === 'hit'), 'only players on stage take part');
  const end = last(star, 'stage');
  assert.equal(end.ev, 'end');
  assert.deepEqual(end.results.map((r) => [r.name, r.score, r.win]), [['Dancer', STAGE.calls, true]]);
  assert.equal(star.player().profile.coins, coins[0] + STAGE.prizeTop);
  assert.equal(sloppy.player().profile.coins, coins[1]);
  assert.equal(fair.stage.phase, 'idle');
});

test('dance stage waits for someone to get on stage', () => {
  const { world, run } = makeWorld();
  const fair = world.rooms.get('fair');
  run(STAGE.everyMs * 2);
  assert.equal(fair.stage.phase, 'idle');
});
