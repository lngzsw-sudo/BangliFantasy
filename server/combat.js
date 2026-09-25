import { CRIT_MULT, MISS_CHANCE, expToNext } from '../shared/constants.js';

// Classic MMO damage roll: ±15% spread, flat defence, 5% miss, crit multiplier.
export function rollDamage({ atk, crit = 0 }, { def = 0, block = 0 }, rng = Math.random) {
  if (rng() < MISS_CHANCE) return { n: 0, miss: true };
  if (block && rng() < block) return { n: 0, block: true };
  const isCrit = rng() < crit;
  let n = atk * (0.85 + rng() * 0.3);
  if (isCrit) n *= CRIT_MULT;
  return { n: Math.max(1, Math.round(n - def)), crit: isCrit };
}

// Adds exp to a profile, levelling up as many times as needed.
// Returns the number of levels gained.
export function addExp(profile, amount) {
  profile.exp += amount;
  let gained = 0;
  while (profile.exp >= expToNext(profile.level)) {
    profile.exp -= expToNext(profile.level);
    profile.level++;
    gained++;
  }
  return gained;
}

export function randInt(rng, [lo, hi]) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
