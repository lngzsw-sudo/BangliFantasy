import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashSessionToken, normalizeRecoveryCode } from '../server/auth.js';
import { errorText, join, makeWorld } from './helpers.js';

const DAY = 24 * 3600 * 1000;
const welcomeOf = (c) => c.inbox.find((m) => m.t === 'welcome');

test('registering shows a recovery code once; remember-me hands out a device token', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Somsri', { remember: true });
  const w = welcomeOf(a);
  assert.match(w.recoveryCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.match(w.session, /^[0-9a-f]{64}$/);
  a.client.disconnect();
  const again = await join(world, 'Somsri', { mode: 'login' });
  assert.equal(welcomeOf(again).recoveryCode, undefined, 'the code is not shown again');
  assert.equal(welcomeOf(again).session, undefined, 'no token unless asked to remember');
});

test('a remembered device logs straight in, until it expires or logs out', async () => {
  const { world, skip } = makeWorld();
  const a = await join(world, 'Device', { remember: true });
  const token = welcomeOf(a).session;
  a.client.disconnect();

  const auto = await join(world, 'device', { mode: 'session', session: token, password: undefined });
  assert.ok(auto.id, 'auto-login works');
  assert.equal(welcomeOf(auto).session, token);
  auto.client.message({ t: 'logout', session: token });
  await new Promise((r) => setTimeout(r, 20));
  auto.client.disconnect();
  const after = await join(world, 'Device', { mode: 'session', session: token, password: undefined });
  assert.equal(after.inbox.find((m) => m.t === 'error').code, 'session');

  const b = await join(world, 'Device', { mode: 'login', remember: true });
  const token2 = welcomeOf(b).session;
  b.client.disconnect();
  skip(31 * DAY);
  const expired = await join(world, 'Device', { mode: 'session', session: token2, password: undefined });
  assert.equal(expired.id, undefined, 'expired after 30 days');

  const wrongOwner = await join(world, 'Other', { mode: 'session', session: token2, password: undefined });
  assert.equal(wrongOwner.id, undefined, "a token only works for its own character");
});

test('forgot password: the recovery code resets it, rotates the code and signs out devices', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Forgetful', { password: 'old-password', remember: true });
  const { recoveryCode, session } = welcomeOf(a);
  a.player().profile.coins = 321;
  a.client.disconnect();

  const bad = await join(world, 'Forgetful', { mode: 'recover', code: 'AAAA-BBBB-CCCC', password: 'new-password' });
  assert.match(errorText(bad), /รหัสกู้คืนไม่ถูกต้อง/);

  // Lower case and missing dashes are fine.
  const typed = normalizeRecoveryCode(recoveryCode).toLowerCase();
  const ok = await join(world, 'forgetful', { mode: 'recover', code: typed, password: 'new-password' });
  assert.ok(ok.id);
  assert.equal(ok.player().profile.coins, 321, 'progress kept');
  const newCode = welcomeOf(ok).recoveryCode;
  assert.ok(newCode && newCode !== recoveryCode, 'a new code replaces the used one');
  ok.client.disconnect();

  assert.match(errorText(await join(world, 'Forgetful', { mode: 'login', password: 'old-password' })), /ไม่ถูกต้อง/);
  assert.ok((await join(world, 'Forgetful', { mode: 'login', password: 'new-password' })).id);
  assert.equal(await world.store.getSession(hashSessionToken(session)), null, 'remembered devices signed out');
  const reused = await join(world, 'Other', { mode: 'recover', code: recoveryCode, password: 'x-password' });
  assert.equal(reused.id, undefined);
});

test('recovery attempts count toward the lockout', async () => {
  const { world } = makeWorld();
  (await join(world, 'Target')).client.disconnect();
  for (let i = 0; i < 5; i++) await join(world, 'Target', { mode: 'recover', code: `WRONG${i}`, password: 'hacked-pw' });
  const locked = await join(world, 'Target', { mode: 'login' });
  assert.match(errorText(locked), /รอ 5 นาที/);
});

test('accounts created before recovery codes get one at their next login', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Veteran');
  const rec = await world.store.get('veteran');
  a.client.disconnect();
  await new Promise((r) => setTimeout(r, 20));
  await world.store.save({ ...rec, recoveryHash: null });
  const b = await join(world, 'Veteran', { mode: 'login' });
  assert.match(welcomeOf(b).recoveryCode, /-/);
});

test('a new recovery code can be issued in game with the current password', async () => {
  const { world } = makeWorld();
  const a = await join(world, 'Careful', { password: 'my-password' });
  a.client.message({ t: 'recovery_new', password: 'wrong-pass' });
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(!a.inbox.some((m) => m.t === 'recovery'));
  a.client.message({ t: 'recovery_new', password: 'my-password' });
  for (let i = 0; i < 50 && !a.inbox.some((m) => m.t === 'recovery'); i++) await new Promise((r) => setTimeout(r, 10));
  const { code } = a.inbox.find((m) => m.t === 'recovery');
  a.client.disconnect();
  await new Promise((r) => setTimeout(r, 20));
  const ok = await join(world, 'Careful', { mode: 'recover', code, password: 'brand-new-pw' });
  assert.ok(ok.id);
});
