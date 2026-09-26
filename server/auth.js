import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export { PASSWORD_MAX, PASSWORD_MIN } from '../shared/constants.js';

// Stored as "scrypt$<salt hex>$<hash hex>".
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [algo, saltHex, hashHex] = String(stored ?? '').split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Recovery codes: shown to the player once, stored only as a scrypt hash.
// No 0/O/1/I/L so they're easy to copy by hand. Format: XXXX-XXXX-XXXX.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRecoveryCode() {
  const chars = Array.from({ length: 12 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

// Case, spaces and dashes don't matter when typing the code back in.
export function normalizeRecoveryCode(code) {
  return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// "Remember me" tokens are long random strings; the store keeps only a SHA-256.
export const SESSION_DAYS = 30;
export const newSessionToken = () => randomBytes(32).toString('hex');
export const hashSessionToken = (token) => createHash('sha256').update(String(token)).digest('hex');

// Slows down password guessing: after `max` failures for a name within
// `windowMs`, further attempts for that name are refused until it expires.
export class LoginLimiter {
  constructor({ max = 5, windowMs = 5 * 60_000, now = () => Date.now() } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.failures = new Map();
  }

  blocked(key) {
    const f = this.failures.get(key);
    if (!f) return false;
    if (this.now() - f.first > this.windowMs) {
      this.failures.delete(key);
      return false;
    }
    return f.count >= this.max;
  }

  fail(key) {
    const f = this.failures.get(key);
    if (!f || this.now() - f.first > this.windowMs) this.failures.set(key, { first: this.now(), count: 1 });
    else f.count++;
  }

  succeed(key) {
    this.failures.delete(key);
  }
}
