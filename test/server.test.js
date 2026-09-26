import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MINIGAME, RECIPES } from '../shared/constants.js';
import { addExp, killExp, rollDamage } from '../server/combat.js';
import { MemoryMatch } from '../server/minigame.js';
import { cleanChat } from '../server/world.js';
import { errorText, join, makeWorld, mulberry32 } from './helpers.js';

test('rollDamage respects miss, block, crit and defence', () => {
  assert.equal(rollDamage({ atk: 10 }, {}, () => 0).miss, true);
  const seq = [0.5, 0.0];
  assert.equal(rollDamage({ atk: 10 }, { block: 0.3 }, () => seq.shift()).block, true);
  const crit = rollDamage({ atk: 10, crit: 1 }, { def: 0 }, () => 0.5);
  assert.equal(crit.crit, true);
  assert.equal(crit.n, 18);
  assert.equal(rollDamage({ atk: 1 }, { def: 99 }, () => 0.5).n, 1);
});

test('killExp falls off once you out-level a monster', () => {
  assert.equal(killExp(10, 2, 5), 10);
  assert.equal(killExp(10, 2, 6), 8);
  assert.equal(killExp(10, 2, 20), 1);
});

test('addExp levels up through several thresholds', () => {
  const profile = { level: 1, exp: 0 };
  assert.equal(addExp(profile, 1000) > 1, true);
  assert.ok(profile.exp >= 0);
});

test('memory match: server reveals cards, detects pairs and pays out', () => {
  const g = new MemoryMatch(mulberry32(3));
  const where = new Map();
  g.deck.forEach((sym, i) => where.set(sym, [...(where.get(sym) ?? []), i]));
  assert.ok(g.flip(99).error);
  let last;
  for (const [a, b] of where.values()) {
    g.flip(a);
    last = g.flip(b);
    assert.deepEqual(last.match, [a, b]);
  }
  assert.equal(last.done, true);
  assert.equal(last.reward, MINIGAME.rewardMax);
  assert.ok(g.flip(0).error);
});

test('memory match: a mismatch is hidden again on the next flip', () => {
  const g = new MemoryMatch(mulberry32(4));
  const a = 0;
  const b = g.deck.findIndex((s, i) => i > 0 && s !== g.deck[0]);
  assert.deepEqual(g.flip(a) && g.flip(b).miss, [a, b]);
  assert.equal(g.flip(a).error, undefined, 'card closes again and can be re-flipped');
});

test('cleanChat strips control chars and caps length', () => {
  assert.equal(cleanChat('  สวัสดี\u0000​   ตลาด  '), 'สวัสดี ตลาด');
  assert.equal(cleanChat('x'.repeat(500)).length, 80);
});

test('register spawns in the market; names are unique', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'สมชาย');
  const room = a.inbox.find((m) => m.t === 'room');
  assert.equal(room.room, 'market');
  assert.ok(room.ents.some((e) => e.id === a.id));

  const dup = await join(world, 'สมชาย', { password: 'another-pass' });
  assert.equal(dup.id, undefined);
  assert.match(errorText(dup), /มีคนใช้แล้ว/);
  assert.equal((await join(world, 'x')).id, undefined, 'bad name');
  assert.equal((await join(world, 'Shorty', { password: '123' })).id, undefined, 'short password');
});

test('login checks the password and locks out after repeated failures', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Owner', { password: 'correct-horse' });
  a.client.disconnect();
  assert.match(errorText(await join(world, 'Nobody', { mode: 'login' })), /ไม่พบ/);
  for (let i = 0; i < 5; i++) {
    const bad = await join(world, 'owner', { password: 'wrong-pass', mode: 'login' });
    assert.match(errorText(bad), /รหัสผ่านไม่ถูกต้อง/);
  }
  const locked = await join(world, 'Owner', { password: 'correct-horse', mode: 'login' });
  assert.match(errorText(locked), /รอ 5 นาที/);
});

test('logging in again kicks the old session and keeps its latest progress', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Twice');
  a.player().profile.coins = 555;
  const b = await join(world, 'twice', { mode: 'login' });
  assert.ok(a.inbox.some((m) => m.t === 'closed'));
  assert.equal(b.player().profile.coins, 555);
  assert.equal(world.online.size, 1);
});

test('chat and emotes reach everyone in the room', async () => {
  const { world, now } = makeWorld();
  const a = await join(world, 'Alice');
  const b = await join(world, 'Bob');
  assert.ok(a.inbox.some((m) => m.t === 'join' && m.e.id === b.id));
  a.client.message({ t: 'chat', text: 'ไปกินโอเลี้ยงกัน' });
  a.client.message({ t: 'emote', e: 'wai' });
  assert.ok(b.inbox.some((m) => m.t === 'chat' && m.id === a.id && m.text === 'ไปกินโอเลี้ยงกัน'));
  assert.ok(b.inbox.some((m) => m.t === 'emote' && m.id === a.id && m.e === 'wai'));
  // Rate limit: a second message within the cooldown is dropped.
  a.client.message({ t: 'chat', text: 'spam' });
  assert.ok(!b.inbox.some((m) => m.t === 'chat' && m.text === 'spam'));
  assert.ok(now());
});

test('walking onto the portal moves the player to the alley and back', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Walker');
  a.client.message({ t: 'move', x: 31, y: 8 });
  run(8000);
  assert.equal(a.player().roomId, 'alley');
  assert.ok(a.inbox.some((m) => m.t === 'room' && m.room === 'alley' && m.ents.some((e) => e.k === 'm')));
  a.client.message({ t: 'move', x: 0, y: 7 });
  run(3000);
  assert.equal(a.player().roomId, 'market');
});

test('no fighting in the safe zone', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Pacifist');
  a.client.message({ t: 'attack', id: 'm1' });
  a.client.message({ t: 'auto', on: true });
  assert.equal(a.player().auto.on, false);
  assert.ok(a.inbox.some((m) => m.t === 'toast'));
});

test('click-attack kills a rat, which drops coins that get picked up', async () => {
  const { world, run } = makeWorld(7);
  const a = await join(world, 'Hunter');
  const p = a.player();
  world.transfer(p, 'alley', 1, 6);
  const alley = world.rooms.get('alley');
  const rat = [...alley.monsters.values()].sort((m, n) => m.x - n.x)[0];
  const coinsBefore = p.profile.coins;
  a.client.message({ t: 'attack', id: rat.id });
  run(20000);
  assert.ok(a.inbox.some((m) => m.t === 'hit' && m.a === p.id && m.d === rat.id), 'damage numbers sent');
  assert.ok(a.inbox.some((m) => m.t === 'die' && m.id === rat.id), 'rat died');
  assert.ok(p.profile.coins > coinsBefore, 'coins looted');
  assert.ok(p.profile.exp > 0 || p.profile.level > 1, 'exp gained');
});

test('auto-farm hunts rats on its own and drinks potions', async () => {
  const { world, run } = makeWorld(11);
  const a = await join(world, 'Botter');
  const p = a.player();
  world.transfer(p, 'alley', 1, 6);
  a.client.message({ t: 'auto', on: true, pct: 90 });
  assert.equal(p.auto.on, true);
  p.hp = 10;
  const potions = p.profile.inv.oliang;
  run(60000);
  const kills = a.inbox.filter((m) => m.t === 'die' && m.id.startsWith('m')).length;
  assert.ok(kills >= 3, `bot killed ${kills} rats`);
  assert.ok(p.profile.inv.oliang < potions, 'bot drank a potion');
  assert.ok(a.inbox.some((m) => m.t === 'me' && m.me.coins > 20));
  // A manual move hands control back to the player.
  a.client.message({ t: 'move', x: 5, y: 6 });
  assert.equal(p.auto.on, false);
});

test('dying sends you back to the market at half HP', async () => {
  const { world, run } = makeWorld(5);
  const a = await join(world, 'Unlucky');
  const p = a.player();
  world.transfer(p, 'alley', 1, 6);
  const alley = world.rooms.get('alley');
  alley.killPlayer(p, world.now());
  run(3500);
  assert.equal(p.dead, false);
  assert.equal(p.roomId, 'market');
  assert.ok(p.hp > 0 && p.hp < p.stats.maxHp * 0.6);
});

test('grind-to-drip: craft the vest at the tailor, it is equipped and broadcast', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Fashion');
  const b = await join(world, 'Watcher');
  const p = a.player();
  const recipe = RECIPES.vest_win;

  a.client.message({ t: 'craft', id: 'vest_win' });
  assert.equal(p.profile.inv.vest_win, undefined, 'too far from the tailor');

  const market = world.rooms.get('market');
  const tailor = market.def.npcs.find((n) => n.kind === 'tailor');
  p.x = tailor.x;
  p.y = tailor.y + 1;
  a.client.message({ t: 'craft', id: 'vest_win' });
  assert.equal(p.profile.inv.vest_win, undefined, 'not enough junk yet');

  p.profile.inv.junk = recipe.items.junk;
  p.profile.coins = recipe.coins + 1;
  a.client.message({ t: 'craft', id: 'vest_win' });
  assert.equal(p.profile.inv.vest_win, 1);
  assert.equal(p.profile.inv.junk, 0);
  assert.equal(p.profile.coins, 1);
  assert.equal(p.profile.equip.body, 'vest_win');
  assert.ok(b.inbox.some((m) => m.t === 'look' && m.id === p.id && m.body === 'vest_win'));
});

test('buying potions and weapons at the right NPC', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Shopper');
  const p = a.player();
  const npc = world.rooms.get('market').def.npcs.find((n) => n.kind === 'cafe');
  p.x = npc.x;
  p.y = npc.y + 1;
  const before = p.profile.inv.oliang;
  a.client.message({ t: 'buy', npc: 'cafe', item: 'oliang' });
  assert.equal(p.profile.inv.oliang, before + 1);
  a.client.message({ t: 'buy', npc: 'cafe', item: 'spatula' });
  assert.equal(p.profile.inv.spatula, undefined, 'cafe does not sell weapons');
  a.client.message({ t: 'buy', npc: 'grocery', item: 'spatula' });
  assert.equal(p.profile.inv.spatula, undefined, 'too far from the grocery');
});

test('minigame over the wire pays coins', async () => {
  const { world } = makeWorld(9);
  const a = await join(world, 'Gamer');
  const p = a.player();
  a.client.message({ t: 'mg_open' });
  const deck = p.mg.deck;
  const where = new Map();
  deck.forEach((s, i) => where.set(s, [...(where.get(s) ?? []), i]));
  const coins = p.profile.coins;
  for (const [x, y] of where.values()) {
    a.client.message({ t: 'mg_flip', i: x });
    a.client.message({ t: 'mg_flip', i: y });
  }
  assert.ok(a.inbox.some((m) => m.t === 'mg' && m.done));
  assert.equal(p.profile.coins, coins + MINIGAME.rewardMax);
  assert.equal(p.mg, null);
});

test('progress is saved on disconnect and restored on login', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Saver');
  a.player().profile.coins = 777;
  a.client.disconnect();
  assert.equal(world.online.size, 0);
  const again = await join(world, 'Saver', { mode: 'login' });
  assert.equal(again.player().profile.coins, 777);
});

test('garbage messages are ignored', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Fuzzer');
  for (const msg of [null, 1, {}, { t: 'constructor' }, { t: 'move', x: 'a' }, { t: 'equip', item: '__proto__' }, { t: 'buy', npc: 'cafe', item: 'toString' }]) {
    a.client.message(msg);
  }
  assert.equal(a.player().roomId, 'market');
});
