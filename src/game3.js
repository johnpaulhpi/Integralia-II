/* ================================================================
   ALGEBRICK — game, part 3: the apprenticeship around the bench
   ================================================================ */

// ---------- title ----------
function titleScreen() {
  TR = null; closeModal(); say('');
  const n = Ledger.all().length;
  $('#scene').innerHTML = `<div class="title">
    <div class="cndl">${Art.lamp(true)}${Art.lamp(true)}</div>
    <div class="t-bricks">${['x2', 'x', '1', '1', 'x', 'y'].map((k, i) => `<svg viewBox="0 0 ${Art.DIM[k][0] * 20 + 4} ${Art.DIM[k][1] * 20 + 6}" style="height:${Art.DIM[k][1] * 20 * .9}px">${Art.brick(k, i === 3, 2, 2)}</svg>`).join('')}</div>
    <h1>Algebrick</h1>
    <div class="sub">An apprenticeship in algebra, built one brick at a time</div>
    <div class="menu">
      <button data-a="begin">Sit down at the bench<small>a full apprenticeship: three rooms, three examiners</small></button>
      <button data-a="practice">The practice bench<small>pick one kind of problem and repeat it</small></button>
      ${n ? `<button data-a="ledger">The logbook<small>${n} build${n === 1 ? '' : 's'} stamped in this browser</small></button>` : ''}
    </div>
  </div>
  <div class="foot">Equations · Inequalities · Factoring · Quadratics · Functions · Slope · Graphing lines</div>`;
}

function ledgerView() {
  const l = Ledger.all();
  modal(`<h2>The logbook</h2><p>Every build you’ve stamped in this browser, newest first.</p>
    <ol class="ledger-list">${l.slice(0, 60).map(e => `<li>${e.p ? `<span class="lp">${e.p}:</span> ` : ''}${M(e.q)} <span class="arrow">→</span> ${M(e.a)}</li>`).join('')}</ol>
    <div class="row"><button class="btn alt" data-a="mc" data-k="close">Close</button></div>`, { close: closeModal }, { closable: true, width: 860 });
}

// ---------- a run ----------
const masterBig = (eye) => `<div class="master" style="top:40px;width:340px;margin-left:-170px">${Art.master(eye)}</div>`;
async function beginRun() {
  G = { run: { region: 0, lamps: 2, maxLamps: 2, gold: 0, deck: REGIONS[0].gifts.map(mkInst), map: null, solved: [] } };
  const veteran = Store.get('algebrick-tutorial-done', false);
  $('#scene').innerHTML = masterBig();
  if (!veteran) {
    await talk([
      'Ah. The new apprentice. Sit. Mind the lamps.',
      'I build things out of bricks. So will you. Every problem I hand you is a blueprint, and every piece of algebra is a brick: a yellow stud is 1, a long green brick is x, a big blue plate is x². Red ones are negative.',
      'An equation is a balance: two plates that weigh the same. You may do anything you like to a balance, as long as you do it to <b>both</b> plates.',
      'We race, you and I. Every good move adds a brick to your tower. Every turn you spend, every mistake, I add one to mine. If my tower gets five taller than yours, yours topples. You have two lamps. When both are out, we’re done for the night.',
      'Let’s begin with something small.',
    ], { big: true });
    tutSaid = new Set();
    const spec = Spec.gen('tutorial');
    const deck = [mkInst('pins'), mkInst('rummage'), mkInst('level'), mkInst('manual')];
    startTrial(spec, { heat: 0, tutorial: true, deck, onWin: afterTutorial });
  } else {
    await talk(['You again. Sit. You know the race: five behind and your tower topples. Two lamps.'], { big: true });
    enterRegion(0);
  }
}
async function afterTutorial() {
  Store.set('algebrick-tutorial-done', true);
  $('#scene').innerHTML = masterBig();
  await talk([
    'Good. Counterweight, snap, saw, stamp. That’s most of algebra, honestly.',
    'From here on my advice costs a brick, my tower keeps growing, and the blueprints get harder.',
  ], { big: true });
  enterRegion(0);
}

async function enterRegion(r) {
  const R = REGIONS[r]; G.run.region = r; G.run.lamps = G.run.maxLamps;
  $('#scene').innerHTML = masterBig();
  await talk(R.intro, { big: true });
  if (r > 0) G.run.deck.push(...R.gifts.map(mkInst));
  const gifts = r === 0 ? G.run.deck : G.run.deck.slice(-R.gifts.length);
  await new Promise(res => modal(`<h2>${R.name}</h2><p>${R.giftLine}</p><div class="deckgrid">${gifts.map(i => techCard(i)).join('')}</div>
      <div class="row"><button class="btn" data-a="mc" data-k="ok">Into the brick bin</button></div>`, { ok: () => { closeModal(); res(); } }, { width: 900 }));
  G.run.map = makeMap(r);
  mapScreen();
}

// ---------- the map ----------
function makeMap(r) {
  const R = REGIONS[r];
  const evA = ['bin', 'bench', 'puzzle'], evB = ['shop', 'bench', 'bin', 'puzzle'];
  const fams = shuffle(R.pool);
  const rows = [
    [{ t: 'start' }],
    [{ t: 'trial', fam: fams[0] }, { t: 'trial', fam: fams[1 % fams.length] }],
    shuffle(evA).slice(0, Math.random() < .5 ? 2 : 3).map(t => ({ t })),
    [{ t: 'trial', fam: fams[2 % fams.length] }, { t: 'trial', fam: fams[3 % fams.length] }],
    shuffle(evB).slice(0, 2).map(t => ({ t })),
    [{ t: 'boss' }],
  ];
  const nodes = []; let id = 0;
  rows.forEach((row, ri) => row.forEach((n, i) => {
    n.id = id++; n.row = ri; n.pos = row.length === 1 ? .5 : i / (row.length - 1);
    n.x = 490 + (i - (row.length - 1) / 2) * 250 + (ri % 2 ? 18 : -18) * (row.length > 1 ? 1 : 0);
    n.y = 560 - ri * 94; n.done = false; nodes.push(n);
  }));
  const edges = [];
  for (let ri = 0; ri < rows.length - 1; ri++) {
    const A = rows[ri], B = rows[ri + 1];
    const th = (A.length === 2 && B.length === 2) ? 1.01 : .51;
    for (const a of A) for (const b of B) if (Math.abs(a.pos - b.pos) <= th) edges.push([a.id, b.id]);
  }
  return { nodes, edges, at: 0, trail: [0] };
}
const NODE_INFO = {
  start: ['The stairs', ''], bin: ['The Brick Bin', 'take a card'], bench: ['The Workbench', 'improve a card'],
  puzzle: ['A puzzle', 'gold for a right answer'], shop: ['Supply shop', 'spend gold'], boss: ['Examiner', ''],
};
const lampsHTML = () => `<div class="lamps">${Array.from({ length: G.run.maxLamps }, (_, i) => Art.lamp(i < G.run.lamps)).join('')}</div>`;
function mapScreen() {
  TR = null; const m = G.run.map; const R = REGIONS[G.run.region];
  const reach = new Set(m.edges.filter(e => e[0] === m.at).map(e => e[1]));
  const trailSet = new Set(m.trail.slice(1).map((n, i) => `${m.trail[i]}-${n}`));
  const paths = m.edges.map(([a, b]) => { const A = m.nodes[a], B = m.nodes[b]; const walked = trailSet.has(`${a}-${b}`); const mx = (A.x + B.x) / 2 + (a % 2 ? 14 : -14);
    return `<path d="M${A.x} ${A.y - 30}Q${mx} ${(A.y + B.y) / 2} ${B.x} ${B.y + (B.t === 'boss' ? 42 : 32)}" stroke="#4a3520" stroke-width="${walked ? 2.6 : 1.6}" stroke-dasharray="${walked ? '0' : '5 6'}" fill="none" opacity="${walked ? .9 : .55}"/>`; }).join('');
  const nodes = m.nodes.map(n => {
    let lbl;
    if (n.t === 'trial') lbl = `<b>${Spec.FAMS[n.fam].label}</b>${Spec.FAMS[n.fam].name}`;
    else if (n.t === 'boss') lbl = `<b>${R.boss.name}</b>two builds`;
    else lbl = `<b>${NODE_INFO[n.t][0]}</b>${NODE_INFO[n.t][1]}`;
    const cls = ['node', n.t === 'boss' ? 'boss' : '', reach.has(n.id) ? 'reach' : '', n.done ? 'done' : '', n.id === m.at ? 'here' : ''].join(' ');
    return `<${reach.has(n.id) ? 'button' : 'div'} class="${cls}" style="left:${n.x}px;top:${n.y}px" ${reach.has(n.id) ? `data-a="node" data-n="${n.id}"` : ''}>${Art[n.t]}<span class="lbl">${lbl}</span></${reach.has(n.id) ? 'button' : 'div'}>`;
  }).join('');
  const here = m.nodes[m.at];
  $('#scene').innerHTML = `
    ${lampsHTML()}
    <div class="master" style="top:-20px;width:210px;margin-left:-105px">${Art.master()}</div>
    <div class="maphud"><span>The ${['first', 'second', 'third'][G.run.region]} room</span><span><span class="gold">${G.run.gold} gold</span>&emsp;<button data-a="satchel">Your brick bin (${G.run.deck.length})</button></span></div>
    <div class="mapsheet"><div class="mapttl"><h2>${R.name}</h2><p>${R.motto}</p></div>
      <svg class="paths" viewBox="0 0 980 618">${paths}</svg>${nodes}
      <svg class="token" viewBox="0 0 34 44" style="left:${here.x}px;top:${here.y}px">${Art.brick('1', false, 5, 14).replace(/<rect/, '<rect')}<rect x="4" y="30" width="26" height="8" rx="2" fill="#6b4a24"/></svg>
    </div>`;
  say(m.at === 0 ? 'Choose your way up. <em>Hover a stamp to read it.</em>' : pick(['Onward.', 'Where next?', 'Choose.', 'Up the stairs.']));
}
async function goNode(id) {
  const m = G.run.map; const n = m.nodes[id];
  const tok = $('.token'); if (tok) { tok.style.left = n.x + 'px'; tok.style.top = n.y + 'px'; }
  Sound.tick(); await sleep(650);
  m.trail.push(id); m.at = id;
  const done = () => { n.done = true; mapScreen(); };
  if (n.t === 'trial') startTrial(Spec.gen(n.fam, {}), { heat: 1, onWin: done });
  else if (n.t === 'bin') brickBin(done);
  else if (n.t === 'bench') workbench(done);
  else if (n.t === 'puzzle') puzzle(done);
  else if (n.t === 'shop') shop(done);
  else if (n.t === 'boss') bossFight();
}

// ---------- the examiners ----------
async function bossFight() {
  const R = REGIONS[G.run.region]; const B = R.boss;
  $('#scene').innerHTML = masterBig(B.eyewear);
  await talk(B.intro, { big: true });
  const phase = async i => {
    const ph = B.phases[i];
    startTrial(Spec.gen(ph.fam, ph.o || {}), {
      heat: ph.heat, boss: { name: B.name, eyewear: B.eyewear, twist: B.twist, phaseIdx: i, phases: B.phases },
      onWin: async () => {
        if (i < B.phases.length - 1) { $('#scene').innerHTML = masterBig(B.eyewear); await talk([B.mid], { big: true }); phase(i + 1); }
        else bossBeaten();
      },
    });
  };
  phase(0);
}
async function bossBeaten() {
  const r = G.run.region; const B = REGIONS[r].boss;
  $('#scene').innerHTML = masterBig(B.eyewear);
  if (r < REGIONS.length - 1) { await talk(B.outro, { big: true }); enterRegion(r + 1); }
  else victory();
}

// ---------- events ----------
function eventFrame(inner) {
  $('#scene').innerHTML = `${lampsHTML()}
    <div class="master" style="top:-14px;width:230px;margin-left:-115px">${Art.master()}</div>
    <div class="turninfo"><strong>${REGIONS[G.run.region].name}</strong><br><span style="color:var(--brass-hi)">${G.run.gold} gold</span></div>
    <div class="event">${inner}</div>`;
}
let EV = {};
function brickBin(done) {
  const R = REGIONS[G.run.region];
  const offer = shuffle(R.shop).slice(0, 3).map(mkInst);
  eventFrame(`<div class="choices shelf">${offer.map((c, i) => `<div class="choice">${techCard(c, { attrs: `data-a="ev" data-k="take" data-i="${i}" role="button" tabindex="0"` })}</div>`).join('')}</div>
    <div class="opts"><button class="btn alt" data-a="ev" data-k="skip" style="color:var(--text-lit)">Take nothing</button></div>`);
  say('Three cards in the brick bin. Take one.');
  EV = { take: el => { const c = offer[+el.dataset.i]; G.run.deck.push(c); Sound.flip(); say(`${CARDS[c.id].name}. Into your bin.`); setTimeout(done, 700); }, skip: done };
}
function workbench(done) {
  let worked = 0;
  const pickCard = () => {
    eventFrame(`<div class="deckgrid">${G.run.deck.map((c, i) => techCard(c, { attrs: `data-a="ev" data-k="pick" data-i="${i}" role="button" tabindex="0"` })).join('')}</div>
      <div class="opts"><button class="btn alt" data-a="ev" data-k="leave" style="color:var(--text-lit)">Leave the workbench</button></div>`);
    say('The workbench. Clamp one card in the vice and I’ll improve it. <em>Choose a card.</em>');
  };
  const options = i => {
    const c = G.run.deck[i];
    eventFrame(`<div class="choices"><div class="choice">${techCard(c)}</div></div>
      <div class="opts">
        <button class="btn" data-a="ev" data-k="up" data-u="refined">Reinforce (+1 brick each use)</button>
        <button class="btn" data-a="ev" data-k="up" data-u="extra">Spare parts (+1 use)</button>
        ${costOf(c) > 0 ? '<button class="btn" data-a="ev" data-k="up" data-u="cheap">Oil it (−1 pin)</button>' : ''}
        ${worked ? '<button class="btn alt" data-a="ev" data-k="leave" style="color:var(--text-lit)">That’s enough</button>' : '<button class="btn alt" data-a="ev" data-k="scrap" style="color:var(--text-lit)">Scrap it (remove it)</button>'}
      </div>`);
    say(worked ? 'Again? <em>Working it twice risks snapping it. One chance in two.</em>' : `${CARDS[c.id].name}. What should I do to it?`);
    EV.up = el => {
      if (worked && Math.random() < .5) { G.run.deck.splice(i, 1); Sound.crack(); say('<em>Snap.</em> Gone. That’s the price of greed.'); setTimeout(done, 1500); return; }
      c[el.dataset.u] = (c[el.dataset.u] || 0) + 1; worked++; Sound.thunk();
      if (worked >= 2) { say('It comes out of the vice better than it went in. Enough for one visit.'); setTimeout(done, 1300); return; }
      options(i);
    };
    EV.scrap = () => { G.run.deck.splice(i, 1); Sound.thunk(); say('Scrapped. A smaller bin draws truer.'); setTimeout(done, 1200); };
  };
  EV = { pick: el => options(+el.dataset.i), leave: done };
  pickCard();
}
function puzzle(done) {
  const used = G.run.riddles || (G.run.riddles = new Set());
  const avail = RIDDLES.map((r, i) => i).filter(i => !used.has(i));
  const idx = pick(avail.length ? avail : RIDDLES.map((r, i) => i)); used.add(idx);
  const R = RIDDLES[idx]; const order = shuffle([0, 1, 2, 3]);
  eventFrame(`<div class="riddle-q">${R.q}</div><div class="riddle-opts">${order.map(k => `<button class="btn opt" data-a="ev" data-k="ans" data-i="${k}">${R.a[k]}</button>`).join('')}</div><div class="opts" id="rid-next"></div>`);
  say('A puzzle. Answer it and I’ll pay you three gold.');
  EV = {
    ans: el => {
      if (EV.answered) return; EV.answered = true;
      const right = +el.dataset.i === 0;
      $$('.riddle-opts .btn').forEach(b => { if (+b.dataset.i === 0) b.classList.add('right'); else if (b === el) b.classList.add('wrong'); });
      if (right) { G.run.gold += 3; Sound.chime(); say(`Yes. ${R.why} <em>Three gold.</em>`); }
      else { Sound.fizzle(); say(`No. ${R.why}`); }
      $('#rid-next').innerHTML = '<button class="btn" data-a="ev" data-k="next">Back to the map</button>';
    },
    next: done,
  };
}
function shop(done) {
  const R = REGIONS[G.run.region];
  const wares = shuffle(R.shop).slice(0, 3).map(mkInst);
  const render = () => {
    const lamp = G.run.lamps < G.run.maxLamps;
    eventFrame(`<div class="choices shelf">${wares.map((c, i) => c ? `<div class="choice">${techCard(c, { attrs: `data-a="ev" data-k="buy" data-i="${i}" role="button" tabindex="0"` })}<span class="price">${PRICES[c.id]} gold</span></div>` : '').join('')}
      ${lamp ? `<div class="choice"><button class="btn" data-a="ev" data-k="lamp" style="padding:18px">${Art.lamp(true).replace('class="lamp-svg lit"', 'class="lamp-svg lit" style="width:46px;height:90px;display:block;margin:0 auto 6px"')}Rewire a lamp</button><span class="price">6 gold</span></div>` : ''}</div>
      <div class="opts"><button class="btn alt" data-a="ev" data-k="leave" style="color:var(--text-lit)">Leave the shop</button></div>`);
  };
  render(); say(`The supply shop. You have ${G.run.gold} gold.`);
  EV = {
    buy: el => { const i = +el.dataset.i; const c = wares[i]; const p = PRICES[c.id]; if (G.run.gold < p) { say(`That’s ${p} gold. You have ${G.run.gold}.`); Sound.fizzle(); return; } G.run.gold -= p; G.run.deck.push(c); wares[i] = null; Sound.chime(); render(); say(`${CARDS[c.id].name}. Into your bin.`); },
    lamp: () => { if (G.run.gold < 6) { say(`Six gold. You have ${G.run.gold}.`); Sound.fizzle(); return; } G.run.gold -= 6; G.run.lamps++; Sound.chime(); render(); say('A new bulb. Don’t waste it.'); },
    leave: done,
  };
}
function satchelView() {
  modal(`<h2>Your brick bin</h2><p>${G.run.deck.length} cards. The tools on the rack are always yours and cost nothing.</p><div class="deckgrid">${G.run.deck.map(c => techCard(c)).join('')}</div>
    <div class="row"><button class="btn alt" data-a="mc" data-k="close">Close</button></div>`, { close: closeModal }, { closable: true, width: 960 });
}

// ---------- endings ----------
async function gameOver() {
  TR = null;
  $('#scene').innerHTML = masterBig() + `<div class="lamps">${Art.lamp(false)}${Art.lamp(false)}</div>`;
  await talk(['Both lamps are out. That’s the night.', `You stamped ${G.run.solved.length} build${G.run.solved.length === 1 ? '' : 's'}. The logbook keeps them. Come back tomorrow.`], { big: true });
  endSheet('The workshop goes dark');
}
async function victory() {
  TR = null;
  $('#scene').innerHTML = masterBig();
  await talk([
    '<em>He sets the last brick on the arch and looks at you for a long moment.</em>',
    'Three rooms. Balances, rectangles, staircases. You can do what I do now, just slower. Speed comes with years.',
    '<em>He puts his hard hat on your head and switches off the lamps himself.</em> Take the logbook home.',
  ], { big: true });
  endSheet('The build is finished');
}
function endSheet(title) {
  const s = G.run.solved;
  modal(`<h2>${title}</h2><p>This apprenticeship’s logbook:</p><ol class="ledger-list">${s.map(e => `<li>${M(e.q)} <span class="arrow">→</span> ${M(e.a)}</li>`).join('') || '<li>Nothing stamped.</li>'}</ol>
    <div class="row"><button class="btn" data-a="mc" data-k="again">Sit down again</button><button class="btn alt" data-a="mc" data-k="title">Back to the door</button></div>`,
    { again: () => { closeModal(); beginRun(); }, title: () => { closeModal(); titleScreen(); } }, { width: 820 });
}

// ---------- practice ----------
function practiceMenu() {
  const rooms = [['The Foundations', ['onestep', 'twostep', 'bothsides', 'distribute', 'ineq', 'ineq2']], ['The Frames', ['expand', 'factor', 'solvefactor', 'sqroot', 'complete', 'formula']], ['The Baseplate', ['evaluate', 'stdform', 'slope2pt', 'graphline', 'bridge']]];
  modal(`<h2>The practice bench</h2><p>No lamps, no gold. Advice is free. Pick a kind of problem and I’ll keep setting them.</p>
    <div class="fam-grid">${rooms.map(([r, fs]) => `<h3>${r}</h3>` + fs.map(f => `<button class="btn opt" data-a="mc" data-k="go" data-f="${f}">${Spec.FAMS[f].name}<small>${Spec.FAMS[f].label}</small></button>`).join('')).join('')}</div>
    <div class="row"><button class="btn alt" data-a="mc" data-k="close">Back</button></div>`,
    { go: el => { closeModal(); startPractice(el.dataset.f); }, close: () => { closeModal(); if (!TR) titleScreen(); } }, { width: 900, closable: true });
}
function startPractice(fam) {
  G = G && G.run ? G : { run: { region: 0, lamps: 2, maxLamps: 2, gold: 0, deck: [], solved: [] } };
  const deck = ['factor', 'factor', 'zero', 'zero', 'root', 'root', 'complete', 'formula', 'swap', 'swap', 'stairs', 'stairs', 'plug', 'start', 'pins', 'pins'].map(mkInst);
  startTrial(Spec.gen(fam, {}), { heat: 1, practice: true, fam, deck });
}

// ---------- wiring ----------
function onClick(ev) {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a;
  if (a === 'mc') { const f = MODAL[el.dataset.k]; if (f) f(el); return; }
  if (a === 'ev') { const f = EV[el.dataset.k]; if (f) f(el); return; }
  if (a === 'mute') { Sound.toggle(); $('#mute').textContent = Sound.muted ? '♪̸' : '♪'; $('#mute').setAttribute('aria-label', Sound.muted ? 'Sound off' : 'Sound on'); return; }
  if (a === 'home') { if (confirmLeave()) titleScreen(); return; }
  if (a === 'begin') return beginRun();
  if (a === 'practice') return practiceMenu();
  if (a === 'ledger') return ledgerView();
  if (a === 'node') return goNode(+el.dataset.n);
  if (a === 'satchel') return satchelView();
  if (TR) trialClick(a, el);
}
function confirmLeave() { return !G || !G.run || !G.run.map || window.confirm('Leave this apprenticeship? The run will be lost; the logbook stays.'); }
function onKey(ev) {
  if (ev.key === 'Escape') {
    if ($('#modal').classList.contains('on') && MODAL.close) { MODAL.close(); return; }
    if (TR && TR.sel) { TR.sel = null; renderTrial(); }
  }
  if ((ev.key === ' ' || ev.key === 'Enter') && $('#blocker').style.display === 'block') { ev.preventDefault(); blockerClick(); }
  if ($('#modal').classList.contains('on')) { if (ev.key === 'ArrowLeft' && MODAL.prev) MODAL.prev(); if (ev.key === 'ArrowRight' && MODAL.next) MODAL.next(); }
}
function init() {
  Stage.el = $('#stage'); Stage.fit();
  window.addEventListener('resize', () => Stage.fit());
  Stage.el.addEventListener('click', onClick);
  $('#blocker').addEventListener('click', blockerClick);
  document.addEventListener('keydown', onKey);
  Stage.el.addEventListener('mouseover', ev => { const el = ev.target.closest('[data-tip]'); if (el) showTip(el.dataset.tip, ev); else hideTip(); });
  Stage.el.addEventListener('mousemove', ev => { const el = ev.target.closest('[data-tip]'); if (el) showTip(el.dataset.tip, ev); });
  Stage.el.addEventListener('mouseleave', hideTip);
  Stage.el.addEventListener('contextmenu', ev => { if (TR && TR.sel) { ev.preventDefault(); TR.sel = null; renderTrial(); } });
  $('#mute').textContent = Sound.muted ? '♪̸' : '♪';
  titleScreen();
}
document.addEventListener('DOMContentLoaded', init);
