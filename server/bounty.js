import { bountiesFor, bountyDay } from '../shared/constants.js';

// Daily bounty state lives on the profile: { day, progress: { id: n }, claimed: [id] }.
// It resets the first time it's touched on a new (Bangkok) day.
function state(profile, now) {
  const day = bountyDay(now);
  if (profile.bounty?.day !== day) profile.bounty = { day, progress: {}, claimed: [] };
  return profile.bounty;
}

// Counts a kill toward today's bounties. Returns the bounties it just completed.
export function recordKill(profile, type, now) {
  const st = state(profile, now);
  const completed = [];
  for (const b of bountiesFor(st.day)) {
    if (b.type !== type || st.claimed.includes(b.id)) continue;
    const have = st.progress[b.id] ?? 0;
    if (have >= b.need) continue;
    st.progress[b.id] = have + 1;
    if (have + 1 === b.need) completed.push(b);
  }
  return completed;
}

export function claimBounty(profile, id, now) {
  const st = state(profile, now);
  const b = bountiesFor(st.day).find((x) => x.id === id);
  if (!b) return { error: 'ไม่มีงานนี้ในวันนี้' };
  if (st.claimed.includes(id)) return { error: 'รับรางวัลงานนี้ไปแล้ว' };
  if ((st.progress[id] ?? 0) < b.need) return { error: 'ยังทำงานนี้ไม่ครบ' };
  st.claimed.push(id);
  return { bounty: b };
}

export function bountyView(profile, now) {
  const st = state(profile, now);
  return {
    day: st.day,
    list: bountiesFor(st.day).map((b) => ({
      ...b, have: Math.min(b.need, st.progress[b.id] ?? 0), claimed: st.claimed.includes(b.id),
    })),
  };
}
