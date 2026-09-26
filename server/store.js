import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { newProfile } from '../shared/constants.js';

// Player persistence. A record is { key, passHash, profile } where key is the
// lower-cased character name. Every store has the same async interface:
//   get(key)      -> record | null
//   create(rec)   -> true, or false if the name is already taken
//   save(rec)     -> upsert the profile (and passHash)
//   flush()/close()
// Pick one with createStore(): Postgres when DATABASE_URL is set, otherwise a
// JSON file (fine for local play, but wiped on hosts with ephemeral disks).

export class MemoryStore {
  constructor() {
    this.records = new Map();
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
      for (const [key, rec] of Object.entries(data)) {
        // Guest records from the first MVP have no password and can't log in.
        if (rec.passHash) this.records.set(key, { ...rec, key });
      }
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
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.records), null, 1));
    renameSync(tmp, this.file);
  }
}

// Every table this game creates starts with blfs_ (Bang Li Fantasy) so it can
// share a database with other apps without name clashes.
export const TABLE_PREFIX = 'blfs_';
export const PLAYERS_TABLE = `${TABLE_PREFIX}players`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${PLAYERS_TABLE} (
    name_key   TEXT PRIMARY KEY,
    pass_hash  TEXT NOT NULL,
    profile    JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

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
    await pool.query(SCHEMA);
    return store;
  }

  async get(key) {
    const { rows } = await this.pool.query(`SELECT pass_hash, profile FROM ${PLAYERS_TABLE} WHERE name_key = $1`, [key]);
    return rows[0] ? { key, passHash: rows[0].pass_hash, profile: rows[0].profile } : null;
  }

  async create(rec) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO ${PLAYERS_TABLE} (name_key, pass_hash, profile) VALUES ($1, $2, $3) ON CONFLICT (name_key) DO NOTHING`,
      [rec.key, rec.passHash, rec.profile],
    );
    return rowCount === 1;
  }

  async save(rec) {
    await this.pool.query(
      `INSERT INTO ${PLAYERS_TABLE} (name_key, pass_hash, profile) VALUES ($1, $2, $3)
       ON CONFLICT (name_key) DO UPDATE SET profile = EXCLUDED.profile, pass_hash = EXCLUDED.pass_hash, updated_at = now()`,
      [rec.key, rec.passHash, rec.profile],
    );
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
