import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { newProfile } from '../shared/constants.js';

// Player persistence. A record is { key, passHash, recoveryHash, profile }
// where key is the lower-cased character name. Sessions ("remember me" logins)
// are { hash, key, expiresAt } keyed by the SHA-256 of the device's token.
// Every store has the same async interface:
//   get(key) / create(rec) -> false if taken / save(rec)
//   createSession(s) / getSession(hash) / deleteSession(hash) / deleteSessionsFor(key)
//   flush() / close()
// Pick one with createStore(): Postgres when DATABASE_URL is set, otherwise a
// JSON file (fine for local play, but wiped on hosts with ephemeral disks).

export class MemoryStore {
  constructor() {
    this.records = new Map();
    this.sessions = new Map();
  }

  async get(key) {
    const rec = this.records.get(key);
    return rec ? structuredClone(rec) : null;
  }

  async create(rec) {
    if (this.records.has(rec.key)) return false;
    this.records.set(rec.key, structuredClone(rec));
    this.changed();
    return true;
  }

  async save(rec) {
    this.records.set(rec.key, structuredClone(rec));
    this.changed();
  }

  async createSession(session) {
    this.sessions.set(session.hash, { ...session });
    this.changed();
  }

  // Expiry is checked by the caller (World), which owns the clock.
  async getSession(hash) {
    const s = this.sessions.get(hash);
    return s ? { ...s } : null;
  }

  async deleteSession(hash) {
    if (this.sessions.delete(hash)) this.changed();
  }

  async deleteSessionsFor(key) {
    for (const [hash, s] of this.sessions) if (s.key === key) this.sessions.delete(hash);
    this.changed();
  }

  changed() {}
  async flush() {}
  async close() {
    await this.flush();
  }
}

export class JsonStore extends MemoryStore {
  constructor(file, { debounceMs = 2000 } = {}) {
    super();
    this.file = file;
    this.debounceMs = debounceMs;
    this.timer = null;
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      // v2 files are { version, players, sessions }; older ones are a bare players map.
      const players = data.version === 2 ? data.players : data;
      for (const [key, rec] of Object.entries(players)) {
        // Guest records from the first MVP have no password and can't log in.
        if (rec.passHash) this.records.set(key, { ...rec, key });
      }
      for (const s of Object.values(data.version === 2 ? data.sessions : {})) this.sessions.set(s.hash, s);
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`[store] could not read ${file}:`, err.message);
    }
  }

  changed() {
    this.timer ??= setTimeout(() => this.flush(), this.debounceMs);
  }

  async flush() {
    clearTimeout(this.timer);
    this.timer = null;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    const data = { version: 2, players: Object.fromEntries(this.records), sessions: Object.fromEntries(this.sessions) };
    writeFileSync(tmp, JSON.stringify(data, null, 1));
    renameSync(tmp, this.file);
  }
}

// Every table this game creates starts with blfs_ (Bang Li Fantasy) so it can
// share a database with other apps without name clashes.
export const TABLE_PREFIX = 'blfs_';
export const PLAYERS_TABLE = `${TABLE_PREFIX}players`;
export const SESSIONS_TABLE = `${TABLE_PREFIX}sessions`;

// Idempotent: safe to run on every start, and upgrades older tables in place.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ${PLAYERS_TABLE} (
    name_key   TEXT PRIMARY KEY,
    pass_hash  TEXT NOT NULL,
    profile    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE ${PLAYERS_TABLE} ADD COLUMN IF NOT EXISTS recovery_hash TEXT`,
  `CREATE TABLE IF NOT EXISTS ${SESSIONS_TABLE} (
    token_hash TEXT PRIMARY KEY,
    name_key   TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS ${SESSIONS_TABLE}_name_key_idx ON ${SESSIONS_TABLE} (name_key)`,
];

export class PgStore {
  // `pool` is a pg.Pool (or anything with the same query() signature).
  constructor(pool) {
    this.pool = pool;
  }

  static async connect(url) {
    const { default: pg } = await import('pg');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const pool = new pg.Pool({
      connectionString: url,
      // Hosted Postgres (Supabase, Neon, Render) requires TLS.
      ssl: local || process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 5,
    });
    const store = new PgStore(pool);
    for (const sql of SCHEMA) await pool.query(sql);
    return store;
  }

  async get(key) {
    const { rows } = await this.pool.query(
      `SELECT pass_hash, recovery_hash, profile FROM ${PLAYERS_TABLE} WHERE name_key = $1`,
      [key],
    );
    const r = rows[0];
    return r ? { key, passHash: r.pass_hash, recoveryHash: r.recovery_hash ?? null, profile: r.profile } : null;
  }

  async create(rec) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO ${PLAYERS_TABLE} (name_key, pass_hash, recovery_hash, profile) VALUES ($1, $2, $3, $4)
       ON CONFLICT (name_key) DO NOTHING`,
      [rec.key, rec.passHash, rec.recoveryHash ?? null, rec.profile],
    );
    return rowCount === 1;
  }

  async save(rec) {
    await this.pool.query(
      `INSERT INTO ${PLAYERS_TABLE} (name_key, pass_hash, recovery_hash, profile) VALUES ($1, $2, $3, $4)
       ON CONFLICT (name_key) DO UPDATE SET profile = EXCLUDED.profile, pass_hash = EXCLUDED.pass_hash,
         recovery_hash = EXCLUDED.recovery_hash, updated_at = now()`,
      [rec.key, rec.passHash, rec.recoveryHash ?? null, rec.profile],
    );
  }

  async createSession({ hash, key, expiresAt }) {
    await this.pool.query(
      `INSERT INTO ${SESSIONS_TABLE} (token_hash, name_key, expires_at) VALUES ($1, $2, $3)`,
      [hash, key, new Date(expiresAt)],
    );
  }

  async getSession(hash) {
    const { rows } = await this.pool.query(
      `SELECT name_key, expires_at FROM ${SESSIONS_TABLE} WHERE token_hash = $1 AND expires_at > now()`,
      [hash],
    );
    return rows[0] ? { hash, key: rows[0].name_key, expiresAt: rows[0].expires_at.getTime() } : null;
  }

  async deleteSession(hash) {
    await this.pool.query(`DELETE FROM ${SESSIONS_TABLE} WHERE token_hash = $1`, [hash]);
  }

  async deleteSessionsFor(key) {
    await this.pool.query(`DELETE FROM ${SESSIONS_TABLE} WHERE name_key = $1 OR expires_at <= now()`, [key]);
  }

  async flush() {}

  async close() {
    await this.pool.end();
  }
}

export async function createStore({ databaseUrl, dataFile }) {
  if (databaseUrl) return PgStore.connect(databaseUrl);
  return new JsonStore(dataFile);
}

// Fill in fields added after a profile was first saved.
export function migrateProfile(profile) {
  const base = newProfile(profile.name);
  return {
    ...base,
    ...profile,
    inv: { ...profile.inv },
    equip: { ...base.equip, ...profile.equip },
    look: { ...base.look, ...profile.look },
  };
}
