import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { newProfile } from '../shared/constants.js';

// Player persistence. MVP uses a JSON file; the interface (get/put/flush) is
// small on purpose so it can be swapped for SQLite/Postgres/Supabase later.

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

export class MemoryStore {
  constructor() {
    this.records = new Map();
  }

  get(name) {
    const rec = this.records.get(name.toLowerCase());
    return rec ? structuredClone(rec) : null;
  }

  put(rec) {
    this.records.set(rec.profile.name.toLowerCase(), structuredClone(rec));
    this.changed();
  }

  changed() {}
  flush() {}
}

export class JsonStore extends MemoryStore {
  constructor(file, { debounceMs = 2000 } = {}) {
    super();
    this.file = file;
    this.debounceMs = debounceMs;
    this.timer = null;
    try {
      const data = JSON.parse(readFileSync(file, 'utf8'));
      for (const [k, v] of Object.entries(data)) this.records.set(k, v);
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`[store] could not read ${file}:`, err.message);
    }
  }

  changed() {
    this.timer ??= setTimeout(() => this.flush(), this.debounceMs);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(this.records), null, 1));
    renameSync(tmp, this.file);
  }
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
