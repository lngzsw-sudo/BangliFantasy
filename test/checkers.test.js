import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECKERS } from '../shared/constants.js';
import { DRAW_QUIET, applyMove, botMove, countPieces, findMove, legalMoves, newGame } from '../shared/checkers.js';
import { join, makeWorld, mulberry32 } from './helpers.js';

// Board from 8 strings; '.' empty, w/b men, W/B kings.
function game(rows, turn = 'w') {
  const g = newGame();
  g.board = rows.map((r) => r.split(''));
  g.turn = turn;
  return g;
}
const moves = (g) => legalMoves(g).map((m) => `${m.from}>${m.to}`).sort();
const last = (c, t, ev) => c.inbox.filter((m) => m.t === t && (!ev || m.ev === ev)).at(-1);

test('opening: 8 men a side on dark squares, red moves first with 7 options', () => {
  const g = newGame();
  assert.deepEqual(countPieces(g), { w: 8, b: 8 });
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (g.board[r][c] !== '.') assert.equal((r + c) % 2, 1);
  assert.equal(g.turn, 'w');
  assert.equal(legalMoves(g).length, 7);
});

test('men step diagonally forward only', () => {
  const g = game([
    '........',
    '........',
    '........',
    '....w...',
    '........',
    '........',
    '........',
    '........',
  ]);
  assert.deepEqual(moves(g), ['3,4>2,3', '3,4>2,5']);
});

test('capturing is compulsory and men capture forward only', () => {
  const g = game([
    '........',
    '........',
    '.....b..',
    '....w...',
    '...b....',
    '........',
    '.w......',
    '........',
  ]);
  // The black man behind (4,3) can't be taken backwards; the forward capture is forced.
  assert.deepEqual(moves(g), ['3,4>1,6']);
});

test('a capture that can continue must continue, and pieces come off at the end', () => {
  const g = game([
    '........',
    '........',
    '...b....',
    '........',
    '.....b..',
    '......w.',
    '........',
    'b.......',
  ]);
  applyMove(g, findMove(g, [5, 6], [3, 4]));
  assert.deepEqual(g.mustFrom, [3, 4], 'same piece keeps jumping');
  assert.equal(g.turn, 'w');
  assert.equal(g.board[4][5], 'b', 'captured piece stays until the turn ends');
  assert.deepEqual(moves(g), ['3,4>1,2']);
  applyMove(g, findMove(g, [3, 4], [1, 2]));
  assert.equal(g.turn, 'b');
  assert.deepEqual(countPieces(g), { w: 1, b: 1 });
});

test('a man reaching the far row becomes a ฮอส that flies but lands right behind its capture', () => {
  const g = game([
    '........',
    '..w.....',
    '........',
    '........',
    '........',
    '........',
    '.....b..',
    '........',
  ]);
  applyMove(g, findMove(g, [1, 2], [0, 1]));
  assert.equal(g.board[0][1], 'W');
  assert.equal(g.turn, 'b');
  const k = game([
    '.W......',
    '........',
    '........',
    '........',
    '.....b..',
    '........',
    '........',
    '........',
  ]);
  const caps = legalMoves(k);
  assert.deepEqual(caps.map((m) => `${m.to}`), ['5,6'], 'captures from afar, lands right behind');
  const quiet = game([
    '.W......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]);
  assert.equal(legalMoves(quiet).length, 7, 'slides any distance');
});

test('no legal moves loses; long captureless play draws', () => {
  const g = game([
    '........',
    '........',
    '........',
    '........',
    '........',
    '...b....',
    '..w.....',
    '........',
  ]);
  applyMove(g, findMove(g, [6, 2], [4, 4]));
  assert.equal(g.winner, 'w', 'black has no pieces left');
  const d = game([
    '.W......',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    '......B.',
  ]);
  d.quiet = DRAW_QUIET - 1;
  applyMove(d, legalMoves(d)[0]);
  assert.equal(d.winner, 'draw');
});

test('ลุงชม takes a free piece and plays legal moves to the end of a game', () => {
  const g = game([
    '........',
    '........',
    '........',
    '........',
    '..b.....',
    '...w....',
    '........',
    '........',
  ], 'b');
  assert.deepEqual(botMove(g, mulberry32(1), 3), { from: [4, 2], to: [6, 4], over: [5, 3] });
  const full = newGame();
  const rng = mulberry32(7);
  for (let i = 0; i < 400 && !full.winner; i++) {
    const m = botMove(full, rng, 2);
    assert.ok(findMove(full, m.from, m.to), 'bot move is legal');
    applyMove(full, m);
  }
  assert.ok(full.winner, 'a bot-vs-bot game finishes');
});

test('play ลุงชม at the market table: moves, bot replies, resign, daily rewards', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Player1');
  const p = a.player();
  world.transfer(p, 'market', 30, 12);
  a.client.message({ t: 'ck_bot' });
  assert.ok(!a.inbox.some((m) => m.t === 'ck'), 'must be at the table');
  world.transfer(p, 'market', 11, 11);
  a.client.message({ t: 'ck_bot' });
  assert.equal(last(a, 'ck', 'start').you, 'w');
  const st = last(a, 'ck', 'state');
  assert.equal(st.moves.length, 7);
  a.client.message({ t: 'ck_move', from: [0, 0], to: [1, 1] });
  assert.equal(last(a, 'ck').ev, 'bad');
  a.client.message({ t: 'ck_move', ...st.moves[0] });
  assert.equal(last(a, 'ck', 'state').turn, 'b');
  run(CHECKERS.botDelayMs + 200);
  assert.equal(last(a, 'ck', 'state').turn, 'w', 'the bot answered');
  a.client.message({ t: 'ck_resign' });
  const end = last(a, 'ck', 'end');
  assert.deepEqual([end.winner, end.reason, end.reward], ['b', 'resign', 0]);
  assert.equal(p.ck, null);

  // A win pays, up to the daily cap.
  const coins = p.profile.coins;
  for (let i = 0; i < CHECKERS.dailyWins + 1; i++) {
    a.client.message({ t: 'ck_bot' });
    world.checkers.finish(p.ck, 'w', 'mate');
  }
  assert.equal(p.profile.coins, coins + CHECKERS.dailyWins * CHECKERS.reward.bot);
  assert.equal(last(a, 'ck', 'end').reward, 0, 'over the cap');
});

test('challenge another player; timeouts and leaving forfeit', async () => {
  const { world, run } = makeWorld();
  const a = await join(world, 'Red');
  const b = await join(world, 'Green');
  world.transfer(a.player(), 'market', 11, 11);
  a.client.message({ t: 'ck_challenge', name: 'Green' });
  assert.equal(last(b, 'ck_invite').from, 'Red');
  b.client.message({ t: 'ck_accept', from: 'Red' });
  assert.equal(last(a, 'ck', 'start').you, 'w');
  assert.equal(last(b, 'ck', 'start').you, 'b');
  assert.equal(last(b, 'ck', 'state').moves.length, 0, 'not your turn');
  b.client.message({ t: 'ck_move', from: [2, 1], to: [3, 0] });
  assert.equal(last(b, 'ck', 'state').turn, 'w', 'moving out of turn does nothing');
  run(CHECKERS.turnMs + 200);
  assert.deepEqual([last(b, 'ck', 'end').winner, last(b, 'ck', 'end').reason], ['b', 'timeout']);
  assert.equal(last(b, 'ck', 'end').reward, CHECKERS.reward.player);

  a.client.message({ t: 'ck_challenge', name: 'Green' });
  b.client.message({ t: 'ck_accept', from: 'Red' });
  b.client.disconnect();
  assert.deepEqual([last(a, 'ck', 'end').winner, last(a, 'ck', 'end').reason], ['w', 'left']);
  assert.equal(world.checkers.matches.size, 0);
});
