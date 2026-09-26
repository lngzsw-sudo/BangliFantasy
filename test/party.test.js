import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MONSTERS, PARTY, expToNext, playerStats } from '../shared/constants.js';
import { bountyView } from '../server/bounty.js';
import { join, makeWorld } from './helpers.js';

const last = (c, t) => c.inbox.filter((m) => m.t === t).at(-1);
const ofType = (room, type) => [...room.monsters.values()].filter((m) => m.type === type);
// Same level as the monster: full EXP, and no level-up to muddy the numbers.
const matchLevel = (p, def) => {
  Object.assign(p.profile, { level: def.level, exp: 0 });
  p.stats = playerStats(p.profile);
  assert.ok(expToNext(def.level) > def.exp);
};

// Joins `names`, levels them up and has the first one invite the rest.
async function party(world, now, names, level = 9) {
  const cs = [];
  for (const name of names) {
    const c = await join(world, name);
    const p = c.player();
    p.profile.level = level;
    p.stats = playerStats(p.profile);
    p.hp = p.stats.maxHp;
    cs.push(c);
  }
  for (const c of cs.slice(1)) {
    cs[0].client.message({ t: 'party_invite', name: c.player().profile.name });
    c.client.message({ t: 'party_accept', from: names[0] });
  }
  return cs;
}

test('invite + accept forms a party; everyone gets the member list', async () => {
  const { world, now } = makeWorld();
  const [a, b] = await party(world, now, ['Leader', 'Buddy']);
  assert.ok(b.inbox.some((m) => m.t === 'party_invite' && m.from === 'Leader'));
  for (const c of [a, b]) {
    const view = last(c, 'party').party;
    assert.deepEqual(view.members.map((m) => m.name), ['Leader', 'Buddy']);
    assert.equal(view.leader, a.id);
  }
  assert.equal(a.player().party, b.player().party);
});

test('invites: only the leader invites, they expire, and a party caps at PARTY.max', async () => {
  const { world, run, now } = makeWorld();
  const names = Array.from({ length: PARTY.max }, (_, i) => `Member${i}`);
  const cs = await party(world, now, names);
  assert.equal(cs[0].player().party.members.length, PARTY.max);

  const extra = await join(world, 'Extra');
  cs[1].client.message({ t: 'party_invite', name: 'Extra' });
  assert.ok(!extra.inbox.some((m) => m.t === 'party_invite'), 'members cannot invite');
  cs[0].client.message({ t: 'party_invite', name: 'Extra' });
  assert.match(last(cs[0], 'toast').text, /เต็ม/);

  const late = await join(world, 'Late');
  const solo = await join(world, 'Solo');
  solo.client.message({ t: 'party_invite', name: 'Late' });
  run(PARTY.inviteMs + 100);
  late.client.message({ t: 'party_accept', from: 'Solo' });
  assert.equal(late.player().party, undefined);
  assert.match(last(late, 'toast').text, /หมดอายุ/);
});

test('a kill shares EXP (with a bonus) and bounty credit with party members nearby', async () => {
  const { world, now } = makeWorld(3);
  const [a, b] = await party(world, now, ['Killer', 'Helper']);
  const outsider = await join(world, 'Outsider');
  const alley = world.rooms.get('alley');
  const today = bountyView(a.player().profile, now()).list.find((x) => x.zone === 'alley');
  const mob = ofType(alley, today.type)[0];
  const p = a.player();
  const q = b.player();
  const o = outsider.player();
  for (const x of [p, q, o]) {
    matchLevel(x, mob.def);
    world.transfer(x, 'alley', Math.round(mob.x), Math.round(mob.y));
  }
  const exp0 = [p.profile.exp, q.profile.exp, o.profile.exp];

  alley.damageMonster(mob, p, { n: 99999 }, now());

  const each = Math.round(MONSTERS[mob.type].exp * (1 + PARTY.bonus) / 2);
  assert.equal(p.profile.exp - exp0[0], each);
  assert.equal(q.profile.exp - exp0[1], each);
  assert.equal(o.profile.exp, exp0[2], 'outsiders get nothing');
  for (const x of [p, q]) {
    assert.equal(bountyView(x.profile, now()).list.find((y) => y.id === today.id).have, 1, x.profile.name);
  }
});

test('party members far away or in another room do not share the kill', async () => {
  const { world, now } = makeWorld(3);
  const [a, b] = await party(world, now, ['Killer', 'Faraway']);
  const alley = world.rooms.get('alley');
  const rat = ofType(alley, 'rat')[0];
  const p = a.player();
  for (const x of [p, b.player()]) matchLevel(x, rat.def);
  world.transfer(p, 'alley', Math.round(rat.x), Math.round(rat.y));
  const exp0 = [p.profile.exp, b.player().profile.exp];
  alley.damageMonster(rat, p, { n: 99999 }, now());
  assert.equal(p.profile.exp - exp0[0], MONSTERS.rat.exp, 'solo share when nobody is near');
  assert.equal(b.player().profile.exp, exp0[1]);
});

test("party members may loot each other's drops right away; strangers must wait", async () => {
  const { world, now } = makeWorld(3);
  const [a, b] = await party(world, now, ['Owner', 'Friend']);
  const stranger = await join(world, 'Stranger');
  const alley = world.rooms.get('alley');
  for (const c of [a, b, stranger]) world.transfer(c.player(), 'alley', 5, 5);
  const d = alley.spawnDrop('junk', 1, { x: 5, y: 5 }, a.player(), now());
  assert.equal(alley.canLoot(b.player(), d, now()), true);
  assert.equal(alley.canLoot(stranger.player(), d, now()), false);
});

test("boss loot: a party's damage counts together", async () => {
  const { world, now } = makeWorld(3);
  const [a, b] = await party(world, now, ['Tank', 'Support'], 30);
  const lone = await join(world, 'Lone');
  const canal = world.rooms.get('canal');
  const boss = ofType(canal, 'flood')[0];
  const at = { x: Math.round(boss.x), y: Math.round(boss.y) };
  for (const c of [a, b, lone]) world.transfer(c.player(), 'canal', at.x, at.y);
  const need = MONSTERS.flood.hp * MONSTERS.flood.shareLoot;
  boss.damageBy.set(a.id, need * 0.6);
  boss.damageBy.set(b.id, need * 0.5);
  boss.damageBy.set(lone.id, need * 0.9);
  const winners = canal.bossWinners(boss, a.player()).map((p) => p.profile.name);
  assert.deepEqual(winners.sort(), ['Support', 'Tank']);
});

test('party chat crosses rooms; leaving hands over the lead; the last member disbands it', async () => {
  const { world, now } = makeWorld();
  const [a, b, c] = await party(world, now, ['Boss', 'Two', 'Three']);
  const other = await join(world, 'NotInParty');
  world.transfer(c.player(), 'canal', 2, 5);
  a.client.message({ t: 'chat', text: 'ไปคลองกัน', party: true });
  assert.ok(c.inbox.some((m) => m.t === 'chat' && m.party && m.text === 'ไปคลองกัน'));
  assert.ok(!other.inbox.some((m) => m.t === 'chat' && m.text === 'ไปคลองกัน'));

  a.client.disconnect();
  assert.equal(last(b, 'party').party.leader, b.id, 'lead passes on');
  b.client.message({ t: 'party_kick', name: 'Three' });
  assert.equal(last(c, 'party').party, null);
  assert.equal(last(b, 'party').party, null, 'one member left: disbanded');
  assert.equal(world.parties.all.size, 0);
});

test('HP changes reach party members in the next sync', async () => {
  const { world, run, now } = makeWorld();
  const [a, b] = await party(world, now, ['Alpha', 'Beta']);
  const q = b.player();
  q.hp = 3;
  run(600);
  const seen = last(a, 'party').party.members.find((m) => m.name === 'Beta').hp;
  assert.ok(seen < q.stats.maxHp / 2, `synced hp ${seen}`);
});
