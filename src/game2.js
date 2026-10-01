/* ================================================================
   ALGEBRICK — game, part 2: the trial at the bench
   ================================================================ */
let G = null;   // run / session state
let TR = null;  // current trial
let seenCards = new Set();
let uidN = 1;
const mkInst = id => ({ uid: 'k' + (uidN++), id, refined: 0, extra: 0, cheap: 0 });
const costOf = inst => Math.max(0, CARDS[inst.id].cost - (inst.cheap || 0));
const dosesOf = inst => CARDS[inst.id].doses + (inst.extra || 0);
const yieldOf = inst => CARDS[inst.id].yld + (inst.refined || 0);
const TOOL_ACTS = new Set(['snap', 'counter', 'saw', 'unbox', 'stamp', 'sawstairs']);

// ---------- technique card HTML ----------
function techCard(inst, o = {}) {
  const d = CARDS[inst.id];
  const cost = costOf(inst);
  const doses = o.doses !== undefined ? o.doses : dosesOf(inst);
  const max = dosesOf(inst);
  const marks = [];
  if (inst.refined) marks.push(`<span title="Reinforced">+${inst.refined} brick</span>`);
  if (inst.extra) marks.push(`<span title="Spare">+${inst.extra} use</span>`);
  if (inst.cheap) marks.push(`<span title="Oiled">−${inst.cheap} pin</span>`);
  const tone = d.target ? Art.TONES.card : Art.TONES.util;
  return `<div class="card hcard ${o.cls || ''}" ${o.attrs || ''} style="--tone-ink:${tone[0]};--tone-tint:${tone[1]};${o.style || ''}">
    <div class="c-name">${d.name}</div>
    <div class="c-art">${Art[d.art]}</div>
    <div class="c-rule"><div>${d.rule}</div></div>
    <div class="c-tech">${d.tech}</div>
    ${cost ? `<div class="cost" title="${cost} pin${cost > 1 ? 's' : ''}">${'<i></i>'.repeat(cost)}</div>` : '<div class="cost free">free</div>'}
    ${yieldOf(inst) ? `<div class="yld" title="Adds this many bricks to your tower">+${yieldOf(inst)} brick${yieldOf(inst) > 1 ? 's' : ''}</div>` : ''}
    <div class="doses" title="${doses} of ${max} uses left">${Array.from({ length: max }, (_, i) => `<i class="${i < doses ? '' : 'used'}"></i>`).join('')}</div>
    ${marks.length ? `<div class="marks">${marks.join('')}</div>` : ''}
  </div>`;
}

// ---------- starting a trial ----------
const stateFromSpec = sp => ({ eqs: Alg.clone(sp.eqs), task: sp.task, target: sp.target, method: sp.method, input: sp.input, var: sp.var, grid: Alg.clone(sp.grid), done: false });
function startTrial(spec, ctx) {
  // ctx: { heat, boss:{name, eyewear, twist, phaseIdx, phases}, practice, tutorial, onWin, deck }
  const deck = ctx.deck || G.run.deck;
  const pile = shuffle(deck.map(inst => ({ inst, doses: dosesOf(inst) })));
  const hand = []; const lent = [];
  for (const id of [...new Set(spec.needs)]) {
    const i = pile.findIndex(h => h.inst.id === id);
    if (i >= 0) hand.push(pile.splice(i, 1)[0]);
    else { const inst = mkInst(id); inst.temp = true; hand.push({ inst, doses: dosesOf(inst) }); lent.push(CARDS[id].name); }
  }
  while (hand.length < 3 && pile.length) hand.push(pile.shift());
  TR = {
    spec, st: stateFromSpec(spec), orig: stateFromSpec(spec), hand, bin: pile, discard: [], pins: 2, me: 0, him: 0, turn: 1,
    phase: 'draw', sel: null, freeNext: false, heat: ctx.heat ?? 1, ctx, hint: null, lent, history: [],
  };
  seenCards = new Set();
  buildTrialScene();
  renderTrial();
  Sound.flip();
  let open = ctx.tutorial ? null : `${pick(['Here.', 'Next.', 'Another.', 'This one.'])} ${spec.prompt}: ${M(Tex.specimen(spec))}.`;
  if (ctx.boss && ctx.boss.phaseIdx === 1) open = null;
  if (lent.length) open = (open ? open + ' ' : '') + `You seem to be missing ${lent.join(' and ')}. <em>Borrow mine, this once.</em>`;
  if (open) say(open + ` <em>${pick(LINES.draw)}</em>`);
  if (ctx.tutorial) tutorialStep();
}

function buildTrialScene() {
  const c = TR.ctx;
  $('#scene').innerHTML = `
    <div class="lamps" id="t-lamps"></div>
    <div class="slip" id="t-slip"></div>
    <div class="master" id="t-master">${Art.master(c.boss ? c.boss.eyewear : 'spectacles')}</div>
    <div class="turninfo" id="t-turn"></div>
    <div class="rack" id="t-rack"></div>
    <div class="bench" id="t-bench"></div>
    <div class="ledger" id="t-ledger"></div>
    <div class="status" id="t-status"></div>
    <div class="towers" id="t-towers"></div>
    <button class="bell" id="t-bell" data-a="bell" data-tip="<b>The bell</b><br>End your turn. The Master Builder adds bricks to his tower.">${Art.bell()}Ring the bell</button>
    <div class="pintray" id="t-pins"></div>
    <div class="hand" id="t-hand"></div>
    <div class="piles" id="t-piles"></div>`;
}

// ---------- the tower race ----------
function towersHTML() {
  const t = TR; const cap = 13;
  const col = (n, x, cls) => {
    let s = ''; const shown = Math.min(n, cap);
    for (let i = 0; i < shown; i++) {
      const y = 196 - (i + 1) * 14, dx = (i % 2) * 3;
      s += `<g class="tb ${cls}"><rect x="${x + dx}" y="${y}" width="52" height="13" rx="2"/><circle cx="${x + dx + 13}" cy="${y + 4}" r="3"/><circle cx="${x + dx + 26}" cy="${y + 4}" r="3"/><circle cx="${x + dx + 39}" cy="${y + 4}" r="3"/></g>`;
    }
    if (n > cap) s += `<text x="${x + 27}" y="${196 - cap * 14 - 6}" text-anchor="middle" class="tn">${n}</text>`;
    return s;
  };
  const lead = t.me - t.him;
  const wob = lead <= -3 ? ' wobble' : '';
  return `<svg viewBox="0 0 208 212" aria-label="Tower race"><path d="M6 197h196" stroke="#6b4a24" stroke-width="4" stroke-linecap="round"/>
      <g class="mine${wob}">${col(t.me, 30, 'me')}</g><g>${col(t.him, 124, 'him')}</g>
      <text x="56" y="210" text-anchor="middle" class="tl">yours</text><text x="150" y="210" text-anchor="middle" class="tl">his</text></svg>
    <div class="tw-read"><span class="me">Your tower ${t.me}</span>&emsp;<span class="him">His tower ${t.him}</span><br>` +
    (lead >= 0 ? `<span class="dz">You lead by ${lead}</span>` : `<span class="dz">${-lead >= 4 ? 'Your build is wobbling' : 'Behind by ' + (-lead)}</span> <small>(topples at 5)</small>`) + '</div>';
}

// ---------- rendering ----------
function renderTrial() {
  if (!TR) return;
  const t = TR, st = t.st, c = t.ctx;
  $('#t-lamps').innerHTML = c.practice ? '' : Array.from({ length: G.run.maxLamps }, (_, i) => Art.lamp(i < G.run.lamps)).join('');
  $('#t-slip').innerHTML = `<div class="who">${t.spec.label}</div><div class="pr">${t.spec.prompt}</div>${M(Tex.specimen(t.spec))}`;
  const title = c.practice ? 'Practice bench' : (c.boss ? c.boss.name : (c.tutorial ? 'First lesson' : REGIONS[G.run.region].name));
  const phase = c.boss ? `<br>Build ${c.boss.phaseIdx + 1} of ${c.boss.phases.length}` : '';
  $('#t-turn').innerHTML = `<strong>${title}</strong>${phase}<br>Turn ${t.turn}<br>${t.heat ? `His tower: +${t.heat} a turn` : 'His tower rests today'}${c.practice ? '' : `<br><span style="color:var(--brass-hi)">${G.run.gold} gold</span>`}`;
  const sel = t.sel;
  $('#t-rack').innerHTML = TOOLS.map(tl => `<button class="tool ${sel && sel.type === 'tool' && sel.id === tl.id ? 'sel' : ''} ${t.hint && t.hint.tool === tl.id ? 'hint-pulse' : ''}" data-a="tool" data-t="${tl.id}" data-tip="<b>${tl.name}</b><br>${tl.tip}${tl.yld ? '<br><em>Adds 1 brick to your tower.</em>' : ''}">${Art[tl.art]}<span>${tl.name}</span></button>`).join('') +
    `<div class="gap"></div><button class="tool minor" data-a="ask" data-tip="<b>Ask the Master Builder</b><br>He tells you the next move.${c.tutorial || c.practice ? '' : ' It costs a brick on his tower.'}">${Art.ask}<span>Ask</span></button>` +
    `<button class="tool minor" data-a="sweep" data-tip="<b>Sweep the bench</b><br>Put the blueprint back the way it started.${c.tutorial || c.practice ? '' : ' Costs a brick.'}">${Art.sweep}<span>Sweep</span></button>`;
  const bench = $('#t-bench');
  const most = Math.max(0, ...st.eqs.map(e => e.L.length + (e.R ? e.R.length : 0)));
  bench.className = 'bench' + (st.grid || st.eqs.length > 1 || most > 5 ? ' cramped' : '') + (most > 7 ? ' tiny' : '');
  bench.innerHTML = benchHTML();
  $('#t-ledger').innerHTML = `<div class="lg-scroll"><span class="lab">Ledger</span>${M(ledgerMath())}</div>` +
    `<button class="explain-btn ${t.history.length ? '' : 'idle'} ${c.tutorial && t.history.length === 1 ? 'hint-pulse' : ''}" data-a="explain" data-tip="<b>Explain the last step</b><br>A diagram and a few paragraphs on why your last move works. Free, always.">${Art.lens}<span>Explain<br>the last step</span></button>`;
  $('#t-status').innerHTML = statusText();
  $('#t-towers').innerHTML = towersHTML();
  $('#t-bell').disabled = t.phase !== 'main';
  $('#t-pins').innerHTML = `<div class="lab">Your pin tray: <b>${t.pins} pin${t.pins === 1 ? '' : 's'}</b></div><div class="slots">${Array.from({ length: 4 }, (_, i) => `<div class="slot">${Art.pin(i < t.pins)}</div>`).join('')}</div>`;
  const n = t.hand.length; const mid = (n - 1) / 2; const overlap = n > 5 ? -(n - 5) * 10 - 8 : n === 5 ? -8 : 4;
  $('#t-hand').innerHTML = t.hand.map((h, i) => {
    const rot = (i - mid) * 3.2, dy = Math.abs(i - mid) ** 2 * 2.4;
    const cost = t.freeNext && CARDS[h.inst.id].target ? 0 : costOf(h.inst);
    const cls = [sel && sel.type === 'hand' && sel.uid === h.inst.uid ? 'sel' : '', cost > t.pins ? 'poor' : '', t.hint && t.hint.card === h.inst.id ? 'hint' : ''].join(' ');
    return techCard(h.inst, { doses: h.doses, cls, attrs: `data-a="hand" data-u="${h.inst.uid}"`, style: `transform: translateY(${dy}px) rotate(${rot}deg); margin: 0 ${overlap}px;` });
  }).join('');
  const drawing = t.phase === 'draw';
  $('#t-piles').innerHTML = `
    <button class="pile ${drawing ? 'ready' : ''}" data-a="draw-bin" ${drawing ? '' : 'disabled'} data-tip="<b>The brick bin</b><br>Draw a technique card.">${Art.bin}<span>Brick bin</span><small>${t.bin.length} left${t.bin.length ? '' : t.discard.length ? ', reshuffles' : ''}</small></button>
    <button class="pile ${drawing ? 'ready' : ''}" data-a="draw-pin" ${drawing ? '' : 'disabled'} data-tip="<b>Pin jar</b><br>Put one more pin in your tray (4 at most). Cards cost pins.">${Art.pins}<span>Pin jar</span><small>+1 pin</small></button>
    <div class="spent">${t.discard.length} used card${t.discard.length === 1 ? '' : 's'}</div>`;
  $$('#t-bench [data-id]').forEach(el => { if (!seenCards.has(el.dataset.id)) el.classList.add('enter'); });
  seenCards = new Set($$('#t-bench [data-id]').map(el => el.dataset.id));
}

function ledgerMath() {
  const st = TR.st;
  if (st.done) return Tex.answer(st);
  if (st.task === 'eval') return `<i>f</i>(${Tex.snum(st.input)}) = ${Tex.side(st.eqs[0].L)}`;
  if (st.task === 'slope' || st.task === 'graph') {
    const g = st.grid;
    const m = st.task === 'graph' ? Tex.snum(g.goal.m) : (g.m ? Tex.snum(g.m) : '?');
    const b = st.task === 'graph' ? Tex.snum(g.goal.b) : (st.eqs.length && Alg.isSolved(st.eqs[0], 'b') ? Tex.snum(Alg.solvedValue(st.eqs[0], 'b')) : '?');
    let s = `<i>y</i> = <i>mx</i> + <i>b</i>, with <i>m</i> = ${m} and <i>b</i> = ${b}`;
    if (st.eqs.length) s += ` <span class="or">;</span> ${Tex.state(st)}`;
    return s;
  }
  return Tex.state(st);
}

function statusText() {
  const t = TR;
  if (t.phase === 'draw') return 'Draw: a card from the brick bin, or a pin from the jar.';
  if (t.phase === 'master') return 'The Master Builder’s turn.';
  if (t.phase === 'won') return 'Stamped.';
  if (t.phase === 'cracked') return 'The build has toppled.';
  if (t.sel) {
    if (t.sel.type === 'tool') return TOOL[t.sel.id].how + ' <em>(Esc to put it down.)</em>';
    const d = CARDS[t.sel.id];
    const w = { factor: 'click the plate whose bricks should become a rectangle', zero: 'click the equation', root: 'click the equation', complete: 'click the equation', formula: 'click the equation', stairs: TR.st.task === 'graph' ? 'click the Start Brick, or the top of a step' : 'click one of the points', plug: 'click one of the two points', start: 'click a stud on the baseplate' }[t.sel.id];
    return `${d.name}: ${w}. <em>(Esc to put it back.)</em>`;
  }
  return 'Pick up a tool or a card. Ring the bell when your turn is done.';
}

// ---------- the bench ----------
function partTarget(p) {
  const s = TR.sel; if (!s || s.type !== 'tool') return false;
  if (s.id === 'counter') return p.t !== 'group';
  if (s.id === 'saw') return (p.t === 'term' && p.k !== '1' && !Alg.req(p.c, Alg.ONE)) || (p.t === 'group' && !Alg.req(p.c, Alg.ONE));
  if (s.id === 'unbox') return p.t === 'group';
  return false;
}
const plateTarget = ps => TR.sel && TR.sel.type === 'hand' && TR.sel.id === 'factor' && ps.length > 0;
const rowTarget = () => TR.sel && ((TR.sel.type === 'tool' && TR.sel.id === 'snap') || (TR.sel.type === 'hand' && ['zero', 'root', 'complete', 'formula'].includes(TR.sel.id)));

function partCardHTML(p, e, s) {
  const m = material(p); const tone = Art.TONES[m.tone] || Art.TONES.one;
  let art, badge = '';
  if (p.t === 'term') { const pl = Art.pile(p.k, p.c); art = pl.svg; badge = pl.badge; }
  else if (p.t === 'root') art = Art.rootBrick(p.n, p.c.n < 0);
  else art = p.f.length === 1 ? Art.crate() : Art.frame(p.f.length === 2 && Alg.peq(p.f[0], p.f[1]));
  const r = Tex.part(p);
  const cls = ['card', 'brick-card', p.t === 'group' ? 'grp' : '', partTarget(p) ? 'targetable' : '', TR.hint && TR.hint.pid === p.id ? 'hint' : ''].join(' ');
  return `<div class="${cls}" data-a="part" data-id="${p.id}" data-e="${e.id}" data-s="${s}" style="--tone-ink:${tone[0]};--tone-tint:${tone[1]}">
    <div class="c-name">${m.name}</div><div class="c-art">${art}${badge ? `<span class="badge">${M(badge)}</span>` : ''}</div><div class="c-math">${M(r.html)}</div></div>`;
}
function plateHTML(e, s) {
  const ps = e[s];
  const inner = ps.length ? ps.map((p, i) => {
    const neg = p.c.n < 0;
    const sg = i > 0 ? `<span class="sgn">${neg ? '−' : '+'}</span>` : (neg ? '<span class="sgn">−</span>' : '');
    return sg + partCardHTML(p, e, s);
  }).join('') : '<div class="zero" title="An empty plate is zero">0</div>';
  return `<div class="plate ${plateTarget(ps) ? 'targetable' : ''}" data-a="plate" data-e="${e.id}" data-s="${s}">${inner}</div>`;
}
function eqRowHTML(e) {
  const v = TR.st.target || 'x';
  if (!e.R) return `<div class="eqrow single ${rowTarget() ? 'targetable' : ''}" data-a="row" data-e="${e.id}">${plateHTML(e, 'L')}</div>`;
  const solved = Alg.isSolved(e, v);
  const tilt = e.rel === '=' ? '' : (e.rel[0] === '<' ? 'tilt-l' : 'tilt-r');
  return `<div class="eqrow ${solved ? 'solved' : ''} ${rowTarget() ? 'targetable' : ''} ${TR.hint && TR.hint.eid === e.id ? 'hint' : ''}" data-a="row" data-e="${e.id}">${plateHTML(e, 'L')}<div class="rel ${tilt}" title="${e.rel === '=' ? 'Balanced: both sides are equal' : 'An inequality: one side is heavier'}">${Tex.rel(e.rel)}</div>${plateHTML(e, 'R')}</div>`;
}
function benchHTML() {
  const st = TR.st;
  const rows = st.eqs.map(eqRowHTML).join('<div class="or-sep">or</div>');
  if (!st.grid) return `<div class="rows">${rows || '<div class="empty-bench">The bench is bare.</div>'}</div>`;
  return `<div class="gridwrap">${gridSVG()}</div><div class="gridside">${placardHTML()}${rows ? `<div class="rows">${rows}</div>` : ''}</div>`;
}
function placardHTML() {
  const st = TR.st, g = st.grid;
  const slot = (v, name) => v === null ? `<span class="slot q">${name}</span>` : `<span class="slot">${M(Tex.snum(v))}</span>`;
  if (st.task === 'graph') {
    return `<div class="placard"><div class="pl-t">Blueprint</div>${M('<i>y</i> = ' + Tex.lineH(g.goal.m, g.goal.b))}
      <div class="pl-s">start at ${M('<i>b</i> = ' + Tex.snum(g.goal.b))}, then steps of ${M('rise ' + Tex.snum(R2(g.goal.m).rise) + ', run ' + R2(g.goal.m).run)}</div></div>`;
  }
  const b = st.eqs.length && Alg.isSolved(st.eqs[0], 'b') ? Alg.solvedValue(st.eqs[0], 'b') : null;
  return `<div class="placard"><div class="pl-t">The line through both points</div><div class="pl-eq">${M('<i>y</i> =')} ${slot(g.m, 'm')} ${M('<i>x</i> +')} ${slot(b, 'b')}</div>
    <div class="pl-s">${g.m ? 'slope found' : 'm: the slope, rise ÷ run'}${st.eqs.length ? '' : '<br>b: where it crosses the y-axis'}</div></div>`;
}
const R2 = m => ({ rise: Alg.R(m.n), run: m.d });

function gridSVG() {
  const g = TR.st.grid, N = g.size, u = 15, o = N * u + 16, W = 2 * o;
  const X = x => o + x * u, Y = y => o - y * u;
  const sel = TR.sel;
  const studT = sel && sel.type === 'hand' && sel.id === 'start';
  const ptT = sel && sel.type === 'hand' && (sel.id === 'stairs' || sel.id === 'plug');
  const stT = sel && sel.type === 'tool' && sel.id === 'saw' && TR.st.task === 'slope' && !g.m;
  let s = `<svg viewBox="0 0 ${W} ${W}" class="grid" aria-label="Baseplate grid"><rect x="3" y="3" width="${W - 6}" height="${W - 6}" rx="10" class="gp-base"/>`;
  for (let x = -N; x <= N; x++) for (let y = -N; y <= N; y++) s += `<circle cx="${X(x)}" cy="${Y(y)}" r="4.3" class="stud ${studT ? 'tg' : ''}" data-a="stud" data-x="${x}" data-y="${y}"/>`;
  s += `<path d="M${X(-N) - 9} ${Y(0)}H${X(N) + 9}M${X(0)} ${Y(-N) - 9}V${Y(N) + 9}" class="axis"/>`;
  s += `<text x="${X(N) + 6}" y="${Y(0) - 5}" class="axl">x</text><text x="${X(0) + 6}" y="${Y(N) - 2}" class="axl">y</text>`;
  for (const k of [-8, -4, 4, 8]) if (Math.abs(k) <= N) s += `<text x="${X(k)}" y="${Y(0) + 15}" class="tick" text-anchor="middle">${k}</text><text x="${X(0) - 7}" y="${Y(k) + 4}" class="tick" text-anchor="end">${k}</text>`;
  if (g.line) {
    const m = Alg.rnum(g.line.m), b = Alg.rnum(g.line.b);
    const pts = []; for (const x of [-N - .6, N + .6]) pts.push([x, m * x + b]);
    s += `<clipPath id="gclip"><rect x="3" y="3" width="${W - 6}" height="${W - 6}" rx="10"/></clipPath><path d="M${X(pts[0][0])} ${Y(pts[0][1])}L${X(pts[1][0])} ${Y(pts[1][1])}" class="beam" clip-path="url(#gclip)"/>`;
  }
  for (const stp of g.stairs) {
    const x1 = X(stp.from.x), x2 = X(stp.to.x), y1 = Y(stp.from.y), y2 = Y(stp.to.y);
    s += `<g class="stairs ${stT ? 'tg' : ''}" data-a="gstairs"><rect class="hit" x="${Math.min(x1, x2) - 6}" y="${Math.min(y1, y2) - 8}" width="${Math.abs(x2 - x1) + 30}" height="${Math.abs(y2 - y1) + 26}"/><rect x="${Math.min(x1, x2)}" y="${y1 - 4}" width="${Math.abs(x2 - x1)}" height="8" rx="2" class="run"/>
      <rect x="${x2 - 4}" y="${Math.min(y1, y2)}" width="8" height="${Math.abs(y2 - y1)}" rx="2" class="rise ${stp.rise < 0 ? 'down' : ''}"/>
      <text x="${(x1 + x2) / 2}" y="${y1 + (stp.rise >= 0 ? 17 : -9)}" text-anchor="middle" class="stl">run ${stp.run}</text>
      <text x="${x2 + 7}" y="${(y1 + y2) / 2 + 4}" class="stl">rise ${stp.rise < 0 ? '−' + (-stp.rise) : stp.rise}</text></g>`;
    if (TR.st.task === 'graph') s += `<g data-a="gpt" data-p="${stp.id}" class="gpt ${ptT ? 'tg' : ''}"><rect class="hit" x="${x2 - 13}" y="${y2 - 13}" width="26" height="26"/><rect x="${x2 - 7}" y="${y2 - 7}" width="14" height="14" rx="2" class="pb step"/></g>`;
  }
  for (const p of g.pts) s += `<g data-a="gpt" data-p="${p.id}" class="gpt ${ptT ? 'tg' : ''}"><rect class="hit" x="${X(p.x) - 13}" y="${Y(p.y) - 13}" width="26" height="26"/><rect x="${X(p.x) - 7}" y="${Y(p.y) - 7}" width="14" height="14" rx="2" class="pb"/><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" class="pbs"/>
    <text x="${X(p.x) + (p.x > 3 ? -10 : 10)}" y="${Y(p.y) + (p.y > 5 ? 17 : -9)}" class="ptl" text-anchor="${p.x > 3 ? 'end' : 'start'}">(${p.x}, ${p.y})`.replace(/-(\d)/g, '−$1') + '</text></g>';
  if (g.start) s += `<g data-a="gpt" data-p="start" class="gpt ${ptT ? 'tg' : ''}"><rect class="hit" x="${X(0) - 14}" y="${Y(g.start.y) - 14}" width="28" height="28"/><rect x="${X(0) - 8}" y="${Y(g.start.y) - 8}" width="16" height="16" rx="2" class="sb"/><circle cx="${X(0)}" cy="${Y(g.start.y)}" r="3.4" class="sbs"/><text x="${X(0) - 11}" y="${Y(g.start.y) - 9}" class="ptl" text-anchor="end">start (0, ${Tex.text(() => Tex.snum(g.start.y ? Alg.R(g.start.y) : Alg.ZERO)).replace('-', '−')})</text></g>`;
  return s + '</svg>';
}

// ---------- input ----------
function trialClick(a, el) {
  const t = TR; if (!t) return;
  if (a === 'explain') {
    if (!t.history.length) { say('Nothing to explain yet. <em>Make a move first; then I’ll show you why it works.</em>'); return; }
    t.sel = null; renderTrial(); return Explain.open(t.history.length - 1);
  }
  if (a === 'draw-bin' || a === 'draw-pin') return draw(a === 'draw-pin' ? 'pin' : 'bin');
  if (t.phase === 'draw') { say('Draw first. <em>Brick bin or pin jar, bottom right.</em>'); return; }
  if (t.phase !== 'main') return;
  if (a === 'bell') return ringBell();
  if (a === 'ask') return askMaster();
  if (a === 'sweep') return sweepBench();
  if (a === 'tool') {
    const id = el.dataset.t;
    if (id === 'stamp') { t.sel = null; return doTool('stamp', {}); }
    t.sel = (t.sel && t.sel.type === 'tool' && t.sel.id === id) ? null : { type: 'tool', id };
    Sound.tick(); renderTrial(); return;
  }
  if (a === 'hand') {
    const h = t.hand.find(x => x.inst.uid === el.dataset.u); if (!h) return;
    const d = CARDS[h.inst.id];
    const cost = t.freeNext ? 0 : costOf(h.inst);
    if (t.sel && t.sel.type === 'hand' && t.sel.uid === h.inst.uid) { t.sel = null; renderTrial(); return; }
    if (cost > t.pins) { say(`${d.name} takes ${cost} pin${cost > 1 ? 's' : ''}. Your tray has ${t.pins}. <em>Take a pin from the jar next turn, or ring the bell.</em>`); Sound.fizzle(); return; }
    if (!d.target) return playUtility(h);
    if (d.target === 'now') { t.sel = null; return doCard(h.inst.uid, {}); }
    t.sel = { type: 'hand', id: h.inst.id, uid: h.inst.uid }; Sound.flip(); renderTrial(); return;
  }
  if (['part', 'plate', 'row', 'stud', 'gpt', 'gstairs'].includes(a)) {
    const up = k => { const c = el.closest(`[data-${k}]`); return c ? c.dataset[k] : undefined; };
    const tg = { a, pid: el.dataset.id, eid: up('e'), side: up('s'), x: +el.dataset.x, y: +el.dataset.y, pt: el.dataset.p };
    if (!t.sel) return inspect(tg);
    if (t.sel.type === 'tool') return doTool(t.sel.id, tg);
    return doCard(t.sel.uid, tg);
  }
}

function inspect(tg) {
  if (tg.a === 'part') {
    const loc = Alg.findPart(TR.st, tg.pid); if (!loc) return;
    const m = material(loc.part); const r = Tex.part(loc.part);
    return say(`${M((r.neg ? '−' : '') + r.html)}. ${m.lore}`);
  }
  if (tg.a === 'stud') return say(`The stud at ${M(`(${tg.x}, ${tg.y})`.replace(/-/g, '−'))}: ${tg.x} across, ${tg.y} up.`);
  if (tg.a === 'gpt') return say('A brick on the baseplate: a point on the line.');
  if (tg.a === 'gstairs') return say('The staircase: how far up (the rise) for how far across (the run).');
  return say('Pick up a tool from the rack, or a card from your hand, then click here.');
}

function draw(which) {
  const t = TR; if (t.phase !== 'draw') return;
  const binEmpty = !t.bin.length && !t.discard.length;
  if (which === 'pin') {
    if (t.pins >= 4 && !binEmpty) { say('Your tray is full. <em>Four pins at most.</em> Take a card instead.'); return; }
    if (t.pins >= 4) say('Your tray is full and the bin is empty, so there’s nothing to draw. <em>On with it.</em>');
    else { t.pins++; Sound.thunk(); }
  } else {
    if (!t.bin.length) { t.bin = shuffle(t.discard); t.discard = []; }
    if (!t.bin.length && t.pins < 4) { say('The brick bin is empty. <em>Take a pin.</em>'); return; }
    if (t.bin.length) { t.hand.push(t.bin.shift()); Sound.flip(); }
    else say('The bin is empty and your tray is full, so there’s nothing to draw. <em>On with it.</em>');
  }
  t.phase = 'main';
  renderTrial();
  if (t.ctx.tutorial) tutorialStep();
}

function playUtility(h) {
  const t = TR; const id = h.inst.id; const cost = costOf(h.inst);
  if (id === 'pins') { if (t.pins >= 4) { say('Your tray is already full.'); return; } t.pins = Math.min(4, t.pins + 2); say('A handful of spare pins.'); Sound.thunk(); }
  else if (id === 'rummage') { let n = 0; for (let k = 0; k < 2; k++) { if (!t.bin.length) { t.bin = shuffle(t.discard); t.discard = []; } if (t.bin.length) { t.hand.push(t.bin.shift()); n++; } } say(n ? `You rummage and find ${n} more.` : 'Nothing left to find.'); Sound.flip(); }
  else if (id === 'level') { const lift = Math.min(2, t.him); t.him -= lift; say(lift ? 'The bubble settles. I take two bricks off my tower.' : 'My tower is empty. Nothing to level.'); Sound.tick(); }
  else if (id === 'manual') { t.freeNext = true; say('You check the instructions. <em>Your next card this turn costs no pins.</em>'); Sound.chime(); }
  t.pins -= cost; spendDose(h); t.sel = null; renderTrial();
}
function spendDose(h) {
  h.doses--;
  if (h.doses <= 0) { const i = TR.hand.indexOf(h); if (i >= 0) TR.hand.splice(i, 1); if (!h.inst.temp) { h.doses = dosesOf(h.inst); TR.discard.push(h); } }
}
function nudge(msg) { say(msg); Sound.tick(); }

// ---------- moves ----------
function doTool(id, tg) {
  const t = TR, st = t.st; let res, act = id;
  const eid = tg.eid || (st.eqs[0] && st.eqs[0].id);
  if (id === 'snap') { if (!st.eqs.length) return nudge('There is no equation to snap yet.'); res = Alg.opSnap(st, eid); }
  else if (id === 'counter') { if (!tg.pid) return nudge('Click a brick card itself, not the empty plate.'); res = Alg.opCounter(st, tg.pid); }
  else if (id === 'saw') {
    if (tg.a === 'gstairs' || (st.grid && st.task === 'slope' && !st.grid.m && !tg.pid)) { act = 'sawstairs'; res = Alg.opSawStairs(st); }
    else { if (!tg.pid) return nudge('Click the variable brick whose number you want to saw off.'); res = Alg.opSaw(st, tg.pid); }
  }
  else if (id === 'unbox') { if (!tg.pid) return nudge('Click a crate or a frame card.'); res = Alg.opUnbox(st, tg.pid); }
  else if (id === 'stamp') res = Alg.opStamp(st);
  if (!res.ok) return misapply(res.msg);
  commit(act, res, tg, TOOL[id].yld, null);
}
function doCard(uid, tg) {
  const t = TR; const h = t.hand.find(x => x.inst.uid === uid); if (!h) return;
  const id = h.inst.id, st = t.st; const eid = tg.eid || (st.eqs[0] && st.eqs[0].id);
  let res;
  switch (id) {
    case 'factor': res = Alg.opFactor(st, eid, tg.side); if (res.ok && res.pair) return factorQuiz(h, res, tg); break;
    case 'zero': res = Alg.opZero(st, eid); break;
    case 'root': res = Alg.opRoot(st, eid); break;
    case 'complete': res = Alg.opComplete(st, eid); break;
    case 'formula': res = Alg.opFormula(st, eid); break;
    case 'swap': res = Alg.opSwap(st); break;
    case 'stairs':
      if (st.task === 'graph' && tg.a !== 'gpt') return nudge('Click the Start Brick, or the top brick of a step, to build a staircase from it.');
      res = Alg.opStairs(st, tg.pt); break;
    case 'plug': if (tg.a !== 'gpt') return nudge('Click one of the two points on the baseplate.'); res = Alg.opPlug(st, tg.pt); break;
    case 'start': if (tg.a !== 'stud') return nudge('Click a stud on the baseplate.'); res = Alg.opStart(st, tg.x, tg.y); break;
    default: return;
  }
  if (!res.ok) return misapply(res.msg);
  commit(id, res, tg, yieldOf(h.inst), h);
}
function commit(act, res, tg, yld, h) {
  const t = TR;
  Explain.record(act, t.st, res, tg);
  t.st = res.st; t.hint = null; t.sel = null;
  if (h) { if (!t.freeNext) t.pins -= costOf(h.inst); t.freeNext = false; spendDose(h); }
  if (yld) gain(yld);
  if (act === 'stamp') { Sound.chime(); return win(); }
  Sound.flip();
  after(lineFor(act, res));
}
function lineFor(act, res) {
  switch (act) {
    case 'snap': return Object.values(res.sides).some(ms => ms.some(m => !m.to)) ? 'Click. A red and a matching brick cancel to nothing.' : 'Click. Like bricks, one pile.';
    case 'counter': return 'A counterweight on both plates. Still balanced.';
    case 'saw': return res.flipped ? `Sawn by ${M(Tex.snum(res.div))}. <em>A negative: the beam tips the other way, and the sign flips.</em>` : `Sawn into ${Math.abs(res.div.n) > 1 && res.div.d === 1 ? Math.abs(res.div.n) + ' equal groups' : 'equal parts'}.`;
    case 'unbox': return 'Unboxed. Everything inside is multiplied out.';
    case 'factor': return 'The bricks make a rectangle.';
    case 'zero': return `Pried apart. ${res.factors.length > 1 ? 'Two branches: either piece can be the zero.' : 'One piece must be zero.'}`;
    case 'root': return res.sq && Alg.isZero(res.sq) ? 'Cut.' : 'Cut. <em>Plus or minus: a negative squares to the same number.</em>';
    case 'complete': return 'The corner is filled. A perfect square.';
    case 'formula': return 'The Master Formula speaks.';
    case 'swap': return 'Every x-brick swapped for the number.';
    case 'stairs': return 'Steps built.';
    case 'sawstairs': return `Rise ÷ run: the slope is ${M(Tex.snum(res.m))}.`;
    case 'plug': return 'Plugged in. Now solve for b.';
    case 'start': return 'The start brick is down.';
  }
  return '';
}
function after(line) {
  renderTrial();
  if (TR.ctx.tutorial) {
    if (TR.history.length === 1) { say(line + ' <em>Whenever you want to know why a move works, press <b>Explain</b> on the right end of the ledger. It’s free.</em>'); setTimeout(() => { if (TR && TR.phase === 'main') tutorialStep(); }, 4200); return; }
    say(line); setTimeout(() => { if (TR && TR.phase === 'main') tutorialStep(); }, 1300); return;
  }
  if (line) say(line);
}
function gain(n) { if (!n) return; TR.me += n; Sound.thunk(); }

function misapply(msg) {
  const t = TR; Sound.fizzle();
  const free = t.ctx.tutorial;
  if (!free) t.him += 1;
  say(`<em>${pick(LINES.no)}</em> ${msg}${free ? '' : ' <em>A brick for my tower.</em>'}`);
  renderTrial(); checkCrack();
}

// ---------- the Rectangle puzzle ----------
function factorQuiz(h, res, tg) {
  const t = TR; const ac = res.ac, B = res.B, A = res.A, C = res.C;
  const pairs = []; const n = Math.abs(ac);
  for (let d = 1; d * d <= n; d++) if (n % d === 0) { const e = n / d; if (ac > 0) pairs.push([d, e], [-d, -e]); else pairs.push([d, -e], [-d, e]); }
  const key = p => [Math.min(...p), Math.max(...p)].join(',');
  const right = res.pair;
  let opts = shuffle(pairs.filter(p => key(p) !== key(right))).slice(0, 5); opts.push(right);
  // decoys that add to b but multiply to the wrong number: both conditions matter
  const decoys = shuffle(Array.from({ length: 19 }, (_, i) => i - 9).map(d => [d, B - d]).filter(p => p[0] <= p[1] && p[0] * p[1] !== ac && !opts.some(o => key(o) === key(p))));
  opts = shuffle(opts.concat(decoys.slice(0, Math.max(1, 5 - opts.length))));
  const polyH = Tex.poly(Alg.pn({ x2: A, x: B, '1': C }));
  const gcfNote = !Alg.req(Alg.rabs(res.g), Alg.ONE) ? `<p>First the common factor comes out: ${M(Tex.snum(res.g))} goes to the front, leaving ${M(polyH)}.</p>` : '';
  const ask = A === 1 ? `two numbers that multiply to ${M('<i>c</i> = ' + ac)} and add to ${M('<i>b</i> = ' + B)}` : `two numbers that multiply to ${M('<i>a</i> · <i>c</i> = ' + A + ' · ' + C + ' = ' + ac)} and add to ${M('<i>b</i> = ' + B)}`;
  const box = `<table class="boxm quiz"><tr><td class="bx2">${M(A === 1 ? '<i>x</i><sup>2</sup>' : A + '<i>x</i><sup>2</sup>')}</td><td class="bx1">?</td></tr><tr><td class="bx1">?</td><td class="bu">${M(Tex.snum(Alg.R(C)))}</td></tr></table>`;
  const render = (msg) => modal(`<h2>Build the rectangle</h2>${gcfNote}<div class="quizbox">${box}<div><p>To arrange ${M(polyH)} into a rectangle, the middle ${M(B + '<i>x</i>')} has to split into two strips of x-bricks. Find ${ask}.</p>
      <div class="pairs">${opts.map((p, i) => `<button class="btn alt" data-a="mc" data-k="pick" data-i="${i}">${M(`${p[0]} and ${p[1]}`.replace(/-/g, '−'))}</button>`).join('')}</div>${msg ? `<p class="qmsg">${msg}</p>` : ''}</div></div>`, {
      pick: el => {
        const p = opts[+el.dataset.i];
        if (p[0] + p[1] === B && p[0] * p[1] === ac) { closeModal(); commit('factor', res, tg, yieldOf(h.inst), h); return; }
        if (!t.ctx.tutorial && !t.ctx.practice) t.him += 1;
        Sound.fizzle(); renderTrial();
        if (checkCrack()) { closeModal(); return; }
        const pen = t.ctx.tutorial || t.ctx.practice ? '' : ' <em>A brick for my tower.</em>';
        if (p[0] * p[1] !== ac) render(`${M(`${p[0]} + ${p[1]} = ${B}`.replace(/-/g, '−'))}, good, but ${M(`${p[0]} × ${p[1]} = ${p[0] * p[1]}`.replace(/-/g, '−'))}, not ${M(String(ac).replace('-', '−'))}. Both have to work.${pen}`);
        else render(`${M(`${p[0]} × ${p[1]} = ${ac}`.replace(/-/g, '−'))}, good, but ${M(`${p[0]} + ${p[1]} = ${p[0] + p[1]}`.replace(/-/g, '−'))}, not ${M(String(B).replace('-', '−'))}. Both have to work.${pen}`);
      },
      close: () => { closeModal(); t.sel = null; renderTrial(); },
    }, { closable: true, width: 760 });
  render('');
}

// ---------- advice ----------
function hintText(h) {
  const st = TR.st;
  const sideName = s => s === 'L' ? 'left' : 'right';
  const partM = p => { const r = Tex.part(p); return M((r.neg ? '−' : '') + r.html); };
  switch (h.act) {
    case 'snap': return 'Snap. Some like bricks on the same plate should click together.';
    case 'counter': { const loc = Alg.findPart(st, h.pid); const neg = Alg.clone(loc.part); neg.c = Alg.rneg(neg.c); return `Counterweight the ${partM(loc.part)} on the ${sideName(loc.s)}: put ${partM(neg)} on both plates, so it cancels there.`; }
    case 'saw': { const loc = Alg.findPart(st, h.pid); const c = loc.part.c; return `Saw by ${M(Tex.snum(c))}: divide both plates by it.${c.n < 0 && loc.e.rel !== '=' ? ' <em>It’s negative, so the sign will flip.</em>' : ''}`; }
    case 'unbox': { const loc = Alg.findPart(st, h.pid); return `Unbox the ${partM(loc.part)}: multiply out everything inside.`; }
    case 'factor': return 'The Rectangle. Play it on the side with the bricks, and arrange them into a rectangle.';
    case 'zero': return 'One side is 0 and the other is a product. The Pry Bar: one of the pieces must be 0.';
    case 'root': return 'A square alone on one side, a number on the other. The Square-Root Cutter. <em>Don’t forget the ±.</em>';
    case 'complete': return 'The x² plate and the x-bricks are alone together. The Corner Piece finishes the square.';
    case 'formula': return 'Everything is on one side. The Master Formula.';
    case 'swap': return 'Swap Bricks: put the number in for every x.';
    case 'stairs': return st.task === 'graph' ? 'The Staircase, from the Start Brick.' : 'The Staircase, between the two points: count the rise and the run.';
    case 'sawstairs': return 'The Saw, on the staircase: rise ÷ run is the slope.';
    case 'plug': return 'Plug-in: put one of the points into y = mx + b. Then solve for b.';
    case 'start': return `The Start Brick, at ${M('(0, ' + Tex.snum(st.grid.goal.b) + ')')}: where x = 0.`;
    case 'stamp': return 'It’s done. Stamp it.';
  }
  return 'Hm.';
}
function askMaster() {
  const t = TR; t.sel = null; const h = Hint.next(t.st);
  const free = t.ctx.tutorial || t.ctx.practice;
  if (!free) t.him += 1;
  if (!h) { say('It looks finished to me. <em>Stamp it.</em>'); renderTrial(); return; }
  t.hint = { act: h.act, pid: h.pid, eid: h.eid, tool: TOOL_ACTS.has(h.act) ? (h.act === 'sawstairs' ? 'saw' : h.act) : null, card: TOOL_ACTS.has(h.act) ? null : h.act };
  let extra = '';
  if (t.hint.card && !t.hand.some(x => x.inst.id === t.hint.card)) extra = ` <em>You don’t have ${CARDS[t.hint.card].name} in hand. You’ll have to draw it.</em>`;
  say(hintText(h) + extra + (free ? '' : ' <em>Advice costs a brick.</em>'));
  renderTrial(); if (!free) { Sound.thunk(); checkCrack(); }
}
function sweepBench() {
  const t = TR; if (!t.ctx.tutorial && !t.ctx.practice) t.him += 1;
  t.st = stateFromSpec(t.spec); t.sel = null; t.hint = null; seenCards = new Set(); t.history = [];
  say('Swept. The blueprint is as it came.'); Sound.flip(); renderTrial(); checkCrack();
}

// ---------- the Master Builder’s turn ----------
async function ringBell() {
  const t = TR; if (t.phase !== 'main') return;
  t.phase = 'master'; t.sel = null; t.freeNext = false;
  const bell = $('#t-bell'); bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring');
  Sound.bell(); renderTrial();
  $('#t-master').classList.add('lean');
  await sleep(500);
  let line = pick(LINES.heat);
  if (t.heat > 0) { t.him += t.heat; Sound.thunk(); }
  if (t.ctx.boss && t.ctx.boss.twist === 'pins' && t.pins >= 2) { t.pins--; line += ' <em>He plucks a pin from your tray for his welding.</em>'; }
  say(line + (t.heat > 1 ? ` <em>(${t.heat} bricks.)</em>` : ''));
  renderTrial();
  await sleep(900);
  $('#t-master') && $('#t-master').classList.remove('lean');
  if (checkCrack()) return;
  t.turn++; t.phase = 'draw'; renderTrial();
  if (t.ctx.tutorial) tutorialStep();
}
function checkCrack() {
  const t = TR; if (t.him - t.me < 5 || t.phase === 'cracked') return false;
  t.phase = 'cracked'; renderTrial();
  const tw = $('#t-towers .mine'); if (tw) tw.classList.add('topple');
  const fl = document.createElement('div'); fl.className = 'flash'; $('#scene').appendChild(fl);
  Sound.crack(); const sc = $('#scene'); sc.classList.add('shake'); setTimeout(() => sc.classList.remove('shake'), 600);
  setTimeout(() => crack(), 900);
  return true;
}
async function crack() {
  const c = TR.ctx;
  if (c.practice) {
    await talk(['Your tower topples. Bricks everywhere. <em>No lamps at the practice bench.</em> Again.']);
    return startTrial(TR.spec, c);
  }
  G.run.lamps--;
  renderTrial(); Sound.fizzle();
  if (G.run.lamps <= 0) return gameOver();
  await talk(['Your tower topples. Bricks everywhere. <em>He switches off one of your lamps.</em>', G.run.lamps === 1 ? 'One lamp left. We’ll try that blueprint again.' : 'Again.']);
  startTrial(TR.spec, c);
}

// ---------- winning ----------
function win() {
  const t = TR; t.phase = 'won'; renderTrial();
  const q = Tex.specimen(t.spec), ans = Tex.answer(t.st);
  Ledger.add(q, ans, t.spec.fam, t.spec.prompt);
  const c = t.ctx;
  const lead = Math.max(0, t.me - t.him);
  const bonus = c.boss ? 3 : 0;
  if (!c.practice && G.run) { G.run.gold += lead + bonus; G.run.solved.push({ q, a: ans }); }
  say(pick(LINES.win));
  const goldLine = c.practice ? '' : `<p style="text-align:center">You finished ${lead} ahead in the tower race: <b>+${lead + bonus} gold</b>${bonus ? ' (with a bonus for the examiner)' : ''}.</p>`;
  const more = c.boss && c.boss.phaseIdx < c.boss.phases.length - 1;
  const btns = c.practice ? `<button class="btn" data-a="mc" data-k="again">Another</button><button class="btn alt" data-a="mc" data-k="fams">Choose a different kind</button><button class="btn alt" data-a="mc" data-k="leave">Leave the bench</button>`
    : `<button class="btn" data-a="mc" data-k="go">${more ? 'The next build' : 'Into the logbook'}</button>`;
  const showWin = () => modal(`<h2>Stamped</h2><div class="win-q">${t.spec.prompt}: ${M(q)}</div><span class="big">${M(ans)}</span>${goldLine}
    <p style="text-align:center"><button class="btn alt" data-a="mc" data-k="walk">${Art.lens.replace('<svg', '<svg style="width:26px;height:20px;vertical-align:-4px;margin-right:6px"')}Walk through all ${t.history.length} steps, with diagrams</button></p><div class="row">${btns}</div>`, {
    walk: () => { Explain.open(0, showWin); },
    go: () => { closeModal(); c.onWin && c.onWin(); },
    again: () => { closeModal(); startPractice(c.fam); },
    fams: () => { closeModal(); practiceMenu(); },
    leave: () => { closeModal(); TR = null; titleScreen(); },
  });
  setTimeout(showWin, 900);
}

// ---------- the first lesson ----------
let tutSaid = new Set();
function tsay(key, html) { if (tutSaid.has(key)) return; tutSaid.add(key); say(html); }
function tutorialStep() {
  const t = TR; if (!t || !t.ctx.tutorial) return;
  const e = t.st.eqs[0];
  if (t.phase === 'draw') return tsay('draw' + t.turn, t.turn === 1
    ? 'Every turn starts with a draw: a card from the brick bin, or a pin from the jar. Both are bottom right. <em>Take either.</em>'
    : 'Draw again. <em>Bin or jar.</em>');
  if (t.st.done || !e) return;
  const loose = e.L.find(p => p.t === 'term' && p.k === '1');
  if (loose) return tsay('counter', 'Look at the plates: three x-bricks and 2 studs on the left balance 11 studs on the right. We want the x-bricks alone. Pick up the <b>Counterweight</b> from the rack, then click the <b>2</b> card. It puts −2 on both plates: it cancels the 2 on the left, and shows up as −2 on the right.');
  if (!Alg.snapped(e.R)) return tsay('snap', 'Now the right plate holds 11 yellow studs and 2 red ones. A red and a yellow cancel. Pick up <b>Snap</b> and click the equation.');
  const x = e.L.find(p => p.t === 'term' && p.k === 'x');
  if (x && !Alg.req(x.c, Alg.ONE)) return tsay('saw', 'Three x-bricks balance 9 studs. So one x-brick balances a third of them. Pick up the <b>Saw</b> and click the <b>3x</b> card: both plates split into 3 equal groups, and we keep one.');
  return tsay('stamp', 'One x-brick balances 3 studs: <b>x = 3</b>. Press the <b>Stamp</b> on the rack.');
}
