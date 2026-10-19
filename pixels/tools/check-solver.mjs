#!/usr/bin/env node
//
// THE LINE SOLVER, AGAINST EVERY WAY A LINE CAN BE FILLED. app.js's
// `solveLine` decides whether the Pixelator saves a puzzle, how hard it is
// and what Hint lights, so here it is held to a solver too plain to be wrong:
// one that tries every filling of the line, keeps those that match the
// numbers and what is known, and marks a square decided where they agree.
//
// Every line up to 6 squares is tried with every set of numbers and every
// mix of known squares, and then lines of 7 to 12 at random from a fixed
// seed, so a run is the same every time. Known squares may contradict the
// numbers; then both must say there is no way, as null.
//
//   node pixels/tools/check-solver.mjs
//
import { pixels } from './lib/pixels-solver.mjs';

const { clues, solveLine } = pixels();

const plain = (clue, known) => {
  const L = known.length;
  let agree = null;
  for (let m = 0; m < 1 << L; m++) {
    const line = Array.from({ length: L }, (_, k) => (m >> k) & 1);
    if (known.some((v, k) => v !== -1 && v !== line[k])) continue;
    if (clues(line).join() !== clue.join()) continue;
    if (!agree) agree = line;
    else for (let k = 0; k < L; k++) if (agree[k] !== line[k]) agree[k] = -1;
  }
  return agree;
};

let cases = 0, wrong = 0;
const compare = (clue, known) => {
  cases++;
  const got = JSON.stringify(solveLine(clue, known)), want = JSON.stringify(plain(clue, known));
  if (got === want) return;
  if (wrong++ < 5) console.log(`  FAIL  numbers ${clue.join(' ')}, known ${known.join(',')}: solver says ${got}, every filling says ${want}`);
};

// Every line up to 6 squares.
for (let L = 1; L <= 6; L++) {
  const all = [...new Set(Array.from({ length: 1 << L }, (_, m) => clues(Array.from({ length: L }, (_, k) => (m >> k) & 1)).join()))]
    .map(s => s.split(',').map(Number));
  for (let n = 0; n < 3 ** L; n++) {
    const known = Array.from({ length: L }, (_, k) => Math.floor(n / 3 ** k) % 3 - 1);
    all.forEach(clue => compare(clue, known));
  }
}

// Longer lines at random, from a fixed seed.
let seed = 20261019;
const random = () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
for (let i = 0; i < 2000; i++) {
  const L = 7 + Math.floor(random() * 6);
  const answer = Array.from({ length: L }, () => (random() < .5 ? 1 : 0));
  const known = answer.map(v => { const r = random(); return r < .6 ? -1 : r < .9 ? v : 1 - v; });
  compare(clues(answer), known);
}

if (wrong) { console.log(`  FAIL  solver  ${wrong} of ${cases} lines disagree`); process.exit(1); }
console.log(`   ok   solver  ${cases} lines, each the same as every filling gives`);
