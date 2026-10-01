/* ================================================================
   ALGEBRICK — the Master Builder's advice: the next move
   ================================================================ */
const Hint = (() => {
  const A = (typeof Alg !== 'undefined') ? Alg : require('./engine.js');
  const zeroReady = e => e.R && e.rel === '=' && ((A.isZeroSide(e.R) && e.L.length === 1 && e.L[0].t === 'group' && e.L[0].f.length >= 2) || (A.isZeroSide(e.L) && e.R.length === 1 && e.R[0].t === 'group' && e.R[0].f.length >= 2));
  function squareSide(e, v) {
    for (const s of ['L', 'R']) {
      const ps = e[s];
      if (ps.length === 1 && ps[0].t === 'term' && ps[0].k === A.mkKey(v, 2)) return { s, c: ps[0].c, part: ps[0] };
      if (ps.length === 1 && ps[0].t === 'group' && ps[0].f.length === 2 && A.peq(ps[0].f[0], ps[0].f[1])) return { s, c: ps[0].c, part: ps[0] };
    }
    return null;
  }
  const constOnly = ps => ps.every(p => p.t === 'term' && p.k === '1');
  function degIn(e, v) { return Math.max(A.pdegIn(A.sidePoly(e.L), v), e.R ? A.pdegIn(A.sidePoly(e.R), v) : 0); }
  const hasLinear = (e, v) => [e.L, e.R].some(s => s && A.sidePoly(s)[v]);

  // isolate the (snapped) key k: bring k-terms to one side, everything else to the other, then saw
  function isolate(e, k) {
    const vp = s => e[s].filter(p => p.t === 'term' && p.k === k);
    const cp = s => e[s].filter(p => !(p.t === 'term' && p.k === k));
    const lv = vp('L'), rv = vp('R');
    if (lv.length && rv.length) { const keep = A.rnum(lv[0].c) >= A.rnum(rv[0].c) ? 'L' : 'R'; return { act: 'counter', pid: (keep === 'L' ? rv : lv)[0].id }; }
    const vs = lv.length ? 'L' : 'R';
    const cs = cp(vs); if (cs.length) return { act: 'counter', pid: cs[0].id };
    const vt = (vs === 'L' ? lv : rv)[0];
    if (vt && !A.req(vt.c, A.ONE)) return { act: 'saw', pid: vt.id };
    return null;
  }
  function solveStep(st, e) {
    const v = st.target || 'x', method = st.method;
    if (zeroReady(e)) return { act: 'zero', eid: e.id };
    const sq = squareSide(e, v);
    if (sq && constOnly(e[A.other(sq.s)])) {
      if (!A.snapped(e[A.other(sq.s)])) return { act: 'snap', eid: e.id };
      if (!A.req(sq.c, A.ONE)) return { act: 'saw', pid: sq.part.id };
      return { act: 'root', eid: e.id };
    }
    for (const s of ['L', 'R']) { const g = e[s].find(p => p.t === 'group'); if (g) return { act: 'unbox', pid: g.id }; }
    if (!A.snapped(e.L) || !A.snapped(e.R)) return { act: 'snap', eid: e.id };
    const deg = degIn(e, v);
    if (deg === 2 && hasLinear(e, v)) {
      const k2 = A.mkKey(v, 2);
      if (method === 'complete') {
        const s = e.L.some(p => p.k === k2) ? 'L' : 'R', o = A.other(s);
        const bad = e[s].find(p => p.t === 'root' || p.k === '1'); if (bad) return { act: 'counter', pid: bad.id };
        const vo = e[o].find(p => p.t === 'term' && p.k !== '1'); if (vo) return { act: 'counter', pid: vo.id };
        const a = e[s].find(p => p.k === k2); if (!A.req(a.c, A.ONE)) return { act: 'saw', pid: a.id };
        return { act: 'complete', eid: e.id };
      }
      // factor / formula: everything onto the x² side
      const s = e.L.some(p => p.k === k2) ? 'L' : 'R', o = A.other(s);
      if (e[o].length) return { act: 'counter', pid: e[o][0].id };
      if (method === 'formula') return { act: 'formula', eid: e.id };
      return { act: 'factor', eid: e.id, side: s };
    }
    if (deg === 2) return isolate(e, A.mkKey(v, 2));
    return isolate(e, v);
  }
  function next(st) {
    if (st.done) return null;
    const v = st.target || 'x';
    const e0 = st.eqs[0];
    switch (st.task) {
      case 'eval':
        if (A.hasVar(e0.L, 'x')) return { act: 'swap' };
        if (!A.snapped(e0.L)) return { act: 'snap', eid: e0.id };
        return { act: 'stamp' };
      case 'expand': {
        const g = e0.L.find(p => p.t === 'group'); if (g) return { act: 'unbox', pid: g.id };
        if (!A.snapped(e0.L)) return { act: 'snap', eid: e0.id };
        return { act: 'stamp' };
      }
      case 'factor':
        if (A.fullyFactored(e0.L, v)) return { act: 'stamp' };
        if (e0.L.some(p => p.t === 'group')) return { act: 'unbox', pid: e0.L.find(p => p.t === 'group').id };
        if (!A.snapped(e0.L)) return { act: 'snap', eid: e0.id };
        return { act: 'factor', eid: e0.id, side: 'L' };
      case 'slope': {
        const g = st.grid;
        if (!g.stairs.length) return { act: 'stairs', pt: g.pts[0].id };
        if (!g.m) return { act: 'sawstairs' };
        if (!st.eqs.length) return { act: 'plug', pt: g.pts[0].id };
        if (!A.isSolved(st.eqs[0], 'b')) return solveStep(st, st.eqs[0]);
        return { act: 'stamp' };
      }
      case 'graph': {
        const g = st.grid;
        if (!g.start) return { act: 'start', x: 0, y: g.goal.b.n / g.goal.b.d };
        if (!g.stairs.length) return { act: 'stairs', pt: 'start' };
        return { act: 'stamp' };
      }
      default: {
        for (const e of st.eqs) if (!A.isSolved(e, v)) { const h = solveStep(st, e); if (h) return h; }
        return { act: 'stamp' };
      }
    }
  }
  // apply a hint to a state (for tests and the autoplayer)
  function apply(st, h) {
    switch (h.act) {
      case 'snap': return A.opSnap(st, h.eid);
      case 'counter': return A.opCounter(st, h.pid);
      case 'saw': return A.opSaw(st, h.pid);
      case 'unbox': return A.opUnbox(st, h.pid);
      case 'factor': return A.opFactor(st, h.eid, h.side);
      case 'zero': return A.opZero(st, h.eid);
      case 'root': return A.opRoot(st, h.eid);
      case 'complete': return A.opComplete(st, h.eid);
      case 'formula': return A.opFormula(st, h.eid);
      case 'swap': return A.opSwap(st);
      case 'stairs': return A.opStairs(st, h.pt);
      case 'sawstairs': return A.opSawStairs(st);
      case 'plug': return A.opPlug(st, h.pt);
      case 'start': return A.opStart(st, h.x, h.y);
      case 'stamp': return A.opStamp(st);
    }
    return { ok: false, msg: 'unknown act ' + h.act };
  }
  return { next, apply, zeroReady, squareSide };
})();
if (typeof module !== 'undefined') module.exports = Hint;
