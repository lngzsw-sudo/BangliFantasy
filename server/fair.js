import { EMOTES, FORTUNES, FORTUNE_STICKS, ITEMS, STAGE, STARS, bountyDay } from '../shared/constants.js';

// ---------- เซียมซี: a daily fortune stick with a buff ----------

function fortuneOf(stick) {
  const f = FORTUNES[(stick - 1) % FORTUNES.length];
  return { stick, ...f };
}

// Today's fortune (buff, value, text), or null if none drawn today.
export function activeFortune(profile, now) {
  const f = profile.fortune;
  return f && f.day === bountyDay(now) ? fortuneOf(f.stick) : null;
}

// Multiplier bonus for one buff kind, e.g. buffBonus(profile, now, 'exp') = 0.2.
export function buffBonus(profile, now, kind) {
  const f = activeFortune(profile, now);
  return f?.buff === kind ? f.v : 0;
}

// Draw today's stick. Drawing again the same day shows the same stick.
export function drawFortune(profile, now, rng) {
  const today = activeFortune(profile, now);
  if (today) return { ...today, again: true };
  const stick = 1 + Math.floor(rng() * FORTUNE_STICKS);
  profile.fortune = { day: bountyDay(now), stick };
  return fortuneOf(stick);
}

// ---------- ซุ้มสอยดาว: pay for a star, win a prize ----------

export function rollStar(rng) {
  const total = STARS.prizes.reduce((n, p) => n + p.w, 0);
  let r = rng() * total;
  for (const prize of STARS.prizes) {
    r -= prize.w;
    if (r < 0) return prize;
  }
  return STARS.prizes[0];
}

// Pays for one star and hands out its prize. Returns what the player got.
export function pickStar(profile, rng) {
  if (profile.coins < STARS.price) return { error: `ต้องมี ${STARS.price} เหรียญต่อดาวหนึ่งดวง` };
  profile.coins -= STARS.price;
  const prize = rollStar(rng);
  if (prize.coins) {
    profile.coins += prize.coins;
    return { coins: prize.coins, text: `ได้ 🪙 ${prize.coins}` };
  }
  const item = ITEMS[prize.item];
  if (prize.rare && profile.inv[prize.item]) {
    profile.coins += STARS.duplicateCoins;
    return { coins: STARS.duplicateCoins, rare: true, text: `${item.icon} ${item.name} (มีแล้ว แลกเป็น 🪙 ${STARS.duplicateCoins})` };
  }
  profile.inv[prize.item] = (profile.inv[prize.item] ?? 0) + prize.n;
  return { item: prize.item, n: prize.n, rare: prize.rare || undefined, text: `${item.icon} ${item.name}${prize.n > 1 ? ` ×${prize.n}` : ''}` };
}

// ---------- เวทีประชันท่าเต้น: the DJ calls emotes, players on stage copy ----------

export class DanceStage {
  constructor(room, area, rng) {
    this.room = room;
    this.area = area;
    this.rng = rng;
    this.phase = 'idle';
    this.nextAt = 0;
  }

  on(p) {
    const { x1, y1, x2, y2 } = this.area;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    return !p.dead && x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }

  dancers() {
    return [...this.room.players.values()].filter((p) => this.on(p));
  }

  tick(now) {
    if (!this.nextAt) this.nextAt = now + STAGE.leadMs;
    if (this.phase === 'idle') {
      if (now < this.nextAt) return;
      const dancers = this.dancers();
      if (!dancers.length) {
        this.nextAt = now + 5000;
        return;
      }
      this.phase = 'round';
      this.scores = new Map(dancers.map((p) => [p.id, 0]));
      this.i = 0;
      this.move = null;
      this.callAt = now + STAGE.leadMs;
      this.room.broadcast({ t: 'stage', ev: 'start', n: STAGE.calls, ms: STAGE.leadMs });
      this.room.broadcast({ t: 'sys', text: '🎤 ดีเจโจ้: ประชันท่าเต้นเริ่มแล้ว! ขึ้นเวทีแล้วทำท่าตามที่เรียก' });
      return;
    }
    if (this.move && now >= this.windowEnd) this.move = null;
    if (!this.move && this.i < STAGE.calls && now >= this.callAt) {
      const moves = Object.keys(EMOTES).filter((e) => e !== this.last);
      this.move = moves[Math.floor(this.rng() * moves.length)];
      this.last = this.move;
      this.answered = new Set();
      this.windowEnd = now + STAGE.windowMs;
      this.callAt = this.windowEnd + STAGE.gapMs;
      this.i++;
      this.room.broadcast({ t: 'stage', ev: 'call', e: this.move, i: this.i, n: STAGE.calls, ms: STAGE.windowMs });
      return;
    }
    if (!this.move && this.i >= STAGE.calls) this.finish(now);
  }

  // A player did an emote: the first one per call counts, if they're on stage.
  onEmote(p, e, now) {
    if (this.phase !== 'round' || !this.move || now > this.windowEnd || !this.on(p)) return;
    if (this.answered.has(p.id)) return;
    this.answered.add(p.id);
    if (!this.scores.has(p.id)) this.scores.set(p.id, 0);
    const ok = e === this.move;
    if (ok) this.scores.set(p.id, this.scores.get(p.id) + 1);
    p.send({ t: 'stage', ev: 'hit', ok, score: this.scores.get(p.id) });
  }

  finish(now) {
    this.phase = 'idle';
    this.nextAt = now + STAGE.everyMs;
    const rows = [...this.scores]
      .map(([id, score]) => ({ p: this.room.players.get(id), score }))
      .filter((r) => r.p && r.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = rows[0]?.score ?? 0;
    const results = rows.map(({ p, score }) => {
      const win = score === top && score >= STAGE.minTop;
      const coins = win ? STAGE.prizeTop : score * STAGE.perPoint;
      p.profile.coins += coins;
      p.profileDirty = true;
      p.send({ t: 'toast', text: win ? `🏆 ชนะประชันท่าเต้น! รับ 🪙 ${coins}` : `👏 ได้ ${score} แต้ม รับ 🪙 ${coins}` });
      return { name: p.profile.name, score, coins, win };
    });
    const winners = results.filter((r) => r.win).map((r) => r.name);
    this.room.broadcast({ t: 'stage', ev: 'end', results });
    this.room.broadcast({
      t: 'sys',
      text: winners.length
        ? `🏆 ${winners.join(', ')} ชนะประชันท่าเต้น (${top}/${STAGE.calls} ท่า)! รอบหน้าอีก ${Math.round(STAGE.everyMs / 1000)} วินาที`
        : `🎤 จบรอบ ยังไม่มีใครได้ ${STAGE.minTop} ท่าขึ้นไป รอบหน้าอีก ${Math.round(STAGE.everyMs / 1000)} วินาที`,
    });
  }
}
