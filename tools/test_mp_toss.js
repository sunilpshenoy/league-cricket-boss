// Regression test for the MP coin-toss feature added 2026-08-15.
//
// Before this, MP had no toss -- the home team always batted first
// (a known gap vs SP, called out in the original handover doc). Now
// match creation writes phase:"toss" with a randomly chosen
// tossWinner, and the toss winner's choice (bat/bowl) determines
// battingTeam/bowlingTeam before phase becomes "playing".
//
// This test does two things, matching this project's established
// pattern (replicate the exact production decision logic, assert
// against hand-calculated expectations; also statically confirm the
// production file still contains the real wiring):
//
// 1. Replicates TossScreen's choose(bat) team-assignment logic and
//    checks it against hand-calculated expected outcomes for all four
//    combinations of (who won the toss) x (bat or bowl chosen).
// 2. Confirms the production file actually writes phase:"toss" with a
//    randomized tossWinner at match creation, and defines TossScreen.
//
// Run with `node tools/test_mp_toss.js`.

function resolveTossChoice(home, away, tossWinner, bat) {
  const otherTeamId = tossWinner === home ? away : home;
  const battingTeam = bat ? tossWinner : otherTeamId;
  const bowlingTeam = battingTeam === home ? away : home;
  return { battingTeam, bowlingTeam };
}

const cases = [
  { home: "MUM", away: "CHN", tossWinner: "MUM", bat: true, expect: { battingTeam: "MUM", bowlingTeam: "CHN" } },
  { home: "MUM", away: "CHN", tossWinner: "MUM", bat: false, expect: { battingTeam: "CHN", bowlingTeam: "MUM" } },
  { home: "MUM", away: "CHN", tossWinner: "CHN", bat: true, expect: { battingTeam: "CHN", bowlingTeam: "MUM" } },
  { home: "MUM", away: "CHN", tossWinner: "CHN", bat: false, expect: { battingTeam: "MUM", bowlingTeam: "CHN" } },
];

let allPassed = true;
for (const c of cases) {
  const result = resolveTossChoice(c.home, c.away, c.tossWinner, c.bat);
  const pass = result.battingTeam === c.expect.battingTeam && result.bowlingTeam === c.expect.bowlingTeam;
  allPassed = allPassed && pass;
  console.log(
    `tossWinner=${c.tossWinner} bat=${c.bat} -> battingTeam=${result.battingTeam},bowlingTeam=${result.bowlingTeam}`,
    pass ? "PASS" : `FAIL (expected battingTeam=${c.expect.battingTeam},bowlingTeam=${c.expect.bowlingTeam})`
  );
}

const fs = require("fs");
const path = require("path");
const prodFile = path.resolve(__dirname, "..", "LeagueCricketBoss_MP_v1.5.html");
let wiringOk = false;
if (fs.existsSync(prodFile)) {
  const src = fs.readFileSync(prodFile, "utf8");
  const hasTossPhase = /phase:\s*"toss"/.test(src);
  const hasRandomWinner = /tossWinner:\s*Math\.random\(\)\s*<\s*\.5\s*\?\s*fx\.home\s*:\s*fx\.away/.test(src);
  const hasTossScreen = /function TossScreen\(\{/.test(src);
  wiringOk = hasTossPhase && hasRandomWinner && hasTossScreen;
  console.log("production file writes phase:\"toss\" at match creation:", hasTossPhase);
  console.log("production file picks a random toss winner:", hasRandomWinner);
  console.log("production file defines TossScreen:", hasTossScreen);
} else {
  console.log("Production file not found:", prodFile);
}

const ok = allPassed && wiringOk;
console.log("\nALL CHECKS PASSED:", ok);
process.exit(ok ? 0 : 1);
