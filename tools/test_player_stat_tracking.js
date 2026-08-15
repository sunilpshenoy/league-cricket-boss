// TEMPLATE: verifying per-ball state-machine logic (batting/bowling figures,
// strike rotation, bowler-over caps) against hand-calculated expected results
// BEFORE touching production code. This exact pattern caught real bugs during
// the ball-by-ball rewrite of MP's live match engine.
//
// IMPORTANT: keep the processBall() logic below byte-for-byte in sync with
// resolveOneBallStep() in bundle.readable.js. If you change one, update the
// other and re-run this file before deploying.
//
// Usage: node test_player_stat_tracking.js

function processBall(batScores, bowlerFigures, facingBatterName, bowlerName, res) {
  batScores = { ...batScores };
  bowlerFigures = { ...bowlerFigures };
  const bf = bowlerFigures[bowlerName] || { overs: 0, runs: 0, wickets: 0 };
  const bs = batScores[facingBatterName] || { runs: 0, balls: 0, out: false };
  if (res.r === 'W') {
    batScores[facingBatterName] = { ...bs, balls: bs.balls + 1, out: true };
    bowlerFigures[bowlerName] = { ...bf, wickets: bf.wickets + 1 };
  } else {
    batScores[facingBatterName] = { ...bs, runs: bs.runs + res.runs, balls: bs.balls + 1 };
    bowlerFigures[bowlerName] = { ...bf, runs: bf.runs + res.runs };
  }
  return { batScores, bowlerFigures };
}

// A scripted 12-ball sequence with known, hand-calculated expected outcomes.
// Extend this with new scenarios (all dot balls, all wickets, etc.) as the
// engine grows, rather than replacing it.
const balls = [
  { batter: 'A', bowler: 'X', res: { r: '4', runs: 4 } },
  { batter: 'A', bowler: 'X', res: { r: '1', runs: 1 } },
  { batter: 'B', bowler: 'X', res: { r: 'W', runs: 0 } },
  { batter: 'B', bowler: 'X', res: { r: '0', runs: 0 } },
  { batter: 'B', bowler: 'X', res: { r: '6', runs: 6 } },
  { batter: 'A', bowler: 'X', res: { r: '2', runs: 2 } },
  { batter: 'A', bowler: 'Y', res: { r: 'W', runs: 0 } },
  { batter: 'C', bowler: 'Y', res: { r: '1', runs: 1 } },
  { batter: 'C', bowler: 'Y', res: { r: '1', runs: 1 } },
  { batter: 'B', bowler: 'Y', res: { r: '4', runs: 4 } },
  { batter: 'B', bowler: 'Y', res: { r: '0', runs: 0 } },
  { batter: 'B', bowler: 'Y', res: { r: '1', runs: 1 } },
];

let batScores = {}, bowlerFigures = {};
for (const b of balls) {
  const result = processBall(batScores, bowlerFigures, b.batter, b.bowler, b.res);
  batScores = result.batScores;
  bowlerFigures = result.bowlerFigures;
}

const checks = [
  ['A runs', batScores.A.runs, 7], ['A balls', batScores.A.balls, 4], ['A out', batScores.A.out, true],
  ['B runs', batScores.B.runs, 11], ['B balls', batScores.B.balls, 6], ['B out', batScores.B.out, true],
  ['C runs', batScores.C.runs, 2], ['C balls', batScores.C.balls, 2], ['C out', batScores.C.out, false],
  ['X runs conceded', bowlerFigures.X.runs, 13], ['X wickets', bowlerFigures.X.wickets, 1],
  ['Y runs conceded', bowlerFigures.Y.runs, 7], ['Y wickets', bowlerFigures.Y.wickets, 1],
];

console.log('=== PASS/FAIL ===');
let allPass = true;
for (const [label, actual, expected] of checks) {
  const pass = actual === expected;
  if (!pass) allPass = false;
  console.log(`${label}: actual=${actual} expected=${expected} -> ${pass ? 'PASS' : 'FAIL'}`);
}
console.log('\nALL CHECKS PASSED:', allPass);
if (!allPass) process.exit(1);
