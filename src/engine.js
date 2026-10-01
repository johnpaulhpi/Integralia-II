/* ================================================================
   ALGEBRICK — algebra engine
   A side of an equation is a list of parts:
     term  c·k      k is '1', 'x', 'x2', 'y' or 'b'  (a pile of bricks)
     root  c·√n     n square-free                       (a root brick)
     group c·(f1)(f2)…                                  (a crate / a frame)
   An equation is {L, R, rel}; a problem state holds one or more
   equations ("or" branches) plus, for graphing, a baseplate grid.
   ================================================================ */
const Alg = (() => {
  // ---------- rationals ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function R(n, d) {
    if (typeof n === 'object') return n;
    if (d === undefined) d = 1;
    if (d < 0) { n = -n; d = -d; }
    if (n === 0) return { n: 0, d: 1 };
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  const ZERO = R(0), ONE = R(1);
  const radd = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
  const rsub = (a, b) => R(a.n * b.d - b.n * a.d, a.d * b.d);
  const rmul = (a, b) => R(a.n * b.n, a.d * b.d);
  const rdiv = (a, b) => R(a.n * b.d, a.d * b.n);
  const rneg = a => R(-a.n, a.d);
  const rabs = a => R(Math.abs(a.n), a.d);
  const req = (a, b) => a.n === b.n && a.d === b.d;
  const isInt = a => a.d === 1;
  const isZero = a => a.n === 0;
  const rnum = a => a.n / a.d;
  const rstr = a => a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`;
  function rpow(a, k) { let r = ONE; for (let i = 0; i < k; i++) r = rmul(r, a); return r; }
  function isqrtInt(k) { if (k < 0) return null; const s = Math.round(Math.sqrt(k)); return s * s === k ? s : null; }
  function sqrtR(r) { if (r.n < 0) return null; const a = isqrtInt(r.n), b = isqrtInt(r.d); return (a !== null && b !== null) ? R(a, b) : null; }
  // k = m²·n with n square-free (k a positive integer)
  function splitRoot(k) { let m = 1, n = k; for (let f = 2; f * f <= n; f++) while (n % (f * f) === 0) { n /= f * f; m *= f; } return { m, n }; }

  // ---------- ids ----------
  let _id = 1;
  const nid = p => `${p}${_id++}`;
  const clone = s => JSON.parse(JSON.stringify(s));

  // ---------- monomial keys ----------
  const ORDER = { x2: 0, x: 1, y: 2, b: 3, '1': 4 };
  const varOf = k => k === '1' ? null : k[0];
  const powOf = k => k === '1' ? 0 : (k.length > 1 ? +k.slice(1) : 1);
  const mkKey = (v, p) => p === 0 ? '1' : (p === 1 ? v : v + p);
  function mulKey(a, b) { if (a === '1') return b; if (b === '1') return a; if (varOf(a) !== varOf(b)) return null; return mkKey(varOf(a), powOf(a) + powOf(b)); }

  // ---------- polynomials: {key: rational} ----------
  function pn(o) { const r = {}; for (const k of Object.keys(o)) { const v = R(o[k]); if (v.n) r[k] = v; } return r; }
  function padd(a, b) { const r = { ...a }; for (const k in b) r[k] = radd(r[k] || ZERO, b[k]); return pn(r); }
  function pscale(a, c) { const r = {}; for (const k in a) r[k] = rmul(a[k], c); return pn(r); }
  function pmul(a, b) { const r = {}; for (const i in a) for (const j in b) { const k = mulKey(i, j); if (!k) throw new Error('mixed variables'); r[k] = radd(r[k] || ZERO, rmul(a[i], b[j])); } return pn(r); }
  const pzero = a => Object.keys(a).length === 0;
  const peq = (a, b) => pzero(padd(a, pscale(b, R(-1))));
  const pkeys = p => Object.keys(p).sort((a, b) => ORDER[a] - ORDER[b]);
  const pc = (p, k) => p[k] || ZERO;
  function pdegIn(p, v) { let d = 0; for (const k in p) if (varOf(k) === v) d = Math.max(d, powOf(k)); return d; }
  function pevalNum(p, env) { let s = 0; for (const k in p) { const v = varOf(k); s += rnum(p[k]) * (v ? Math.pow(env[v], powOf(k)) : 1); } return s; }
  const hasVarP = (p, v) => Object.keys(p).some(k => varOf(k) === v);

  // ---------- parts ----------
  const term = (c, k) => ({ t: 'term', id: nid('t'), c: R(c), k });
  const root = (c, n) => ({ t: 'root', id: nid('r'), c: R(c), n });
  const group = (c, f) => ({ t: 'group', id: nid('g'), c: R(c), f: f.map(pn) });
  function partPoly(p) { if (p.t === 'term') return pn({ [p.k]: p.c }); if (p.t === 'group') return p.f.reduce((a, f) => pmul(a, f), pn({ '1': p.c })); return {}; }
  const sidePoly = s => s.reduce((a, p) => padd(a, partPoly(p)), {});
  function sideRoots(s) { const m = {}; for (const p of s) if (p.t === 'root') m[p.n] = radd(m[p.n] || ZERO, p.c); for (const k in m) if (!m[k].n) delete m[k]; return m; }
  function sideNum(s, env) { return pevalNum(sidePoly(s), env) + Object.entries(sideRoots(s)).reduce((a, [n, c]) => a + rnum(c) * Math.sqrt(+n), 0); }
  const termsOf = p => pkeys(p).map(k => term(p[k], k));
  const hasVar = (s, v) => s.some(p => p.t !== 'root' && hasVarP(partPoly(p), v));
  const isZeroSide = s => pzero(sidePoly(s)) && !Object.keys(sideRoots(s)).length;
  const bucketOf = p => p.t === 'term' ? p.k : (p.t === 'root' ? 'r' + p.n : null);
  function snapped(s) { const seen = new Set(); for (const p of s) { if (p.t === 'group') continue; if (isZero(p.c)) return false; const k = bucketOf(p); if (seen.has(k)) return false; seen.add(k); } return true; }
  function sortSide(s) {
    const rank = p => p.t === 'group' ? -1 : p.t === 'root' ? 9 : ORDER[p.k];
    return s.map((p, i) => [p, i]).sort((a, b) => (rank(a[0]) - rank(b[0])) || (a[1] - b[1])).map(x => x[0]);
  }
  const negPart = p => p.t === 'term' ? term(rneg(p.c), p.k) : p.t === 'root' ? root(rneg(p.c), p.n) : group(rneg(p.c), p.f);
  const eqn = (L, Rs, rel = '=') => ({ id: nid('e'), L, R: Rs, rel });
  function findPart(st, pid) { for (const e of st.eqs) for (const s of ['L', 'R']) { if (!e[s]) continue; const i = e[s].findIndex(p => p.id === pid); if (i >= 0) return { e, s, i, part: e[s][i] }; } return null; }
  const findEq = (st, eid) => st.eqs.find(e => e.id === eid);
  const other = s => s === 'L' ? 'R' : 'L';
  const FLIP = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=' };
  const ok = (st, extra = {}) => ({ ok: true, st, ...extra });
  const no = msg => ({ ok: false, msg });

  // ---------- is this equation solved for v? ----------
  function solvedSide(e, v) {
    if (!e.R) return null;
    for (const s of ['L', 'R']) {
      const a = e[s], b = e[other(s)];
      if (a.length === 1 && a[0].t === 'term' && a[0].k === v && req(a[0].c, ONE) && !hasVar(b, v) && !b.some(p => p.t === 'group') && snapped(b)) return s;
    }
    return null;
  }
  const isSolved = (e, v) => solvedSide(e, v) !== null;

  // ---------- factoring a polynomial in v (integer coefficients) ----------
  function factorPoly(poly, v) {
    const k2 = mkKey(v, 2);
    if (Object.keys(poly).some(k => ![k2, v, '1'].includes(k))) return null;
    const a = pc(poly, k2), b = pc(poly, v), c = pc(poly, '1');
    if (![a, b, c].every(isInt)) return null;
    let g = [a, b, c].filter(r => r.n).reduce((acc, r) => acc ? gcd(acc, r.n) : Math.abs(r.n), 0);
    if (!g) return null;
    const lead = a.n ? a : b.n ? b : c;
    if (lead.n < 0) g = -g;
    const A = a.n / g, B = b.n / g, C = c.n / g;
    const res = { g: R(g), A, B, C, f: [], kind: '' };
    if (A === 0) {
      if (B === 0 || Math.abs(g) === 1) return null;
      res.f = [pn({ [v]: B, '1': C })]; res.kind = 'gcf'; return res;
    }
    if (C === 0) {
      if (B === 0) return null;
      res.f = [pn({ [v]: 1 }), pn({ [v]: A, '1': B })]; res.kind = 'gcfx'; return res;
    }
    const D = B * B - 4 * A * C; const s = isqrtInt(D);
    if (s === null) {
      if (Math.abs(g) === 1) return null;
      res.f = [pn({ [k2]: A, [v]: B, '1': C })]; res.kind = 'gcf'; return res;
    }
    const mk = r => pn({ [v]: r.d, '1': -r.n });
    const f1 = mk(R(-B - s, 2 * A)), f2 = mk(R(-B + s, 2 * A));
    const prod = pmul(f1, f2);
    res.g = rmul(R(g), rdiv(R(A), prod[k2]));
    res.f = [f1, f2];
    res.kind = s === 0 ? 'square' : (B === 0 ? 'diffsq' : 'trinomial');
    res.pair = [(B + s) / 2, (B - s) / 2]; res.ac = A * C;
    return res;
  }
  function fullyFactored(side, v) {
    if (side.length !== 1 || side[0].t !== 'group' || !isInt(side[0].c)) return false;
    for (const f of side[0].f) {
      const ks = Object.values(f);
      if (!ks.every(isInt)) return false;
      if (Object.keys(f).length > 1 && ks.reduce((acc, r) => gcd(acc, r.n), 0) !== 1) return false;
      if (pdegIn(f, v) === 2) { const fp = factorPoly(f, v); if (fp && fp.kind !== 'gcf') return false; }
    }
    return true;
  }

  // ================= operations =================
  // Snap: combine like bricks on both sides (zero pairs vanish)
  function opSnap(st0, eid) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e) return no('Nothing on the bench to snap.');
    const info = { eid: e.id, sides: {} }; let changed = false;
    for (const s of ['L', 'R']) {
      if (!e[s]) continue;
      const out = e[s].filter(p => p.t === 'group');
      const buckets = new Map();
      for (const p of e[s]) { if (p.t === 'group') continue; const k = bucketOf(p); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(p); }
      const merges = [];
      for (const list of buckets.values()) {
        const tot = list.reduce((a, p) => radd(a, p.c), ZERO);
        let np = null;
        if (!isZero(tot)) { np = list.length === 1 ? list[0] : (list[0].t === 'term' ? term(tot, list[0].k) : root(tot, list[0].n)); out.push(np); }
        if (list.length > 1 || isZero(tot)) { changed = true; merges.push({ from: list.map(p => ({ id: p.id, c: p.c })), tot, t: list[0].t, k: list[0].k, n: list[0].n, to: np ? np.id : null }); }
      }
      e[s] = sortSide(out);
      info.sides[s] = merges;
    }
    if (!changed) return no('Nothing to snap. Each side already has at most one pile of each shape.');
    return ok(st, info);
  }
  // Counterweight: take a part off one side by adding its opposite to both sides
  function opCounter(st0, pid) {
    const st = clone(st0); const loc = findPart(st, pid);
    if (!loc) return no('Click one of the brick cards on a plate.');
    const e = loc.e;
    if (!e.R) return no('There is only one plate here. A counterweight balances an equation, so it needs two sides.');
    if (loc.part.t === 'group') return no('That is a boxed group. Unbox it first, then move the pieces one at a time.');
    const [p] = e[loc.s].splice(loc.i, 1);
    const q = negPart(p); e[other(loc.s)].push(q);
    return ok(st, { eid: e.id, part: p, added: q, from: loc.s });
  }
  // Saw: divide both sides by the number in front of a variable brick (or a group)
  function opSaw(st0, pid) {
    const st = clone(st0); const loc = findPart(st, pid);
    if (!loc) return no('Click the variable brick whose number you want to saw off.');
    const e = loc.e, p = loc.part;
    if (!e.R) return no('There is only one plate. The saw splits both sides of an equation into equal parts.');
    if (p.t === 'root' || (p.t === 'term' && p.k === '1')) return no('Saw by the number in front of a variable brick (like the 3 in 3x), not by a loose number.');
    const c = p.c;
    if (req(c, ONE)) return no('That brick already stands alone, with nothing in front of it to saw off.');
    for (const s of ['L', 'R']) e[s] = e[s].map(q => ({ ...q, c: rdiv(q.c, c) }));
    const flipped = c.n < 0 && e.rel !== '=';
    const relBefore = e.rel;
    if (flipped) e.rel = FLIP[e.rel];
    return ok(st, { eid: e.id, part: p, div: c, flipped, relBefore });
  }
  // Unbox: distribute a group into separate terms
  function opUnbox(st0, pid) {
    const st = clone(st0); const loc = findPart(st, pid);
    if (!loc) return no('Click a boxed group, like 3(x + 2).');
    const p = loc.part;
    if (p.t !== 'group') return no('Nothing to unbox. Unbox opens a group in brackets, like 3(x + 2).');
    const ts = termsOf(partPoly(p));
    loc.e[loc.s].splice(loc.i, 1, ...ts);
    return ok(st, { eid: loc.e.id, side: loc.s, group: p, terms: ts });
  }
  // Rectangle: factor one side
  function opFactor(st0, eid, side) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e) return no('Nothing to factor.');
    let s = side || (!e.L.length && e.R && e.R.length ? 'R' : 'L');
    if (e.R && isZeroSide(e[s]) && !isZeroSide(e[other(s)])) s = other(s);
    const parts = e[s];
    if (!parts.length) return no('That plate is empty.');
    if (parts.some(p => p.t === 'group')) return no('This side is already in a box. If you want to start over, unbox it first.');
    if (parts.some(p => p.t === 'root')) return no('Root bricks can’t go into a rectangle.');
    if (!snapped(parts)) return no('Snap the like bricks together first, so there is one pile of each shape.');
    const v = st.target || 'x';
    const r = factorPoly(sidePoly(parts), v);
    if (!r) return no('These bricks won’t make a rectangle with whole-number sides: this doesn’t factor over the integers. Completing the square or the Master Formula will still work.');
    const g = group(r.g, r.f);
    e[s] = [g];
    return ok(st, { eid: e.id, side: s, before: parts, ...r, group: g });
  }
  // Pry bar: zero-product property
  function opZero(st0, eid) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e || !e.R) return no('The pry bar needs an equation with 0 on one side.');
    if (e.rel !== '=') return no('The zero-product idea only works for equations (=), not inequalities.');
    let s = null;
    if (isZeroSide(e.R) && !isZeroSide(e.L)) s = 'L'; else if (isZeroSide(e.L) && !isZeroSide(e.R)) s = 'R';
    if (!s) return no('One side must be 0 before you can pry a product apart. Move everything to one side first.');
    const ps = e[s];
    if (ps.length !== 1 || ps[0].t !== 'group' || ps[0].f.length < 2) return no('The other side must be a single product of pieces, like (x − 2)(x + 5). Factor it with the Rectangle first.');
    const g = ps[0]; const v = st.target || 'x';
    const uniq = [];
    for (const f of g.f) if (hasVarP(f, v) && !uniq.some(u => peq(u, f))) uniq.push(f);
    const branches = uniq.map(f => s === 'L' ? eqn(termsOf(f), [], '=') : eqn([], termsOf(f), '='));
    st.eqs.splice(st.eqs.indexOf(e), 1, ...branches);
    return ok(st, { eid: e.id, group: g, factors: uniq, branches: branches.map(b => b.id) });
  }
  // Square-root cutter: square = number  →  base = ±√number
  function opRoot(st0, eid) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e || !e.R) return no('The cutter works on an equation: a square on one side, a number on the other.');
    if (e.rel !== '=') return no('The square-root cutter only works on equations (=).');
    const v = st.target || 'x';
    let s = null, base = null;
    for (const side of ['L', 'R']) {
      const ps = e[side];
      if (ps.length === 1 && ps[0].t === 'term' && ps[0].k === mkKey(v, 2) && req(ps[0].c, ONE)) { s = side; base = pn({ [v]: 1 }); }
      else if (ps.length === 1 && ps[0].t === 'group' && req(ps[0].c, ONE) && ps[0].f.length === 2 && peq(ps[0].f[0], ps[0].f[1])) { s = side; base = ps[0].f[0]; }
    }
    if (!s) {
      const sq = ['L', 'R'].find(side => e[side].length === 1 && ((e[side][0].t === 'term' && e[side][0].k === mkKey(v, 2)) || (e[side][0].t === 'group' && e[side][0].f.length === 2 && peq(e[side][0].f[0], e[side][0].f[1]))));
      if (sq) return no('There’s a number in front of the square. Saw both sides by it first, so the square stands alone.');
      return no('One side must be a perfect square standing alone, like x² or (x + 3)², with just a number on the other side.');
    }
    const o = e[other(s)];
    if (o.some(p => !(p.t === 'term' && p.k === '1'))) return no('The other side must be just a number. Move everything else across first.');
    if (!snapped(o)) return no('Snap the numbers on the other side together first.');
    const k = o.length ? o[0].c : ZERO;
    if (k.n < 0) return no('No real number squares to a negative, so this equation has no real solution.');
    const sq = sqrtR(k);
    const mkEq = rhs => s === 'L' ? eqn(termsOf(base), rhs) : eqn(rhs, termsOf(base));
    let branches, m = null, n = null;
    if (sq) branches = isZero(sq) ? [mkEq([])] : [mkEq([term(sq, '1')]), mkEq([term(rneg(sq), '1')])];
    else {
      const sp = splitRoot(k.n * k.d); m = sp.m; n = sp.n;
      const coef = R(m, k.d);
      branches = [mkEq([root(coef, n)]), mkEq([root(rneg(coef), n)])];
    }
    st.eqs.splice(st.eqs.indexOf(e), 1, ...branches);
    return ok(st, { eid: e.id, side: s, base, k, sq, m, n, branches: branches.map(b => b.id) });
  }
  // Corner piece: complete the square
  function opComplete(st0, eid) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e || !e.R) return no('The corner piece works on an equation.');
    const v = st.target || 'x', k2 = mkKey(v, 2);
    const s = ['L', 'R'].find(side => e[side].some(p => p.t === 'term' && p.k === k2));
    if (!s) return no('Completing the square needs an x² plate.');
    const ps = e[s];
    if (ps.some(p => p.t === 'group')) return no('Unbox the group first.');
    if (!snapped(ps)) return no('Snap the like bricks together first.');
    const a = ps.find(p => p.k === k2).c;
    if (!req(a, ONE)) return no(`There’s a ${rstr(a)} in front of the x² plate. Saw both sides by it first, so the plate stands alone.`);
    if (ps.some(p => p.t === 'root' || p.k === '1')) return no('Move the loose number bricks to the other side first. The x² plate and the x bricks need the corner to themselves.');
    const bT = ps.find(p => p.k === v);
    if (!bT) return no('There are no x bricks, so there is no corner to fill. The Square-Root Cutter can finish this.');
    const o = e[other(s)];
    if (o.some(p => !(p.t === 'term' && p.k === '1'))) return no('The other side should hold only number bricks.');
    const b = bT.c, h = rdiv(b, R(2)), h2 = rmul(h, h);
    const base = pn({ [v]: 1, '1': h });
    e[s] = [group(ONE, [base, base])];
    e[other(s)] = [...o, term(h2, '1')];
    return ok(st, { eid: e.id, side: s, b, h, h2 });
  }
  // The Master Formula
  function opFormula(st0, eid) {
    const st = clone(st0); const e = findEq(st, eid) || st.eqs[0];
    if (!e || !e.R) return no('The formula solves an equation.');
    if (e.rel !== '=') return no('The formula is for equations (=).');
    const v = st.target || 'x';
    let s = null;
    if (isZeroSide(e.R)) s = 'L'; else if (isZeroSide(e.L)) s = 'R';
    if (!s) return no('Get 0 on one side first: move every brick to the other plate.');
    const ps = e[s];
    if (ps.some(p => p.t !== 'term')) return no('Unbox any groups first, so the side reads ax² + bx + c.');
    if (!snapped(ps)) return no('Snap the like bricks together first.');
    const P = sidePoly(ps);
    if (Object.keys(P).some(k => ![mkKey(v, 2), v, '1'].includes(k))) return no('The formula needs only x², x and number bricks.');
    const a = pc(P, mkKey(v, 2)), b = pc(P, v), c = pc(P, '1');
    if (isZero(a)) return no('There’s no x² plate, so this isn’t a quadratic. Use the Counterweight and the Saw.');
    const D = rsub(rmul(b, b), rmul(R(4), rmul(a, c)));
    if (D.n < 0) return no('b² − 4ac is negative, so no real number works: there are no real solutions.');
    const den = rmul(R(2), a), cen = rdiv(rneg(b), den);
    const sq = sqrtR(D);
    const X = () => [term(ONE, v)];
    const val = r => isZero(r) ? [] : [term(r, '1')];
    let branches, m = null, n = null;
    if (sq) branches = isZero(sq) ? [eqn(X(), val(cen))] : [eqn(X(), val(radd(cen, rdiv(sq, den)))), eqn(X(), val(rsub(cen, rdiv(sq, den))))];
    else {
      const sp = splitRoot(D.n * D.d); m = sp.m; n = sp.n;
      const coef = rdiv(R(m, D.d), rabs(den));
      branches = [eqn(X(), [...val(cen), root(coef, n)]), eqn(X(), [...val(cen), root(rneg(coef), n)])];
    }
    st.eqs.splice(st.eqs.indexOf(e), 1, ...branches);
    return ok(st, { eid: e.id, a, b, c, D, sq, m, n, cen, den, branches: branches.map(q => q.id) });
  }
  // Swap bricks: evaluate f at the input number
  function opSwap(st0) {
    const st = clone(st0);
    if (st.task !== 'eval') return no('Swap Bricks is for evaluating a function at a number, like f(−2).');
    const e = st.eqs[0]; const v = st.var || 'x'; const val = st.input;
    if (!hasVar(e.L, v)) return no('There are no variable bricks left to swap.');
    const map = [];
    e.L = e.L.flatMap(p => {
      if (p.t === 'term' && varOf(p.k) === v) { const q = term(rmul(p.c, rpow(val, powOf(p.k))), '1'); map.push({ from: p, to: q }); return [q]; }
      if (p.t === 'group') { const q = term(R(Math.round(pevalNum(partPoly(p), { [v]: rnum(val) }) * 1e6) / 1e6), '1'); map.push({ from: p, to: q }); return [q]; }
      return [p];
    });
    return ok(st, { val, map });
  }
  // ---------- graphing on the baseplate ----------
  function opStairs(st0, ptId) {
    const st = clone(st0); const g = st.grid;
    if (!g) return no('The staircase is built on the baseplate grid.');
    if (st.task === 'slope') {
      if (g.stairs.length) return no('The staircase between the two points is already built.');
      const [A, B] = g.pts.slice().sort((p, q) => p.x - q.x);
      const s = { id: nid('s'), from: { x: A.x, y: A.y }, to: { x: B.x, y: B.y }, rise: B.y - A.y, run: B.x - A.x };
      g.stairs.push(s); return ok(st, { stairs: s });
    }
    if (st.task === 'graph') {
      const from = ptId === 'start' || !ptId ? g.start : (g.stairs.find(s => s.id === ptId) || {}).to;
      const fromPt = from || (g.stairs.length ? g.stairs[g.stairs.length - 1].to : g.start);
      if (!fromPt) return no('Place the Start Brick first: the staircase needs somewhere to start.');
      const m = g.goal.m; const rise = m.n, run = m.d;
      const to = { x: fromPt.x + run, y: fromPt.y + rise };
      if (Math.abs(to.x) > g.size || Math.abs(to.y) > g.size) return no('That step would run off the edge of the baseplate. Start the stairs from a different point.');
      const s = { id: nid('s'), from: { ...fromPt }, to, rise, run };
      g.stairs.push(s); return ok(st, { stairs: s });
    }
    return no('The staircase is for graphing lines.');
  }
  function opSawStairs(st0) {
    const st = clone(st0); const g = st.grid;
    if (!g || !g.stairs.length) return no('Build the staircase first, then saw the rise by the run.');
    if (g.m) return no('The slope is already measured.');
    const s = g.stairs[0];
    g.m = R(s.rise, s.run);
    return ok(st, { rise: s.rise, run: s.run, m: g.m });
  }
  function opPlug(st0, ptId) {
    const st = clone(st0); const g = st.grid;
    if (!g || st.task !== 'slope') return no('Plug-in puts a point into y = mx + b.');
    if (!g.m) return no('Find the slope first: build the staircase, then saw the rise by the run.');
    if (st.eqs.length) return no('You already plugged in a point.');
    const P = g.pts.find(p => p.id === ptId) || g.pts[0];
    const mx = rmul(g.m, R(P.x));
    st.eqs = [eqn([term(R(P.y), '1')].filter(p => !isZero(p.c)), [...(isZero(mx) ? [] : [term(mx, '1')]), term(ONE, 'b')])];
    st.target = 'b';
    return ok(st, { pt: P, m: g.m, mx });
  }
  function opStart(st0, x, y) {
    const st = clone(st0); const g = st.grid;
    if (!g || st.task !== 'graph') return no('The Start Brick marks where a line crosses the y-axis.');
    if (g.start) return no('The Start Brick is already placed.');
    if (x !== 0) return no(`The line crosses the y-axis where x = 0. That stud is at x = ${x}.`);
    if (!req(R(y), g.goal.b)) return no(`In y = mx + b, the line starts at height b = ${rstr(g.goal.b)} when x = 0. That stud is at height ${y}.`);
    g.start = { x, y };
    return ok(st, { x, y });
  }
  // ---------- Stamp: finish ----------
  function opStamp(st0) {
    const st = clone(st0); const v = st.target || 'x';
    const fail = m => no(m);
    switch (st.task) {
      case 'solve': {
        const open = st.eqs.filter(e => !isSolved(e, v));
        if (open.length) return fail(`Not finished. ${st.eqs.length > 1 ? 'Every branch' : 'The equation'} must end as ${v} alone on one side, with a single number or tidy expression on the other.`);
        break;
      }
      case 'expand': { const L = st.eqs[0].L; if (L.some(p => p.t === 'group')) return fail('Not finished: there is still a box to unbox.'); if (!snapped(L)) return fail('Not finished: snap the like bricks together.'); break; }
      case 'factor': { const L = st.eqs[0].L; if (!fullyFactored(L, v)) return fail(L.length === 1 && L[0].t === 'group' ? 'Not finished: one of the pieces can still be broken down.' : 'Not finished: the bricks aren’t arranged into a rectangle (a product) yet.'); break; }
      case 'eval': { const L = st.eqs[0].L; if (hasVar(L, st.var || 'x')) return fail('Not finished: swap the variable bricks for the number first.'); if (!snapped(L)) return fail('Not finished: snap the number bricks into a single pile.'); break; }
      case 'slope': { if (!st.grid.m) return fail('Not finished: measure the slope first.'); if (!st.eqs.length || !isSolved(st.eqs[0], 'b')) return fail('Not finished: find b, where the line crosses the y-axis.'); st.grid.line = { m: st.grid.m, b: solvedValue(st.eqs[0], 'b') }; break; }
      case 'graph': { if (!st.grid.start) return fail('Not finished: place the Start Brick at the y-intercept.'); if (!st.grid.stairs.length) return fail('Not finished: build at least one step of the staircase.'); st.grid.line = { m: st.grid.goal.m, b: st.grid.goal.b }; break; }
    }
    st.done = true;
    return ok(st);
  }
  function solvedValue(e, v) { const s = solvedSide(e, v); if (!s) return null; const o = e[other(s)]; return o.length ? (o[0].t === 'term' && o[0].k === '1' && o.length === 1 ? o[0].c : null) : ZERO; }

  return {
    R, ZERO, ONE, radd, rsub, rmul, rdiv, rneg, rabs, req, isInt, isZero, rnum, rstr, rpow, gcd, sqrtR, splitRoot, isqrtInt,
    varOf, powOf, mkKey, pn, padd, pscale, pmul, peq, pzero, pkeys, pc, pdegIn, pevalNum, hasVarP,
    term, root, group, partPoly, sidePoly, sideRoots, sideNum, termsOf, hasVar, isZeroSide, snapped, sortSide, eqn, findPart, findEq, other, FLIP, clone,
    isSolved, solvedSide, solvedValue, factorPoly, fullyFactored,
    opSnap, opCounter, opSaw, opUnbox, opFactor, opZero, opRoot, opComplete, opFormula, opSwap, opStairs, opSawStairs, opPlug, opStart, opStamp,
  };
})();
if (typeof module !== 'undefined') module.exports = Alg;
