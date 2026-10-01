/* ================================================================
   ALGEBRICK — drawings (inline SVG)
   ================================================================ */
const Art = (() => {
  const S = (body, vb = '0 0 60 44') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  // ---------- brick colours: [fill, edge, stud-highlight] ----------
  const COL = {
    '1': ['#f2c233', '#a8801a', '#ffe38a'], x: ['#43a84f', '#23692c', '#8fdc96'], x2: ['#3577d4', '#1f4d93', '#8fb8f2'],
    y: ['#8e5fcf', '#5a3793', '#c9a9f2'], b: ['#ef8a2e', '#a85a17', '#ffc185'], neg: ['#d6443a', '#8e2820', '#ff9d92'],
    root: ['#b9c2cc', '#6f7a86', '#eef3f7'], crate: ['#a8743f', '#5e3d1d', '#d8a86c'],
  };
  const U = 20, GAP = 3;
  const DIM = { '1': [1, 1], x: [3.4, 1], x2: [3.4, 3.4], y: [2.6, 1], b: [2, 1] };   // in stud units
  function stud(cx, cy, c) { return `<circle cx="${cx}" cy="${cy + 1.2}" r="5.4" fill="${c[1]}" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="5.4" fill="${c[0]}" stroke="${c[1]}" stroke-width=".9"/><path d="M${cx - 3} ${cy - 1.5}a3.4 3.4 0 0 1 4-2.2" stroke="${c[2]}" stroke-width="1.3" fill="none"/>`; }
  // one brick at (x, y), top view
  function brick(k, neg, x = 0, y = 0) {
    const c = neg ? COL.neg : COL[k] || COL['1'];
    const [wu, hu] = DIM[k] || DIM['1'];
    const w = wu * U, h = hu * U;
    let s = `<rect x="${x}" y="${y + 1.6}" width="${w}" height="${h}" rx="3" fill="${c[1]}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c[0]}" stroke="${c[1]}" stroke-width="1"/>`;
    s += `<path d="M${x + 2} ${y + h - 2}V${y + 2}H${x + w - 2}" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" fill="none"/>`;
    const nx = Math.max(1, Math.floor(wu)), ny = Math.max(1, Math.floor(hu));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) s += stud(x + (i + .5) * (w / nx), y + (j + .5) * (h / ny), c);
    if (neg) s += `<path d="M${x + w / 2 - 4} ${y + h - 4}h8" stroke="#fff" stroke-width="2" opacity=".9"/>`;
    return s;
  }
  // a pile of bricks for a term card: returns {svg, badge}
  function pile(k, c) {
    const neg = c.n < 0; const a = Math.abs(c.n);
    const whole = c.d === 1;
    const [wu, hu] = DIM[k] || DIM['1']; const w = wu * U, h = hu * U;
    const cap = { '1': 12, x: 6, x2: 4, y: 6, b: 4 }[k] || 6;
    let n = whole && a <= cap ? a : 1;
    const cols = k === '1' ? Math.min(n, n > 6 ? 4 : 3) : (k === 'x2' ? Math.min(n, 2) : (n > 3 ? 2 : 1));
    const rows = Math.ceil(n / cols);
    let body = '';
    for (let i = 0; i < n; i++) { const col = i % cols, row = Math.floor(i / cols); body += brick(k, neg, 2 + col * (w + GAP), 2 + row * (h + GAP)); }
    const W = cols * (w + GAP) + 2, H = rows * (h + GAP) + 4;
    const badge = (whole && a <= cap) ? '' : (whole ? `×${a}` : `×<span class="fr"><span class="fn">${a}</span><span class="fd">${c.d}</span></span>`);
    return { svg: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${body}</svg>`, badge };
  }
  function rootBrick(n, neg) {
    const c = neg ? COL.neg : COL.root;
    return `<svg viewBox="0 0 70 30" aria-hidden="true"><rect x="2" y="3.6" width="66" height="24" rx="4" fill="${c[1]}"/><rect x="2" y="2" width="66" height="24" rx="4" fill="${c[0]}" stroke="${c[1]}"/>
      <text x="35" y="20" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="17" font-weight="700" fill="#2a2a33">√${n}</text></svg>`;
  }
  // a crate (one factor) or a frame (a product) for group cards
  function crate() {
    const c = COL.crate;
    return `<svg viewBox="0 0 90 60" aria-hidden="true"><rect x="6" y="10" width="78" height="44" rx="4" fill="${c[0]}" stroke="${c[1]}" stroke-width="2"/>
      <path d="M6 24h78M6 40h78M22 10v44M68 10v44" stroke="${c[1]}" stroke-width="1.4" opacity=".6"/><path d="M4 12l12-8h58l12 8" fill="${c[2]}" stroke="${c[1]}" stroke-width="1.6"/>
      ${brick('x', false, 26, 27).replace(/<rect/g, '<rect opacity=".95"')}</svg>`;
  }
  function frame(square) {
    const X = 44, one = 13;
    const cells = square
      ? `<rect x="8" y="8" width="${X}" height="${X}" fill="${COL.x2[0]}" stroke="${COL.x2[1]}"/><rect x="${8 + X}" y="8" width="${one * 2}" height="${X}" fill="${COL.x[0]}" stroke="${COL.x[1]}"/><rect x="8" y="${8 + X}" width="${X}" height="${one * 2}" fill="${COL.x[0]}" stroke="${COL.x[1]}"/><rect x="${8 + X}" y="${8 + X}" width="${one * 2}" height="${one * 2}" fill="${COL['1'][0]}" stroke="${COL['1'][1]}"/>`
      : `<rect x="8" y="8" width="${X}" height="${X}" fill="${COL.x2[0]}" stroke="${COL.x2[1]}"/><rect x="${8 + X}" y="8" width="${one * 3}" height="${X}" fill="${COL.x[0]}" stroke="${COL.x[1]}"/><rect x="8" y="${8 + X}" width="${X}" height="${one * 2}" fill="${COL.x[0]}" stroke="${COL.x[1]}"/><rect x="${8 + X}" y="${8 + X}" width="${one * 3}" height="${one * 2}" fill="${COL['1'][0]}" stroke="${COL['1'][1]}"/>`;
    return `<svg viewBox="0 0 ${square ? 82 : 96} ${square ? 82 : 82}" aria-hidden="true"><rect x="5" y="5" width="${square ? 72 : 86}" height="${square ? 72 : 60}" rx="3" fill="none" stroke="#6b4a24" stroke-width="3"/>${cells}</svg>`;
  }
  // ---------- tool icons ----------
  const I = {
    snap: S(`<rect x="6" y="18" width="20" height="14" rx="2"/><rect x="34" y="18" width="20" height="14" rx="2"/><circle cx="12" cy="18" r="2.5"/><circle cx="20" cy="18" r="2.5"/><circle cx="40" cy="18" r="2.5"/><circle cx="48" cy="18" r="2.5"/><path d="M27 12l3 4l3-4M27 38l3-4l3 4"/>`),
    counter: S(`<path d="M30 6v32M14 38h32"/><path d="M8 14h44"/><path d="M8 14l-5 12h10zM52 14l-5 12h10z"/><path d="M5 26a3 3 0 0 0 6 0M49 26a3 3 0 0 0 6 0"/><path d="M6 20h4M8 18v4" stroke-width="1.3"/><path d="M50 20h4" stroke-width="1.3"/>`),
    saw: S(`<path d="M8 30l30-18l6 10l-30 18z"/><path d="M14 36l2 3M18 34l2 3M22 32l2 3M26 29l2 3M30 27l2 3M34 25l2 3" stroke-width="1.2"/><path d="M38 12l8-5a4 4 0 0 1 6 2l2 5a4 4 0 0 1-2 5l-8 3"/>`),
    unbox: S(`<path d="M10 20h40v18H10z"/><path d="M10 20l-6-8h22l4 8M50 20l6-8H34l-4 8"/><path d="M30 20v18"/><path d="M24 8l6-5l6 5" stroke-width="1.3"/>`),
    stamp: S(`<path d="M24 6h12v10l4 6H20l4-6z"/><path d="M12 22h36v8H12z"/><path d="M14 36h32" stroke-width="2.4"/>`),
    ask: S(`<path d="M10 8h40v22H26l-10 8v-8h-6z"/><path d="M26 15a4 4 0 1 1 5 4c-1 .6-1 1.5-1 3"/><circle cx="30" cy="26" r=".9" fill="currentColor"/>`),
    sweep: S(`<path d="M42 6L26 26"/><path d="M26 26l-12 6l-4 8l18-6l6-10z"/><path d="M14 38l4-6M20 38l3-5"/>`),
    lens: S(`<circle cx="24" cy="19" r="11" fill="var(--tint)" fill-opacity=".25"/><path d="M32 27l12 12" stroke-width="4"/><path d="M18 15a7 7 0 0 1 6-3" stroke-width="1.4"/>`),
    // card art
    rect: S(`<rect x="10" y="6" width="40" height="32" rx="1"/><path d="M34 6v32M10 26h40"/><path d="M4 6v20M4 30v8M10 42h24M36 42h14" stroke-width="1.2"/>`),
    crowbar: S(`<path d="M10 38L42 10l6 2l2 6"/><path d="M10 38l-4-2"/><path d="M36 26h14M43 19v14" stroke-width="1.3"/>`),
    cutter: S(`<rect x="8" y="12" width="24" height="24"/><path d="M36 10l16 26M52 10L36 36"/><path d="M12 28l3 3l5-12h8" stroke-width="1.4"/>`),
    corner: S(`<path d="M8 8h26v26H8z"/><path d="M34 8h10v26H34M8 34h26v8H8"/><rect x="34" y="34" width="10" height="8" stroke-dasharray="2 2"/>`),
    formula: S(`<path d="M12 6h30a6 6 0 0 1 6 6v26H18a6 6 0 0 1-6-6z"/><path d="M18 18h24M18 26h18" stroke-width="1.2"/><path d="M30 12v12M24 18h12" stroke-width="1.6"/>`),
    swap: S(`<rect x="6" y="10" width="20" height="8" rx="2"/><rect x="36" y="8" width="7" height="7" rx="1"/><rect x="45" y="8" width="7" height="7" rx="1"/><path d="M14 26q16 10 30 0M40 26l4 0l0-4"/><path d="M44 18q-14-8-28 0" stroke-dasharray="2 3"/>`),
    stairs: S(`<path d="M6 38h10v-8h10v-8h10v-8h10v-8h8"/><path d="M6 38h48" stroke-width="1" opacity=".5"/>`),
    plug: S(`<path d="M6 38L54 8" stroke-width="1.3"/><circle cx="30" cy="23" r="4" fill="currentColor"/><path d="M30 23v15M30 23H6" stroke-dasharray="2 2" stroke-width="1"/>`),
    flag: S(`<path d="M16 40V6"/><path d="M16 8h22l-5 6l5 6H16" fill="var(--tint)" fill-opacity=".4"/><path d="M8 40h40" stroke-width="1"/>`),
    pins: S(`<path d="M14 12h32v26H14z"/><path d="M14 12l4-6h24l4 6"/><path d="M22 20v12M30 18v14M38 20v12" stroke-width="2.4"/>`),
    bin: S(`<path d="M8 14h44l-4 26H12z"/><path d="M6 14h48"/><rect x="18" y="6" width="10" height="8"/><rect x="30" y="8" width="14" height="6"/>`),
    level: S(`<rect x="4" y="16" width="52" height="12" rx="3"/><rect x="24" y="18" width="12" height="8" rx="3"/><circle cx="30" cy="22" r="2"/>`),
    manual: S(`<path d="M8 8h20a4 4 0 0 1 4 4v28a4 4 0 0 0-4-4H8zM52 8H36a4 4 0 0 0-4 4v28a4 4 0 0 1 4-4h16z"/><rect x="12" y="14" width="10" height="6" rx="1"/><path d="M38 16h10M38 22h8" stroke-width="1.2"/>`),
    // map stamps
    start: S(`<path d="M10 38h40M16 38v-8h8v-8h8v-8h8v-8"/>`),
    trial: S(`<rect x="8" y="10" width="44" height="26" rx="3"/><path d="M14 16h20M14 22h28M14 28h14" stroke-width="1.2"/>`),
    shop: S(`<path d="M8 16h44l-4 22H12z"/><path d="M20 16v-4a10 10 0 0 1 20 0v4"/>`),
    bench: S(`<path d="M6 20h48v6H6zM10 26v12M50 26v12"/><path d="M18 20l4-10h16l4 10"/>`),
    puzzle: S(`<path d="M10 10h16a4 4 0 0 1 8 0h16v16a4 4 0 0 0 0 8v10H10z"/><circle cx="30" cy="26" r="1" fill="currentColor"/>`),
    boss: S(`<path d="M8 38h44M12 38V20l8-10h20l8 10v18"/><path d="M24 38V28h12v10"/><path d="M8 20h44" stroke-width="1.2"/>`),
    bindraw: S(`<path d="M8 14h44l-4 26H12z"/><path d="M6 14h48"/>`),
  };
  // ---------- tones for cards (ink, tint) ----------
  const TONES = {
    one: ['#7a5a0c', '#f2c233'], x: ['#1f5a27', '#43a84f'], x2: ['#1f4d93', '#3577d4'], y: ['#4f2f86', '#8e5fcf'], b: ['#8a4a12', '#ef8a2e'],
    neg: ['#7d2019', '#d6443a'], root: ['#4d5661', '#b9c2cc'], crate: ['#5e3d1d', '#a8743f'], card: ['#3f3a54', '#8b86b3'], util: ['#3a4f44', '#86a391'],
  };
  // ---------- the Master Builder ----------
  function master(eyewear = 'spectacles') {
    const glass = cx => `<circle cx="${cx}" cy="80" r="13" fill="#0c0806" stroke="#8f6b35" stroke-width="2"/><ellipse class="glint" cx="${cx - 4}" cy="75" rx="4.5" ry="2.6" fill="#ffd9a0" opacity=".85"/>`;
    let eyes;
    if (eyewear === 'loupe') eyes = `${glass(104)}<rect x="120" y="68" width="30" height="24" rx="4" fill="#15100b" stroke="#8f6b35" stroke-width="2"/><circle cx="150" cy="80" r="11" fill="#0c0806" stroke="#c49a52" stroke-width="2.5"/><ellipse class="glint" cx="147" cy="75" rx="4" ry="2.4" fill="#ffe2b0"/>`;
    else if (eyewear === 'goggles') eyes = `<path d="M60 78h140" stroke="#2c2016" stroke-width="7"/><rect x="86" y="66" width="36" height="28" rx="12" fill="#0a0705" stroke="#6d5330" stroke-width="3"/><rect x="138" y="66" width="36" height="28" rx="12" fill="#0a0705" stroke="#6d5330" stroke-width="3"/><ellipse class="glint" cx="98" cy="73" rx="6" ry="2" fill="#f2b35a" opacity=".6"/><ellipse class="glint" cx="150" cy="73" rx="6" ry="2" fill="#f2b35a" opacity=".6"/>`;
    else if (eyewear === 'visor') eyes = `${glass(104)}${glass(156)}<path d="M117 80c4-4 22-4 26 0" stroke="#8f6b35" stroke-width="2" fill="none"/><path d="M72 60q58 -22 116 0l-10 8q-48-14-96 0z" fill="#1d3a28" stroke="#3f7a52" stroke-width="1.5" opacity=".9"/>`;
    else eyes = `${glass(104)}${glass(156)}<path d="M117 80c4-4 22-4 26 0" stroke="#8f6b35" stroke-width="2" fill="none"/>`;
    const hat = eyewear === 'visor' ? '' : `<path d="M66 56c0-30 28-48 64-48s64 18 64 48z" fill="#2a2110" stroke="#a8862f" stroke-width="2" opacity=".95"/><path d="M52 58h156" stroke="#a8862f" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M130 10v44M104 16l6 38M156 16l-6 38" stroke="#a8862f" stroke-width="1.6" opacity=".55"/>`;
    return `<svg viewBox="0 0 260 172" class="master-svg" aria-hidden="true">
      <defs><radialGradient id="mrim" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#5a3b1c" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <path d="M10 172c10-38 40-52 70-56c-14-12-22-30-22-52c0-34 32-58 72-58s72 24 72 58c0 22-8 40-22 52c30 4 60 18 70 56z" fill="#0b0705"/>
      <path d="M10 172c10-38 40-52 70-56c-14-12-22-30-22-52c0-34 32-58 72-58s72 24 72 58c0 22-8 40-22 52c30 4 60 18 70 56z" fill="url(#mrim)"/>
      ${hat}
      <path d="M86 120c14 18 74 18 88 0c-4 24-22 40-44 40s-40-16-44-40z" fill="#16100b" opacity=".9"/>
      ${eyes}
      <path d="M130 92c-3 10-3 14 2 16" stroke="#3a2614" stroke-width="2" fill="none" opacity=".8"/>
      <path d="M196 70l18-26" stroke="#c9a462" stroke-width="3" opacity=".7"/><path d="M214 44l3-5" stroke="#3a2614" stroke-width="3"/>
    </svg>`;
  }
  function lamp(lit) {
    return `<svg viewBox="0 0 48 96" class="lamp-svg${lit ? ' lit' : ''}" aria-hidden="true">
      ${lit ? '<defs><radialGradient id="lglow" cx="35%" cy="45%" r="55%"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset=".5" stop-color="#f5c46a" stop-opacity=".16"/><stop offset="1" stop-color="#f5c46a" stop-opacity="0"/></radialGradient></defs><ellipse class="glow" cx="18" cy="48" rx="26" ry="34" fill="url(#lglow)"/>' : ''}
      <path d="M8 90h32" stroke="#6b4a24" stroke-width="5" stroke-linecap="round"/><path d="M24 88V58l-8-14" stroke="#8a6230" stroke-width="3" fill="none"/>
      <path d="M6 30l14-16l18 14l-10 12z" fill="${lit ? '#c9892c' : '#4a3a28'}" stroke="#6b4a24" stroke-width="1.5"/>
      ${lit ? '<path d="M14 36l-6 18l20-6z" fill="#ffe7a8" opacity=".55"/><circle cx="16" cy="36" r="3.5" fill="#fff4cf"/>' : '<circle cx="16" cy="36" r="3" fill="#2a2016"/>'}
    </svg>`;
  }
  function pin(on) {
    return `<svg viewBox="0 0 40 40" class="pin-svg${on ? ' on' : ''}" aria-hidden="true"><rect x="15" y="4" width="10" height="32" rx="4" fill="${on ? '#9aa4ad' : '#3a342c'}" stroke="${on ? '#5d6670' : '#4a4034'}" stroke-width="1.5"/><rect x="11" y="16" width="18" height="6" rx="2" fill="${on ? '#c7ced4' : '#4a4034'}" stroke="${on ? '#5d6670' : '#4a4034'}"/><path d="M18 8v8M22 26v6" stroke="#fff" stroke-opacity="${on ? .5 : .1}" stroke-width="1.4"/></svg>`;
  }
  function bell() {
    return `<svg viewBox="0 0 80 64" aria-hidden="true"><path d="M14 52h52" stroke="#6b4a24" stroke-width="5" stroke-linecap="round"/><path d="M18 50c0-20 8-32 22-32s22 12 22 32z" fill="#c9a462" stroke="#6b4a24" stroke-width="2"/><path d="M26 44c0-12 5-20 12-22" stroke="#f3dfaa" stroke-width="2.5" fill="none" opacity=".7"/><circle cx="40" cy="14" r="4" fill="#8a6230"/></svg>`;
  }
  return { S, ...I, COL, DIM, U, brick, pile, rootBrick, crate, frame, TONES, master, lamp, pin, bell };
})();
