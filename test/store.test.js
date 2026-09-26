import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { newProfile } from '../shared/constants.js';
import { LoginLimiter, hashPassword, verifyPassword } from '../server/auth.js';
import { JsonStore, MemoryStore, PLAYERS_TABLE, PgStore } from '../server/store.js';

test('passwords are salted and verified', async () => {
  const a = await hashPassword('hunter22');
  const b = await hashPassword('hunter22');
  assert.notEqual(a, b, 'salted');
  assert.equal(await verifyPassword('hunter22', a), true);
  assert.equal(await verifyPassword('hunter23', a), false);
  assert.equal(await verifyPassword('hunter22', 'garbage'), false);
});

test('login limiter blocks after max failures and expires', () => {
  let t = 0;
  const lim = new LoginLimiter({ max: 2, windowMs: 1000, now: () => t });
  lim.fail('a');
  assert.equal(lim.blocked('a'), false);
  lim.fail('a');
  assert.equal(lim.blocked('a'), true);
  t = 1500;
  assert.equal(lim.blocked('a'), false);
});

// Every store must pass the same contract.
function contract(name, makeStore) {
  describe(`${name} contract`, () => {
    test('create, get, save round-trip; duplicate create refused', async () => {
      const store = await makeStore();
      const key = `p${Math.random().toString(36).slice(2, 10)}`;
      const rec = { key, passHash: 'scrypt$aa$bb', profile: newProfile(key) };
      assert.equal(await store.get(key), null);
      assert.equal(await store.create(rec), true);
      assert.equal(await store.create(rec), false);
      const got = await store.get(key);
      assert.equal(got.passHash, rec.passHash);
      assert.deepEqual(got.profile, rec.profile);
      await store.save({ ...rec, profile: { ...rec.profile, coins: 999 } });
      assert.equal((await store.get(key)).profile.coins, 999);
      await store.close();
    });
  });
}

contract('MemoryStore', () => new MemoryStore());

const dir = mkdtempSync(join(tmpdir(), 'bangli-'));
after(() => rmSync(dir, { recursive: true, force: true }));
contract('JsonStore', () => new JsonStore(join(dir, 'players.json'), { debounceMs: 1 }));

test('JsonStore persists to disk', async () => {
  const file = join(dir, 'persist.json');
  const a = new JsonStore(file);
  await a.create({ key: 'somchai', passHash: 'scrypt$aa$bb', profile: newProfile('Somchai') });
  await a.close();
  assert.equal((await new JsonStore(file).get('somchai')).profile.name, 'Somchai');
});

test('PgStore only touches blfs_-prefixed tables', async () => {
  const sql = [];
  const pool = { query: async (text) => (sql.push(text), { rows: [], rowCount: 1 }) };
  const store = new PgStore(pool);
  const rec = { key: 'somchai', passHash: 'x', profile: newProfile('Somchai') };
  await store.get('somchai');
  await store.create(rec);
  await store.save(rec);
  assert.equal(PLAYERS_TABLE, 'blfs_players');
  for (const text of sql) {
    assert.match(text, /\bblfs_players\b/);
    assert.doesNotMatch(text, /\b(FROM|INTO)\s+players\b/i);
  }
});

// Runs when a database is available (always in CI; locally set TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;
if (url) contract('PgStore', () => PgStore.connect(url));
else test('PgStore contract (set TEST_DATABASE_URL to run)', { skip: 'no TEST_DATABASE_URL' }, () => {});
