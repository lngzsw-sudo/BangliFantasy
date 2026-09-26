import { CRIT_MULT, MISS_CHANCE, expToNext } from '../shared/constants.js';

// Classic MMO damage roll: ±15% spread, flat defence, 5% miss, crit multiplier.
export function rollDamage({ atk, crit = 0 }, { def = 0, block = 0, evade = 0 }, rng = Math.random) {
  if (rng() < MISS_CHANCE) return { n: 0, miss: true };
  if (evade && rng() < evade) return { n: 0, miss: true };
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

// Out-levelling a monster by more than 3 cuts its EXP by 20% per extra level,
// down to 10%, so each zone stops being worth farming after a while.
export function killExp(baseExp, monsterLevel, playerLevel) {
  const over = playerLevel - monsterLevel - 3;
  if (over <= 0) return baseExp;
  return Math.max(1, Math.round(baseExp * Math.max(0.1, 1 - 0.2 * over)));
}

export function randInt(rng, [lo, hi]) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
