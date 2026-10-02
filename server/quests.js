import { ITEMS, TUTORIAL } from '../shared/constants.js';

// เควสต์มือใหม่ progress. Game code reports events (buy, kill, enter...);
// state steps (items in the bag, level) are re-checked after every event.
export class Quests {
  constructor(world) {
    this.world = world;
  }

  event(p, kind, target) {
    const q = p.profile.quest;
    if (!q || q.step >= TUTORIAL.length) return;
    const s = TUTORIAL[q.step];
    if (s.on === kind && (s.target === undefined || s.target === target)) {
      q.n++;
      p.profileDirty = true;
    }
    this.check(p);
  }

  check(p) {
    const q = p.profile.quest;
    while (q && q.step < TUTORIAL.length) {
      const s = TUTORIAL[q.step];
      const have = s.on === 'have' ? p.profile.inv[s.target] ?? 0 : s.on === 'level' ? p.profile.level : q.n;
      if (have < s.n) return;
      q.step++;
      q.n = 0;
      p.profileDirty = true;
      this.reward(p, s, q.step);
    }
  }

  reward(p, s, done) {
    const { coins = 0, exp = 0, items = {} } = s.reward;
    p.profile.coins += coins;
    for (const [id, n] of Object.entries(items)) p.profile.inv[id] = (p.profile.inv[id] ?? 0) + n;
    const parts = [coins && `🪙 ${coins}`, exp && `EXP ${exp}`, ...Object.entries(items).map(([id, n]) => `${ITEMS[id].icon} ×${n}`)].filter(Boolean);
    const last = done >= TUTORIAL.length;
    p.send({ t: 'quest', ev: 'done', id: s.id, text: s.text, reward: parts.join(' · '), last });
    if (exp) this.world.rooms.get(p.roomId)?.grantExp(p, exp);
  }

  skip(p) {
    if (!p.profile.quest) return;
    p.profile.quest.step = TUTORIAL.length;
    p.profileDirty = true;
  }
}

// What the HUD shows: the current step, or null once the chain is done.
export function questView(profile) {
  const q = profile.quest;
  if (!q || q.step >= TUTORIAL.length) return null;
  const s = TUTORIAL[q.step];
  const have = s.on === 'have' ? Math.min(s.n, profile.inv[s.target] ?? 0) : s.on === 'level' ? profile.level : q.n;
  return { step: q.step, total: TUTORIAL.length, have, need: s.n };
}
