/* ================================================================
   ALGEBRICK — typesetting (HTML, plus a plain-text mode for tests)
   ================================================================ */
const Tex = (() => {
  const A = (typeof Alg !== 'undefined') ? Alg : require('./engine.js');
  const MINUS = '\u2212';
  const HTML = {
    v: s => `<i>${s}</i>`, sup: s => `<sup>${s}</sup>`,
    frac: (a, b) => `<span class="fr"><span class="fn">${a}</span><span class="fd">${b}</span></span>`,
    sqrt: s => `√<span class="ov">${s}</span>`, minus: MINUS, dot: '·',
  };
  const TEXT = { v: s => s, sup: s => `^${s}`, frac: (a, b) => `(${a})/(${b})`, sqrt: s => `√${s}`, minus: '-', dot: '*' };
  let M = HTML;
  const REL = { '=': '=', '<': '<', '>': '>', '<=': '≤', '>=': '≥' };
  const RELT = { '=': '=', '<': '<', '>': '>', '<=': '<=', '>=': '>=' };
  const rel = r => (M === TEXT ? RELT : REL)[r] || r;

  const num = r => r.d === 1 ? `${Math.abs(r.n)}` : M.frac(`${Math.abs(r.n)}`, `${r.d}`);   // unsigned
  const sgn = r => r.n < 0 ? M.minus : '';
  const snum = r => sgn(r) + num(r);
  function varH(k) { if (k === '1') return ''; const v = k[0], p = A.powOf(k); return M.v(v) + (p > 1 ? M.sup(p) : ''); }
  // unsigned body of c·k
  function termBody(c, k) {
    const a = A.rabs(c);
    if (k === '1') return num(a);
    if (A.req(a, A.ONE)) return varH(k);
    if (a.d !== 1) return M === TEXT ? `(${a.n}/${a.d})${varH(k)}` : M.frac(`${a.n}${varH(k)}`, `${a.d}`);
    return `${a.n}${varH(k)}`;
  }
  function rootBody(c, n) {
    const a = A.rabs(c);
    const r = M.sqrt(`${n}`);
    if (A.req(a, A.ONE)) return r;
    if (a.d !== 1) return M.frac(`${a.n === 1 ? '' : a.n}${r}`, `${a.d}`);
    return `${a.n}${r}`;
  }
  // polynomial as a signed sum
  function poly(p) {
    const ks = A.pkeys(p);
    if (!ks.length) return '0';
    return ks.map((k, i) => { const c = p[k]; const body = termBody(c, k); return i === 0 ? sgn(c) + body : ` ${c.n < 0 ? M.minus : '+'} ${body}`; }).join('');
  }
  function factorH(f) { const ks = Object.keys(f); if (ks.length === 1 && A.req(f[ks[0]], A.ONE) && ks[0] !== '1') return varH(ks[0]); return `(${poly(f)})`; }
  // unsigned body of a group; neg tells the sign
  function groupBody(g) {
    const a = A.rabs(g.c);
    const pre = A.req(a, A.ONE) ? '' : num(a);
    let fs;
    if (g.f.length === 2 && A.peq(g.f[0], g.f[1])) fs = `(${poly(g.f[0])})${M.sup(2)}`;
    else fs = g.f.map(factorH).join('');
    return pre + fs;
  }
  function part(p) {
    if (p.t === 'term') return { neg: p.c.n < 0, html: termBody(p.c, p.k) };
    if (p.t === 'root') return { neg: p.c.n < 0, html: rootBody(p.c, p.n) };
    return { neg: p.c.n < 0, html: groupBody(p) };
  }
  function side(ps) {
    if (!ps || !ps.length) return '0';
    return ps.map((p, i) => { const r = part(p); return i === 0 ? (r.neg ? M.minus : '') + r.html : ` ${r.neg ? M.minus : '+'} ${r.html}`; }).join('');
  }
  const eq = e => e.R ? `${side(e.L)} ${rel(e.rel)} ${side(e.R)}` : side(e.L);
  const state = st => st.eqs.map(eq).join(M === TEXT ? ' or ' : ' <span class="or">or</span> ');
  // the problem as posed
  function specimen(sp) {
    if (sp.task === 'eval') return `${M.v('f')}(${M.v('x')}) = ${side(sp.eqs[0].L)}`;
    if (sp.task === 'slope') return `(${sp.grid.pts[0].x}, ${sp.grid.pts[0].y}) and (${sp.grid.pts[1].x}, ${sp.grid.pts[1].y})`.replace(/-/g, M.minus);
    if (sp.task === 'graph') return `${M.v('y')} = ${lineH(sp.grid.goal.m, sp.grid.goal.b)}`;
    return eq(sp.eqs[0]);
  }
  function lineH(m, b) { return poly(A.pn({ x: m, '1': b })); }
  // final answers, x first, ± folded
  function answer(st) {
    const v = st.target || 'x';
    if (st.task === 'expand' || st.task === 'factor') return side(st.eqs[0].L);
    if (st.task === 'eval') return `${M.v('f')}(${snum(st.input)}) = ${side(st.eqs[0].L)}`;
    if (st.task === 'slope' || st.task === 'graph') { const g = st.grid; const l = g.line || { m: g.m, b: g.goal ? g.goal.b : A.ZERO }; return `${M.v('y')} = ${lineH(l.m, l.b)}`; }
    const sols = st.eqs.map(e => { const s = A.solvedSide(e, v); if (!s) return null; const o = e[A.other(s)]; return { o, rel: s === 'L' ? e.rel : A.FLIP[e.rel] }; });
    if (sols.some(x => !x)) return state(st);
    if (sols.length === 2 && sols[0].rel === '=' && sols[1].rel === '=') {
      const [a, b] = sols.map(s => s.o);
      const ra = a.filter(p => p.t === 'root'), rb = b.filter(p => p.t === 'root');
      const ca = a.filter(p => p.t !== 'root'), cb = b.filter(p => p.t !== 'root');
      if (ra.length === 1 && rb.length === 1 && ra[0].n === rb[0].n && A.req(ra[0].c, A.rneg(rb[0].c)) && side(ca) === side(cb)) {
        const pm = M === TEXT ? '+-' : '±';
        const rc = A.rabs(ra[0].c);
        if (ca.length === 1 && ca[0].t === 'term' && ca[0].c.d > 1 && ca[0].c.d === rc.d) { // (p ± q√n)/d
          const p = ca[0].c; return `${varH(v)} = ${M.frac(`${sgn(p)}${Math.abs(p.n)} ${pm} ${rc.n === 1 ? '' : rc.n}${M.sqrt(`${ra[0].n}`)}`, `${p.d}`)}`;
        }
        return `${varH(v)} = ${ca.length ? side(ca) + ' ' + pm + ' ' : pm}${rootBody(ra[0].c, ra[0].n)}`;
      }
    }
    return sols.map(s => `${varH(v)} ${rel(s.rel)} ${side(A.sortSide(s.o))}`).join(M === TEXT ? ' or ' : ' <span class="or">or</span> ');
  }
  function withText(fn) { const o = M; M = TEXT; try { return fn(); } finally { M = o; } }
  return { num, snum, sgn, varH, termBody, rootBody, poly, factorH, groupBody, part, side, eq, rel, state, specimen, answer, lineH, text: withText, MINUS };
})();
if (typeof module !== 'undefined') module.exports = Tex;
