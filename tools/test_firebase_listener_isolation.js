// Regression test for the "connectivity bug" fixed 2026-08-15 in function Nt()
// (mp/bundle.readable.js and the production HTML bundles).
//
// Root cause: Nt() is the shared real-time listener hook. Its cleanup called
// ref.off("value") with NO callback argument. Firebase Realtime Database
// treats that as "remove every 'value' listener registered on this path" --
// not just the caller's own. Multiple components legitimately watch the same
// path at once in this app (e.g. the top-level router AND an individual
// screen both watch sessions/{code}/meta). When one of them unmounted, its
// cleanup silently deregistered the OTHER one's listener too, with no error
// thrown anywhere -- matching the "listeners inconsistently stop receiving
// updates, no code-level explanation found" symptom from the handover doc.
//
// This mock reproduces real Firebase .on()/.off() semantics closely enough
// to prove the mechanism, run standalone with `node tools/test_firebase_listener_isolation.js`.

class MockRef {
  constructor(store, path) { this.store = store; this.path = path; }
  on(event, cb) {
    this.store.listeners[this.path] = this.store.listeners[this.path] || {};
    this.store.listeners[this.path][event] = this.store.listeners[this.path][event] || [];
    this.store.listeners[this.path][event].push(cb);
    return cb;
  }
  off(event, cb) {
    const list = this.store.listeners[this.path]?.[event];
    if (!list) return;
    this.store.listeners[this.path][event] = cb ? list.filter(f => f !== cb) : [];
  }
  push(val) {
    this.store.data[this.path] = val;
    (this.store.listeners[this.path]?.value || []).forEach(cb => cb({ val: () => val }));
  }
}
function makeStore() { return { data: {}, listeners: {} }; }

function runScenario(offRemovesEverything) {
  const store = makeStore();
  const path = "sessions/ABC123/meta";
  let routerReceived = "NOTHING_YET";

  const routerRef = new MockRef(store, path);
  routerRef.on("value", i => (routerReceived = i.val()));

  const screenRef = new MockRef(store, path);
  const screenCb = i => {};
  screenRef.on("value", screenCb);

  // Simulates Nt()'s cleanup on unmount, before vs. after the fix.
  if (offRemovesEverything) {
    screenRef.off("value");          // BUGGY: wipes every listener on the path
  } else {
    screenRef.off("value", screenCb); // FIXED: only removes this one
  }

  routerRef.push({ status: "auction" }); // server pushes the next status
  return routerReceived !== "NOTHING_YET";
}

const buggyBehaviorLosesRouter = runScenario(true) === false;
const fixedBehaviorKeepsRouter = runScenario(false) === true;

console.log("Buggy off('value') with no callback loses the router's listener:", buggyBehaviorLosesRouter ? "PASS (confirms the bug existed)" : "FAIL");
console.log("Fixed off('value', ownCallback) preserves the router's listener:", fixedBehaviorKeepsRouter ? "PASS" : "FAIL");

// Also check the actual deployed file, not just the abstract mock above --
// makes sure a future edit can't silently reintroduce the bare off("value")
// call without this test catching it.
const fs = require("fs");
const path = require("path");
const prodFile = path.resolve(__dirname, "..", "LeagueCricketBoss_MP_v1.5.html");
let prodFileOk = false;
if (fs.existsSync(prodFile)) {
  const src = fs.readFileSync(prodFile, "utf8");
  const ntMatch = src.match(/function Nt\(t,l=\[\]\)\{[\s\S]*?\n?[^\n]*?\},\[t,\.\.\.l\]\),a\}/);
  if (ntMatch) {
    const fnText = ntMatch[0];
    const hasBareOff = /n&&n\.off\("value"\)/.test(fnText);
    const hasScopedOff = /n&&s&&n\.off\("value",s\)/.test(fnText);
    prodFileOk = hasScopedOff && !hasBareOff;
  }
}
console.log("Production file (LeagueCricketBoss_MP_v1.5.html) uses scoped off():", prodFileOk ? "PASS" : "FAIL");

const allPassed = buggyBehaviorLosesRouter && fixedBehaviorKeepsRouter && prodFileOk;
console.log("\nALL CHECKS PASSED:", allPassed);
process.exit(allPassed ? 0 : 1);
