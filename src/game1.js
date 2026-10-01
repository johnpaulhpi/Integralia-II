/* ================================================================
   ALGEBRICK — game, part 1: plumbing, data, voice
   ================================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const M = html => `<span class="m">${html}</span>`;

// ---------- storage (per-viewer conveniences only) ----------
const Store = {
  get(k, d) { try { let v = localStorage.getItem(k); if (v === null) v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

// ---------- sound ----------
const Sound = (() => {
  let ctx = null; let muted = Store.get('algebrick-muted', false);
  const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, dur, type = 'sine', gain = .2, when = 0) {
    const a = ac(); if (!a || muted) return; const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, gain = .15, freq = 1200, q = 1, when = 0) {
    const a = ac(); if (!a || muted) return; const t = a.currentTime + when;
    const len = Math.floor(a.sampleRate * dur); const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(); s.buffer = buf; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = a.createGain(); g.gain.value = gain; s.connect(bp).connect(g).connect(a.destination); s.start(t);
  }
  return {
    bell() { tone(1318, 1.7, 'sine', .16); tone(1976, 1.1, 'sine', .06); tone(659, 1.9, 'triangle', .05); },
    thunk() { tone(96, .28, 'sine', .32); noise(.08, .1, 380); },
    tick() { tone(660, .09, 'triangle', .06); },
    flip() { noise(.07, .09, 2600, .8); },
    sizzle() { noise(.55, .07, 4200, .5); tone(180, .3, 'sine', .04); },
    chime() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 1.1, 'sine', .08, i * .09)); },
    crack() { noise(.4, .32, 1900, .5); noise(.2, .2, 5000, 1, .08); tone(70, .5, 'sawtooth', .06); },
    fizzle() { noise(.25, .06, 700, 1.5); tone(220, .2, 'triangle', .04); tone(165, .25, 'triangle', .04, .1); },
    get muted() { return muted; },
    toggle() { muted = !muted; Store.set('algebrick-muted', muted); if (!muted) this.tick(); },
  };
})();

// ---------- data: technique cards ----------
const fr = (a, b) => `<span class="fr"><span class="fn">${a}</span><span class="fd">${b}</span></span>`;
const CARDS = {
  factor: { name: 'The Rectangle', tech: 'factoring', cost: 1, doses: 2, yld: 2, target: 'side', art: 'rect',
    rule: 'Arrange one side’s bricks into a rectangle. Its two side lengths are the factors.' },
  zero: { name: 'Pry Bar', tech: 'zero-product property', cost: 1, doses: 2, yld: 1, target: 'eq', art: 'crowbar',
    rule: `If ${M('<i>A</i> · <i>B</i> = 0')}, then ${M('<i>A</i> = 0')} or ${M('<i>B</i> = 0')}.` },
  root: { name: 'Square-Root Cutter', tech: 'square roots', cost: 1, doses: 2, yld: 1, target: 'eq', art: 'cutter',
    rule: `${M('(□)<sup>2</sup> = <i>k</i>')} becomes ${M('□ = ±√<i>k</i>')}.` },
  complete: { name: 'Corner Piece', tech: 'completing the square', cost: 2, doses: 1, yld: 2, target: 'eq', art: 'corner',
    rule: `For ${M('<i>x</i><sup>2</sup> + <i>bx</i>')}, add ${M('(<i>b</i>/2)<sup>2</sup>')} to both sides to finish the square.` },
  formula: { name: 'The Master Formula', tech: 'quadratic formula', cost: 3, doses: 1, yld: 3, target: 'eq', art: 'formula',
    rule: M(`<i>x</i> = ${fr('−<i>b</i> ± √(<i>b</i><sup>2</sup> − 4<i>ac</i>)', '2<i>a</i>')}`) },
  swap: { name: 'Swap Bricks', tech: 'evaluating a function', cost: 1, doses: 2, yld: 1, target: 'now', art: 'swap',
    rule: 'Replace every x-brick with the input number.' },
  stairs: { name: 'Staircase', tech: 'slope = rise ÷ run', cost: 1, doses: 2, yld: 1, target: 'point', art: 'stairs',
    rule: 'Build the steps between points on the baseplate: so many up for so many across.' },
  plug: { name: 'Plug-in', tech: 'a point on the line', cost: 1, doses: 1, yld: 1, target: 'point', art: 'plug',
    rule: `Put a point’s ${M('(<i>x</i>, <i>y</i>)')} into ${M('<i>y</i> = <i>mx</i> + <i>b</i>')}.` },
  start: { name: 'Start Brick', tech: 'the y-intercept', cost: 0, doses: 1, yld: 1, target: 'stud', art: 'flag',
    rule: `Place it where the line crosses the y-axis, at ${M('(0, <i>b</i>)')}.` },
  pins: { name: 'Spare Pins', tech: 'supplies', cost: 0, doses: 1, yld: 0, target: false, art: 'pins', rule: 'Add 2 pins to your tray.' },
  rummage: { name: 'Rummage', tech: 'draw', cost: 1, doses: 1, yld: 0, target: false, art: 'bin', rule: 'Draw 2 cards from the brick bin.' },
  level: { name: 'Spirit Level', tech: 'relief', cost: 1, doses: 1, yld: 0, target: false, art: 'level', rule: 'Take 2 bricks off the Master Builder’s tower.' },
  manual: { name: 'Instructions', tech: 'free build', cost: 0, doses: 1, yld: 0, target: false, art: 'manual', rule: 'Your next card this turn costs no pins.' },
};
const PRICES = { factor: 4, zero: 3, root: 3, complete: 5, formula: 6, swap: 3, stairs: 3, plug: 3, start: 2, pins: 3, rummage: 3, level: 3, manual: 3 };

// ---------- data: tools (always on the rack, free) ----------
const TOOLS = [
  { id: 'snap', name: 'Snap', art: 'snap', yld: 0, tip: 'Combine like bricks on each side. Bricks of the same shape click into one pile, and a red brick cancels a matching coloured one.', how: 'Snap: click an equation to click its like bricks together.' },
  { id: 'counter', name: 'Counterweight', art: 'counter', yld: 1, tip: 'Move a brick card off its side by putting its opposite on both sides. It cancels where it was, and shows up flipped on the other side.', how: 'Counterweight: click the brick card you want to move off its side.' },
  { id: 'saw', name: 'Saw', art: 'saw', yld: 1, tip: 'Divide both sides by the number in front of a variable brick (3x becomes x). Sawing by a negative number flips an inequality. On the baseplate, it saws the rise by the run.', how: 'Saw: click the variable brick whose number should be sawn off (or the staircase).' },
  { id: 'unbox', name: 'Unbox', art: 'unbox', yld: 1, tip: 'Distribute: open a crate like 3(x + 2) into 3x + 6, or multiply out a frame like (x + 2)(x + 3).', how: 'Unbox: click a crate or a frame.' },
  { id: 'stamp', name: 'Stamp', art: 'stamp', yld: 1, tip: 'Stamp the finished build: the variable alone on one side, or the form the blueprint asks for.', how: '' },
];
const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));

// ---------- data: the three rooms ----------
const REGIONS = [
  {
    name: 'The Foundations', motto: 'Equations and inequalities',
    pool: ['onestep', 'twostep', 'bothsides', 'distribute', 'ineq'],
    shop: ['pins', 'rummage', 'level', 'manual'],
    gifts: ['pins', 'rummage', 'level'],
    intro: [
      'Foundations first. Nothing stands on a crooked footing.',
      'An equation is two plates on a balance. Whatever you do to one plate, you do to the other, or the whole thing tips.',
      'Your job: get <b>x</b> alone on one plate. The Counterweight moves a brick across. The Saw splits both sides into equal groups. Snap tidies up like bricks.',
    ],
    giftLine: 'These rooms need nothing but your tools. Take some supplies for the bin anyway.',
    boss: {
      name: 'The Inspector', eyewear: 'loupe', twist: null,
      phases: [{ fam: 'distribute', o: { hard: true }, heat: 1 }, { fam: 'ineq2', heat: 2 }],
      intro: ['<em>He screws a jeweller’s loupe into one eye.</em>', 'The Inspector, tonight. I check foundations for a living. Crates first, then a tilted beam.'],
      mid: 'Level enough. The second one tilts. <em>Two bricks a turn.</em>',
      outro: ['<em>He unscrews the loupe.</em> Your footings hold. Up to the frames.'],
    },
  },
  {
    name: 'The Frames', motto: 'Factoring and quadratics',
    pool: ['expand', 'factor', 'solvefactor', 'sqroot', 'complete'],
    shop: ['factor', 'zero', 'root', 'complete', 'formula', 'pins', 'rummage', 'level', 'manual'],
    gifts: ['factor', 'factor', 'zero', 'root', 'complete'],
    intro: [
      'The frames. Here the big blue plates come in: x times x.',
      'Every product is a rectangle. (x + 2)(x + 3) is a rectangle with those side lengths. Count the bricks inside and you get x² + 5x + 6. Factoring runs it backwards: arrange the bricks into a rectangle and read off its sides.',
      'And when one side is a product and the other is zero, the Pry Bar splits it, because the only way to multiply to zero is for one piece to be zero.',
    ],
    giftLine: 'Two Rectangles, a Pry Bar, a Square-Root Cutter and a Corner Piece.',
    boss: {
      name: 'The Welder', eyewear: 'goggles', twist: 'pins',
      phases: [{ fam: 'solvefactor', o: { hard: true }, heat: 1 }, { fam: 'complete', o: { irr: true }, heat: 1 }],
      intro: ['<em>He pulls smoked goggles down over his eyes.</em>', 'The Welder. I need pins for my joints. Leave two or more in your tray when you ring the bell and <em>I’ll take one.</em>'],
      mid: 'It holds. The next one needs a corner filled.',
      outro: ['<em>He pushes the goggles up.</em> Square work. The baseplate is yours.'],
    },
  },
  {
    name: 'The Baseplate', motto: 'Functions, slope and graphing',
    pool: ['evaluate', 'stdform', 'slope2pt', 'graphline'],
    shop: ['swap', 'stairs', 'plug', 'start', 'formula', 'pins', 'rummage', 'level', 'manual'],
    gifts: ['swap', 'stairs', 'stairs', 'plug', 'start'],
    intro: [
      'The baseplate. A grid of studs: every stud is a point (x, y).',
      'A line is a staircase. Every step goes the same number up for the same number across. That ratio, rise over run, is the slope m. Where the line crosses the y-axis is b. Together: y = mx + b.',
      'And a function is a machine: put a number in for x, swap every x-brick for it, and read what comes out.',
    ],
    giftLine: 'Swap Bricks, two Staircases, a Plug-in and a Start Brick.',
    boss: {
      name: 'The Master Builder', eyewear: 'spectacles', twist: null,
      phases: [{ fam: 'formula', o: { hard: true }, heat: 2 }, { fam: 'bridge', heat: 2 }],
      intro: ['<em>He takes off his hard hat and sets it on the bench.</em>', 'No inspector, no welder. Just me. First, the formula. Then the job I’ve been saving: where a straight beam meets an arch.'],
      mid: 'One more. The beam and the arch.',
      outro: [],
    },
  },
];

// ---------- data: puzzles ----------
const RIDDLES = [
  { q: `${M('(−3) · (−4)')} = ?`, a: [M('12'), M('−12'), M('−7'), M('7')], why: 'Two negatives multiply to a positive: two red bricks flipped twice.' },
  { q: `If ${M('−2<i>x</i> &lt; 6')}, then…`, a: [M('<i>x</i> &gt; −3'), M('<i>x</i> &lt; −3'), M('<i>x</i> &lt; 3'), M('<i>x</i> &gt; 3')], why: 'Dividing by −2 flips the sign: the beam tips the other way.' },
  { q: `${M('(<i>x</i> + 3)<sup>2</sup>')} = ?`, a: [M('<i>x</i><sup>2</sup> + 6<i>x</i> + 9'), M('<i>x</i><sup>2</sup> + 9'), M('<i>x</i><sup>2</sup> + 3<i>x</i> + 9'), M('2<i>x</i> + 6')], why: 'The square has two strips of 3x-bricks and a 3 by 3 corner: x² + 6x + 9.' },
  { q: `${M('<i>x</i><sup>2</sup> − 9')} factors as?`, a: [M('(<i>x</i> − 3)(<i>x</i> + 3)'), M('(<i>x</i> − 3)<sup>2</sup>'), M('(<i>x</i> − 9)(<i>x</i> + 1)'), M('It doesn’t factor')], why: 'A difference of squares: a² − b² = (a − b)(a + b).' },
  { q: 'Which two numbers multiply to 12 and add to 7?', a: [M('3 and 4'), M('2 and 6'), M('1 and 12'), M('−3 and −4')], why: 'So x² + 7x + 12 = (x + 3)(x + 4).' },
  { q: `What is the slope of ${M('<i>y</i> = 3<i>x</i> − 2')}?`, a: [M('3'), M('−2'), M('<i>x</i>'), M('1/3')], why: 'In y = mx + b, the number in front of x is the slope m.' },
  { q: `Where does ${M('<i>y</i> = 2<i>x</i> + 5')} cross the y-axis?`, a: [M('(0, 5)'), M('(5, 0)'), M('(0, 2)'), M('(2, 5)')], why: 'On the y-axis x = 0, so y = 5.' },
  { q: 'The slope from (1, 2) to (3, 8) is?', a: [M('3'), M('6'), M('2'), M('1/3')], why: 'Rise 6 over run 2 is 3.' },
  { q: `If ${M('<i>f</i>(<i>x</i>) = <i>x</i><sup>2</sup> − 1')}, then ${M('<i>f</i>(−3)')} = ?`, a: [M('8'), M('−10'), M('10'), M('−8')], why: '(−3)² = 9, and 9 − 1 = 8. The square of a negative is positive.' },
  { q: `${M('√50')} simplifies to?`, a: [M('5√2'), M('25√2'), M('2√5'), M('10√5')], why: '50 = 25 · 2, and √25 = 5.' },
  { q: `Solve ${M('<i>x</i><sup>2</sup> = 49')}.`, a: [M('<i>x</i> = ±7'), M('<i>x</i> = 7'), M('<i>x</i> = 24.5'), M('<i>x</i> = −7')], why: 'Both 7 and −7 square to 49.' },
  { q: `${M('3(<i>x</i> − 4)')} = ?`, a: [M('3<i>x</i> − 12'), M('3<i>x</i> − 4'), M('<i>x</i> − 12'), M('3<i>x</i> + 12')], why: 'The 3 multiplies every brick in the crate.' },
  { q: `For ${M('<i>x</i><sup>2</sup> + 10<i>x</i>')}, what completes the square?`, a: [M('25'), M('10'), M('100'), M('5')], why: 'Half of 10 is 5, and 5² = 25.' },
  { q: `How many real solutions does ${M('<i>x</i><sup>2</sup> + 4 = 0')} have?`, a: [M('none'), M('one'), M('two'), M('four')], why: 'x² is never negative, so x² can’t be −4.' },
  { q: 'Which line is steeper?', a: [M('<i>y</i> = −4<i>x</i>'), M('<i>y</i> = 3<i>x</i> + 10'), M('<i>y</i> = <i>x</i>'), M('<i>y</i> = ½<i>x</i> − 9')], why: 'Steepness is the size of the slope: |−4| is the biggest.' },
  { q: `Solve ${M('<i>x</i>/3 = 5')}.`, a: [M('15'), M('5/3'), M('8'), M('2')], why: 'Multiply both sides by 3.' },
];

// ---------- the Master Builder’s lines ----------
const LINES = {
  heat: ['A brick for my tower.', 'Tick.', 'My tower grows.', 'Take your time. My tower won’t wait.', 'Hm.', 'Another brick.', 'The mortar’s drying.', 'Up it goes.'],
  no: ['No.', 'That doesn’t fit.', 'The bricks won’t click.', 'Not like that.', 'Wobbly.', 'That won’t hold.'],
  win: ['Solid.', 'Square and level.', 'Clean build.', 'Into the logbook with it.', 'Tidy.'],
  draw: ['Draw.', 'Your turn. Draw.', 'Bin or pins?'],
};

// ---------- names for brick cards ----------
function material(p) {
  const P = (name, sub, tone, lore) => ({ name, sub, tone, lore });
  const neg = p.c && p.c.n < 0;
  if (p.t === 'root') return P('Root brick', 'a square root', neg ? 'neg' : 'root', 'A root brick: a square root that doesn’t come out whole, like √2. Leave it as it is; it’s exact.');
  if (p.t === 'group') {
    if (p.f.length === 1) return P('Crate', 'a number times a group', 'crate', 'A crate: everything inside is multiplied by the number on the lid. Unbox it to distribute.');
    if (p.f.length === 2 && Alg.peq(p.f[0], p.f[1])) return P('Square frame', 'a perfect square', 'crate', 'A square frame: something times itself. The Square-Root Cutter undoes a square.');
    return P('Frame', 'a product', 'crate', 'A frame: a rectangle whose sides are the factors. Unbox multiplies it out; the Pry Bar splits it when it equals 0.');
  }
  const k = p.k;
  if (k === '1') return P(neg ? 'Red studs' : 'Studs', neg ? 'negative ones' : 'ones', neg ? 'neg' : 'one', 'Studs: plain numbers. Each yellow stud is 1, each red stud is −1, and a yellow and a red cancel.');
  if (k === 'x') return P(neg ? 'Red x-bricks' : 'x-bricks', neg ? 'negative x' : 'unknown length x', neg ? 'neg' : 'x', 'An x-brick is a long brick of unknown length x. We never measure it directly; we find it by balancing.');
  if (k === 'x2') return P(neg ? 'Red x² plates' : 'x² plates', 'x times x', neg ? 'neg' : 'x2', 'An x² plate is a square, x long and x wide: x times x.');
  if (k === 'y') return P(neg ? 'Red y-bricks' : 'y-bricks', 'unknown length y', neg ? 'neg' : 'y', 'A y-brick is a second unknown, a different length from x.');
  if (k === 'b') return P('b-brick', 'the y-intercept', neg ? 'neg' : 'b', 'The b-brick is where the line crosses the y-axis. Solve for it.');
  return P('Bricks', '', 'one', '');
}
// ---------- stage & scaling ----------
const Stage = {
  el: null, scale: 1,
  fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    this.scale = s;
    this.el.style.transform = `translate(-50%, -50%) scale(${s})`;
    this.el.style.transformOrigin = '50% 50%';
  },
};

// ---------- the Master's voice ----------
const Voice = (() => {
  let timer = null, units = [], idx = 0, onDone = null;
  function prep(html) {
    const box = $('#speech'); box.innerHTML = html;
    units = [];
    const walk = node => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const c of ch.textContent) { const s = document.createElement('span'); s.textContent = c; s.style.opacity = 0; frag.appendChild(s); units.push(s); }
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.classList.contains('m') || ch.tagName === 'SVG') { ch.style.opacity = 0; units.push(ch); }
          else walk(ch);
        }
      }
    };
    walk(box);
  }
  function say(html, opts = {}) {
    clearInterval(timer); idx = 0;
    const box = $('#speech'); box.className = opts.big ? 'big' : '';
    prep(html);
    const speed = opts.fast ? 6 : 16;
    return new Promise(res => {
      onDone = res;
      timer = setInterval(() => {
        for (let k = 0; k < 2 && idx < units.length; k++) units[idx++].style.opacity = 1;
        if (idx >= units.length) { clearInterval(timer); timer = null; const d = onDone; onDone = null; d && d(); }
      }, speed);
    });
  }
  function finish() { if (!timer) return false; clearInterval(timer); timer = null; units.forEach(u => u.style.opacity = 1); const d = onDone; onDone = null; d && d(); return true; }
  const typing = () => !!timer;
  return { say, finish, typing };
})();
const say = (html, opts) => Voice.say(html, opts);

// blocking conversation: click to advance
let talkWaiter = null;
async function talk(lines, opts = {}) {
  const bl = $('#blocker'); bl.style.display = 'block';
  for (const line of lines) {
    await say(line, opts);
    $('#taphint').style.display = 'block';
    await new Promise(r => { talkWaiter = r; });
    $('#taphint').style.display = 'none';
  }
  talkWaiter = null; bl.style.display = 'none';
}
function blockerClick() {
  if (Voice.typing()) { Voice.finish(); return; }
  if (talkWaiter) { const r = talkWaiter; talkWaiter = null; r(); }
}

// ---------- tooltip ----------
function showTip(html, ev) {
  const tip = $('#tip'); tip.innerHTML = html; tip.style.display = 'block';
  const r = Stage.el.getBoundingClientRect(); const s = Stage.scale;
  let x = (ev.clientX - r.left) / s + 16, y = (ev.clientY - r.top) / s + 14;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  if (x + w > 1270) x -= w + 30; if (y + h > 790) y -= h + 26;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
const hideTip = () => { $('#tip').style.display = 'none'; };

// ---------- modal ----------
let MODAL = {};
function modal(html, handlers = {}, opts = {}) {
  const m = $('#modal'); m.innerHTML = `<div class="sheet ${opts.cls || ''}" style="${opts.width ? 'width:' + opts.width + 'px' : ''}">${opts.closable ? '<button class="x" data-a="mc" data-k="close" aria-label="Close">×</button>' : ''}${html}</div>`;
  MODAL = handlers; m.classList.add('on');
}
function closeModal() { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; MODAL = {}; }

// ---------- ledger (persistent across sessions, this browser only) ----------
const Ledger = {
  all() { return Store.get('algebrick-ledger', []); },
  add(q, a, fam, p) { const l = this.all(); l.unshift({ q, a, fam, p, t: Date.now() }); Store.set('algebrick-ledger', l.slice(0, 150)); },
};
