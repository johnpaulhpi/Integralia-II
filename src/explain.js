/* ================================================================
   ALGEBRICK — "Explain the last step": diagrams, figures, paragraphs
   ================================================================ */
const Explain = (() => {
  // ---------- arrow kinds (the legend) ----------
  const K = {
    identity: { col: '#2a64c5', name: 'identity: same value, new form' },
    multiply: { col: '#9a6b00', name: 'multiply' },
    divide: { col: '#b0283f', name: 'divide' },
    add: { col: '#2e8b57', name: 'add or subtract' },
    sub: { col: '#0f8a8a', name: 'substitute (swap in)' },
    move: { col: '#6a5845', name: 'move or split' },
  };
  const kw = (k, s) => `<b class="kw" style="color:${K[k].col}">${s}</b>`;
  const P = (lead, text) => `<span class="lead">${lead}</span> ${text}`;
  const MINUS = '−';
  const num = x => { const r = Math.round(x * 100) / 100; return (r < 0 ? MINUS : '') + Math.abs(r); };

  // ---------- recording ----------
  function record(act, before, res, tg = {}) {
    if (!TR) return;
    const { st, ...rest } = res;
    TR.history.push({ act, before: Alg.clone(before), after: Alg.clone(st), res: Alg.clone(rest), tg: Alg.clone(tg), orig: Alg.clone(TR.orig) });
  }

  // ---------- diagram model ----------
  const chip = (id, html, o = {}) => ({ t: 'chip', id, html, ...o });
  const op = (sym, kind) => ({ t: 'op', sym, kind });
  const row = (label, items, gap) => ({ label, items, gap });

  function diagramHTML(spec) {
    const rowOfId = {}; spec.rows.forEach((r, i) => r.items.forEach(it => { if (it.id) rowOfId[it.id] = i; }));
    const arcTop = new Set(); (spec.arrows || []).forEach(a => { const rf = rowOfId[a.from], rt = rowOfId[a.to]; if (rf !== undefined && rf === rt && (a.side || 't') === 't') arcTop.add(rf); });
    const rows = spec.rows.map((r, i) => {
      const items = r.items.map(it => {
        if (it.t === 'op') return `<span class="dg-op" style="${it.kind ? 'color:' + K[it.kind].col : ''}">${it.sym}</span>`;
        if (it.t === 'gap') return `<span style="display:inline-block;width:${it.w}px"></span>`;
        const tone = it.tone && Art.TONES[it.tone];
        const hi = it.hi && K[it.hi];
        const style = [tone ? `background:${tone[1]}26;border-color:${tone[0]}88` : '', hi ? `border-color:${hi.col};box-shadow:0 0 0 2.5px ${hi.col}40` : ''].join(';');
        return `<div class="dg-chip${it.sm ? ' sm' : ''}" data-dg="${it.id}" style="${style}${it.minw ? ';min-width:' + it.minw + 'px' : ''}">${it.cap ? `<span class="cap">${it.cap}</span>` : ''}<span class="m">${it.html}</span></div>`;
      }).join('');
      let gap = r.gap !== undefined ? r.gap : (i === 0 ? 8 : 62);
      if (arcTop.has(i)) gap = Math.max(gap, i === 0 ? 62 : 84);
      return `<div class="dg-row" data-row="${i}" style="margin-top:${gap}px"><div class="dg-rl">${r.label || ''}</div><div class="dg-items">${items}</div></div>`;
    }).join('');
    return `<div class="dg" id="dg"><svg class="dg-svg" id="dg-svg"></svg>${rows}<div class="dg-lbls" id="dg-lbls"></div></div>`;
  }

  function posIn(el, root) {
    let x = 0, y = 0, e = el;
    while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  function drawArrows(spec) {
    const root = $('#dg'); if (!root) return;
    const svg = $('#dg-svg'), lbls = $('#dg-lbls');
    const W = root.offsetWidth, H = root.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const boxes = {}; const rowOf = {};
    $$('[data-dg]', root).forEach(el => { boxes[el.dataset.dg] = posIn(el, root); rowOf[el.dataset.dg] = +el.closest('.dg-row').dataset.row; });
    const arrows = (spec.arrows || []).filter(a => boxes[a.from] && boxes[a.to]);
    // decide sides
    arrows.forEach(a => {
      const rf = rowOf[a.from], rt = rowOf[a.to];
      if (Math.abs(rt - rf) >= 2 && !a.route) { const b = boxes[a.from]; a.route = (b.x + b.w / 2 < W / 2) ? 'left' : 'right'; }
      if (a.route) { a.fs = a.ts = a.route === 'left' ? 'L' : 'R'; }
      else if (rt > rf) { a.fs = 'b'; a.ts = 't'; } else if (rt < rf) { a.fs = 't'; a.ts = 'b'; } else { a.fs = a.ts = a.side || 't'; }
    });
    // spread endpoints along each side
    const ends = {};
    arrows.forEach((a, i) => {
      (ends[a.from + a.fs] = ends[a.from + a.fs] || []).push({ i, end: 'f', other: boxes[a.to] });
      (ends[a.to + a.ts] = ends[a.to + a.ts] || []).push({ i, end: 't', other: boxes[a.from] });
    });
    const fr = {};
    Object.values(ends).forEach(list => {
      list.sort((p, q) => (p.other.x + p.other.w / 2) - (q.other.x + q.other.w / 2));
      list.forEach((e, k) => { fr[e.i + e.end] = list.length === 1 ? .5 : .22 + .56 * k / (list.length - 1); });
    });
    const pt = (b, side, f) => side === 'b' ? [b.x + b.w * f, b.y + b.h] : side === 't' ? [b.x + b.w * f, b.y] : side === 'L' ? [b.x, b.y + b.h * f] : [b.x + b.w, b.y + b.h * f];
    const used = new Set(arrows.map(a => a.kind));
    let defs = '<defs>' + [...used].map(k => `<marker id="xa-${k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${K[k].col}"/></marker>`).join('') + '</defs>';
    let paths = ''; const labs = [];
    arrows.forEach((a, i) => {
      const [x1, y1] = pt(boxes[a.from], a.fs, fr[i + 'f']);
      const [x2, y2] = pt(boxes[a.to], a.ts, fr[i + 't']);
      let c1, c2;
      if (a.route) { const sg = a.route === 'left' ? -1 : 1; const xo = (sg < 0 ? Math.min(x1, x2) : Math.max(x1, x2)) + sg * (a.out || 64); c1 = [xo, y1]; c2 = [xo, y2]; }
      else if (a.fs !== a.ts) { const dy = y2 - y1; c1 = [x1, y1 + dy * .5]; c2 = [x2, y2 - dy * .5]; }
      else { const h = (a.h || 34 + Math.abs(x2 - x1) * .12) * (a.fs === 't' ? -1 : 1); c1 = [x1, y1 + h]; c2 = [x2, y2 + h]; }
      const col = K[a.kind].col;
      paths += `<path d="M${x1} ${y1}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x2} ${y2}" stroke="${col}" stroke-width="2.3" fill="none" ${a.dash ? 'stroke-dasharray="6 5"' : ''} marker-end="url(#xa-${a.kind})"/>`;
      if (a.label) {
        const t = a.t || .5, u = 1 - t;
        const bx = u * u * u * x1 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x2;
        const by = u * u * u * y1 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y2;
        labs.push({ x: bx, y: by, html: a.label, col });
      }
    });
    svg.innerHTML = defs + paths;
    lbls.innerHTML = labs.map((l, i) => `<div class="dg-lbl" data-l="${i}" style="left:${l.x}px;top:${l.y}px;border-color:${l.col};color:${l.col}">${l.html}</div>`).join('');
    // nudge overlapping labels apart
    const els = $$('.dg-lbl', lbls);
    const rect = el => ({ x: parseFloat(el.style.left) - el.offsetWidth / 2, y: parseFloat(el.style.top) - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight });
    for (let pass = 0; pass < 12; pass++) {
      let moved = false;
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
        const a = rect(els[i]), b = rect(els[j]);
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + 6, oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + 2;
        if (ox > 0 && oy > 0) {
          const s = (a.x + a.w / 2 <= b.x + b.w / 2) ? 1 : -1;
          els[i].style.left = (parseFloat(els[i].style.left) - s * ox / 2) + 'px';
          els[j].style.left = (parseFloat(els[j].style.left) + s * ox / 2) + 'px';
          moved = true;
        }
      }
      if (!moved) break;
    }
    els.forEach(el => { const r = rect(el); const L = parseFloat(el.style.left); if (r.x < 4) el.style.left = (L + 4 - r.x) + 'px'; if (r.x + r.w > W - 4) el.style.left = (L - (r.x + r.w - W + 4)) + 'px'; });
    void H;
  }
  function legendHTML(spec) {
    const used = [...new Set((spec.arrows || []).map(a => a.kind))];
    return `<div class="ex-legend">${used.map(k => `<span><svg viewBox="0 0 30 10"><path d="M1 5H24" stroke="${K[k].col}" stroke-width="2.4"/><path d="M22 1L29 5L22 9z" fill="${K[k].col}"/></svg>${K[k].name}</span>`).join('')}${spec.dashNote ? `<span><svg viewBox="0 0 30 10"><path d="M1 5H28" stroke="#555" stroke-width="2" stroke-dasharray="5 4"/></svg>${spec.dashNote}</span>` : ''}</div>`;
  }

  // ---------- numbers & plots ----------
  function pickRange(fn, cands = [[-3, 3], [0.1, 4], [-0.95, 0.95], [0.05, 1.5], [-1.5, 1.5]]) {
    let best = cands[0], bestN = -1;
    for (const [a, b] of cands) {
      let n = 0, lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 60; i++) { const y = fn(a + (b - a) * i / 60); if (Number.isFinite(y) && Math.abs(y) < 1e6) { n++; lo = Math.min(lo, y); hi = Math.max(hi, y); } }
      if (hi - lo < 1e-9) n -= 30;
      if (n > bestN + 2) { best = [a, b]; bestN = n; }
    }
    return best;
  }
  let clipN = 0;
  function plot(o) {
    const W = o.w || 380, H = o.h || 230, pl = 36, pr = 12, pt = 16, pb = 24;
    const N = 240;
    const series = o.fns.map(s => { const pts = []; for (let i = 0; i <= N; i++) { const x = o.x0 + (o.x1 - o.x0) * i / N; let y; try { y = s.f(x); } catch (e) { y = NaN; } pts.push([x, y]); } return { ...s, pts }; });
    let ylo = o.y0, yhi = o.y1;
    if (ylo === undefined) {
      const ys = series.filter(s => !s.noRange).flatMap(s => s.pts.map(p => p[1]).filter(y => Number.isFinite(y) && Math.abs(y) < 1e6)).sort((a, b) => a - b);
      ylo = ys[Math.floor(ys.length * .02)]; yhi = ys[Math.floor(ys.length * .98)];
      (o.hlines || []).forEach(h => { ylo = Math.min(ylo, h.y); yhi = Math.max(yhi, h.y); });
      if (!(yhi - ylo > 1e-6)) { ylo -= 1; yhi += 1; }
      const m = (yhi - ylo) * .14; ylo -= m; yhi += m;
    }
    const X = x => pl + (x - o.x0) / (o.x1 - o.x0) * (W - pl - pr);
    const Y = y => pt + (yhi - y) / (yhi - ylo) * (H - pt - pb);
    const span = yhi - ylo;
    const cid = 'pc' + (++clipN);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="plot" font-family="Cormorant Garamond, Georgia, serif"><defs><clipPath id="${cid}"><rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}"/></clipPath>
      <marker id="${cid}m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2e8b57"/></marker></defs>
      <rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="rgba(255,255,255,.45)" stroke="rgba(60,40,20,.25)"/>`;
    if (ylo < 0 && yhi > 0) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(60,40,20,.45)"/>`;
    if (o.x0 < 0 && o.x1 > 0) s += `<line y1="${pt}" y2="${H - pb}" x1="${X(0)}" x2="${X(0)}" stroke="rgba(60,40,20,.45)"/>`;
    s += `<text x="${pl - 4}" y="${pt + 10}" font-size="12" text-anchor="end" fill="#5b4630">${num(yhi)}</text><text x="${pl - 4}" y="${H - pb}" font-size="12" text-anchor="end" fill="#5b4630">${num(ylo)}</text>`;
    s += `<text x="${pl}" y="${H - 6}" font-size="12" fill="#5b4630">${num(o.x0)}</text><text x="${W - pr}" y="${H - 6}" font-size="12" text-anchor="end" fill="#5b4630">${num(o.x1)}</text>`;
    if (o.xlabel) s += `<text x="${(W + pl) / 2}" y="${H - 6}" font-size="13" font-style="italic" text-anchor="middle" fill="#5b4630">${o.xlabel}</text>`;
    s += `<g clip-path="url(#${cid})">`;
    (o.vlines || []).forEach(v => { s += `<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${pt}" y2="${H - pb}" stroke="${v.col || '#b0283f'}" stroke-dasharray="4 4" stroke-width="1.4"/>`; });
    (o.hlines || []).forEach(h => { s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(h.y)}" y2="${Y(h.y)}" stroke="${h.col || '#2e8b57'}" stroke-dasharray="5 4" stroke-width="1.5"/>`; });
    for (const se of series) {
      let d = ''; let pen = false; let prev = null;
      for (const [x, y] of se.pts) {
        const okY = Number.isFinite(y) && y > ylo - span * 2 && y < yhi + span * 2;
        if (!okY || (prev !== null && Math.abs(y - prev) > span * .8)) { pen = false; prev = okY ? y : null; if (!okY) continue; }
        d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`; pen = true; prev = y;
      }
      s += `<path d="${d}" fill="none" stroke="${se.col}" stroke-width="${se.w || 2.4}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''} stroke-linejoin="round" opacity="${se.op || 1}"/>`;
    }
    (o.segs || []).forEach(g => { s += `<line x1="${X(g.x1)}" y1="${Y(g.y1)}" x2="${X(g.x2)}" y2="${Y(g.y2)}" stroke="${g.col}" stroke-width="${g.w || 1.8}" ${g.dash ? `stroke-dasharray="${g.dash}"` : ''} ${g.arrow ? `marker-end="url(#${cid}m)" marker-start="url(#${cid}m)"` : ''}/>`; });
    (o.marks || []).forEach(m => { s += `<circle cx="${X(m.x)}" cy="${Y(m.y)}" r="4" fill="${m.col}" stroke="#fff" stroke-width="1.2"/>`; if (m.label) s += `<text x="${X(m.x) + (m.dx || 7)}" y="${Y(m.y) + (m.dy || -7)}" font-size="13.5" fill="${m.col}" font-weight="600" ${m.anchor ? `text-anchor="${m.anchor}"` : ''}>${m.label}</text>`; });
    s += `</g>`;
    (o.vlines || []).forEach(v => { if (v.label) s += `<text x="${X(v.x) + 4}" y="${pt + 12}" font-size="12.5" fill="${v.col || '#b0283f'}">${v.label}</text>`; });
    (o.hlines || []).forEach(h => { if (h.label) s += `<text x="${W - pr - 4}" y="${Y(h.y) - 5}" font-size="12.5" text-anchor="end" fill="${h.col || '#2e8b57'}">${h.label}</text>`; });
    let ly = pt + 14;
    series.forEach(se => { if (!se.label) return; s += `<line x1="${pl + 8}" x2="${pl + 28}" y1="${ly - 4}" y2="${ly - 4}" stroke="${se.col}" stroke-width="${se.w || 2.4}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''}/><text x="${pl + 33}" y="${ly}" font-size="13.5" fill="#2a1c0f">${se.label}</text>`; ly += 17; });
    return s + '</svg>';
  }
  const fig = (inner, cap) => `<div class="ex-fig">${inner}${cap ? `<div class="cap">${cap}</div>` : ''}</div>`;

  // ================= Algebrick helpers =================
  const A = Alg;
  const rs = r => Tex.snum(r);
  const X = '<i>x</i>';
  const pM = p => { const r = Tex.part(p); return (r.neg ? MINUS : '') + r.html; };
  const negOf = p => { const q = A.clone(p); q.c = A.rneg(q.c); return q; };
  const relS = r => Tex.rel(r);
  const sideName = s => s === 'L' ? 'left' : 'right';
  const tv = st => st.target || 'x';
  const vH = st => `<i>${tv(st)}</i>`;
  function stateLine(st) {
    if (st.done) return Tex.answer(st);
    if (st.task === 'slope' || st.task === 'graph') {
      const g = st.grid; const m = st.task === 'graph' ? rs(g.goal.m) : (g.m ? rs(g.m) : '?');
      const b = st.task === 'graph' ? rs(g.goal.b) : (st.eqs.length && A.isSolved(st.eqs[0], 'b') ? rs(A.solvedValue(st.eqs[0], 'b')) : '?');
      return `<i>y</i> = <i>mx</i> + <i>b</i>, <i>m</i> = ${m}, <i>b</i> = ${b}` + (st.eqs.length ? ` ; ${Tex.state(st)}` : '');
    }
    if (st.task === 'eval') return `<i>f</i>(${rs(st.input)}) = ${Tex.side(st.eqs[0].L)}`;
    return Tex.state(st);
  }
  // chips for one side (signs as green ops)
  function sideChips(ps, pre, o = {}) {
    if (!ps.length) return [chip(pre + 'zero', '0', { cap: o.zcap || 'empty plate' })];
    const items = [];
    ps.forEach((p, i) => {
      const r = Tex.part(p);
      if (i > 0 || r.neg) items.push(op(r.neg ? MINUS : '+', 'add'));
      const m = material(p);
      items.push(chip(pre + p.id, r.html, { cap: (o.caps && o.caps[p.id]) || m.name, tone: m.tone, hi: o.hi && o.hi[p.id], sm: o.sm }));
    });
    return items;
  }
  function eqChips(e, pre, o = {}) {
    if (!e.R) return sideChips(e.L, pre + 'L', o);
    return [...sideChips(e.L, pre + 'L', o), o.relChip ? chip(pre + 'rel', relS(e.rel), { cap: 'the sign', hi: o.relHi }) : op(relS(e.rel)), ...sideChips(e.R, pre + 'R', o)];
  }
  const cid = (pre, s, p) => pre + s + p.id;
  const findIn = (st, eid) => st.eqs.find(e => e.id === eid) || st.eqs[0];
  // numbers
  const fmt = x => { const r = Math.round(x * 1000) / 1000; return (r < 0 ? MINUS : '') + Math.abs(r); };
  // substitute a value into a side, as HTML: 3(4) + 2
  function subH(ps, v, valH) {
    if (!ps.length) return '0';
    return ps.map((p, i) => {
      let body;
      const r = Tex.part(p);
      if (p.t === 'term' && p.k !== '1' && A.varOf(p.k) === v) {
        const a = A.rabs(p.c); const pw = A.powOf(p.k);
        body = `${A.req(a, A.ONE) ? '' : Tex.num(a)}(${valH})${pw > 1 ? '<sup>' + pw + '</sup>' : ''}`;
      } else if (p.t === 'group') { const bare = !/^[−-]/.test(valH.replace(/<[^>]+>/g, '')) && !/fr/.test(valH); body = r.html.replace(/<i>x<\/i>/g, bare ? valH : `(${valH})`); }
      else body = r.html;
      return i === 0 ? (r.neg ? MINUS : '') + body : ` ${r.neg ? MINUS : '+'} ${body}`;
    }).join('');
  }
  // ---------- figures ----------
  function tilesSVG(list) { // list of {k, neg, n} rows of bricks, drawn left to right; returns svg
    let x = 4, s = ''; const U = Art.U, gap = 3; let H = 0;
    for (const g of list) {
      const [wu, hu] = Art.DIM[g.k]; const w = wu * U, h = hu * U;
      for (let i = 0; i < g.n; i++) { s += Art.brick(g.k, g.neg, x, 4); x += w + gap; }
      x += 10; H = Math.max(H, h);
    }
    return `<svg viewBox="0 0 ${x} ${H + 10}" class="tiles" aria-hidden="true">${s}</svg>`;
  }
  function zeroPairFig(k, pos, negN) {
    const n = Math.min(pos, negN);
    if (pos > 14 || negN > 14 || !n) return '';
    const U = Art.U; const [wu] = Art.DIM[k]; const w = wu * U + 4; const cols = Math.max(pos, negN);
    let s = '';
    for (let i = 0; i < pos; i++) s += Art.brick(k, false, 6 + i * w, 6);
    for (let i = 0; i < negN; i++) s += Art.brick(k, true, 6 + i * w, 44);
    for (let i = 0; i < n; i++) s += `<rect x="${3 + i * w}" y="2" width="${w - 2}" height="${2 * U + 26}" rx="6" fill="none" stroke="${K.add.col}" stroke-width="2" stroke-dasharray="4 3"/>`;
    return fig(`<svg viewBox="0 0 ${12 + cols * w} ${2 * U + 34}" class="tiles" aria-hidden="true">${s}</svg>`,
      `Each dashed box is a zero pair: a brick and its red opposite add to 0. ${n} pair${n > 1 ? 's' : ''} vanish${n > 1 ? '' : 'es'}, and ${Math.abs(pos - negN)} ${pos >= negN ? 'yellow' : 'red'} brick${Math.abs(pos - negN) === 1 ? '' : 's'} remain${Math.abs(pos - negN) === 1 ? 's' : ''}.`);
  }
  function boxTable(rowsT, colsT, cellFn, corner = '×') {
    return `<table class="boxm"><tr><th class="corner">${corner}</th>${colsT.map(c => `<th>${M(c)}</th>`).join('')}</tr>${rowsT.map((r, i) => `<tr><th>${M(r)}</th>${colsT.map((c, j) => `<td>${M(cellFn(i, j))}</td>`).join('')}</tr>`).join('')}</table>`;
  }
  const polyTerms = f => A.pkeys(f).map(k => ({ c: f[k], k }));
  const termH = t => { const s = Tex.poly(A.pn({ [t.k]: t.c })); return s; };
  function gridFig(g, o = {}) {
    const N = g.size, u = 11, off = N * u + 12, W = 2 * off;
    const Xp = x => off + x * u, Yp = y => off - y * u;
    let s = `<svg viewBox="0 0 ${W} ${W}" class="plot" aria-hidden="true"><rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="8" fill="#3d7a44"/>`;
    for (let x = -N; x <= N; x++) for (let y = -N; y <= N; y++) s += `<circle cx="${Xp(x)}" cy="${Yp(y)}" r="3" fill="#5b9d61"/>`;
    s += `<path d="M${Xp(-N) - 6} ${Yp(0)}H${Xp(N) + 6}M${Xp(0)} ${Yp(-N) - 6}V${Yp(N) + 6}" stroke="#d9e8c9" stroke-width="1.6"/>`;
    const line = o.line || g.line;
    if (line) { const m = A.rnum(line.m), b = A.rnum(line.b); s += `<clipPath id="gfc${o.id || ''}"><rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="8"/></clipPath><path d="M${Xp(-N - 1)} ${Yp(m * (-N - 1) + b)}L${Xp(N + 1)} ${Yp(m * (N + 1) + b)}" stroke="#e6c47c" stroke-width="4" clip-path="url(#gfc${o.id || ''})" opacity=".9"/>`; }
    for (const st of (o.stairs || g.stairs)) {
      const x1 = Xp(st.from.x), x2 = Xp(st.to.x), y1 = Yp(st.from.y), y2 = Yp(st.to.y);
      s += `<path d="M${x1} ${y1}H${x2}" stroke="${Art.COL.x[0]}" stroke-width="6" stroke-linecap="round"/><path d="M${x2} ${y1}V${y2}" stroke="${st.rise < 0 ? Art.COL.neg[0] : Art.COL.x2[0]}" stroke-width="6" stroke-linecap="round"/>
        <text x="${(x1 + x2) / 2}" y="${y1 + (st.rise >= 0 ? 16 : -8)}" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">run ${st.run}</text><text x="${x2 + 6}" y="${(y1 + y2) / 2 + 4}" font-size="12" fill="#fff" font-weight="700">rise ${String(st.rise).replace('-', '−')}</text>`;
    }
    const dot = (x, y, col, lbl) => `<rect x="${Xp(x) - 6}" y="${Yp(y) - 6}" width="12" height="12" rx="2" fill="${col}" stroke="#3a2a10"/>` + (lbl ? `<text x="${Xp(x) + (x > 3 ? -9 : 9)}" y="${Yp(y) + (y > 5 ? 16 : -8)}" text-anchor="${x > 3 ? 'end' : 'start'}" font-size="12.5" fill="#fff" font-weight="700">${lbl}</text>` : '');
    for (const p of (o.pts || g.pts)) s += dot(p.x, p.y, Art.COL['1'][0], `(${p.x}, ${p.y})`.replace(/-/g, '−'));
    const start = o.start || g.start;
    if (start) s += dot(0, start.y, Art.COL.b[0], `(0, ${start.y})`.replace(/-/g, '−'));
    return s + '</svg>';
  }
  function numberLineFig(k, rel) {
    const W = 380, H = 70, kx = A.rnum(k), lo = Math.floor(kx) - 5, hi = lo + 10;
    const Xp = x => 20 + (x - lo) / (hi - lo) * (W - 40);
    const right = rel === '>' || rel === '>=', closed = rel === '<=' || rel === '>=';
    let s = `<svg viewBox="0 0 ${W} ${H}" class="plot" aria-hidden="true"><path d="M10 34H${W - 10}" stroke="#5b4630" stroke-width="1.5"/>`;
    for (let x = lo; x <= hi; x++) s += `<path d="M${Xp(x)} 29v10" stroke="#5b4630"/><text x="${Xp(x)}" y="56" text-anchor="middle" font-size="12" fill="#5b4630">${String(x).replace('-', '−')}</text>`;
    s += `<path d="M${Xp(kx)} 34H${right ? W - 8 : 8}" stroke="${K.identity.col}" stroke-width="6" stroke-linecap="round" opacity=".75"/>`;
    s += `<path d="M${right ? W - 16 : 16} 26L${right ? W - 4 : 4} 34L${right ? W - 16 : 16} 42" fill="${K.identity.col}"/>`;
    s += `<circle cx="${Xp(kx)}" cy="34" r="7" fill="${closed ? K.identity.col : '#fbf6e8'}" stroke="${K.identity.col}" stroke-width="3"/>`;
    return fig(s + '</svg>', `Every number on the blue ray works. The circle at ${M(rs(k))} is ${closed ? 'filled: the boundary itself is included (≤ or ≥)' : 'open: the boundary itself is not included (< or >)'}.`);
  }
  function parabolaFig(poly, v, roots, cap) {
    const a = A.rnum(A.pc(poly, v + '2')), b = A.rnum(A.pc(poly, v)), c = A.rnum(A.pc(poly, '1'));
    const f = x => a * x * x + b * x + c;
    const rs0 = roots.length ? roots : [-b / (2 * a)];
    const lo = Math.min(...rs0), hi = Math.max(...rs0), pad = Math.max(2, (hi - lo) * .6);
    return fig(plot({ fns: [{ f, col: '#3d5a36', label: `y = ${Tex.text(() => Tex.poly(poly)).replace(/\^2/g, '²').replace(/-/g, '−')}` }], x0: lo - pad, x1: hi + pad, xlabel: v,
      marks: roots.map((r, i) => ({ x: r, y: 0, col: K.divide.col, label: `${v} = ${fmt(r)}`, dy: i % 2 ? 16 : -8 })) }), cap);
  }

  // ================= one builder per move =================
  const B = {};

  B.counter = r => {
    const eb = findIn(r.before, r.res.eid), ea = findIn(r.after, r.res.eid);
    const p = r.res.part, q = r.res.added, s = r.res.from, o = A.other(s);
    const v = tv(r.before);
    const rows = [
      row('Before', eqChips(eb, 'b', { hi: { [p.id]: 'move' } })),
      row('Both plates', [chip('qL', pM(q), { cap: s === 'L' ? 'cancels it' : 'lands here', tone: material(q).tone, hi: 'add' }), { t: 'gap', w: 70 }, op(relS(eb.rel)), { t: 'gap', w: 70 }, chip('qR', pM(q), { cap: s === 'R' ? 'cancels it' : 'lands here', tone: material(q).tone, hi: 'add' })]),
      row('After', eqChips(ea, 'a', { hi: { [q.id]: 'add' } })),
    ];
    const arrows = [
      { from: s === 'L' ? 'qL' : 'qR', to: cid('b', s, p), kind: 'add', label: 'zero pair: they cancel' },
      { from: s === 'L' ? 'qR' : 'qL', to: cid('a', o, q), kind: 'add', label: 'shows up here' },
    ];
    const isVar = p.t === 'term' && p.k !== '1';
    const paras = [
      P('In the game.', `You used the Counterweight on the ${M(pM(p))} on the ${sideName(s)} plate. It put ${M(pM(q))} on <em>both</em> plates.`),
      P('The math.', `This is the balance rule: whatever you add to one side of an ${eb.rel === '=' ? 'equation' : 'inequality'}, you add to the other, so it stays balanced. Adding ${M(pM(q))} to both sides is the same as ${p.c.n > 0 ? 'subtracting' : 'adding'} ${M(Tex.part(p).html)} ${p.c.n > 0 ? 'from' : 'to'} both sides. On the ${sideName(s)}, ${M(pM(p))} and ${M(pM(q))} make a ${kw('add', 'zero pair')}, which cancels. On the ${sideName(o)}, the ${M(pM(q))} simply appears.`),
      P('Why it helps.', isVar ? `It gathers the ${M(vH(r.before))}-bricks onto one plate, so they can be combined and then isolated.` : `It clears the loose bricks away from the ${M(vH(r.before))}-bricks. Each counterweight gets ${M(vH(r.before))} one step closer to standing alone.${eb.rel !== '=' ? ' Adding or subtracting the same thing on both sides never flips an inequality.' : ''}`),
    ];
    if (!A.snapped(ea[o])) paras.push(P('Next.', `The ${sideName(o)} plate now has like bricks side by side. Snap them together.`));
    void v;
    return { title: 'Counterweight: the same on both sides', rows, arrows, paras };
  };

  B.snap = r => {
    const eb = findIn(r.before, r.res.eid), ea = findIn(r.after, r.res.eid);
    const rows = [row('Before', eqChips(eb, 'b')), row('After', eqChips(ea, 'a'))];
    const arrows = []; let ghost = 0; const lines = []; let zfig = '';
    for (const s of ['L', 'R']) {
      for (const mg of (r.res.sides[s] || [])) {
        const sum = mg.from.map(f => rs(f.c)).join(' + ').replace(/\+ −/g, '− ');
        const tot = mg.to ? rs(mg.tot) : '0';
        const unit = mg.t === 'root' ? `√${mg.n}` : (mg.k === '1' ? '' : Tex.varH(mg.k));
        lines.push(`${M(mg.from.map(f => Tex.part(mg.t === 'root' ? { t: 'root', c: f.c, n: mg.n } : { t: 'term', c: f.c, k: mg.k })).map((x, i) => i === 0 ? (x.neg ? MINUS : '') + x.html : ` ${x.neg ? MINUS : '+'} ${x.html}`).join('') + ' = ' + (mg.to ? pM(mg.t === 'root' ? { t: 'root', c: mg.tot, n: mg.n } : { t: 'term', c: mg.tot, k: mg.k }) : '0'))}`);
        let target;
        if (mg.to) target = 'a' + s + mg.to;
        else { target = 'gz' + (ghost++); rows[1].items.push({ t: 'gap', w: 20 }, chip(target, '0', { cap: 'a zero pair: gone', hi: 'add', sm: true })); }
        mg.from.forEach((f, i) => arrows.push({ from: 'b' + s + f.id, to: target, kind: 'add', label: i === 0 ? `${sum}${unit ? ' (' + Tex.text(() => unit).replace('^2', '²') + ')' : ''} = ${tot}`.replace(/<[^>]+>/g, '') : null }));
        if (!zfig && mg.t === 'term' && mg.from.length === 2 && mg.from[0].c.n * mg.from[1].c.n < 0 && mg.from.every(f => f.c.d === 1)) {
          const pos = mg.from.find(f => f.c.n > 0).c.n, ng = -mg.from.find(f => f.c.n < 0).c.n;
          zfig = zeroPairFig(mg.k, pos, ng);
        }
      }
    }
    const cancelled = arrows.some(a => a.to.startsWith('gz'));
    const paras = [
      P('In the game.', `You used Snap. Bricks of the same shape on the same plate clicked together into one pile: ${lines.join(', and ')}.`),
      P('The math.', `This is ${kw('add', 'combining like terms')}. Like terms have exactly the same variable part: plain numbers with plain numbers, ${X} with ${X}, ${X}<sup>2</sup> with ${X}<sup>2</sup>. You add their numbers and keep the shape.${zfig || cancelled ? ' A yellow brick and a red one of the same shape add to 0. That’s a zero pair, and it disappears.' : ''}`),
      P('Why it helps.', `You can’t combine different shapes: ${M('3' + X + ' + 2')} stays as it is, like 3 apples and 2 oranges. But one tidy pile of each shape makes the next move obvious.`),
    ];
    return { title: 'Snap: combining like bricks', rows, arrows, paras, figure: zfig };
  };

  B.saw = r => {
    const eb = findIn(r.before, r.res.eid), ea = findIn(r.after, r.res.eid);
    const c = r.res.div, p = r.res.part; const flipped = r.res.flipped;
    const rows = [row('Before', eqChips(eb, 'b', { hi: { [p.id]: 'divide' }, relChip: flipped })), row('After', eqChips(ea, 'a', { relChip: flipped, relHi: flipped ? 'move' : null }))];
    const arrows = [];
    let first = true;
    for (const s of ['L', 'R']) for (const q of eb[s]) { arrows.push({ from: cid('b', s, q), to: cid('a', s, q), kind: 'divide', label: first ? `÷ ${Tex.text(() => rs(c))}`.replace('-', '−') : null }); first = false; }
    if (flipped) arrows.push({ from: 'brel', to: 'arel', kind: 'move', label: 'flips!' });
    const whole = c.d === 1, kk = Math.abs(c.n);
    let figure = '';
    if (flipped) figure = fig(`<div class="flipdemo">${M('2 &lt; 5')}<span class="arr">× (−1)</span>${M('−2 &gt; −5')}</div>` + numberLineFig(A.solvedValue(ea, tv(r.after)) || A.ZERO, A.solvedSide(ea, tv(r.after)) === 'L' ? ea.rel : A.FLIP[ea.rel]).replace('<div class="ex-fig">', '<div>'),
      'Multiplying or dividing by a negative number reverses the order of numbers, so the inequality sign must turn around.');
    else if (whole && kk >= 2 && kk <= 5 && eb.L.length === 1 && eb.R.length === 1 && eb.L[0].t === 'term' && eb.R[0].t === 'term' && eb.R[0].k === '1' && eb.R[0].c.d === 1 && Math.abs(eb.R[0].c.n) / kk <= 6 && c.n > 0 && eb.R[0].c.n > 0) {
      const each = eb.R[0].c.n / kk; let s = ''; const U = Art.U; const [wu] = Art.DIM[eb.L[0].k];
      for (let i = 0; i < kk; i++) {
        const y = 6 + i * (U + 10);
        s += Art.brick(eb.L[0].k, false, 6, y) + `<text x="${wu * U + 18}" y="${y + 15}" font-size="18" fill="#5b4630">=</text>`;
        for (let j = 0; j < each; j++) s += Art.brick('1', false, wu * U + 36 + j * (U + 4), y);
        if (i === 0) s += `<rect x="2" y="${y - 4}" width="${wu * U + 40 + each * (U + 4)}" height="${U + 8}" rx="6" fill="none" stroke="${K.divide.col}" stroke-width="2.4"/>`;
      }
      figure = fig(`<svg viewBox="0 0 ${wu * U + 44 + each * (U + 4)} ${kk * (U + 10) + 6}" class="tiles" aria-hidden="true">${s}</svg>`, `${kk} equal groups. Each ${Tex.text(() => Tex.varH(eb.L[0].k)).replace('^2', '²')}-brick balances ${each} stud${each === 1 ? '' : 's'}; keep one group.`);
    }
    const paras = [
      P('In the game.', `You used the Saw on ${M(pM(p))}. It ${whole && c.n > 0 ? `split both plates into ${kk} equal groups and kept one` : `divided everything on both plates by ${M(rs(c))}`}.`),
      P('The math.', `This is ${kw('divide', 'dividing both sides')} by ${M(rs(c))}. ${whole && c.n > 0 ? `If ${kk} ${M(Tex.varH(p.k || 'x'))}-bricks balance something, then one of them balances a ${kk === 2 ? 'half' : kk === 3 ? 'third' : kk === 4 ? 'quarter' : kk + 'th'} of it.` : c.d !== 1 ? `Dividing by the fraction ${M(rs(c))} is the same as multiplying by its flip, ${M(rs(A.rdiv(A.ONE, c)))}.` : ''} Every brick on both plates gets divided, not just one, or the balance would tip.`),
      flipped ? P('Watch the sign.', `Dividing by a negative number flips an inequality: ${M(relS(r.res.relBefore))} became ${M(relS(ea.rel))}. That’s because dividing by a negative reverses the order of numbers: 2 &lt; 5, but −2 &gt; −5.`)
        : P('Why it helps.', `The number in front of ${M(vH(r.before))} is now 1, which is the last step to ${M(vH(r.before))} standing alone.`),
    ];
    return { title: 'The Saw: dividing both sides', rows, arrows, paras, figure };
  };

  B.unbox = r => {
    const g = r.res.group, terms = r.res.terms;
    const rows = [row('Before', [chip('g', pM(g), { cap: g.f.length === 1 ? 'a crate' : 'a frame', tone: 'crate', hi: 'multiply' })]), row('After', sideChips(terms, 'a'))];
    const arrows = terms.map((t, i) => ({ from: 'g', to: 'a' + t.id, kind: 'multiply', label: i === 0 ? 'multiply out' : null }));
    let figure, paras;
    if (g.f.length === 1) {
      const ts = polyTerms(g.f[0]);
      figure = fig(boxTable([rs(g.c)], ts.map(termH), (i, j) => termH({ c: A.rmul(g.c, ts[j].c), k: ts[j].k })), `The number on the crate’s lid, ${M(rs(g.c))}, ${kw('multiply', 'multiplies')} every brick inside.`);
      const prods = ts.map(t => `${M(rs(g.c) + ' · ' + (t.c.n < 0 ? '(' + termH(t) + ')' : termH(t)) + ' = ' + termH({ c: A.rmul(g.c, t.c), k: t.k }))}`).join(' and ');
      paras = [
        P('In the game.', `You unboxed the crate ${M(pM(g))}.`),
        P('The math.', `This is the ${kw('multiply', 'distributive property')}: a number outside brackets multiplies <em>every</em> term inside: ${prods}. So ${M(pM(g) + ' = ' + Tex.side(terms))}.`),
        P('Why it helps.', 'Brackets keep bricks locked in a box. Once they’re out, you can move them with the Counterweight and combine them with Snap like any others.'),
      ];
    } else {
      const f1 = polyTerms(g.f[0]), f2 = polyTerms(g.f[1]);
      const cell = (i, j) => termH({ c: A.rmul(g.c, A.rmul(f1[i].c, f2[j].c)), k: A.mkKey('x', A.powOf(f1[i].k) + A.powOf(f2[j].k)) });
      figure = fig(boxTable(f1.map(termH), f2.map(termH), cell), `The box method: every term on the left ${kw('multiply', 'multiplies')} every term across the top. ${kw('add', 'Add')} the boxes; the two x boxes combine.`);
      const mids = []; for (let i = 0; i < f1.length; i++) for (let j = 0; j < f2.length; j++) mids.push(cell(i, j));
      paras = [
        P('In the game.', `You unboxed the frame ${M(pM(g))}: a rectangle whose sides are ${M('(' + Tex.poly(g.f[0]) + ')')} and ${M('(' + Tex.poly(g.f[1]) + ')')}.`),
        P('The math.', `Multiplying two brackets means every term in the first ${kw('multiply', 'multiplies')} every term in the second. With two terms in each, that’s four products (sometimes called FOIL: first, outer, inner, last): ${M(mids.join(', '))}. Then like bricks ${kw('add', 'combine')}, giving ${M(Tex.side(terms))}.`),
        P('Why it helps.', `Written this way the expression is in standard form: ${X}<sup>2</sup> first, then ${X}, then the number. It’s also a good check: factoring runs this exact process backwards.`),
      ];
    }
    return { title: 'Unbox: distributing', rows, arrows, paras, figure };
  };

  B.factor = r => {
    const res = r.res, g = res.group; const v = tv(r.before);
    const before = res.before;
    const factorChips = [];
    if (!A.req(g.c, A.ONE)) factorChips.push(chip('fc', rs(g.c), { cap: 'common factor', tone: 'crate' }), op('·'));
    g.f.forEach((f, i) => { if (i) factorChips.push(op('·')); factorChips.push(chip('f' + i, Tex.factorH(f), { cap: `side ${i + 1}`, tone: 'x', hi: 'identity' })); });
    const rows = [row('Before', sideChips(before, 'b'))];
    const arrows = [];
    if (res.pair) {
      const [p, q] = res.pair;
      rows.push(row('Split the middle', [chip('s2', termH({ c: A.R(res.A), k: v + '2' }), { cap: 'the plate', tone: 'x2', sm: true }), op('+', 'add'), chip('sp', termH({ c: A.R(p), k: v }), { cap: 'strip 1', tone: 'x', sm: true }), op('+', 'add'), chip('sq', termH({ c: A.R(q), k: v }), { cap: 'strip 2', tone: 'x', sm: true }), op('+', 'add'), chip('s1', rs(A.R(res.C)), { cap: 'the corner', tone: 'one', sm: true })]));
      const mid = before.find(t => t.k === v);
      if (mid) { arrows.push({ from: 'b' + mid.id, to: 'sp', kind: 'add', label: `${p} + ${q} = ${res.B}`.replace(/-/g, '−').replace('+ −', '− ') }); arrows.push({ from: 'b' + mid.id, to: 'sq', kind: 'add' }); }
    }
    rows.push(row('The rectangle', factorChips));
    const last = res.pair ? 'sp' : 'b' + before[0].id;
    g.f.forEach((f, i) => arrows.push({ from: res.pair ? (i ? 'sq' : 'sp') : 'b' + before[Math.min(i, before.length - 1)].id, to: 'f' + i, kind: 'identity', label: i === 0 ? 'read off the sides' : null }));
    void last;
    // the rectangle as a box
    let figure = '';
    if (g.f.length === 2) {
      const t1 = polyTerms(g.f[0]), t2 = polyTerms(g.f[1]);
      const cell = (i, j) => termH({ c: A.rmul(g.c, A.rmul(t1[i].c, t2[j].c)), k: A.mkKey(v, A.powOf(t1[i].k) + A.powOf(t2[j].k)) });
      figure = fig(boxTable(t1.map(termH), t2.map(termH), cell, A.req(g.c, A.ONE) ? '×' : rs(g.c) + '×'), `The rectangle: the cells are the bricks you started with, and the edges are the factors.${res.kind === 'diffsq' ? ' The two x-cells cancel each other: that’s why x² − p² has no middle term.' : ''}`);
    } else {
      const t2 = polyTerms(g.f[0]);
      figure = fig(boxTable([rs(g.c)], t2.map(termH), (i, j) => termH({ c: A.rmul(g.c, t2[j].c), k: t2[j].k })), 'One row: the common factor times each brick that is left.');
    }
    const fac = Tex.side([g]);
    const paras = [P('In the game.', `You used the Rectangle on ${M(Tex.side(before))}. The bricks were arranged into a rectangle, and its sides give ${M(fac)}.`)];
    if (res.kind === 'gcf') paras.push(P('The math.', `Every term had a common factor of ${M(rs(g.c))}, so it came out in front: ${M(Tex.side(before) + ' = ' + fac)}. This is the distributive property run backwards.`));
    else if (res.kind === 'gcfx') paras.push(P('The math.', `Every term had ${M(rs(g.c) === '1' ? X : Tex.side([A.term(g.c, v)]))} in it, so that comes out in front. What’s left goes in the brackets: ${M(fac)}. This is the distributive property run backwards.`));
    else {
      const [p, q] = res.pair;
      paras.push(P('The math.', `${!A.req(A.rabs(g.c), A.ONE) ? `First the common factor ${M(rs(g.c))} came out of every term. ` : ''}Factoring is multiplying run backwards. To split the middle ${M(termH({ c: A.R(res.B), k: v }))} into two strips, you need two numbers that multiply to ${res.A === 1 ? M('<i>c</i> = ' + res.ac) : M('<i>a</i>·<i>c</i> = ' + res.ac)} and add to ${M('<i>b</i> = ' + res.B)}: that’s ${M(`${p} and ${q}`.replace(/-/g, '−'))}. Then the rectangle’s sides can be read off.${res.kind === 'square' ? ' Both sides came out the same, so it’s a perfect square.' : ''}${res.kind === 'diffsq' ? ' This one is a difference of squares, a² − b² = (a − b)(a + b).' : ''}`));
      const exp = Tex.side(A.termsOf(A.partPoly(g)));
      paras.push(P('Check it.', `${kw('multiply', 'Multiply')} the factors back out (the box shows every product) and you land on ${M(exp)}, what you started with.`));
    }
    if (r.before.task !== 'factor') paras.push(P('Why it helps.', 'A product is far more useful than a sum here: with 0 on the other side, the Pry Bar can split it into simple pieces.'));
    return { title: 'The Rectangle: factoring', rows, arrows, paras, figure };
  };

  B.zero = r => {
    const eb = findIn(r.before, r.res.eid); const v = tv(r.before);
    const g = r.res.group; const fs = r.res.factors;
    const bs = r.res.branches.map(id => r.after.eqs.find(e => e.id === id));
    const rows = [row('Before', eqChips(eb, 'b', { hi: { [g.id]: 'move' } }))];
    const items = [];
    bs.forEach((e, i) => { if (i) items.push({ t: 'gap', w: 16 }, op('or'), { t: 'gap', w: 16 }); items.push(chip('br' + i, Tex.eq(e), { cap: `branch ${i + 1}`, tone: 'x', hi: 'move' })); });
    rows.push(row('Branches', items));
    const gs = eb.L.some(p => p.id === g.id) ? 'L' : 'R';
    const arrows = bs.map((e, i) => ({ from: cid('b', gs, g), to: 'br' + i, kind: 'move', label: i === 0 ? 'one piece must be 0' : null }));
    const poly = A.partPoly(g);
    const roots = fs.map(f => A.rnum(A.rdiv(A.rneg(A.pc(f, '1')), A.pc(f, v))));
    const figure = A.pdegIn(poly, v) === 2 ? parabolaFig(poly, v, roots, 'The product is zero exactly where the graph crosses the x-axis: where one of the pieces is zero.') : '';
    const paras = [
      P('In the game.', `You used the Pry Bar on ${M(Tex.eq(eb))}. It split the equation into ${bs.length === 1 ? 'one simpler equation' : 'two branches'}: ${bs.map(e => M(Tex.eq(e))).join(' or ')}.`),
      P('The math.', `This is the ${kw('move', 'zero-product property')}: if two numbers multiply to 0, at least one of them must be 0. There’s no other way to get 0 from a multiplication.${!A.req(A.rabs(g.c), A.ONE) ? ` The number ${M(rs(g.c))} in front can’t be 0, so it drops out.` : ''}${bs.length === 1 && g.f.length === 2 ? ' Both pieces are the same here, so there’s just one branch.' : ''}`),
      P('Why it helps.', `Each branch is a simple equation you already know how to solve with the Counterweight and the Saw. Solve ${bs.length > 1 ? 'both: a quadratic can have two answers' : 'it'}.`),
      P('Careful.', 'This only works with 0 on the other side. If a product equals 6, the pieces could be 2 and 3, or 1 and 6, or ½ and 12… there’s no way to split it.'),
    ];
    return { title: 'The Pry Bar: zero-product property', rows, arrows, paras, figure };
  };

  B.root = r => {
    const eb = findIn(r.before, r.res.eid); const v = tv(r.before);
    const s = r.res.side; const sq = eb[s][0]; const k = r.res.k;
    const bs = r.res.branches.map(id => r.after.eqs.find(e => e.id === id));
    const items = [];
    bs.forEach((e, i) => { if (i) items.push({ t: 'gap', w: 16 }, op('or'), { t: 'gap', w: 16 }); items.push(chip('br' + i, Tex.eq(e), { cap: i === 0 ? 'the + root' : 'the − root', tone: 'x' })); });
    const rows = [row('Before', eqChips(eb, 'b', { hi: { [sq.id]: 'identity' } })), row('Square root', items)];
    const arrows = bs.map((e, i) => ({ from: cid('b', s, sq), to: 'br' + i, kind: 'identity', label: i === 0 ? '√ of both sides' : null }));
    const kv = A.rnum(k); const rt = Math.sqrt(kv);
    const base = r.res.base; const h = A.rnum(A.pc(base, '1'));
    const figure = fig(plot({ fns: [{ f: x => (x + h) * (x + h), col: '#3d5a36', label: `y = ${Tex.text(() => Tex.side([sq])).replace(/\^2/g, '²').replace(/-/g, '−')}` }], x0: -h - rt - 2.5, x1: -h + rt + 2.5,
      hlines: [{ y: kv, label: `y = ${fmt(kv)}`, col: K.identity.col }], xlabel: v,
      marks: [{ x: -h + rt, y: kv, col: K.divide.col, label: `${v} = ${fmt(-h + rt)}` }, { x: -h - rt, y: kv, col: K.divide.col, label: `${v} = ${fmt(-h - rt)}`, dy: 16 }] }),
      `The square reaches ${fmt(kv)} in two places, one on each side: that’s the ±.`);
    const paras = [
      P('In the game.', `You used the Square-Root Cutter on ${M(Tex.eq(eb))}.`),
      P('The math.', `Taking the ${kw('identity', 'square root of both sides')} undoes the square. But careful: a positive number and its negative have the same square, so there are two branches: ${bs.map(e => M(Tex.eq(e))).join(' or ')}. That’s where the ± (plus or minus) comes from.`),
    ];
    if (!r.res.sq) paras.push(P('The root.', `${M(rs(k))} isn’t a perfect square, so the answer stays exact as a root. It’s simplified by pulling out the biggest perfect-square factor: ${M(`√${k.n * k.d} = √(${r.res.m * r.res.m} · ${r.res.n}) = ${r.res.m === 1 ? '' : r.res.m}√${r.res.n}`)}${k.d > 1 ? `, over ${k.d}` : ''}.`));
    paras.push(P('Why it helps.', `With the square gone, each branch is ${A.pzero(A.padd(base, A.pn({ [v]: -1 }))) ? 'already solved' : 'a simple equation: one Counterweight finishes it'}.`));
    return { title: 'The Square-Root Cutter', rows, arrows, paras, figure };
  };

  B.complete = r => {
    const eb = findIn(r.before, r.res.eid), ea = findIn(r.after, r.res.eid); const v = tv(r.before);
    const { b, h, h2 } = r.res; const s = r.res.side, o = A.other(s);
    const sqp = ea[s][0]; const added = ea[o][ea[o].length - 1];
    const rows = [
      row('Before', eqChips(eb, 'b')),
      row('The corner', [chip('cL', '+ ' + Tex.num(h2), { cap: s === 'L' ? 'fills the corner' : 'added here too', tone: 'one', hi: 'add', sm: true }), { t: 'gap', w: 60 }, op('='), { t: 'gap', w: 60 }, chip('cR', '+ ' + Tex.num(h2), { cap: s === 'R' ? 'fills the corner' : 'added here too', tone: 'one', hi: 'add', sm: true })]),
      row('After', eqChips(ea, 'a', { hi: { [sqp.id]: 'identity' } })),
    ];
    const arrows = [{ from: s === 'L' ? 'cL' : 'cR', to: cid('a', s, sqp), kind: 'identity', label: 'a perfect square' }, { from: s === 'L' ? 'cR' : 'cL', to: cid('a', o, added), kind: 'add', label: 'balance it' }];
    for (const p of eb[s]) arrows.push({ from: cid('b', s, p), to: cid('a', s, sqp), kind: 'identity' });
    // the square picture
    const ha = Math.abs(A.rnum(h)); const Xs = 110, hs = Math.max(26, Math.min(60, ha * 16));
    const col = A.rnum(h) < 0 ? Art.COL.neg : Art.COL.x;
    const svg = `<svg viewBox="0 0 ${Xs + hs + 60} ${Xs + hs + 40}" class="plot" aria-hidden="true">
      <rect x="30" y="20" width="${Xs}" height="${Xs}" fill="${Art.COL.x2[0]}" stroke="${Art.COL.x2[1]}"/><text x="${30 + Xs / 2}" y="${20 + Xs / 2 + 7}" text-anchor="middle" font-size="22" fill="#fff" font-style="italic">x²</text>
      <rect x="${30 + Xs}" y="20" width="${hs}" height="${Xs}" fill="${col[0]}" stroke="${col[1]}"/><rect x="30" y="${20 + Xs}" width="${Xs}" height="${hs}" fill="${col[0]}" stroke="${col[1]}"/>
      <rect x="${30 + Xs}" y="${20 + Xs}" width="${hs}" height="${hs}" fill="${Art.COL['1'][0]}" stroke="${K.add.col}" stroke-width="3" stroke-dasharray="5 3"/>
      <text x="${30 + Xs + hs / 2}" y="${20 + Xs + hs / 2 + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="#3a2a10">${Tex.text(() => Tex.num(h2))}</text>
      <text x="${30 + Xs / 2}" y="14" text-anchor="middle" font-size="15" font-style="italic" fill="#5b4630">x</text><text x="${30 + Xs + hs / 2}" y="14" text-anchor="middle" font-size="15" fill="#5b4630">${Tex.text(() => Tex.num(h))}</text>
      <text x="22" y="${20 + Xs / 2}" text-anchor="end" font-size="15" font-style="italic" fill="#5b4630">x</text><text x="22" y="${20 + Xs + hs / 2 + 5}" text-anchor="end" font-size="15" fill="#5b4630">${Tex.text(() => Tex.num(h))}</text>
    </svg>`;
    const figure = fig(svg, `The ${M(termH({ c: b, k: v }))} splits into two strips of ${M(termH({ c: h, k: v }))} along the x² plate. The dashed corner, ${M(Tex.num(h) + ' × ' + Tex.num(h) + ' = ' + Tex.num(h2))}, is what’s missing from a perfect square.`);
    const hh = Tex.num(h);
    const paras = [
      P('In the game.', `You used the Corner Piece. It added ${M(Tex.num(h2))} to both plates, and ${M(Tex.side(eb[s]))} became ${M(pM(sqp))}${ea[o].length > 1 ? ' on one side' : ''}.`),
      P('The math.', `Picture ${M(X + '<sup>2</sup>')} as a square plate and the ${M(termH({ c: b, k: v }))} split into two equal strips of ${M(termH({ c: h, k: v }))}, laid along two sides of it. That’s almost a bigger square, ${M('(' + Tex.poly(A.pn({ [v]: 1, '1': h })) + ')')} on each side, but one corner is missing: a ${hh} by ${hh} square of ${M(Tex.num(h2))}. Half of ${M(rs(b))} is ${M(rs(h))}, and ${M(rs(h) + '<sup>2</sup> = ' + Tex.num(h2))}. Adding it ${kw('identity', 'completes the square')}, and the balance rule says ${kw('add', 'add it to the other plate too')}.`),
      P('Why it helps.', 'Now one side is a perfect square standing alone, so the Square-Root Cutter can finish the job. This works even when the quadratic doesn’t factor into whole numbers.'),
    ];
    if (!A.snapped(ea[o])) paras.push(P('Next.', `Snap the numbers on the ${sideName(o)} plate, then use the Square-Root Cutter.`));
    return { title: 'The Corner Piece: completing the square', rows, arrows, paras, figure };
  };

  B.formula = r => {
    const eb = findIn(r.before, r.res.eid); const v = tv(r.before);
    const { a, b, c, D } = r.res;
    const bs = r.res.branches.map(id => r.after.eqs.find(e => e.id === id));
    const items = []; bs.forEach((e, i) => { if (i) items.push({ t: 'gap', w: 14 }, op('or'), { t: 'gap', w: 14 }); items.push(chip('br' + i, Tex.eq(e), { cap: i ? 'the − branch' : 'the + branch', tone: 'x' })); });
    const rows = [
      row('Before', eqChips(eb, 'b')),
      row('Read off', [chip('ca', '<i>a</i> = ' + rs(a), { cap: 'with x²', tone: 'x2', sm: true }), chip('cb', '<i>b</i> = ' + rs(b), { cap: 'with x', tone: 'x', sm: true }), chip('cc', '<i>c</i> = ' + rs(c), { cap: 'the number', tone: 'one', sm: true }), { t: 'gap', w: 30 },
        chip('cD', `<i>b</i><sup>2</sup> − 4<i>ac</i> = ${rs(D)}`, { cap: 'the discriminant', hi: 'multiply', sm: true })]),
      row('Answers', items),
    ];
    const arrows = [{ from: 'ca', to: 'cD', kind: 'multiply', side: 't' }, { from: 'cc', to: 'cD', kind: 'multiply', label: '− 4ac', side: 't' }, ...bs.map((e, i) => ({ from: 'cD', to: 'br' + i, kind: 'identity', label: i === 0 ? '± √' : null })), { from: 'cb', to: 'br0', kind: 'divide', label: '−b over 2a' }];
    const P2 = A.sidePoly(eb[A.isZeroSide(eb.R) ? 'L' : 'R']);
    const roots = bs.map(e => A.sideNum(e.R, {}));
    const figure = parabolaFig(P2, v, roots, 'The answers are where the parabola crosses the x-axis.');
    const Dn = A.rnum(D);
    const paras = [
      P('In the game.', `You used the Master Formula on ${M(Tex.eq(eb))}.`),
      P('The math.', `The quadratic formula solves any ${M('<i>a</i>' + X + '<sup>2</sup> + <i>b</i>' + X + ' + <i>c</i> = 0')}: ${M(`${X} = ${'<span class="fr"><span class="fn">−<i>b</i> ± √(<i>b</i><sup>2</sup> − 4<i>ac</i>)</span><span class="fd">2<i>a</i></span></span>'}`)}. Here ${M('<i>a</i> = ' + rs(a))}, ${M('<i>b</i> = ' + rs(b))} and ${M('<i>c</i> = ' + rs(c))}, so ${M(`<i>b</i><sup>2</sup> − 4<i>ac</i> = (${rs(b)})<sup>2</sup> − 4(${rs(a)})(${rs(c)}) = ${rs(D)}`)}.`),
      P('The discriminant.', `The part under the root, ${M('<i>b</i><sup>2</sup> − 4<i>ac</i>')}, tells you how many answers to expect: positive means two, zero means one, negative means none (no real number squares to a negative). Here it’s ${M(rs(D))}, ${Dn > 0 ? 'positive, so two answers' : 'zero, so one answer'}${r.res.sq ? ', and a perfect square, so they come out as fractions or whole numbers' : ', and not a perfect square, so the answers keep a root'}.`),
      P('Where it comes from.', 'It’s completing the square done once, in general, for every quadratic at the same time.'),
    ];
    return { title: 'The Master Formula', rows, arrows, paras, figure };
  };

  B.swap = r => {
    const eb = r.before.eqs[0], ea = r.after.eqs[0]; const val = r.res.val;
    const valH = rs(val);
    const rows = [row('f(x)', sideChips(eb.L, 'b')), row(`f(${Tex.text(() => rs(val)).replace('-', '−')})`, sideChips(ea.L, 'a'))];
    const arrows = r.res.map.map((m, i) => {
      const p = m.from; const pw = p.t === 'term' ? A.powOf(p.k) : 1;
      const lab = p.t === 'term' ? `${Tex.text(() => rs(p.c))}·(${Tex.text(() => valH)})${pw > 1 ? '²' : ''} = ${Tex.text(() => rs(m.to.c))}` : '';
      return { from: 'b' + p.id, to: 'a' + m.to.id, kind: 'sub', label: lab.replace(/-/g, '−') || (i === 0 ? 'swap' : null) };
    });
    const P0 = A.sidePoly(eb.L); const f = x => A.pevalNum(P0, { x }); const vx = A.rnum(val);
    const figure = fig(`<div class="machine"><span class="in">${M(X + ' = ' + valH)}</span><span class="box">${M('<i>f</i>')}</span><span class="out">${M('<i>f</i>(' + valH + ') = ' + fmt(f(vx)))}</span></div>` +
      plot({ fns: [{ f, col: '#3d5a36', label: 'y = f(x)' }], x0: vx - 4, x1: vx + 4, xlabel: 'x', h: 190, marks: [{ x: vx, y: f(vx), col: K.sub.col, label: `(${fmt(vx)}, ${fmt(f(vx))})` }] }),
      `A function is a machine: ${valH.replace(/<[^>]+>/g, '')} goes in, ${fmt(f(vx))} comes out. On the graph, that’s the point (${fmt(vx)}, ${fmt(f(vx))}).`);
    const negIn = val.n < 0; const hasSq = eb.L.some(p => p.k === 'x2');
    const paras = [
      P('In the game.', `You played Swap Bricks. Every ${X}-brick was ${kw('sub', 'replaced by the input')}, ${M(valH)}.`),
      P('The math.', `Evaluating a function means substituting: put the number in everywhere you see ${X}. So ${M('<i>f</i>(' + valH + ') = ' + subH(eb.L, 'x', valH))}.${negIn && hasSq ? ` Careful with negatives and squares: ${M(`(${valH})<sup>2</sup> = (${valH})·(${valH}) = ${rs(A.rmul(val, val))}`)}, which is positive.` : ''}${negIn ? ' Put the negative number in brackets so the signs come out right.' : ''}`),
      P('Why it helps.', `Now the plate holds only numbers, so Snap adds them into one answer: the output of the machine, ${M('<i>f</i>(' + valH + ')')}.`),
    ];
    return { title: 'Swap Bricks: evaluating a function', rows, arrows, paras, figure };
  };

  B.stairs = r => {
    const g = r.after.grid; const s = r.res.stairs; const riseH = String(s.rise).replace('-', '−');
    let rows, arrows, paras;
    if (r.after.task === 'slope') {
      const [Pa, Pb] = [s.from, s.to];
      rows = [row('Points', [chip('pa', `(${Pa.x}, ${Pa.y})`.replace(/-/g, '−'), { cap: 'left point', tone: 'one' }), { t: 'gap', w: 120 }, chip('pb', `(${Pb.x}, ${Pb.y})`.replace(/-/g, '−'), { cap: 'right point', tone: 'one' })]),
        row('Staircase', [chip('run', `run = ${Pb.x} − ${Pa.x < 0 ? '(' + Pa.x + ')' : Pa.x} = ${s.run}`.replace(/-(\d)/g, '−$1'), { cap: 'across', tone: 'x' }), { t: 'gap', w: 30 }, chip('rise', `rise = ${Pb.y} − ${Pa.y < 0 ? '(' + Pa.y + ')' : Pa.y} = ${riseH}`.replace(/-(\d)/g, '−$1'), { cap: s.rise < 0 ? 'down' : 'up', tone: s.rise < 0 ? 'neg' : 'x2' })])];
      arrows = [{ from: 'pa', to: 'run', kind: 'add', label: 'subtract the x’s' }, { from: 'pb', to: 'run', kind: 'add' }, { from: 'pa', to: 'rise', kind: 'add' }, { from: 'pb', to: 'rise', kind: 'add', label: 'subtract the y’s' }];
      paras = [
        P('In the game.', `You played the Staircase between ${M(`(${Pa.x}, ${Pa.y})`)} and ${M(`(${Pb.x}, ${Pb.y})`)}.`.replace(/-(\d)/g, '−$1')),
        P('The math.', `Walking from the left point to the right one, you go ${s.run} stud${s.run === 1 ? '' : 's'} across (the ${kw('add', 'run')}) and ${Math.abs(s.rise)} stud${Math.abs(s.rise) === 1 ? '' : 's'} ${s.rise < 0 ? 'down' : 'up'} (the ${kw('add', 'rise')}). As a rule: run = ${M('<i>x</i><sub>2</sub> − <i>x</i><sub>1</sub>')}, rise = ${M('<i>y</i><sub>2</sub> − <i>y</i><sub>1</sub>')}.${s.rise < 0 ? ' A negative rise means the stairs go down.' : ''}`),
        P('Why it helps.', 'A straight line climbs at the same rate everywhere, so every staircase along it has the same rise-to-run ratio. That ratio is the slope, the next thing to find.'),
      ];
    } else {
      const m = g.goal.m;
      rows = [row('From', [chip('fr', `(${s.from.x}, ${s.from.y})`.replace(/-/g, '−'), { cap: 'a point on the line', tone: 'b' })]),
        row('One step', [chip('run', `across ${s.run}`, { cap: 'the run', tone: 'x', sm: true }), { t: 'gap', w: 40 }, chip('rise', `${s.rise < 0 ? 'down' : 'up'} ${Math.abs(s.rise)}`, { cap: 'the rise', tone: s.rise < 0 ? 'neg' : 'x2', sm: true })]),
        row('To', [chip('to', `(${s.to.x}, ${s.to.y})`.replace(/-/g, '−'), { cap: 'another point', tone: 'one' })])];
      arrows = [{ from: 'fr', to: 'run', kind: 'add' }, { from: 'fr', to: 'rise', kind: 'add' }, { from: 'run', to: 'to', kind: 'add', label: 'x + run' }, { from: 'rise', to: 'to', kind: 'add', label: 'y + rise' }];
      paras = [
        P('In the game.', `You built a step of the Staircase from ${M(`(${s.from.x}, ${s.from.y})`.replace(/-(\d)/g, '−$1'))} to ${M(`(${s.to.x}, ${s.to.y})`.replace(/-(\d)/g, '−$1'))}.`),
        P('The math.', `The slope is ${M('<i>m</i> = ' + rs(m))}, which means ${M(rs(m))} = rise ÷ run = ${M(riseH + ' ÷ ' + s.run)}. So every step goes ${s.run} across and ${Math.abs(s.rise)} ${s.rise < 0 ? 'down' : 'up'}. ${m.d > 1 ? 'Using the denominator as the run keeps every step on whole studs.' : ''}`),
        P('Why it helps.', 'Two points are enough to fix a straight line: lay a beam through the start brick and the top of this step.'),
      ];
    }
    return { title: 'The Staircase: rise and run', rows, arrows, paras, figure: fig(gridFig(g, { id: 'st' }), r.after.task === 'slope' ? 'Green: the run (across). Blue: the rise (up). Red if it goes down.' : 'Each step: the same run, the same rise.') };
  };

  B.sawstairs = r => {
    const { rise, run, m } = r.res; const riseH = String(rise).replace('-', '−');
    const rows = [row('Staircase', [chip('rise', 'rise = ' + riseH, { cap: 'up (or down)', tone: rise < 0 ? 'neg' : 'x2' }), { t: 'gap', w: 60 }, chip('run', 'run = ' + run, { cap: 'across', tone: 'x' })]),
      row('Slope', [chip('m', `<i>m</i> = <span class="fr"><span class="fn">${riseH}</span><span class="fd">${run}</span></span>${m.d !== run || m.n !== rise ? ' = ' + rs(m) : ''}`, { cap: 'rise ÷ run', hi: 'divide' })])];
    const arrows = [{ from: 'rise', to: 'm', kind: 'divide', label: 'rise ÷ run' }, { from: 'run', to: 'm', kind: 'divide' }];
    const paras = [
      P('In the game.', `You used the Saw on the staircase: it ${kw('divide', 'divided')} the rise by the run.`),
      P('The math.', `The slope is ${M('<i>m</i> = rise ÷ run = ' + riseH + ' ÷ ' + run + ' = ' + rs(m))}. It says how many studs the line goes up for every one stud across.${m.d > 1 ? ` A fraction is fine: ${M(rs(m))} means ${Math.abs(m.n)} ${m.n < 0 ? 'down' : 'up'} for every ${m.d} across.` : ''} ${m.n < 0 ? 'A negative slope means the line falls as you go right.' : 'A positive slope means the line climbs as you go right.'}`),
      P('Why it helps.', `The slope is the ${M('<i>m</i>')} in ${M('<i>y</i> = <i>mx</i> + <i>b</i>')}. One unknown is left: ${M('<i>b</i>')}, where the line crosses the y-axis.`),
    ];
    return { title: 'Slope: sawing the rise by the run', rows, arrows, paras, figure: fig(gridFig(r.after.grid, { id: 'ss' }), `Any two points on this line give the same ratio, ${rs(m).replace(/<[^>]+>/g, '')}.`) };
  };

  B.plug = r => {
    const { pt, m, mx } = r.res; const e = r.after.eqs[0];
    const rows = [row('Template', [chip('tpl', '<i>y</i> = <i>m</i><i>x</i> + <i>b</i>', { cap: 'every point on the line obeys this' })]),
      row('Plug in', [chip('py', '<i>y</i> = ' + String(pt.y).replace('-', '−'), { cap: 'the point’s y', tone: 'one', sm: true }), chip('pm', '<i>m</i> = ' + rs(m), { cap: 'the slope', tone: 'x2', sm: true }), chip('px', '<i>x</i> = ' + String(pt.x).replace('-', '−'), { cap: 'the point’s x', tone: 'x', sm: true })]),
      row('Equation', eqChips(e, 'e'))];
    const arrows = [{ from: 'tpl', to: 'py', kind: 'sub' }, { from: 'tpl', to: 'pm', kind: 'sub', label: 'substitute' }, { from: 'tpl', to: 'px', kind: 'sub' }, { from: 'pm', to: e.R[0] ? 'eR' + e.R[0].id : 'eRzero', kind: 'multiply', label: 'm · x' }, { from: 'px', to: e.R[0] ? 'eR' + e.R[0].id : 'eRzero', kind: 'multiply' }];
    const paras = [
      P('In the game.', `You used Plug-in on the point ${M(`(${pt.x}, ${pt.y})`.replace(/-(\d)/g, '−$1'))}.`),
      P('The math.', `Every point on a line makes ${M('<i>y</i> = <i>mx</i> + <i>b</i>')} true. ${kw('sub', 'Substitute')} ${M('<i>y</i> = ' + pt.y)}, ${M('<i>x</i> = ' + pt.x)} and the slope ${M('<i>m</i> = ' + rs(m))}: ${M(`${pt.y} = ${rs(m)} · ${pt.x < 0 ? '(' + pt.x + ')' : pt.x} + <i>b</i>`.replace(/-(\d)/g, '−$1'))}, which is ${M(Tex.eq(e))}.`),
      P('Why it helps.', `Now ${M('<i>b</i>')} is the only unknown, so solve for it like any equation: Counterweight, Snap, done.`),
    ];
    void mx;
    return { title: 'Plug-in: a point in y = mx + b', rows, arrows, paras, figure: fig(gridFig(r.after.grid, { id: 'pl' }), 'The point you plugged in lies on the line, so it must satisfy the equation.') };
  };

  B.start = r => {
    const g = r.after.grid; const b = g.goal.b, m = g.goal.m;
    const rows = [row('Blueprint', [chip('bp', '<i>y</i> = ' + Tex.lineH(m, b), { cap: 'y = mx + b' })]), row('On the y-axis', [chip('x0', '<i>x</i> = 0', { cap: 'the y-axis', tone: 'x', sm: true })]), row('Start', [chip('st', `<i>y</i> = ${rs(m)}·0 ${b.n < 0 ? '−' : '+'} ${Tex.num(A.rabs(b))} = ${rs(b)}`, { cap: 'the y-intercept b', tone: 'b', hi: 'sub' })])];
    const arrows = [{ from: 'bp', to: 'x0', kind: 'sub', label: 'put x = 0' }, { from: 'x0', to: 'st', kind: 'sub' }];
    const paras = [
      P('In the game.', `You placed the Start Brick at ${M('(0, ' + rs(b) + ')')}.`),
      P('The math.', `The ${kw('sub', 'y-intercept')} is where the line crosses the y-axis. Everywhere on the y-axis, ${M('<i>x</i> = 0')}, so ${M('<i>y</i> = <i>m</i>·0 + <i>b</i> = <i>b</i>')}. That’s why ${M('<i>b</i>')} in ${M('<i>y</i> = <i>mx</i> + <i>b</i>')} is the starting height: here ${M(rs(b))}.`),
      P('Why it helps.', 'It gives the line a first point. The staircase (the slope) gives the next.'),
    ];
    return { title: 'The Start Brick: the y-intercept', rows, arrows, paras, figure: fig(gridFig(g, { id: 'sb' }), 'The start brick sits on the y-axis at height b.') };
  };

  B.stamp = r => {
    const st = r.after, o = r.orig; const v = tv(st); const ans = Tex.answer(st);
    const rows = [row('Answer', [chip('ans', ans, { cap: 'stamped', hi: 'identity' })])];
    const arrows = []; let figure = ''; const paras = [P('In the game.', `You stamped the build: ${M(ans)}.`)];
    if (st.task === 'solve' && v === 'x') {
      const e0 = o.eqs[0];
      const sols = st.eqs.map(e => { const s = A.solvedSide(e, v); return { e, s, val: A.sideNum(e[A.other(s)], {}), rel: s === 'L' ? e.rel : A.FLIP[e.rel], exact: e[A.other(s)] }; });
      if (e0.rel === '=') {
        const chk = []; sols.forEach((s, i) => {
          const exactNum = s.exact.length <= 1 && s.exact.every(p => p.t === 'term');
          const valH = exactNum ? Tex.side(s.exact) : fmt(s.val);
          const lhs = A.sideNum(e0.L, { x: s.val }), rhs = A.sideNum(e0.R, { x: s.val });
          chk.push(chip('ck' + i, `${subH(e0.L, 'x', valH)} = ${fmt(lhs)}`, { cap: `left, with x = ${valH.replace(/<[^>]+>/g, '')}`, sm: true }), op('='), chip('cr' + i, `${subH(e0.R, 'x', valH)}${e0.R.length > 1 || (e0.R[0] && e0.R[0].t !== 'term') || (e0.R[0] && e0.R[0].k !== '1') ? ' = ' + fmt(rhs) : ''}`, { cap: 'right', sm: true }));
          arrows.push({ from: 'ans', to: 'ck' + i, kind: 'sub', label: i === 0 ? 'put it back in' : null });
        });
        rows.push(row('Check', chk.slice(0, 6)));
        if (sols.length === 2) rows[1].items.splice(3, 0, { t: 'gap', w: 14 });
        const exact = sols.every(s => s.exact.every(p => p.t === 'term'));
        paras.push(P('Check it.', `Put your answer back into the original, ${M(Tex.eq(e0))}. ${sols.length > 1 ? 'Both answers make' : 'It makes'} the two sides equal${exact ? '' : ' (with roots, a calculator does the arithmetic: the decimals match)'}. That’s what “solution” means: a value that balances the plates.`));
        const P2 = A.padd(A.sidePoly(e0.L), A.pscale(A.sidePoly(e0.R), A.R(-1)));
        if (A.pdegIn(P2, 'x') === 2) figure = parabolaFig(A.pc(P2, 'x2').n < 0 ? A.pscale(P2, A.R(-1)) : P2, 'x', sols.map(s => s.val), 'Moving everything to one side and graphing it: each answer is a place where the graph crosses zero.');
        else { const s0 = sols[0]; figure = fig(`<div class="balcheck"><div class="pan">${M(subH(e0.L, 'x', fmt(s0.val)))}<small>= ${fmt(A.sideNum(e0.L, { x: s0.val }))}</small></div><div class="ful">=</div><div class="pan">${M(subH(e0.R, 'x', fmt(s0.val)))}<small>= ${fmt(A.sideNum(e0.R, { x: s0.val }))}</small></div></div>`, 'Both plates weigh the same: the balance is level.'); }
      } else {
        const s = sols[0]; const k = A.solvedValue(s.e, v) || A.ZERO; const kx = A.rnum(k);
        const inside = s.rel[0] === '<' ? Math.floor(kx) - 1 : Math.ceil(kx) + 1, outside = s.rel[0] === '<' ? Math.ceil(kx) + 1 : Math.floor(kx) - 1;
        const t = xv => `${M(subH(e0.L, 'x', String(xv).replace('-', '−')) + ' = ' + fmt(A.sideNum(e0.L, { x: xv })))} and ${M(subH(e0.R, 'x', String(xv).replace('-', '−')) + ' = ' + fmt(A.sideNum(e0.R, { x: xv })))}`;
        paras.push(P('Check it.', `Try a number inside the answer, like ${M('<i>x</i> = ' + String(inside).replace('-', '−'))}: the sides are ${t(inside)}, and ${M(fmt(A.sideNum(e0.L, { x: inside })) + ' ' + relS(e0.rel) + ' ' + fmt(A.sideNum(e0.R, { x: inside })))} is true. Try one outside, like ${M('<i>x</i> = ' + String(outside).replace('-', '−'))}: the original is false there.`));
        paras.push(P('The answer is a range.', `An inequality’s answer isn’t one number but a whole stretch of the number line: every ${X} ${relS(s.rel)} ${M(rs(k))}.`));
        figure = numberLineFig(k, s.rel);
      }
    } else if (st.task === 'solve') {
      const e = st.eqs[0]; const s = A.solvedSide(e, 'y'); const P0 = A.sidePoly(e[A.other(s)]);
      const m = A.pc(P0, 'x'), b = A.pc(P0, '1');
      paras.push(P('The math.', `Solved for ${M('<i>y</i>')}, the equation is in slope-intercept form, ${M('<i>y</i> = <i>mx</i> + <i>b</i>')}: the slope is ${M('<i>m</i> = ' + rs(m))} and it crosses the y-axis at ${M('<i>b</i> = ' + rs(b))}.`));
      paras.push(P('Why it helps.', 'In this form you can graph the line at a glance: start at b on the y-axis, then climb the staircase m.'));
      figure = fig(gridFig({ size: 8, pts: [], stairs: [], line: { m, b } }, { id: 'sf', start: { y: A.rnum(b) }, stairs: [] }), 'The same line, now easy to read: start at b, slope m.');
    } else if (st.task === 'expand' || st.task === 'factor') {
      const e0 = o.eqs[0];
      paras.push(P('Check it.', `${st.task === 'expand' ? 'Factor it back' : 'Multiply it back out'} and you return to ${M(Tex.side(e0.L))}. Expanding and factoring are the same equation read in opposite directions: ${M(Tex.side(st.task === 'expand' ? e0.L : st.eqs[0].L) + ' = ' + Tex.side(st.task === 'expand' ? st.eqs[0].L : e0.L))}.`));
      if (st.task === 'factor') paras.push(P('Fully factored?', 'Yes: none of the pieces can be broken down further with whole numbers, and any common factor has been pulled out front.'));
    } else if (st.task === 'eval') {
      const P0 = A.sidePoly(o.eqs[0].L); const vx = A.rnum(st.input);
      paras.push(P('The math.', `${M('<i>f</i>(' + rs(st.input) + ') = ' + Tex.side(st.eqs[0].L))} means: when the input is ${M(rs(st.input))}, the output is ${M(Tex.side(st.eqs[0].L))}. On the graph of ${M('<i>f</i>')}, that’s the point ${M('(' + rs(st.input) + ', ' + Tex.side(st.eqs[0].L) + ')')}.`));
      figure = fig(plot({ fns: [{ f: x => A.pevalNum(P0, { x }), col: '#3d5a36', label: 'y = f(x)' }], x0: vx - 4, x1: vx + 4, xlabel: 'x', marks: [{ x: vx, y: A.pevalNum(P0, { x: vx }), col: K.sub.col, label: `(${fmt(vx)}, ${fmt(A.pevalNum(P0, { x: vx }))})` }] }), 'The input and output together make a point on the graph.');
    } else {
      const g = st.grid; const l = g.line;
      paras.push(P('The math.', `The line is ${M(ans)}: slope ${M(rs(l.m))}, crossing the y-axis at ${M(rs(l.b))}.`));
      if (st.task === 'slope') paras.push(P('Check it.', `Both points should satisfy it: ${g.pts.map(p => M(`${p.y} = ${rs(l.m)}·${p.x < 0 ? '(' + p.x + ')' : p.x} + ${rs(l.b)}`.replace(/-(\d)/g, '−$1').replace('+ −', '− '))).join(' and ')}. Both are true.`));
      else paras.push(P('Check it.', 'Every stud the beam passes through makes the equation true, including the start brick and the top of each step.'));
      figure = fig(gridFig(g, { id: 'fin' }), 'The finished beam.');
    }
    return { title: 'Stamped', rows, arrows, paras, figure };
  };

  // ---------- the modal ----------
  let cur = 0, onClose = null;
  function build(i) {
    const hist = TR.history; const r = hist[i];
    let ex;
    try { ex = B[r.act](r); } catch (e) { console.error(e); ex = { title: 'This step', rows: [], arrows: [], paras: ['This step changed the bench as shown in the ledger above.'] }; }
    const spec = { rows: ex.rows, arrows: ex.arrows, dashNote: ex.dashNote };
    const nav = `<div class="ex-nav"><button class="btn alt" data-a="mc" data-k="prev" ${i === 0 ? 'disabled' : ''}>◀ Earlier</button><button class="btn alt" data-a="mc" data-k="next" ${i === hist.length - 1 ? 'disabled' : ''}>Later ▶</button></div>`;
    const html = `<div class="ex-head"><div><div class="ex-step">Step ${i + 1} of ${hist.length}</div><h2>${ex.title}</h2></div>${nav}<button class="x" style="position:static" data-a="mc" data-k="close" aria-label="Close">×</button></div>
      <div class="ex-ba"><span class="lab">Before</span><div class="ex-eq">${M(stateLine(r.before))}</div><span class="lab">After</span><div class="ex-eq">${M(stateLine(r.after))}</div></div>
      <div class="ex-main ${ex.figure ? 'has-fig' : ''}">${ex.rows.length ? `<div class="ex-dgwrap">${diagramHTML(spec)}${legendHTML(spec)}</div>` : ''}${ex.figure || ''}</div>
      <div class="ex-paras ${ex.paras.length < 3 ? 'one' : ''}">${ex.paras.map(p => `<p>${p}</p>`).join('')}</div>`;
    const already = $('#modal').classList.contains('on') && $('#modal .sheet.wide');
    modal(html, {
      prev: () => { if (cur > 0) open(cur - 1, onClose); },
      next: () => { if (cur < TR.history.length - 1) open(cur + 1, onClose); },
      close: () => { closeModal(); const f = onClose; onClose = null; f && f(); },
    }, { cls: 'wide' + (already ? ' still' : '') });
    const draw = () => drawArrows(spec);
    draw();
    // let the text fit: three columns if needed, then slightly tighter type
    const sheet = $('#modal .sheet'), ps = $('#modal .ex-paras');
    if (sheet && ps) {
      const over = () => sheet.scrollHeight > sheet.clientHeight + 1;
      if (over() && !ps.classList.contains('one')) ps.classList.add('three');
      if (over()) ps.classList.add('tight');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if ($('#dg')) draw(); });
  }
  function open(i, after) {
    if (!TR || !TR.history.length) return false;
    cur = clamp(i, 0, TR.history.length - 1); onClose = after || null;
    build(cur); Sound.flip();
    return true;
  }
  return { record, open, K };
})();
