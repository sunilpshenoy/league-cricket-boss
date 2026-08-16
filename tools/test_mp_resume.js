// Regression test for the "resume an in-progress game" fix added
// 2026-08-15, in direct response to a real report: a player closed
// and reopened the app mid-match and was dropped all the way back to
// the splash screen with no way back in -- Join is explicitly blocked
// once a game has left the lobby (see xm()'s "Game already started"
// check), so there was previously no recovery path at all, matching
// the "no reconnection/resilience hardening" gap named in the
// original handover doc.
//
// Root cause: the session code (n) and team id (i) in the router
// (Nm()) were plain in-memory useState with nothing to restore them
// from on a fresh mount. The fix persists {code, teamId, uid} to
// localStorage on host/join, and restores it once anonymous auth
// resolves, fetching the session's current meta.status to land
// directly on the correct screen instead of flashing through splash.
//
// This is a static check -- the actual end-to-end behavior was
// verified live via the mock Firebase harness, simulating a real
// close-and-reopen (a second, fresh page in the same browser context,
// pre-seeded with the same "Firebase" data and sharing localStorage,
// exactly like real life): the reopened session landed on the exact
// same ball, score, and screen the first session had reached, with
// zero errors, for both a mid-match resume and a lobby-phase resume.
//
// Run with `node tools/test_mp_resume.js`.

const fs = require("fs");
const path = require("path");

const prodFile = path.resolve(__dirname, "..", "LeagueCricketBoss_MP_v1.5.html");
let ok = false;

if (fs.existsSync(prodFile)) {
  const src = fs.readFileSync(prodFile, "utf8");
  const persistsOnHostJoin = (src.match(/localStorage\.setItem\("lcb_session"/g) || []).length === 2;
  const restoresOnMount = /localStorage\.getItem\("lcb_session"/.test(src);
  const validatesPlayerStillMember = /vo\(`sessions\/\$\{saved\.code\}\/players\/\$\{a\}`\)/.test(src);
  const mapsStatusToScreen = /auction:\s*"auction"[^}]*season:\s*"season"[^}]*match:\s*"match"[^}]*playoffs:\s*"playoffs"[^}]*awards:\s*"awards"/.test(src);
  ok = persistsOnHostJoin && restoresOnMount && validatesPlayerStillMember && mapsStatusToScreen;
  console.log("persists {code,teamId,uid} on both host and join (expect 2 call sites):", persistsOnHostJoin);
  console.log("restores from localStorage on mount:", restoresOnMount);
  console.log("validates the player is still a real member before resuming:", validatesPlayerStillMember);
  console.log("maps every meta.status to the correct screen:", mapsStatusToScreen);
} else {
  console.log("Production file not found:", prodFile);
}

console.log("\nALL CHECKS PASSED:", ok);
process.exit(ok ? 0 : 1);
