// Regression test for the "Quick Sim Rest of Match" feature added
// 2026-08-15, requested so a solo tester isn't stuck manually tapping
// through ~240 ball-by-ball decisions to reach season/playoff/awards
// screens. Reuses the exact same AI decision logic already used to
// auto-play an offline/AI opponent, just applied to the human's own
// side once they opt in -- writes the same battingDecision/
// bowlerChoice/bowlerDelivery fields a manual tap would, so it's
// invisible to resolveOneBallStep and the "both players must decide"
// invariant.
//
// This is a static check (the actual end-to-end behavior was verified
// live via the mock Firebase harness -- a full two-innings match
// completed via Quick Sim in seconds with zero page errors). This
// test just confirms the wiring stays in the production file.
//
// Run with `node tools/test_mp_quicksim.js`.

const fs = require("fs");
const path = require("path");

const prodFile = path.resolve(__dirname, "..", "LeagueCricketBoss_MP_v1.5.html");
let ok = false;

if (fs.existsSync(prodFile)) {
  const src = fs.readFileSync(prodFile, "utf8");
  const hasState = /\[quickSim,\s*setQuickSim\]\s*=\s*R\.useState\(/.test(src);
  const hasGuard = /phase\s*!==\s*"playing"\s*\|\|\s*!quickSim\)\s*return;/.test(src);
  const buttonCount = (src.match(/Quick Sim Rest of Match/g) || []).length;
  ok = hasState && hasGuard && buttonCount === 3;
  console.log("has quickSim state:", hasState);
  console.log("auto-play effect gated on quickSim:", hasGuard);
  console.log("Quick Sim button present on all 3 decision screens (expect 3):", buttonCount);
} else {
  console.log("Production file not found:", prodFile);
}

console.log("\nALL CHECKS PASSED:", ok);
process.exit(ok ? 0 : 1);
