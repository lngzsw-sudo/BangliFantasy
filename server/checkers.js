import { CHECKERS, bountyDay } from '../shared/constants.js';
import { applyMove, botMove, findMove, legalMoves, newGame, other } from '../shared/checkers.js';

const toast = (p, text) => p.send({ t: 'toast', text });
const SIDE_NAME = { w: 'ฝาแดง', b: 'ฝาเขียว' };
export const BOT_NAME = 'ลุงชม';

const square = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 0 && n < 8);

// Running หมากฮอส matches. A player is in at most one (p.ck). Matches live in
// memory: leaving the game forfeits.
export class CheckersHall {
  constructor(world) {
    this.world = world;
    this.matches = new Set();
  }

  find(name) {
    return this.world.online.get(String(name ?? '').trim().toLowerCase()) ?? null;
  }

  challenge(p, name, now) {
    const t = this.find(name);
    if (!t || t === p) return toast(p, 'ไม่พบผู้เล่นชื่อนี้ที่ออนไลน์อยู่');
    if (p.ck) return toast(p, 'จบกระดานที่เล่นอยู่ก่อนนะ');
    if (t.ck) return toast(p, `${t.profile.name} กำลังเล่นหมากฮอสอยู่`);
    t.ckInvites ??= new Map();
    t.ckInvites.set(p.key, now + CHECKERS.inviteMs);
    t.send({ t: 'ck_invite', from: p.profile.name, lvl: p.profile.level });
    toast(p, `ส่งคำท้าดวลหมากฮอสถึง ${t.profile.name} แล้ว`);
  }

  accept(p, from, now) {
    const host = this.find(from);
    const until = host && p.ckInvites?.get(host.key);
    if (host) p.ckInvites.delete(host.key);
    if (!until || now > until) return toast(p, 'คำท้านี้หมดอายุแล้ว');
    if (p.ck || host.ck) return toast(p, 'มีคนกำลังเล่นกระดานอื่นอยู่');
    this.start(host, p, now);
  }

  decline(p, from) {
    const host = this.find(from);
    if (host && p.ckInvites?.delete(host.key)) toast(host, `${p.profile.name} ไม่รับคำท้า`);
  }

  playBot(p, now) {
    if (p.ck) return toast(p, 'จบกระดานที่เล่นอยู่ก่อนนะ');
    this.start(p, null, now);
  }

  // `a` plays ฝาแดง (moves first); `b` is a player or null for the bot.
  start(a, b, now) {
    const m = { side: { w: a, b }, game: newGame(), turnAt: now, botAt: 0 };
    this.matches.add(m);
    for (const [side, p] of Object.entries(m.side)) {
      if (!p) continue;
      p.ck = m;
      const opp = m.side[other(side)];
      p.send({ t: 'ck', ev: 'start', you: side, opp: opp ? opp.profile.name : BOT_NAME, bot: !opp });
    }
    this.sync(m, now);
  }

  sideOf(m, p) {
    return m.side.w === p ? 'w' : 'b';
  }

  move(p, from, to, now) {
    const m = p.ck;
    if (!m || !square(from) || !square(to) || m.game.turn !== this.sideOf(m, p)) return;
    const mv = findMove(m.game, from, to);
    if (!mv) return p.send({ t: 'ck', ev: 'bad' });
    this.play(m, mv, now);
  }

  play(m, mv, now) {
    const turn = m.game.turn;
    applyMove(m.game, mv);
    if (m.game.turn !== turn) m.turnAt = now;
    this.sync(m, now);
    if (m.game.winner) this.finish(m, m.game.winner, m.game.winner === 'draw' ? 'draw' : 'mate');
  }

  resign(p) {
    const m = p.ck;
    if (m) this.finish(m, other(this.sideOf(m, p)), 'resign');
  }

  // Leaving the game (or logging in elsewhere) forfeits.
  leave(p) {
    const m = p.ck;
    if (m) this.finish(m, other(this.sideOf(m, p)), 'left');
  }

  tick(now) {
    for (const m of this.matches) {
      const turn = m.game.turn;
      if (!m.side[turn]) {
        if (!m.botAt) m.botAt = now + CHECKERS.botDelayMs;
        if (now < m.botAt) continue;
        m.botAt = 0;
        this.play(m, botMove(m.game, this.world.rng), now);
      } else if (now - m.turnAt > CHECKERS.turnMs) {
        this.finish(m, other(turn), 'timeout');
      }
    }
  }

  // Each player gets the board; the one to move also gets their legal moves.
  sync(m, now) {
    const g = m.game;
    const left = Math.max(0, CHECKERS.turnMs - (now - m.turnAt));
    const legal = legalMoves(g);
    for (const [side, p] of Object.entries(m.side)) {
      if (!p) continue;
      const mine = g.turn === side && !g.winner;
      p.send({
        t: 'ck', ev: 'state', board: g.board, turn: g.turn, last: g.last, captured: g.captured, mustFrom: g.mustFrom,
        moves: mine ? legal.map(({ from, to }) => ({ from, to })) : [], capture: mine && legal.some((mv) => mv.over), ms: left,
      });
    }
  }

  finish(m, winner, reason) {
    if (!this.matches.delete(m)) return;
    const now = this.world.now();
    const vsBot = !m.side.w || !m.side.b;
    for (const [side, p] of Object.entries(m.side)) {
      if (!p) continue;
      p.ck = null;
      let reward = 0;
      if (winner === side) {
        const day = bountyDay(now);
        const rec = p.profile.checkers?.day === day ? p.profile.checkers : { day, wins: 0 };
        this.world.achievements.add(p, 'ckWins');
        if (rec.wins < CHECKERS.dailyWins) {
          reward = vsBot ? CHECKERS.reward.bot : CHECKERS.reward.player;
          rec.wins++;
          p.profile.coins += reward;
          p.profileDirty = true;
        }
        p.profile.checkers = rec;
      }
      p.send({ t: 'ck', ev: 'end', winner, you: side, reason, reward, winnerName: winner === 'draw' ? null : (m.side[winner]?.profile.name ?? BOT_NAME) });
    }
    if (!vsBot && winner !== 'draw') {
      const room = this.world.rooms.get(m.side[winner].roomId);
      room?.broadcast({ t: 'sys', text: `♟️ ${m.side[winner].profile.name} ชนะหมากฮอส ${m.side[other(winner)].profile.name} (${SIDE_NAME[winner]})` });
    }
  }
}
