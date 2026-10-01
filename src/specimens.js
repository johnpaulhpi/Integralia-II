/* ================================================================
   ALGEBRICK — blueprints (the problems the Master Builder sets)
   ================================================================ */
const Spec = (() => {
  const A = (typeof Alg !== 'undefined') ? Alg : require('./engine.js');
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pk = a => a[Math.floor(Math.random() * a.length)];
  const nz = (a, b) => { let v; do v = ri(a, b); while (v === 0); return v; };
  const T = A.term, E = A.eqn, G = A.group, P = A.pn, R = A.R;
  const lin = (a, b) => P({ x: a, '1': b });
  const mk = (fam, task, eqs, o = {}) => ({ fam, label: FAMS[fam].label, prompt: FAMS[fam].prompt, task, target: o.target || 'x', var: 'x', eqs, needs: o.needs || [], method: o.method || null, input: o.input, grid: o.grid || null });
  const expandTerms = (g) => A.termsOf(A.partPoly(g));

  const FAMS = {
    tutorial: { label: 'A first build', prompt: 'Solve for x', name: 'First build' },
    onestep: { label: 'One move', prompt: 'Solve for x', name: 'One-step equations' },
    twostep: { label: 'Two moves', prompt: 'Solve for x', name: 'Two-step equations' },
    bothsides: { label: 'Bricks on both sides', prompt: 'Solve for x', name: 'Variables on both sides' },
    distribute: { label: 'Crated', prompt: 'Solve for x', name: 'Distributing (brackets)' },
    ineq: { label: 'The tilted beam', prompt: 'Solve the inequality', name: 'Inequalities' },
    ineq2: { label: 'Tilted and crated', prompt: 'Solve the inequality', name: 'Harder inequalities' },
    expand: { label: 'Fill the frame', prompt: 'Multiply out', name: 'Multiplying binomials' },
    factor: { label: 'Make a rectangle', prompt: 'Factor completely', name: 'Factoring' },
    solvefactor: { label: 'Zero ground', prompt: 'Solve by factoring', name: 'Solving quadratics by factoring' },
    sqroot: { label: 'Squared away', prompt: 'Solve for x', name: 'Square roots' },
    complete: { label: 'The missing corner', prompt: 'Complete the square', name: 'Completing the square' },
    formula: { label: 'The Master Formula', prompt: 'Solve with the formula', name: 'The quadratic formula' },
    bridge: { label: 'Where the beam meets the arch', prompt: 'Solve for x', name: 'Line meets parabola' },
    evaluate: { label: 'The function machine', prompt: 'Evaluate', name: 'Evaluating functions' },
    stdform: { label: 'The leaning wall', prompt: 'Solve for y', name: 'Standard form to slope-intercept' },
    slope2pt: { label: 'Two studs', prompt: 'Find the line through', name: 'Line through two points' },
    graphline: { label: 'The staircase', prompt: 'Build on the baseplate', name: 'Graphing a line' },
  };

  const SLOPES = [R(1), R(2), R(3), R(-1), R(-2), R(1, 2), R(-1, 2), R(2, 3), R(-2, 3), R(3, 2), R(-3, 2), R(1, 3)];
  const GEN = {
    tutorial: () => mk('tutorial', 'solve', [E([T(3, 'x'), T(2, '1')], [T(11, '1')])]),
    onestep: () => {
      const x = nz(-9, 9); const kind = pk(['add', 'sub', 'mul', 'mul']);
      if (kind === 'add') { const a = ri(1, 9); return mk('onestep', 'solve', [E([T(1, 'x'), T(a, '1')], [T(x + a, '1')].filter(p => p.c.n))]); }
      if (kind === 'sub') { const a = ri(1, 9); return mk('onestep', 'solve', [E([T(1, 'x'), T(-a, '1')], [T(x - a, '1')].filter(p => p.c.n))]); }
      const a = pk([2, 3, 4, 5, 6, 7, -2, -3, -4]); return mk('onestep', 'solve', [E([T(a, 'x')], [T(a * x, '1')])]);
    },
    twostep: () => { const a = pk([2, 3, 4, 5, 6, -2, -3, -4, -5]), x = nz(-8, 8), b = nz(-9, 9); const c = a * x + b; return mk('twostep', 'solve', [E([T(a, 'x'), T(b, '1')], c ? [T(c, '1')] : [])]); },
    bothsides: () => {
      let a, c; do { a = nz(-6, 7); c = nz(-6, 7); } while (a === c || Math.abs(a - c) > 6);
      const x = nz(-6, 6), b = nz(-9, 9); const d = a * x + b - c * x;
      return mk('bothsides', 'solve', [E([T(a, 'x'), T(b, '1')], [T(c, 'x'), ...(d ? [T(d, '1')] : [])])]);
    },
    distribute: o => {
      const k = pk([2, 3, 4, 5, -2, -3]), p = nz(-6, 6), x = nz(-6, 6); const v = (o && o.hard) ? 1 : ri(0, 2);
      if (v === 0) return mk('distribute', 'solve', [E([G(k, [lin(1, p)])], [T(k * (x + p), '1')].filter(q => q.c.n))]);
      if (v === 1) { let c; do c = nz(-4, 6); while (c === k); const d = k * (x + p) - c * x; return mk('distribute', 'solve', [E([G(k, [lin(1, p)])], [T(c, 'x'), ...(d ? [T(d, '1')] : [])])]); }
      const q = nz(-9, 9); const r = k * (x + p) + q; return mk('distribute', 'solve', [E([G(k, [lin(1, p)]), T(q, '1')], r ? [T(r, '1')] : [])]);
    },
    ineq: () => { const a = pk([2, 3, 4, 5, -2, -3, -4, -5]), x0 = nz(-7, 7), b = nz(-9, 9); const rel = pk(['<', '>', '<=', '>=']); const c = a * x0 + b; return mk('ineq', 'solve', [E([T(a, 'x'), T(b, '1')], c ? [T(c, '1')] : [], rel)]); },
    ineq2: () => {
      const k = pk([2, 3, -2]), p = nz(-5, 5), x0 = nz(-5, 5); let c; do c = nz(-5, 5); while (c === k);
      const d = k * (x0 + p) - c * x0; const rel = pk(['<', '>', '<=', '>=']);
      return mk('ineq2', 'solve', [E([G(k, [lin(1, p)])], [T(c, 'x'), ...(d ? [T(d, '1')] : [])], rel)]);
    },
    expand: o => {
      const hard = o && o.hard; const a = hard ? pk([2, 3]) : 1, p = nz(-7, 7), q = nz(-7, 7);
      const kind = hard ? 'nonmonic' : pk(['monic', 'monic', 'square', 'diffsq']);
      let f1 = lin(a, p), f2 = lin(1, q);
      if (kind === 'square') f2 = f1; if (kind === 'diffsq') f2 = lin(1, -p);
      return mk('expand', 'expand', [E([G(1, [f1, f2])], null, null)]);
    },
    factor: o => {
      const kind = (o && o.kind) || pk(['monic', 'monic', 'monic', 'gcfx', 'diffsq', 'nonmonic', 'gcftri']);
      let g;
      if (kind === 'monic') { let p, q; do { p = nz(-8, 8); q = nz(-8, 8); } while (p === -q); g = G(1, [lin(1, p), lin(1, q)]); }
      else if (kind === 'gcfx') { const k = pk([2, 3, 4, 5]), a = pk([1, 2, 3]), b = nz(-7, 7); g = G(k, [P({ x: 1 }), lin(a, b)]); }
      else if (kind === 'diffsq') { const p = ri(2, 9); g = G(1, [lin(1, -p), lin(1, p)]); }
      else if (kind === 'nonmonic') { const a = pk([2, 3]), p = nz(-5, 5), q = nz(-5, 5); g = G(1, [lin(a, p), lin(1, q)]); if (A.gcd(a, Math.abs(p)) !== 1) return GEN.factor(o); }
      else { const k = pk([2, 3]); let p, q; do { p = nz(-6, 6); q = nz(-6, 6); } while (p === -q); g = G(k, [lin(1, p), lin(1, q)]); }
      return mk('factor', 'factor', [E(expandTerms(g), null, null)], { needs: ['factor'] });
    },
    solvefactor: o => {
      let r1, r2; do { r1 = nz(-8, 8); r2 = nz(-8, 8); } while (r1 === r2 || r1 === -r2);
      const b = -(r1 + r2), c = r1 * r2;
      if (o && o.hard) { // x² + bx = −c  (move it first)
        return mk('solvefactor', 'solve', [E([T(1, 'x2'), ...(b ? [T(b, 'x')] : [])], [T(-c, '1')])], { needs: ['factor', 'zero'], method: 'factor' });
      }
      return mk('solvefactor', 'solve', [E([T(1, 'x2'), ...(b ? [T(b, 'x')] : []), T(c, '1')], [])], { needs: ['factor', 'zero'], method: 'factor' });
    },
    sqroot: o => {
      const kind = (o && o.kind) || pk(['plain', 'shift', 'scaled', 'irr']);
      const k = ri(2, 9);
      if (kind === 'plain') return mk('sqroot', 'solve', [E([T(1, 'x2')], [T(k * k, '1')])], { needs: ['root'], method: 'root' });
      if (kind === 'shift') { const h = nz(-6, 6); return mk('sqroot', 'solve', [E([G(1, [lin(1, h), lin(1, h)])], [T(k * k, '1')])], { needs: ['root'], method: 'root' }); }
      if (kind === 'scaled') { const a = pk([2, 3, 4]), c = nz(-9, 9); const d = a * k * k + c; return mk('sqroot', 'solve', [E([T(a, 'x2'), T(c, '1')], d ? [T(d, '1')] : [])], { needs: ['root'], method: 'root' }); }
      const n = pk([2, 3, 5, 6, 7, 8, 10, 12, 18, 20]); return mk('sqroot', 'solve', [E([T(1, 'x2')], [T(n, '1')])], { needs: ['root'], method: 'root' });
    },
    complete: o => {
      const h = nz(-5, 5); const irr = o && o.irr !== undefined ? o.irr : Math.random() < .5;
      const k = irr ? pk([2, 3, 5, 6, 7, 8, 10, 11, 12]) : pk([1, 4, 9, 16, 25]);
      const c = h * h - k; const b = 2 * h;
      return mk('complete', 'solve', [E([T(1, 'x2'), T(b, 'x'), ...(c ? [T(c, '1')] : [])], [])], { needs: ['complete', 'root'], method: 'complete' });
    },
    formula: o => {
      let a, b, c, D;
      do { a = pk((o && o.hard) ? [2, 3] : [1, 2, 3]); b = nz(-7, 7); c = nz(-6, 6); D = b * b - 4 * a * c; } while (D <= 0 || A.isqrtInt(D) === 0);
      return mk('formula', 'solve', [E([T(a, 'x2'), T(b, 'x'), T(c, '1')], [])], { needs: ['formula'], method: 'formula' });
    },
    bridge: () => {
      let r1, r2; do { r1 = nz(-4, 5); r2 = nz(-4, 5); } while (r1 === r2 || r1 === -r2);
      const q = r1 + r2, s = nz(-5, 5); const p = r1 * r2 + s; // x² + p = q x + s
      return mk('bridge', 'solve', [E([T(1, 'x2'), ...(p ? [T(p, '1')] : [])], [...(q ? [T(q, 'x')] : []), T(s, '1')])], { needs: ['factor', 'zero'], method: 'factor' });
    },
    evaluate: () => {
      const a = pk([1, 2, 3, -1, -2, 0]), b = nz(-6, 6), c = nz(-9, 9), v = nz(-4, 4);
      const L = [...(a ? [T(a, 'x2')] : []), T(b, 'x'), T(c, '1')];
      return mk('evaluate', 'eval', [E(L, null, null)], { needs: ['swap'], input: R(v) });
    },
    stdform: () => {
      const b = pk([2, 3, 4, 5, -2, -3]); const a = nz(-6, 6); const k = nz(-5, 5);
      return mk('stdform', 'solve', [E([T(a, 'x'), T(b, 'y')], [T(b * k, '1')])], { target: 'y' });
    },
    slope2pt: () => {
      for (;;) {
        const m = pk(SLOPES), b = nz(-4, 4);
        const xs = []; for (let x = -6; x <= 6; x++) { const y = A.radd(A.rmul(m, R(x)), R(b)); if (A.isInt(y) && Math.abs(y.n) <= 7 && x !== 0) xs.push(x); }
        if (xs.length < 2) continue;
        const y = x => A.radd(A.rmul(m, R(x)), R(b)).n;
        const x1 = pk(xs); const rest = xs.filter(x => Math.abs(x - x1) >= 3 && Math.abs(y(x) - y(x1)) >= 2 && Math.abs(y(x)) <= 6); if (!rest.length || Math.abs(y(x1)) > 6) continue;
        const x2 = pk(rest);
        const grid = { size: 8, pts: [{ id: 'A', x: x1, y: y(x1) }, { id: 'B', x: x2, y: y(x2) }], stairs: [], m: null, line: null, start: null, goal: { m, b: R(b) } };
        return mk('slope2pt', 'slope', [], { needs: ['stairs', 'plug'], grid, target: 'b' });
      }
    },
    graphline: () => {
      const m = pk(SLOPES), b = nz(-4, 4);
      const grid = { size: 8, pts: [], stairs: [], m: null, line: null, start: null, goal: { m, b: R(b) } };
      return mk('graphline', 'graph', [], { needs: ['start', 'stairs'], grid });
    },
  };
  function gen(fam, o) { return GEN[fam](o || {}); }
  return { gen, FAMS, GEN };
})();
if (typeof module !== 'undefined') module.exports = Spec;
