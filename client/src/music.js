// Chiptune loops for each room theme, written as note text so there are no
// audio files. Each track is a list of eighth-note steps separated by spaces:
// a note ('C5', 'F#4'), '-' for silence or '~' to hold the previous note.
// Drum steps: k kick, s snare, h hi-hat, c ฉิ่ง (small bright cymbal), - nothing.
// Pure data + helpers (no DOM) so tests can check every song.

const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// 'A4' -> 440 Hz; null for anything that isn't a note.
export function noteFreq(note) {
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) return null;
  const midi = (Number(m[2]) + 1) * 12 + NAMES[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

export const steps = (track) => track.trim().split(/\s+/);

export const SONGS = {
  // ตลาด: bouncy C major pentatonic, like a ลูกทุ่ง jingle.
  market: {
    bpm: 118, lead: 'square', bass: 'triangle',
    tracks: {
      lead: 'E5 ~ G5 E5 D5 ~ C5 D5  E5 ~ G5 A5 G5 ~ - -  A5 ~ G5 E5 D5 ~ E5 G5  E5 D5 C5 ~ C5 ~ - -',
      bass: 'C3 - G3 - C3 - G3 -  F3 - C4 - F3 - C4 -  A2 - E3 - A2 - E3 -  G2 - D3 - G2 - B2 -',
      drums: 'k - h - s - h -  k - h - s - h h  k - h - s - h -  k - h - s - h h',
    },
  },
  // ซอย: sneaky A minor pentatonic.
  alley: {
    bpm: 100, lead: 'square', bass: 'triangle',
    tracks: {
      lead: 'A4 - C5 - A4 - G4 E4  - - A4 - C5 D5 C5 -  E5 - D5 C5 A4 - G4 -  A4 ~ ~ ~ - - - -',
      bass: 'A2 ~ - A2 - - E2 -  A2 ~ - A2 - - G2 -  F2 ~ - F2 - - G2 -  A2 ~ - A2 E2 - A2 -',
      drums: 'k - - h s - - h  k - k h s - - h  k - - h s - - h  k - k h s - h h',
    },
  },
  // ริมคลอง: slow and mellow, D pentatonic on a soft triangle.
  canal: {
    bpm: 84, lead: 'triangle', bass: 'triangle',
    tracks: {
      lead: 'D5 ~ ~ E5 F#5 ~ A5 ~  B5 ~ A5 ~ F#5 ~ ~ ~  E5 ~ ~ F#5 A5 ~ F#5 ~  E5 ~ D5 ~ ~ ~ - -',
      bass: 'D3 ~ A3 ~ D3 ~ A3 ~  G2 ~ D3 ~ G2 ~ D3 ~  B2 ~ F#3 ~ B2 ~ F#3 ~  A2 ~ E3 ~ A2 ~ E3 ~',
      drums: 'k - - - h - - -  s - - - h - - -  k - - - h - - -  s - - - h - h -',
    },
  },
  // ชานเมือง: driving E minor with a busy bass.
  suburb: {
    bpm: 132, lead: 'square', bass: 'sawtooth',
    tracks: {
      lead: 'E5 - E5 G5 - E5 D5 -  B4 - D5 - E5 - - -  E5 - E5 G5 - A5 G5 -  F#5 - D5 - E5 - - -',
      bass: 'E2 E2 E3 E2 E2 E3 E2 E3  C3 C3 C2 C3 D3 D3 D2 D3  E2 E2 E3 E2 E2 E3 E2 E3  C3 C3 D3 D3 E2 E2 E2 -',
      drums: 'k h s h k k s h  k h s h k k s h  k h s h k k s h  k h s h k s s s',
    },
  },
  // งานวัด: หมอลำ-style G pentatonic over a แคน drone, with ฉิ่ง on the off-beats.
  fair: {
    bpm: 126, lead: 'square', bass: 'triangle', drone: ['G3', 'D4'],
    tracks: {
      lead: 'G5 A5 B5 A5 G5 E5 D5 E5  G5 ~ E5 D5 E5 ~ - -  D5 E5 G5 A5 B5 A5 G5 E5  D5 E5 D5 B4 G4 ~ - -',
      bass: 'G2 - D3 - G2 - D3 -  G2 - D3 - E3 - D3 -  G2 - D3 - G2 - D3 -  E2 - D3 - G2 - G2 -',
      drums: 'k c - c s c - c  k c - c s c c c  k c - c s c - c  k c - c s c s c',
    },
  },
};
