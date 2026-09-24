// 8-directional A* on a boolean blocked grid. Diagonals may not cut corners.
// Returns the list of tiles to walk through (excluding the start), or null.

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export function isBlocked(grid, x, y) {
  return y < 0 || y >= grid.length || x < 0 || x >= grid[0].length || grid[y][x];
}

function octile(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

export function findPath(grid, sx, sy, gx, gy, maxNodes = 4000) {
  if (isBlocked(grid, gx, gy)) return null;
  if (sx === gx && sy === gy) return [];
  const w = grid[0].length;
  const key = (x, y) => y * w + x;
  const open = new MinHeap();
  const g = new Map([[key(sx, sy), 0]]);
  const parent = new Map();
  const closed = new Set();
  open.push(octile(sx, sy, gx, gy), sx, sy);
  let expanded = 0;
  while (open.size) {
    const [x, y] = open.pop();
    const k = key(x, y);
    if (closed.has(k)) continue;
    if (x === gx && y === gy) {
      const path = [];
      let cur = k;
      while (cur !== key(sx, sy)) {
        path.push({ x: cur % w, y: Math.floor(cur / w) });
        cur = parent.get(cur);
      }
      return path.reverse();
    }
    closed.add(k);
    if (++expanded > maxNodes) return null;
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (isBlocked(grid, nx, ny)) continue;
      if (dx && dy && (isBlocked(grid, x + dx, y) || isBlocked(grid, x, y + dy))) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = g.get(k) + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        parent.set(nk, k);
        open.push(ng + octile(nx, ny, gx, gy), nx, ny);
      }
    }
  }
  return null;
}

// Nearest walkable tile to (x, y), searching outward in rings.
export function nearestOpen(grid, x, y, maxR = 6) {
  if (!isBlocked(grid, x, y)) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    let best = null;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isBlocked(grid, x + dx, y + dy)) continue;
        const d = dx * dx + dy * dy;
        if (!best || d < best.d) best = { x: x + dx, y: y + dy, d };
      }
    }
    if (best) return { x: best.x, y: best.y };
  }
  return null;
}

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(f, x, y) {
    const a = this.a;
    a.push([f, x, y]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return [top[1], top[2]];
  }
}
