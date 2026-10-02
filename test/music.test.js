import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SONGS, noteFreq, steps } from '../client/src/music.js';
import { ROOMS } from '../shared/maps.js';

test('note names map to the right pitches', () => {
  assert.equal(noteFreq('A4'), 440);
  assert.equal(Math.round(noteFreq('C4')), 262);
  assert.equal(Math.round(noteFreq('F#5')), 740);
  assert.equal(noteFreq('-'), null);
  assert.equal(noteFreq('H2'), null);
});

test('every room theme has a song whose tracks line up and use valid steps', () => {
  for (const room of Object.values(ROOMS)) assert.ok(SONGS[room.theme], `${room.theme} has music`);
  for (const [name, song] of Object.entries(SONGS)) {
    const t = Object.fromEntries(Object.entries(song.tracks).map(([k, v]) => [k, steps(v)]));
    assert.ok(song.bpm > 40 && song.bpm < 220, name);
    for (const [k, list] of Object.entries(t)) {
      assert.equal(list.length, t.lead.length, `${name}.${k} length`);
      for (const s of list) {
        if (k === 'drums') assert.match(s, /^[kshc-]$/, `${name}.${k}: ${s}`);
        else assert.ok(s === '-' || s === '~' || noteFreq(s), `${name}.${k}: ${s}`);
      }
      if (k !== 'drums') assert.notEqual(list[0], '~', `${name}.${k} can't start by holding`);
    }
    for (const n of song.drone ?? []) assert.ok(noteFreq(n), `${name} drone ${n}`);
  }
});
