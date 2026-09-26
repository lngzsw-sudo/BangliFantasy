import {
  DROP_LIFETIME_MS, DROP_OWNER_LOCK_MS, MONSTERS, PICKUP_RANGE, POTION_COOLDOWN_MS,
  DEATH_RESPAWN_MS, ITEMS, BOT_LEVEL_MARGIN, playerStats,
} from '../shared/constants.js';
import { buildBlockedGrid, portalAt, roomSize } from '../shared/maps.js';
import { findPath, isBlocked, nearestOpen } from '../shared/pathfinding.js';
import { recordKill, bountyView } from './bounty.js';
import { addExp, killExp, randInt, rollDamage } from './combat.js';

let nextId = 1;
export const newId = (prefix) => `${prefix}${nextId++}`;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = (e) => ({ x: Math.round(e.x), y: Math.round(e.y) });
const round2 = (v) => Math.round(v * 100) / 100;

const BOT_SEARCH_RANGE = 30;
const OUT_OF_COMBAT_MS = 5000;
const OWNER_PICKUP_RANGE = 2;

// Move an entity along its path by speed * dt tiles.
function advance(ent, dt) {
  let budget = ent.speed * dt;
  while (budget > 1e-6 && ent.path.length) {
    const next = ent.path[0];
    const dx = next.x - ent.x;
    const dy = next.y - ent.y;
    const d = Math.hypot(dx, dy);
    if (Math.abs(dx) > 0.01) ent.dir = dx > 0 ? 1 : -1;
    if (d <= budget) {
      ent.x = next.x;
      ent.y = next.y;
      ent.path.shift();
      budget -= d;
    } else {
      ent.x += (dx / d) * budget;
      ent.y += (dy / d) * budget;
      budget = 0;
    }
    ent.dirty = true;
  }
}

// One authoritative room: players, monsters and ground drops of a single map.
export class GameRoom {
  constructor(def, world, rng = Math.random) {
    this.def = def;
    this.id = def.id;
    this.world = world;
    this.rng = rng;
    this.safe = def.safe;
    // Players may path onto portals; monsters and the bot may not.
    this.playerGrid = buildBlockedGrid(def);
    this.grid = this.playerGrid.map((row) => row.slice());
    for (const p of def.portals) {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) this.grid[y][x] = true;
    }
    this.players = new Map();
    this.monsters = new Map();
    this.drops = new Map();
    this.respawns = [];
    for (const spawn of def.spawns) for (let i = 0; i < spawn.count; i++) this.spawnMonster(spawn);
  }

  // ---------- messaging ----------

  broadcast(msg, exceptId = null) {
    for (const p of this.players.values()) if (p.id !== exceptId) p.send(msg);
  }

  entities() {
    return [
      ...[...this.players.values()].map(playerView),
      ...[...this.monsters.values()].map(monsterView),
      ...[...this.drops.values()].map(dropView),
    ];
  }

  // ---------- players ----------

  addPlayer(p, x, y) {
    p.roomId = this.id;
    p.x = x;
    p.y = y;
    p.path = [];
    p.target = null;
    p.goal = null;
    p.dirty = false;
    this.players.set(p.id, p);
    this.broadcast({ t: 'join', e: playerView(p) }, p.id);
    p.send({ t: 'room', room: this.id, you: p.id, ents: this.entities() });
  }

  removePlayer(p) {
    if (!this.players.delete(p.id)) return;
    for (const m of this.monsters.values()) if (m.aggro === p.id) m.aggro = null;
    this.broadcast({ t: 'leave', id: p.id });
  }

  // A random walkable tile near `at`, so a crowd doesn't spawn on one tile.
  scatter(at, r = 2) {
    for (let tries = 0; tries < 20; tries++) {
      const x = at.x + Math.round((this.rng() * 2 - 1) * r);
      const y = at.y + Math.round((this.rng() * 2 - 1) * r);
      if (!isBlocked(this.grid, x, y)) return { x, y };
    }
    return { x: at.x, y: at.y };
  }

  setPath(ent, gx, gy, grid = this.grid) {
    const start = tileOf(ent);
    const goal = nearestOpen(grid, gx, gy);
    if (!goal) return false;
    // Starting inside a blocked tile (e.g. an arrival point) should not strand anyone.
    const path = findPath(grid, start.x, start.y, goal.x, goal.y)
      ?? (isBlocked(grid, start.x, start.y) ? [goal] : null);
    if (!path) return false;
    ent.path = path;
    ent.goal = goal;
    return true;
  }

  moveTo(p, x, y) {
    if (p.dead) return;
    p.target = null;
    this.setPath(p, x, y, this.playerGrid);
  }

  attack(p, id) {
    if (p.dead) return;
    if (this.safe) return p.send({ t: 'toast', text: 'ห้ามต่อสู้ใน Safe Zone นะจ๊ะ' });
    const m = this.monsters.get(id);
    if (!m) return;
    p.target = m.id;
    p.goal = null;
  }

  usePotion(p, now) {
    if (p.dead || !(p.profile.inv.oliang > 0)) return false;
    if (now < (p.potionReadyAt ?? 0)) return false;
    const heal = Math.min(ITEMS.oliang.heal, p.stats.maxHp - p.hp);
    p.profile.inv.oliang--;
    p.potionReadyAt = now + POTION_COOLDOWN_MS;
    p.hp += heal;
    p.dirty = true;
    p.profileDirty = true;
    this.broadcast({ t: 'fx', id: p.id, fx: 'heal', n: Math.round(heal) });
    return true;
  }

  // ---------- monsters ----------

  spawnMonster(spawn) {
    const def = MONSTERS[spawn.type];
    const { x1, y1, x2, y2 } = spawn.area;
    let pos = null;
    for (let tries = 0; tries < 50 && !pos; tries++) {
      const x = x1 + Math.floor(this.rng() * (x2 - x1 + 1));
      const y = y1 + Math.floor(this.rng() * (y2 - y1 + 1));
      if (!isBlocked(this.grid, x, y)) pos = { x, y };
    }
    if (!pos) return null;
    const m = {
      id: newId('m'), type: spawn.type, def, spawn,
      x: pos.x, y: pos.y, home: { ...pos }, dir: 1,
      hp: def.hp, speed: def.speed, path: [], aggro: null,
      nextAttackAt: 0, idleUntil: 0, repathAt: 0, dirty: false,
    };
    this.monsters.set(m.id, m);
    this.broadcast({ t: 'join', e: monsterView(m) });
    return m;
  }

  damageMonster(m, attacker, roll, now) {
    this.broadcast({ t: 'hit', a: attacker.id, d: m.id, n: roll.n, crit: roll.crit || undefined, miss: roll.miss || undefined });
    if (!roll.n) return;
    m.hp -= roll.n;
    m.dirty = true;
    if (!m.aggro) {
      m.aggro = attacker.id;
      // Flock monsters (pigeons) pile on together.
      if (m.def.flock) {
        for (const o of this.monsters.values()) {
          if (o.type === m.type && !o.aggro && dist(o, m) <= m.def.flock) o.aggro = attacker.id;
        }
      }
    }
    attacker.lastCombatAt = now;
    if (m.hp <= 0) this.killMonster(m, attacker, now);
  }

  killMonster(m, killer, now) {
    this.monsters.delete(m.id);
    this.broadcast({ t: 'die', id: m.id });
    this.respawns.push({ spawn: m.spawn, at: now + m.def.respawnMs });
    for (const p of this.players.values()) if (p.target === m.id) p.target = null;

    const at = tileOf(m);
    this.spawnDrop('coin', randInt(this.rng, m.def.coins), at, killer, now);
    for (const d of m.def.drops) {
      if (this.rng() < d.chance) this.spawnDrop(d.item, randInt(this.rng, d.amount), at, killer, now);
    }

    this.grantExp(killer, killExp(m.def.exp, m.def.level, killer.profile.level));
    for (const b of recordKill(killer.profile, m.type, now)) {
      killer.send({ t: 'toast', text: `📋 งาน "${bountyTitle(b)}" ครบแล้ว! กลับไปรับรางวัลที่กระดานในตลาด` });
    }
  }

  grantExp(p, amount) {
    const before = p.profile.level;
    const levels = addExp(p.profile, amount);
    p.profileDirty = true;
    if (levels) {
      p.stats = playerStats(p.profile);
      p.hp = p.stats.maxHp;
      p.dirty = true;
      this.broadcast({ t: 'lvl', id: p.id, lvl: p.profile.level, maxHp: p.stats.maxHp });
      p.send({ t: 'toast', text: `เลเวลอัป! Lv.${before} → Lv.${p.profile.level}` });
    }
  }

  spawnDrop(item, amount, at, owner, now) {
    const d = {
      id: newId('d'), item, amount,
      x: round2(at.x + (this.rng() - 0.5) * 0.6),
      y: round2(at.y + (this.rng() - 0.5) * 0.6),
      owner: owner.id, lockUntil: now + DROP_OWNER_LOCK_MS, expiresAt: now + DROP_LIFETIME_MS,
    };
    this.drops.set(d.id, d);
    this.broadcast({ t: 'join', e: dropView(d) });
    return d;
  }

  canLoot(p, d, now) {
    return d.owner === p.id || now >= d.lockUntil;
  }

  // ---------- simulation ----------

  tick(now, dt) {
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      if (now >= this.respawns[i].at) {
        this.spawnMonster(this.respawns[i].spawn);
        this.respawns.splice(i, 1);
      }
    }
    for (const d of this.drops.values()) {
      if (now >= d.expiresAt) {
        this.drops.delete(d.id);
        this.broadcast({ t: 'gone', id: d.id });
      }
    }
    for (const p of [...this.players.values()]) this.tickPlayer(p, now, dt);
    if (this.players.size) for (const m of this.monsters.values()) this.tickMonster(m, now, dt);
    this.flush(now);
  }

  tickPlayer(p, now, dt) {
    if (p.dead) {
      if (now >= p.respawnAt) this.world.respawn(p);
      return;
    }
    this.regen(p, now, dt);
    if (p.auto.on) this.botThink(p, now);

    if (p.target) {
      const m = this.monsters.get(p.target);
      if (!m) {
        p.target = null;
      } else if (dist(p, m) <= p.stats.range) {
        p.path = [];
        p.goal = null;
        if (Math.abs(m.x - p.x) > 0.05) p.dir = m.x > p.x ? 1 : -1;
        if (now >= p.nextAttackAt) this.playerAttack(p, m, now);
      } else {
        const mt = tileOf(m);
        if (!p.path.length || p.goal?.x !== mt.x || p.goal?.y !== mt.y) this.setPath(p, mt.x, mt.y);
      }
    }

    advance(p, dt);

    // Your own loot is magnetised a little further so melee kills auto-collect.
    for (const d of this.drops.values()) {
      const range = d.owner === p.id ? OWNER_PICKUP_RANGE : PICKUP_RANGE;
      if (dist(p, d) <= range && this.canLoot(p, d, now)) this.pickup(p, d);
    }

    const portal = portalAt(this.def, p.x, p.y);
    if (portal) this.world.transfer(p, portal.to, portal.tx, portal.ty);
  }

  regen(p, now, dt) {
    const max = p.stats.maxHp;
    if (p.hp >= max) return;
    const rate = this.safe ? 0.05 : now - (p.lastCombatAt ?? 0) > OUT_OF_COMBAT_MS ? 0.01 : 0;
    if (!rate) return;
    const before = Math.round(p.hp);
    p.hp = Math.min(max, p.hp + max * rate * dt);
    if (Math.round(p.hp) !== before) p.dirty = true;
  }

  playerAttack(p, m, now) {
    p.nextAttackAt = now + 1000 / p.stats.aspd;
    const roll = rollDamage(p.stats, m.def, this.rng);
    this.damageMonster(m, p, roll, now);
    if (p.stats.splash && roll.n) {
      for (const o of [...this.monsters.values()]) {
        if (o !== m && dist(o, m) <= 1.5) {
          this.damageMonster(o, p, { n: Math.max(1, Math.round(roll.n * p.stats.splash)) }, now);
        }
      }
    }
  }

  pickup(p, d) {
    this.drops.delete(d.id);
    if (d.item === 'coin') p.profile.coins += d.amount;
    else p.profile.inv[d.item] = (p.profile.inv[d.item] ?? 0) + d.amount;
    p.profileDirty = true;
    this.broadcast({ t: 'gone', id: d.id, by: p.id });
    if (p.goal && p.goalDrop === d.id) {
      p.goal = null;
      p.goalDrop = null;
    }
  }

  // Server-side auto-farm: keeps running even if the browser tab is throttled.
  botThink(p, now) {
    if (this.safe) {
      p.auto.on = false;
      p.send({ t: 'auto', on: false, pct: p.auto.pct });
      return;
    }
    if (p.hp / p.stats.maxHp * 100 < p.auto.pct) this.usePotion(p, now);
    if (p.target && this.monsters.has(p.target)) return;

    let best = null;
    let bestD = Infinity;
    for (const d of this.drops.values()) {
      const dd = dist(p, d);
      if (d.owner === p.id && dd < 10 && dd < bestD) [best, bestD] = [d, dd];
    }
    if (best) {
      if (p.goalDrop !== best.id || !p.path.length) {
        p.goalDrop = best.id;
        const t = tileOf(best);
        this.setPath(p, t.x, t.y);
        if (!p.path.length) this.pickup(p, best);
      }
      return;
    }

    // Prefer whatever is already chewing on us, then the closest monster.
    bestD = Infinity;
    for (const m of this.monsters.values()) {
      const fighting = m.aggro === p.id;
      if (!fighting && m.def.level > p.profile.level + BOT_LEVEL_MARGIN) continue;
      const dd = dist(p, m) - (fighting ? 100 : 0);
      if (dist(p, m) < BOT_SEARCH_RANGE && dd < bestD) [best, bestD] = [m, dd];
    }
    if (best) p.target = best.id;
  }

  tickMonster(m, now, dt) {
    if (!m.aggro && m.def.aggroRange) m.aggro = this.nearestVictim(m)?.id ?? null;
    const p = m.aggro ? this.players.get(m.aggro) : null;
    if (m.aggro && (!p || p.dead || dist(m, m.home) > m.def.leash)) {
      m.aggro = null;
      this.setPath(m, m.home.x, m.home.y);
      m.hp = m.def.hp;
      m.dirty = true;
    } else if (p) {
      if (dist(m, p) <= m.def.range) {
        m.path = [];
        if (Math.abs(p.x - m.x) > 0.05) m.dir = p.x > m.x ? 1 : -1;
        if (now >= m.nextAttackAt) this.monsterAttack(m, p, now);
      } else if (now >= m.repathAt) {
        m.repathAt = now + 400;
        const t = tileOf(p);
        this.setPath(m, t.x, t.y);
      }
    } else if (!m.path.length && now >= m.idleUntil) {
      m.idleUntil = now + 1500 + this.rng() * 3000;
      const r = m.def.wanderRadius;
      const x = m.home.x + Math.round((this.rng() * 2 - 1) * r);
      const y = m.home.y + Math.round((this.rng() * 2 - 1) * r);
      if (!isBlocked(this.grid, x, y)) this.setPath(m, x, y);
    }
    advance(m, dt);
  }

  nearestVictim(m) {
    let best = null;
    let bestD = m.def.aggroRange;
    for (const p of this.players.values()) {
      const d = dist(p, m);
      if (!p.dead && d <= bestD && dist(p, m.home) <= m.def.leash) [best, bestD] = [p, d];
    }
    return best;
  }

  monsterAttack(m, p, now) {
    m.nextAttackAt = now + 1000 / m.def.aspd;
    const roll = rollDamage(m.def, p.stats, this.rng);
    this.broadcast({ t: 'hit', a: m.id, d: p.id, n: roll.n, crit: roll.crit || undefined, miss: roll.miss || undefined, block: roll.block || undefined });
    p.lastCombatAt = now;
    if (!roll.n) return;
    p.hp -= roll.n;
    p.dirty = true;
    // Being hit with nothing targeted: fight back (classic MMO auto-counter).
    if (!p.target && !p.path.length) p.target = m.id;
    if (p.hp <= 0) this.killPlayer(p, now);
  }

  killPlayer(p, now) {
    p.hp = 0;
    p.dead = true;
    p.respawnAt = now + DEATH_RESPAWN_MS;
    p.target = null;
    p.path = [];
    p.dirty = true;
    if (p.auto.on) {
      p.auto.on = false;
      p.send({ t: 'auto', on: false, pct: p.auto.pct });
    }
    for (const m of this.monsters.values()) if (m.aggro === p.id) m.aggro = null;
    this.broadcast({ t: 'die', id: p.id });
    p.send({ t: 'toast', text: 'หมดสติ! เดี๋ยวพี่วินหามกลับตลาดให้นะ…' });
  }

  // Send delta snapshot of moved/damaged entities, plus private profile updates.
  flush(now) {
    const e = [];
    for (const p of this.players.values()) {
      if (p.dirty) {
        e.push([p.id, round2(p.x), round2(p.y), Math.max(0, Math.round(p.hp)), p.dir]);
        p.dirty = false;
      }
    }
    for (const m of this.monsters.values()) {
      if (m.dirty) {
        e.push([m.id, round2(m.x), round2(m.y), Math.max(0, m.hp), m.dir]);
        m.dirty = false;
      }
    }
    if (e.length) this.broadcast({ t: 's', e });
    for (const p of this.players.values()) {
      if (p.profileDirty) {
        p.profileDirty = false;
        p.send({ t: 'me', me: selfView(p, now) });
      }
    }
  }

  get size() {
    return roomSize(this.def);
  }
}

export function playerView(p) {
  return {
    id: p.id, k: 'p', name: p.profile.name, x: round2(p.x), y: round2(p.y), dir: p.dir,
    hp: Math.max(0, Math.round(p.hp)), maxHp: p.stats.maxHp, lvl: p.profile.level,
    look: p.profile.look, body: p.profile.equip.body, head: p.profile.equip.head, weapon: p.profile.equip.weapon,
    dead: p.dead || undefined,
  };
}

export function monsterView(m) {
  return {
    id: m.id, k: 'm', type: m.type, name: m.def.name, lvl: m.def.level,
    x: m.x, y: m.y, dir: m.dir, hp: m.hp, maxHp: m.def.hp,
  };
}

export function dropView(d) {
  return { id: d.id, k: 'd', item: d.item, amount: d.amount, x: d.x, y: d.y, owner: d.owner };
}

export function selfView(p, now) {
  const { name, level, exp, coins, inv, equip } = p.profile;
  return {
    id: p.id, name, level, exp, coins, inv, equip, stats: p.stats, hp: Math.round(p.hp), auto: p.auto,
    bounty: bountyView(p.profile, now),
  };
}

export function bountyTitle(b) {
  return `ปราบ${MONSTERS[b.type].name} ${b.need} ตัว`;
}
