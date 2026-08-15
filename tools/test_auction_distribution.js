// TEMPLATE: How to test game-logic changes against the REAL production code
// before deploying, using a mock Firebase and the exact extracted function text.
// This pattern found and prevented several real bugs during MP development
// (silent player loss in auto-complete, uneven squad distribution).
//
// Usage: node test_auction_distribution.js

const teamDB = require('./mp_team_database_extracted.js');
const Q = Object.fromEntries(Object.entries(teamDB).map(([t, l]) => [t, {
  ...l, id: t, players: l.p.map(([a, e, n, u, i, c]) => ({ name: a, role: e, bat: n, bowl: u, form: i, price: c }))
}]));
const Za = 120;
const mt = Object.keys(Q);
const g1 = new Set(["Rasheed Khan","Varun Chakravarthi","Noor Ahamed","Kuldeep Yadaw","Ravi Bishnoy","Yuzvendra Chahall","Rahul Chaahar"]);

function Ct(t) { return Math.round(t * 10) / 10 }
function Vl(t) { let l = t.price || .3; return l >= 15 ? 2 : l >= 8 ? 1.5 : l >= 4 ? 1 : l >= 1.5 ? .75 : l >= .5 ? .4 : .2 }
function Em() {
  let t = []; mt.forEach(a => Q[a].players.forEach(e => t.push({ ...e, team: a })));
  let l = { BAT: [], FAST: [], SPIN: [], AR: [], WK: [] };
  t.forEach(a => { a.role === "WK" || a.role === "WKB" ? l.WK.push(a) : a.role === "AR" ? l.AR.push(a) : a.role === "BAT" ? l.BAT.push(a) : a.role === "BOWL" ? g1.has(a.name) ? l.SPIN.push(a) : l.FAST.push(a) : l.BAT.push(a) });
  Object.values(l).forEach(a => a.sort((e, n) => n.price - e.price));
  return [...l.BAT, ...l.FAST, ...l.SPIN, ...l.AR, ...l.WK].map(a => ({ name: a.name, role: a.role, bat: a.bat, bowl: a.bowl, form: a.form, price: a.price, team: a.team, baseP: Vl(a) }));
}

// Mock Firebase: in-memory store with the same get/set semantics as vo()/yt()
const store = {};
function getPath(obj, path) { const parts = path.split('/'); let cur = obj; for (const p of parts) { if (cur == null) return null; cur = cur[p] } return cur }
function setPath(obj, path, value) { const parts = path.split('/'); let cur = obj; for (let i = 0; i < parts.length - 1; i++) { if (!(parts[i] in cur)) cur[parts[i]] = {}; cur = cur[parts[i]] } cur[parts[parts.length - 1]] = value }
async function vo(path) { return getPath(store, path) }
async function yt(path, patch) { const existing = getPath(store, path) || {}; setPath(store, path, { ...existing, ...patch }); return true }

// IMPORTANT: keep this function's body identical to the real bowlerPool()/auction-completion
// logic in bundle.readable.js. When you change the production logic, update this test to match,
// re-run it, and only then deploy. Never trust "the code looks right" alone.
async function ensureMinSquads(code, teamIds) {
  const squads = await vo(`sessions/${code}/squads`) || {};
  for (const tid of teamIds) {
    const cur = squads[tid] || { players: [], purse: 120 };
    let players = [...(cur.players || [])]; let n = 1;
    while (players.length < 18) { players.push({ name: `${tid} Reserve ${n}`, role: "AR", bat: 55, bowl: 55, form: 1, price: .5, paid: 0 }); n++ }
    if (players.length !== (cur.players || []).length) await yt(`sessions/${code}/squads/${tid}`, { players, purse: cur.purse != null ? cur.purse : 120 });
  }
}

async function runAutoComplete(sessionCode) {
  const t = sessionCode;
  const K = Em();
  setPath(store, `sessions/${t}/auction`, { idx: 0, pool: K, log: [], done: false });
  mt.forEach(team => setPath(store, `sessions/${t}/squads/${team}`, { players: [], purse: Za }));
  let _ = await vo(`sessions/${t}/auction`);
  while (_ && !_.done) {
    let w = K[_.idx];
    if (!w) break;
    let squadsNow = await vo(`sessions/${t}/squads`) || {};
    let affordable = mt.filter(cand => (squadsNow[cand]?.purse || Za) >= w.baseP);
    let pool2 = affordable.length ? affordable : mt;
    let zt = [...pool2].sort((a, b) => ((squadsNow[a]?.players || []).length) - ((squadsNow[b]?.players || []).length) || Math.random() - .5)[0];
    let Tt = squadsNow[zt] || { players: [], purse: Za };
    let ct = Math.min(w.baseP, Tt.purse || 0);
    await yt(`sessions/${t}/squads/${zt}`, { players: [...Tt.players || [], { ...w, paid: ct }], purse: Ct((Tt.purse || 0) - ct) });
    let Aa = [...(_.log || []), { name: w.name, team: zt, price: ct }];
    let Jl = (_.idx || 0) + 1;
    if (Jl >= K.length) { await ensureMinSquads(t, mt); await yt(`sessions/${t}/auction`, { done: true, log: Aa }); break }
    await yt(`sessions/${t}/auction`, { idx: Jl, bid: K[Jl]?.baseP, bidder: null, bidAt: Date.now(), log: Aa });
    _ = await vo(`sessions/${t}/auction`);
  }
}

async function main() {
  await runAutoComplete('TEST1');
  const squads = await vo('sessions/TEST1/squads');
  console.log('Real-player count per team (should all be equal or very close):');
  for (const team of mt) {
    const real = squads[team].players.filter(p => !p.name.includes('Reserve')).length;
    console.log(` ${team}: ${real} real players, ${squads[team].players.length} total`);
  }
}
main().catch(e => console.error('TEST ERROR:', e));
