import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
      await store.save({ ...rec, recoveryHash: 'scrypt$cc$dd', profile: { ...rec.profile, coins: 999 } });
      const saved = await store.get(key);
      assert.equal(saved.profile.coins, 999);
      assert.equal(saved.recoveryHash, 'scrypt$cc$dd');

      const hash = `h${key}`;
      const future = Date.now() + 60_000;
      await store.createSession({ hash, key, expiresAt: future });
      assert.equal((await store.getSession(hash)).key, key);
      await store.deleteSession(hash);
      assert.equal(await store.getSession(hash), null);
      await store.createSession({ hash: `${hash}1`, key, expiresAt: future });
      await store.createSession({ hash: `${hash}2`, key, expiresAt: future });
      await store.deleteSessionsFor(key);
      assert.equal(await store.getSession(`${hash}2`), null);
      await store.close();
    });
  });
}

contract('MemoryStore', () => new MemoryStore());

const dir = mkdtempSync(join(tmpdir(), 'bangli-'));
after(() => rmSync(dir, { recursive: true, force: true }));
contract('JsonStore', () => new JsonStore(join(dir, 'players.json'), { debounceMs: 1 }));

test('JsonStore persists players and sessions, and reads the old file format', async () => {
  const file = join(dir, 'persist.json');
  const a = new JsonStore(file);
  await a.create({ key: 'somchai', passHash: 'scrypt$aa$bb', profile: newProfile('Somchai') });
  await a.createSession({ hash: 'abc', key: 'somchai', expiresAt: 1 });
  await a.close();
  const b = new JsonStore(file);
  assert.equal((await b.get('somchai')).profile.name, 'Somchai');
  assert.equal((await b.getSession('abc')).key, 'somchai');

  const legacy = join(dir, 'legacy.json');
  writeFileSync(legacy, JSON.stringify({ mali: { passHash: 'scrypt$aa$bb', profile: newProfile('Mali') } }));
  assert.equal((await new JsonStore(legacy).get('mali')).profile.name, 'Mali');
});

test('PgStore only touches blfs_-prefixed tables', async () => {
  const sql = [];
  const pool = { query: async (text) => (sql.push(text), { rows: [], rowCount: 1 }) };
  const store = new PgStore(pool);
  const rec = { key: 'somchai', passHash: 'x', profile: newProfile('Somchai') };
  await store.get('somchai');
  await store.create(rec);
  await store.save(rec);
  await store.createSession({ hash: 'h', key: 'somchai', expiresAt: Date.now() });
  await store.getSession('h');
  await store.deleteSession('h');
  await store.deleteSessionsFor('somchai');
  assert.equal(PLAYERS_TABLE, 'blfs_players');
  for (const text of sql) {
    assert.match(text, /\bblfs_(players|sessions)\b/);
    assert.doesNotMatch(text, /\b(FROM|INTO|UPDATE)\s+(?!blfs_|SET\b)\w+/i);
  }
});

// Runs when a database is available (always in CI; locally set TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;
if (url) contract('PgStore', () => PgStore.connect(url));
else test('PgStore contract (set TEST_DATABASE_URL to run)', { skip: 'no TEST_DATABASE_URL' }, () => {});
