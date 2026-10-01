// node test.js : auto-solve many blueprints of every family and check every answer independently
const A = require('./engine.js'); const T = require('./tex.js'); const S = require('./specimens.js'); const H = require('./hints.js');
const N = +(process.argv[2] || 200);
const fams = Object.keys(S.GEN);
const opts = { distribute: [{}, { hard: true }], expand: [{}, { hard: true }], solvefactor: [{}, { hard: true }], sqroot: [{ kind: 'plain' }, { kind: 'shift' }, { kind: 'scaled' }, { kind: 'irr' }], complete: [{ irr: true }, { irr: false }], formula: [{}, { hard: true }], factor: [{ kind: 'monic' }, { kind: 'gcfx' }, { kind: 'diffsq' }, { kind: 'nonmonic' }, { kind: 'gcftri' }] };
let fails = 0; const stats = {};
const stateOf = sp => ({ eqs: A.clone(sp.eqs), task: sp.task, target: sp.target, method: sp.method, input: sp.input, var: sp.var, grid: A.clone(sp.grid), done: false });
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
function holds(rel, a, b) { const d = a - b; if (rel === '=') return Math.abs(d) < 1e-7; if (rel === '<') return d < -1e-9; if (rel === '>') return d > 1e-9; if (rel === '<=') return d < 1e-9; return d > -1e-9; }
function check(sp, st) {
  const e0 = sp.eqs[0];
  if (st.task === 'expand') { const L = st.eqs[0].L; return !L.some(p => p.t === 'group') && A.snapped(L) && A.peq(A.sidePoly(L), A.sidePoly(e0.L)); }
  if (st.task === 'factor') return A.fullyFactored(st.eqs[0].L, 'x') && A.peq(A.sidePoly(st.eqs[0].L), A.sidePoly(e0.L));
  if (st.task === 'eval') { const L = st.eqs[0].L; return L.length <= 1 && near(A.sideNum(L, {}), A.pevalNum(A.sidePoly(e0.L), { x: A.rnum(sp.input) })); }
  if (st.task === 'slope') { const l = st.grid.line; return sp.grid.pts.every(p => near(A.rnum(l.m) * p.x + A.rnum(l.b), p.y)) && A.req(l.m, sp.grid.goal.m) && A.req(l.b, sp.grid.goal.b); }
  if (st.task === 'graph') { const g = st.grid, m = A.rnum(g.goal.m), b = A.rnum(g.goal.b); return g.start.x === 0 && near(g.start.y, b) && g.stairs.every(s => near(s.to.y, m * s.to.x + b)); }
  const v = st.target;
  if (v === 'y') { // y = expression in x
    const e = st.eqs[0]; const s = A.solvedSide(e, 'y'); if (!s) return false; const o = e[A.other(s)];
    return [0.7, -2.3, 3].every(x => { const y = A.sideNum(o, { x }); return near(A.sideNum(e0.L, { x, y }), A.sideNum(e0.R, { x, y })); });
  }
  const sols = st.eqs.map(e => { const s = A.solvedSide(e, v); return { val: A.sideNum(e[A.other(s)], {}), rel: s === 'L' ? e.rel : A.FLIP[e.rel] }; });
  const f = x => A.sideNum(e0.L, { x }) - A.sideNum(e0.R, { x });
  if (e0.rel !== '=') {
    if (sols.length !== 1) return false; const { val: k, rel } = sols[0];
    return [-1.3, -0.4, 0, 0.4, 1.3].every(d => holds(e0.rel, A.sideNum(e0.L, { x: k + d }), A.sideNum(e0.R, { x: k + d })) === holds(rel, k + d, k));
  }
  if (!sols.every(s => s.rel === '=' && Math.abs(f(s.val)) < 1e-6)) return false;
  // no solution lost: compare with the number of real roots of L − R
  const P = A.padd(A.sidePoly(e0.L), A.pscale(A.sidePoly(e0.R), A.R(-1)));
  const a = A.rnum(A.pc(P, 'x2')), b = A.rnum(A.pc(P, 'x')), c = A.rnum(A.pc(P, '1'));
  const want = a ? (b * b - 4 * a * c > 1e-9 ? 2 : 1) : 1;
  const got = new Set(sols.map(s => s.val.toFixed(8))).size;
  return got === want;
}
for (const fam of fams) {
  stats[fam] = { ok: 0, moves: 0 };
  for (const o of (opts[fam] || [{}])) for (let t = 0; t < N; t++) {
    const sp = S.gen(fam, o); let st = stateOf(sp); let steps = 0, err = null; const log = [];
    while (!st.done && steps < 40) {
      const h = H.next(st); if (!h) { err = 'no hint'; break; }
      const r = H.apply(st, h); log.push(h.act);
      if (!r.ok) { err = `${h.act} refused: ${typeof r.msg === 'string' ? r.msg : JSON.stringify(r.msg)}`; break; }
      st = r.st; steps++;
    }
    if (!err && !st.done) err = 'too many steps';
    if (!err && !check(sp, st)) err = 'WRONG ANSWER';
    if (err) { fails++; if (fails < 25) console.log(fam, JSON.stringify(o), T.text(() => T.specimen(sp)), '|', err, '|', log.join(' '), '|', T.text(() => T.state(st))); }
    else { stats[fam].ok++; stats[fam].moves += steps; }
  }
}
for (const f of fams) stats[f].avg = +(stats[f].moves / Math.max(1, stats[f].ok)).toFixed(1), delete stats[f].moves;
console.log(JSON.stringify(stats));
// a few samples, solved
for (const fam of fams) { const sp = S.gen(fam, (opts[fam] || [{}])[0]); let st = stateOf(sp); for (let k = 0; k < 40 && !st.done; k++) { const r = H.apply(st, H.next(st)); if (!r.ok) break; st = r.st; } console.log(fam.padEnd(12), T.text(() => T.specimen(sp)).padEnd(34), '→', T.text(() => T.answer(st))); }
console.log('fails', fails);
