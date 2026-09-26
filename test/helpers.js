// Shared helpers for server tests (not a test file itself).
import { MemoryStore } from '../server/store.js';
import { World } from '../server/world.js';

// Deterministic PRNG so fights and drops are reproducible.
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeWorld(seed = 1) {
  let clock = 1_000_000;
  const world = new World({ store: new MemoryStore(), rng: mulberry32(seed), now: () => clock });
  world.lastTick = clock;
  const run = (ms) => {
    for (let t = 0; t < ms; t += 100) {
      clock += 100;
      world.tick(clock);
    }
  };
  // Jump the clock without simulating (e.g. to the next day).
  const skip = (ms) => {
    clock += ms;
    world.lastTick = clock;
  };
  return { world, run, skip, now: () => clock };
}

// Connects a client and waits until the server has answered the hello.
export async function join(world, name, { password = 'secret123', mode = 'register', ...extra } = {}) {
  const inbox = [];
  const client = world.connect((m) => inbox.push(m), () => inbox.push({ t: 'closed' }));
  client.message({ t: 'hello', name, password, mode, ...extra });
  for (let i = 0; i < 200 && !inbox.some((m) => m.t === 'welcome' || m.t === 'error'); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  const welcome = inbox.find((m) => m.t === 'welcome');
  return { client, inbox, id: welcome?.id, player: () => [...world.online.values()].find((p) => p.id === welcome?.id) };
}

export const errorText = (c) => c.inbox.find((m) => m.t === 'error')?.text;
