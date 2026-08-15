# League Cricket Boss — Handover to Claude Code

Prepared for migration from Claude (chat) to Claude Code. This document exists so a fresh Claude Code session — or you — can pick this project up without re-discovering things the hard way. Read this fully before making changes.

---

## 1. What this project is

Two related but separate browser-based cricket management games, both single-file React apps (no build step — React loaded from CDN, JSX compiled inline) deployed as static HTML on GitHub Pages under `sunilpshenoy.github.io`.

- **SP (Single Player)** — `LeagueCricketBoss_SP_v2.2` — offline, one device, richer built-in mechanics (full ball-by-ball engine, toss, batting order editor, coach personalities). This is the **reference implementation** for gameplay depth — MP has been built to match and in some areas exceed it.
- **MP (Multiplayer)** — `LeagueCricketBoss_MP_v1.5` — two humans on separate devices, synchronized via **Firebase Realtime Database**. This is where almost all recent development effort went.

Both are IPL-style T20 franchise games: auction → squad building → season of fixtures → playoffs → awards, with a live ball-by-ball match engine at the center.

**Owner/context:** Sunil Shenoy, non-technical ("vibe coder"), directs via natural language, tests on a mobile phone via GitHub Pages. Has zero tolerance for unverified claims of "fixed" — every fix in recent history was expected to be tested, not just asserted.

---

## 2. File guide (this package)

```
/mp/
  LeagueCricketBoss_MP_v1.5.DEPLOY.html   <- THE production file. Deploy this, unmodified in structure, to GitHub Pages.
  bundle.readable.js                       <- The same JS, pretty-printed (js-beautify) for reading/editing. NOT deployable as-is (it's just the script content, not full HTML).
  raw-bundle.js                            <- The exact minified JS as it exists in DEPLOY.html, unformatted. Useful for exact diffing.
  shell.head.html / shell.tail.html        <- The HTML wrapper (styles, meta, CDN script tags) split out from the JS bundle.

/sp/
  (same structure, for the single-player version)

/tools/
  test_auction_distribution.js             <- Reusable Node test harness (mock Firebase) for the auction/squad-distribution logic.
  test_player_stat_tracking.js             <- Reusable Node test for per-ball batting/bowling stat accumulation.
  mp_team_database_extracted.js            <- MP's full player roster, extracted as a plain JS module (189 players, 10 teams).
  sp_team_database_extracted.js            <- SP's full player roster (180 players, 10 teams).

/docs/
  HANDOVER.md                              <- This file.
```

**Important:** the variable names throughout (`t`, `l`, `a`, `Q`, `mt`, `yt`, `vo`, etc.) are NOT the product of a minifier — this is simply how the code was originally written/generated. `bundle.readable.js` reformats indentation and line breaks only; it does not rename anything. Renaming would be a large, valuable, but separate refactoring project — flagged in Section 6, not done here.

---

## 3. Architecture (MP specifically — this is where the complexity lives)

- **No build step.** React 18/19 and Firebase SDKs loaded via `<script>` CDN tags in the HTML head. The entire app is one big IIFE using `React.createElement`-equivalent calls via a JSX-less compiled form (`(0,f.jsx)(...)` calls — `f` is the jsx-runtime alias).
- **State machine via Firebase Realtime Database**, keyed by a 6-character session code: `sessions/{code}/meta`, `/players`, `/teams`, `/auction`, `/squads`, `/fixtures`, `/table`, `/activeMatch`, `/lineups/{teamId}`, `/injuries/{teamId}`.
- **Top-level router** (`Nm()`) is supposed to watch `meta.status` and switch which screen component renders (`Dm` lobby → `_m` auction → `Um` season hub → `LCB_LiveMatch` → `Rm` playoffs → `Cm` awards). **This router's own listener has proven unreliable** — see Section 6, Issue #1. The fix pattern used throughout: individual screens now watch their own `meta.status` directly and self-navigate to the next screen, rather than trusting the router.
- **Live match engine** (`LCB_LiveMatch`) resolves cricket **ball by ball**, not over by over. Every single ball requires **both** a batting-side shot choice (`match.battingDecision`) and a bowling-side delivery choice (`match.bowlerDelivery`) to be present before it resolves — this is enforced by the trigger condition and cannot be bypassed by either player alone. See Section 5 for exact mechanics.
- **Two Firebase helper patterns exist**: `yt()` swallows errors internally (catches and logs to console, returns undefined on failure — silent failure). `ytStrict()` does not swallow errors — use this for anything where you need to know if a write actually failed. Prefer `ytStrict` for new code.
- **`Nt(path, deps)`** is the real-time listener hook (`.on('value', ...)`). **`vo(path)`** is a one-time read (`.get()`). Both are used heavily; know the difference before debugging "stale data" issues.

---

## 4. Current feature status (MP)

### Implemented and working (as of last testing round)
- Host/join flow, lobby with ready-check, host-triggered auction start
- Auction: manual bidding, host-only auto-complete-rest-of-auction, purse/role-aware distribution guaranteeing fair squad sizes (tested — see `test_auction_distribution.js`)
- Full 18-per-team roster for both SP and MP (MP's roster was recently expanded from 130 to 189 total players to match/exceed SP)
- Squad-of-18 floor guarantee with real-player-first, synthetic-reserve-fallback logic
- Playing XI selection: exactly 11 players, capped and enforced in the UI, with Impact Player restricted to the 7 non-XI players
- Season hub: fixtures, points table, squad view, bulk AI-vs-AI simulation, human-fixture play
- **Full ball-by-ball live match engine**, matching SP's granularity and in one respect exceeding it:
  - Bowler selection (once per over) + delivery-type selection (fresh every ball) — no bowler can bowl two overs in a row, and no bowler can exceed 4 overs in a 20-over innings, with safe fallbacks for thin squads
  - Batting side now ALSO chooses a shot type fresh every ball (Defensive/Nudge/Balanced/Aggressive/Loft), interacting multiplicatively with the bowler's delivery choice for wicket/boundary probability — this is a genuine enhancement beyond SP, which only gives the bowler per-ball control
  - Real strike rotation: swaps on odd runs, swaps at end of over, correctly brings in the next batter on a wicket
  - Per-player batting figures (runs, balls, out/not out) and bowling figures (overs, runs conceded, wickets) — tracked ball by ball, tested against hand-calculated sequences (see `test_player_stat_tracking.js`)
  - Ball-by-ball reveal: every screen shows the previous ball's result (large, color-coded) plus generated commentary before asking for the next decision — this was a late but critical fix; earlier ball-by-ball builds resolved silently with no feedback, which is why gameplay initially felt "dull" despite the underlying mechanism being correct
  - "Ball chip" progress row (6 dots per over, filled as balls are bowled) and a live striker-vs-bowler stat card, both modeled directly on SP's actual screen design
  - Risk/reward hints on both shot and delivery buttons (↑wicket, ↑boundary, misfire warnings when a bowler's skill is below a delivery's safe threshold)
  - Live, always-correct score display (fixed a real bug where the scoreboard and run-chase target math went stale mid-over)
- Playoffs and awards screens (Coach Points formula implemented; Orange/Purple Cap currently based on static player ratings, not the newly-added real per-innings stats — see Section 6)

### Explicitly NOT implemented (known gaps, not yet requested/prioritized)
- **No toss.** Home team always bats first. SP has a toss; MP does not.
- **Orange Cap / Purple Cap use static bat/bowl ratings**, not the real per-match batting/bowling figures now being tracked. Since the stat infrastructure now exists (`inn.batScores`, `inn.bowlerFigures`), wiring these into a genuine season-long leaderboard is now a comfortably scoped next step, not a rebuild.
- No reconnection/resilience hardening beyond basic AI-fallback-on-disconnect.
- SP and MP remain two independent codebases (Phase 1 "shared engine extraction" from the original project roadmap was never started). This handover does not merge them.
- No monetization, leaderboard, persistent cross-session identity, or social features (all were roadmap items, none started).

---

## 5. The "both players must decide" rule — exact mechanics

This was explicitly required and is currently enforced by this exact condition in `LCB_LiveMatch` (search `resolveOneBallStep` in `bundle.readable.js`):

```js
if (phase === "playing" && match.battingDecision && match.bowlerChoice && match.bowlerDelivery && iShouldResolve)
  resolveOneBallStep()
```

A ball only resolves when all three are truthy. After resolving, `bowlerDelivery` and `battingDecision` are both cleared (`null`) for the next ball; `bowlerChoice` (which bowler) persists for the whole over. If you touch this logic, **re-verify this condition stays a strict AND of all three** — it is the single most important invariant in the live match engine per the product owner's explicit requirement.

---

## 6. Known issues, landmines, and hard-won lessons

### Issue #1 — Firebase real-time listeners are not uniformly reliable (unresolved root cause)
Multiple times during development, two separate `Nt()` listener instances subscribed to the *identical* Firebase path behaved inconsistently — one would receive an update, the other would not, with no code-level explanation found despite deep investigation (confirmed via a diagnostic build that displayed both values side by side on screen simultaneously). This was never root-caused. **The mitigation in place**: critical screen transitions no longer trust a shared/router-level listener; each screen reads its own local listener and self-navigates. This works but is a workaround, not a fix. If you have tools to inspect this properly (real browser DevTools, Firebase console logs), it would be worth actually diagnosing.

### Issue #2 — Silent errors from `yt()`
`yt()` catches its own errors and logs to `console.error`, which is invisible on a mobile phone. Several real bugs were completely undiagnosable until specific code paths were switched to `ytStrict()` (which lets errors propagate) with UI-visible error reporting. **Prefer `ytStrict()` for anything new**, and consider migrating remaining `yt()` calls in critical paths over time.

### Issue #3 — Hidden pre-existing code in fragile comma-expression chains
The auction component (`_m`) contains long JavaScript statements built from chained comma operators (multiple `useEffect` registrations concatenated with commas as a single expression, itself the condition of an `if` statement). This pattern is inherently fragile: at least one real, silent bug was found this way — a function declared as a named function *expression* inside one of these chains, which meant its name never became callable outside its own body, producing exactly the class of runtime error `"(intermediate value)(...) is not a function"`. **Treat any edit inside these comma chains as high-risk.** Read the surrounding chain completely before editing, and validate with `node --check` after every change. This is also the strongest argument for an eventual proper refactor of this function.

### Issue #4 — The working directory / sandbox is not durable across sessions
Test scripts, extracted data, and scratch files written outside the actual deployment path do not reliably persist between work sessions. This handover package exists specifically so that testing infrastructure isn't lost again. **Commit `/tools/` to version control** so this doesn't recur.

### Issue #5 — Deployment/caching ambiguity
Multiple rounds of "I fixed it" / "still broken" cycles turned out to be the product owner testing a stale cached build, not a real bug. **A visible build marker was added to the splash screen** (small gold text below the version number) specifically to eliminate this ambiguity — every deploy should update this string. Keep this practice; it saved significant back-and-forth once introduced.

### Issue #6 — Mathematical ceilings vs. bugs
Early in the squad-size debugging, "only getting 13 real players per team" was diagnosed (correctly, eventually) as a hard mathematical consequence of the player database only having 130 total entries across 10 teams — not a distribution bug. Always check whether a "shortfall" complaint is actually a data-completeness issue before assuming the algorithm is at fault. (This specific issue is now resolved — the roster was expanded to 189 total entries.)

---

## 7. Testing methodology — please continue this

The single most effective practice established during MP development: **before deploying any change to core game logic, extract the exact function text from the production file and execute it in an isolated Node script against realistic data, with hand-calculated expected results to check against.** This is not the same as "the code looks correct on read" — several real bugs were only caught this way, and several false alarms (claimed bugs that turned out to be correct behavior) were also resolved this way.

See `/tools/test_auction_distribution.js` and `/tools/test_player_stat_tracking.js` for the pattern. Both:
1. Extract or replicate the exact production logic (kept in sync manually — there's a comment reminding you to do this)
2. Mock Firebase with a simple in-memory get/set object
3. Run realistic or adversarial scenarios
4. Assert against hand-calculated expected values, not just "did it crash"

When you change logic these tests cover, **update the test file to match and re-run it before deploying** — don't let them silently drift out of sync with production.

For syntax validation alone (much cheaper, do this on every single change): extract the `<script>` contents from the HTML and run `node --check` on it.

---

## 8. Recommended immediate next steps, in rough priority order

1. **Get this deployed and confirm the build marker shows correctly** — re-establish the working baseline before making any further changes.
2. **Wire real per-innings stats into Orange Cap / Purple Cap** — the data now exists (`inn.batScores`, `inn.bowlerFigures`), it's just not aggregated across a season yet. Needs a season-long accumulator (currently these reset per-match) and the awards screen updated to read from it.
3. **Add a toss** — SP has one, MP doesn't; this is a known, scoped, not-yet-done gap.
4. **Consider addressing Issue #1 properly** if you have real browser debugging tools available — the current fix is a workaround, and understanding the actual root cause would reduce risk in future features that need reliable real-time sync.
5. **Consider the SP/MP shared-engine merge** (Phase 1 of the original roadmap) if long-term maintenance burden of two parallel codebases becomes a problem — not urgent, but named here since it was the original intended direction.
6. Longer-term roadmap items (leaderboard, persistent identity, reconnection hardening, monetization) remain undesigned — treat as a fresh scoping conversation with the product owner, not something to infer from this codebase.

---

## 9. A note on working with the product owner

Sunil is non-technical, tests exclusively on a mobile phone via GitHub Pages, and has been burned repeatedly by claims of "fixed" that weren't verified before being stated. What worked well over the course of this project:
- Explicit, itemized confidence levels per claim (verified by execution vs. verified by reading vs. genuinely unknown), not a single blanket reassurance
- Asking for the *exact* on-screen text/error rather than a paraphrase, when debugging
- A visible build marker to eliminate "which version am I testing" ambiguity
- Treating "I don't know" as an acceptable, better answer than an unverified guess
