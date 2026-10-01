// หมากฮอสไทย (Thai checkers) rules, shared by the server and the browser.
//
// 8x8 board, play on the dark squares ((r + c) odd). Each side starts with 8
// men on its first two rows. 'w' moves up (towards row 0) and goes first, 'b'
// moves down. Men step and capture diagonally forward only. Capturing is
// compulsory, and a piece that can keep capturing must. A man reaching the far
// row becomes a ฮอส (king, 'W'/'B'): it moves any distance diagonally, and
// captures from a distance but must land on the square right behind the piece
// it takes. Captured pieces stay on the board (and can't be jumped again)
// until the capturing turn ends. No legal move = you lose.

export const SIZE = 8;
export const DRAW_QUIET = 60; // plies in a row without a capture -> draw

const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const FORWARD = { w: -1, b: 1 };

export const colorOf = (p) => (p === '.' ? null : p.toLowerCase());
export const isKing = (p) => p === 'W' || p === 'B';
const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
export const other = (side) => (side === 'w' ? 'b' : 'w');

export function newBoard() {
  const board = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) row.push((r + c) % 2 === 1 ? (r < 2 ? 'b' : r >= SIZE - 2 ? 'w' : '.') : '.');
    board.push(row);
  }
  return board;
}

export function newGame() {
  return { board: newBoard(), turn: 'w', mustFrom: null, captured: [], quiet: 0, winner: null, last: null };
}

export function cloneGame(g) {
  return {
    board: g.board.map((row) => row.slice()), turn: g.turn, mustFrom: g.mustFrom && [...g.mustFrom],
    captured: g.captured.map((x) => [...x]), quiet: g.quiet, winner: g.winner, last: g.last,
  };
}

function captureMoves(g, r, c) {
  const b = g.board;
  const p = b[r][c];
  const me = colorOf(p);
  const out = [];
  const taken = (rr, cc) => g.captured.some(([a, d]) => a === rr && d === cc);
  for (const [dr, dc] of DIAG) {
    if (!isKing(p) && dr !== FORWARD[me]) continue;
    let rr = r + dr;
    let cc = c + dc;
    if (isKing(p)) {
      while (inside(rr, cc) && b[rr][cc] === '.') {
        rr += dr;
        cc += dc;
      }
    }
    if (!inside(rr, cc)) continue;
    const q = b[rr][cc];
    if (q === '.' || colorOf(q) === me || taken(rr, cc)) continue;
    const lr = rr + dr;
    const lc = cc + dc;
    if (inside(lr, lc) && b[lr][lc] === '.') out.push({ from: [r, c], to: [lr, lc], over: [rr, cc] });
  }
  return out;
}

function stepMoves(g, r, c) {
  const b = g.board;
  const p = b[r][c];
  const out = [];
  for (const [dr, dc] of DIAG) {
    if (!isKing(p) && dr !== FORWARD[colorOf(p)]) continue;
    let rr = r + dr;
    let cc = c + dc;
    while (inside(rr, cc) && b[rr][cc] === '.') {
      out.push({ from: [r, c], to: [rr, cc] });
      if (!isKing(p)) break;
      rr += dr;
      cc += dc;
    }
  }
  return out;
}

// Every move the side to play may make right now (one jump at a time).
export function legalMoves(g) {
  if (g.winner) return [];
  if (g.mustFrom) return captureMoves(g, ...g.mustFrom);
  const caps = [];
  const steps = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (colorOf(g.board[r][c]) !== g.turn) continue;
      caps.push(...captureMoves(g, r, c));
      if (!caps.length) steps.push(...stepMoves(g, r, c));
    }
  }
  return caps.length ? caps : steps;
}

export function findMove(g, from, to) {
  return legalMoves(g).find((m) => m.from[0] === from[0] && m.from[1] === from[1] && m.to[0] === to[0] && m.to[1] === to[1]) ?? null;
}

// Plays a legal move in place. A capture that can continue keeps the turn
// (mustFrom); otherwise captured pieces come off, men may promote, the turn
// passes, and the game may end.
export function applyMove(g, move) {
  const b = g.board;
  const [r, c] = move.from;
  const [r2, c2] = move.to;
  const p = b[r][c];
  b[r][c] = '.';
  b[r2][c2] = p;
  g.last = { from: move.from, to: move.to };
  if (move.over) {
    g.captured.push(move.over);
    g.quiet = 0;
    if (captureMoves(g, r2, c2).length) {
      g.mustFrom = [r2, c2];
      return g;
    }
    for (const [a, d] of g.captured) b[a][d] = '.';
    g.captured = [];
  } else {
    g.quiet++;
  }
  g.mustFrom = null;
  if (p === 'w' && r2 === 0) b[r2][c2] = 'W';
  if (p === 'b' && r2 === SIZE - 1) b[r2][c2] = 'B';
  g.turn = other(g.turn);
  if (!legalMoves(g).length) g.winner = other(g.turn);
  else if (g.quiet >= DRAW_QUIET) g.winner = 'draw';
  return g;
}

export function countPieces(g) {
  const n = { w: 0, b: 0 };
  for (const row of g.board) for (const p of row) if (p !== '.') n[colorOf(p)]++;
  return n;
}

// ---------- ลุงชม: a small alpha-beta bot ----------

function evaluate(g, me) {
  if (g.winner) return g.winner === me ? 10000 : g.winner === 'draw' ? 0 : -10000;
  let s = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = g.board[r][c];
      if (p === '.') continue;
      const side = colorOf(p);
      let v = isKing(p) ? 35 : 10 + (side === 'w' ? SIZE - 1 - r : r);
      if (!isKing(p) && (c === 0 || c === SIZE - 1)) v += 1; // edges are safe
      s += side === me ? v : -v;
    }
  }
  return s;
}

function search(g, depth, alpha, beta, me) {
  if (depth <= 0 || g.winner) return evaluate(g, me);
  const max = g.turn === me;
  let best = max ? -Infinity : Infinity;
  for (const m of legalMoves(g)) {
    const n = applyMove(cloneGame(g), m);
    // A jump that continues is the same turn: don't spend depth on it.
    const v = search(n, n.turn === g.turn && !n.winner ? depth : depth - 1, alpha, beta, me);
    if (max) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export function botMove(g, rng = Math.random, depth = 4) {
  const me = g.turn;
  const moves = legalMoves(g);
  let best = -Infinity;
  let picks = [];
  for (const m of moves) {
    const n = applyMove(cloneGame(g), m);
    const v = search(n, n.turn === me && !n.winner ? depth : depth - 1, -Infinity, Infinity, me);
    if (v > best + 0.5) {
      best = v;
      picks = [m];
    } else if (Math.abs(v - best) <= 0.5) {
      picks.push(m);
    }
  }
  return picks[Math.floor(rng() * picks.length)] ?? null;
}
