import { ACHIEVEMENTS, ITEMS, TUTORIAL } from '../shared/constants.js';

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// How far a profile is towards an achievement: [have, need].
export function progress(profile, a) {
  const r = a.req;
  const st = profile.stats ?? {};
  if (r.kill) return [st.kills?.[r.kill] ?? 0, r.n];
  if (r.level) return [profile.level, r.level];
  if (r.stat) return [st[r.stat] ?? 0, r.n];
  if (r.quest) return [(profile.quest?.step ?? 0) >= TUTORIAL.length ? 1 : 0, 1];
  if (r.fashion) {
    const n = Object.keys(profile.inv).filter((id) => profile.inv[id] > 0 && ['body', 'head'].includes(ITEMS[id]?.slot)).length;
    return [n, r.fashion];
  }
  if (r.pet) return [Object.keys(profile.inv).some((id) => profile.inv[id] > 0 && ITEMS[id]?.slot === 'pet') ? 1 : 0, 1];
  return [0, 1];
}

export function titleOf(profile) {
  return BY_ID.get(profile.title)?.title;
}

// What the ตู้โชว์ panel shows.
export function achievementView(profile) {
  const got = new Set(profile.achievements ?? []);
  return {
    title: profile.title ?? null,
    list: ACHIEVEMENTS.map((a) => {
      const [have, need] = progress(profile, a);
      return { id: a.id, done: got.has(a.id), have: Math.min(have, need), need };
    }),
  };
}

// Counts lifetime stats and unlocks achievements (titles + a few outfits).
export class Achievements {
  constructor(world) {
    this.world = world;
  }

  kill(p, type) {
    const k = (p.profile.stats.kills ??= {});
    k[type] = (k[type] ?? 0) + 1;
    this.check(p);
  }

  add(p, stat) {
    p.profile.stats[stat] = (p.profile.stats[stat] ?? 0) + 1;
    this.check(p);
  }

  check(p) {
    const prof = p.profile;
    prof.achievements ??= [];
    for (const a of ACHIEVEMENTS) {
      if (prof.achievements.includes(a.id)) continue;
      const [have, need] = progress(prof, a);
      if (have < need) continue;
      prof.achievements.push(a.id);
      p.profileDirty = true;
      if (a.item) prof.inv[a.item] = Math.max(1, prof.inv[a.item] ?? 0);
      p.send({ t: 'achieve', id: a.id, item: a.item });
      this.world.rooms.get(p.roomId)?.broadcast({ t: 'sys', text: `🏆 ${prof.name} ปลดล็อกความสำเร็จ «${a.title}»` }, p.id);
    }
    p.profileDirty = true;
  }

  setTitle(p, id) {
    if (id !== null && !p.profile.achievements?.includes(id)) return;
    p.profile.title = id;
    p.profileDirty = true;
    const room = this.world.rooms.get(p.roomId);
    room?.broadcast({ t: 'title', id: p.id, title: titleOf(p.profile) ?? null });
  }
}
