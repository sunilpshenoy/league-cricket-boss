// Regression test for a bug found 2026-08-15 via live browser testing (not
// catchable by node --check, since it's valid JS that only fails at runtime):
//
// The pre-match "Match Day" screen component (zv() in sp/bundle.readable.js)
// renders a "‹ Back to Hub" button whose onClick calls onCancel(). The
// screen that renders zv() DOES pass an onCancel prop -- but zv()'s own
// parameter destructuring never listed onCancel, so inside the component it
// referred to nothing, and clicking the button threw "onCancel is not
// defined" instead of navigating back. Confirmed live: the button did
// nothing and threw a page error.
//
// This test statically confirms the production file's zv() signature still
// destructures onCancel, so a future edit to this component can't silently
// drop it again the same way. Run with `node tools/test_sp_prematch_cancel.js`.

const fs = require("fs");
const path = require("path");

const prodFile = path.resolve(__dirname, "..", "LeagueCricketBoss_SP_v2.2.html");
let ok = false;

if (fs.existsSync(prodFile)) {
  const src = fs.readFileSync(prodFile, "utf8");
  const sigMatch = src.match(/function zv\(\{[^}]*\}\)\{/);
  if (sigMatch) {
    const usesOnCancel = /onClick:\(\)=>onCancel&&onCancel\(\)/.test(src);
    const destructuresOnCancel = /\bonCancel\b/.test(sigMatch[0]);
    ok = usesOnCancel && destructuresOnCancel;
    console.log("zv() signature:", sigMatch[0]);
    console.log("Back button still calls onCancel():", usesOnCancel);
    console.log("zv() destructures onCancel from its props:", destructuresOnCancel);
  } else {
    console.log("Could not find function zv() in production file -- component may have been renamed/removed.");
  }
} else {
  console.log("Production file not found:", prodFile);
}

console.log("\nALL CHECKS PASSED:", ok);
process.exit(ok ? 0 : 1);
