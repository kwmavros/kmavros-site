/* KMavros — BIM: ηλεκτρομηχανολογικός σχεδιασμός βήμα-βήμα (isometric, scroll-driven) */
(function () {
  'use strict';
  var section = document.getElementById('bim');
  if (!section) return;
  var svg = section.querySelector('#bim-svg');
  var NS = 'http://www.w3.org/2000/svg';
  var reduced = document.documentElement.classList.contains('reduced');
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  var S = 25, CO = 0.8660254, SI = 0.5, FH = 3.4;
  function P(x, y, z) { return [(x - y) * CO * S, (x + y) * SI * S - z * S]; }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var COLORS = { struct: '#C9D6EA', elec: '#F5C518', hvac: '#4FD1E8', heat: '#FF8A3D', fire: '#FF3B5C', pv: '#7BE08A' };
  var SYSTEMS = ['struct', 'elec', 'hvac', 'heat', 'fire', 'pv'];

  // level groups (0 ground, 1 first floor, 2 roof) > system groups
  var siteG = el('g', { 'data-sys': 'struct' }, svg);
  var root = el('g', { 'class': 'bim-root' }, svg);
  var levels = [0, 1, 2].map(function (l) { return el('g', { 'class': 'lvl' }, root); });
  var sysG = {};
  levels.forEach(function (lg, l) {
    SYSTEMS.forEach(function (s) {
      var g = el('g', { 'data-sys': s }, lg);
      (sysG[s] = sysG[s] || []).push(g);
    });
  });
  var labelLayer = el('g', {}, svg);
  function G(l, s) { return sysG[s][l]; }

  function line(l, s, pts, o) {
    o = o || {};
    var d = pts.map(function (p, i) { var q = P(p[0], p[1], p[2]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    return el('path', {
      d: d, 'class': 'd', stroke: o.color || COLORS[s], 'stroke-width': o.w || 1.6,
      'stroke-opacity': o.op == null ? 1 : o.op, 'stroke-dasharray': o.dash || ''
    }, o.parent || G(l, s));
  }
  function duct(l, s, pts) { line(l, s, pts, { w: 7, op: 0.28 }); line(l, s, pts, { w: 1.8 }); }
  function poly(l, s, pts, fill, o) {
    o = o || {};
    var d = pts.map(function (p, i) { var q = P(p[0], p[1], p[2]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ') + 'Z';
    return el('path', { d: d, 'class': 'f', fill: fill, stroke: o.stroke || 'none', 'stroke-width': o.sw || 1 }, o.parent || G(l, s));
  }
  function box(l, s, x, y, z, dx, dy, dz, color) {
    var c = color || COLORS[s];
    var X = x + dx, Y = y + dy, Z = z + dz;
    poly(l, s, [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], c, { stroke: c }).setAttribute('fill-opacity', 0.55);
    poly(l, s, [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], c, { stroke: c }).setAttribute('fill-opacity', 0.32);
    poly(l, s, [[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], c, { stroke: c }).setAttribute('fill-opacity', 0.2);
  }
  function dot(l, s, x, y, z, r, color) {
    var q = P(x, y, z);
    return el('circle', { 'class': 'f', cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: r || 2.4, fill: color || COLORS[s] }, G(l, s));
  }
  function square(l, s, x, y, z, a) {
    a = a || 0.3;
    poly(l, s, [[x - a, y - a, z], [x + a, y - a, z], [x + a, y + a, z], [x - a, y + a, z]], COLORS[s], { stroke: COLORS[s] }).setAttribute('fill-opacity', 0.5);
  }

  var LX = 14, LY = 9;

  /* ---------------- Structure ---------------- */
  // site grid
  for (var gx = -1; gx <= 17; gx += 2) line(0, 'struct', [[gx, -1, 0], [gx, 14, 0]], { w: 0.6, op: 0.1, parent: siteG });
  for (var gy = -1; gy <= 14; gy += 2) line(0, 'struct', [[-1, gy, 0], [17, gy, 0]], { w: 0.6, op: 0.1, parent: siteG });
  sysG.struct.push(siteG);
  [0, 1, 2].forEach(function (l) {
    var z = l * FH;
    poly(l, 'struct', [[0, 0, z], [LX, 0, z], [LX, LY, z], [0, LY, z]], 'rgba(160,190,240,.07)', { stroke: 'rgba(201,214,234,.55)', sw: 1.2 });
    if (l < 2) {
      // back walls (cutaway)
      poly(l, 'struct', [[0, 0, z], [LX, 0, z], [LX, 0, z + FH], [0, 0, z + FH]], 'rgba(160,190,240,.045)', { stroke: 'rgba(201,214,234,.25)' });
      poly(l, 'struct', [[0, 0, z], [0, LY, z], [0, LY, z + FH], [0, 0, z + FH]], 'rgba(160,190,240,.06)', { stroke: 'rgba(201,214,234,.25)' });
      // columns
      [[LX, LY], [LX, 0], [0, LY], [7, LY], [LX, 4.5], [7, 0], [0, 4.5]].forEach(function (c) {
        line(l, 'struct', [[c[0], c[1], z], [c[0], c[1], z + FH]], { w: 2.4, op: 0.8 });
      });
      // partitions
      line(l, 'struct', [[7, 0, z], [7, 4.6, z]], { w: 1, op: 0.45 });
      line(l, 'struct', [[0, 4.6, z], [5.5, 4.6, z]], { w: 1, op: 0.45 });
      line(l, 'struct', [[8.6, 4.6, z], [LX, 4.6, z]], { w: 1, op: 0.45 });
    }
  });

  /* ---------------- Electrical ---------------- */
  [0, 1].forEach(function (l) {
    var z0 = l * FH, zc = z0 + 3.0;
    box(l, 'elec', 1.0, 0.05, z0 + 0.9, 0.8, 0.25, 1.0);
    line(l, 'elec', [[1.4, 0.3, z0 + 1.9], [1.4, 0.3, zc]]);
    if (l === 0) line(l, 'elec', [[1.4, 0.3, zc], [1.4, 0.3, z0 + FH]]);
    line(l, 'elec', [[1.4, 0.3, zc], [1.4, 4.5, zc], [13.5, 4.5, zc]], { w: 3 });
    line(l, 'elec', [[1.4, 0.3, zc], [13.5, 0.3, zc]], { w: 2 });
    [2.5, 5.5, 8.5, 11.5].forEach(function (x) {
      line(l, 'elec', [[x, 2.2, zc], [x, 7.0, zc]], { w: 1.2 });
      square(l, 'elec', x, 2.2, zc, 0.32); square(l, 'elec', x, 7.0, zc, 0.32);
    });
    [4, 8, 12].forEach(function (x) {
      line(l, 'elec', [[x, 0.3, zc], [x, 0.3, z0 + 0.45]], { w: 1.2 });
      box(l, 'elec', x - 0.15, 0.05, z0 + 0.3, 0.3, 0.1, 0.25);
    });
  });

  /* ---------------- HVAC ---------------- */
  box(2, 'hvac', 9.2, 5.4, 2 * FH, 2.8, 2.0, 1.3);
  [0, 1].forEach(function (l) {
    var z0 = l * FH, zd = z0 + 2.7;
    duct(l, 'hvac', [[10.5, 6.6, z0 + FH], [10.5, 6.6, zd]]);
    duct(l, 'hvac', [[1.5, 6.6, zd], [12.8, 6.6, zd]]);
    [3.5, 8].forEach(function (x) {
      duct(l, 'hvac', [[x, 8.3, zd], [x, 2.4, zd]]);
      square(l, 'hvac', x, 2.4, zd - 0.05, 0.42); square(l, 'hvac', x, 8.3, zd - 0.05, 0.42);
    });
    square(l, 'hvac', 12.8, 6.6, zd - 0.05, 0.42); square(l, 'hvac', 1.5, 6.6, zd - 0.05, 0.42);
  });
  duct(2, 'hvac', [[10.5, 6.6, 2 * FH], [10.5, 6.6, 2 * FH + 0.3]]);

  /* ---------------- Heating & water ---------------- */
  box(0, 'heat', 15.2, 5.4, 0, 1.5, 1.0, 1.3);
  box(0, 'heat', 12.0, 7.4, 0, 1.0, 1.0, 1.9, '#FFB23D');
  var RET = '#6C9BFF';
  [0, 1].forEach(function (l) {
    var z0 = l * FH, zf = z0 + 0.08;
    // manifold
    box(l, 'heat', 13.0, 8.2, z0 + 0.4, 0.25, 0.7, 0.5);
    // riser supply / return
    line(l, 'heat', [[13.6, 8.6, z0 + 0.7], [13.6, 8.6, z0 + FH]], { w: 2.2 });
    line(l, 'heat', [[13.85, 8.6, z0 + 0.45], [13.85, 8.6, z0 + FH]], { w: 2.2, color: RET });
    // underfloor loops
    [[0.8, 0.8, 6.6, 4.2], [7.4, 0.8, 13.2, 4.2], [0.8, 5.0, 6.6, 8.4], [7.4, 5.0, l === 0 ? 11.6 : 12.6, 8.4]].forEach(function (r) {
      var pts = [], y = r[1], k = 0;
      while (y <= r[3] + 0.001) { pts.push([k % 2 ? r[2] : r[0], y, zf]); pts.push([k % 2 ? r[0] : r[2], y, zf]); y += 0.55; k++; }
      line(l, 'heat', pts, { w: 1, op: 0.85 });
    });
    line(l, 'heat', [[13.0, 8.5, zf], [13.3, 4.6, zf], [0.8, 4.6, zf]], { w: 2 });
  });
  line(0, 'heat', [[15.2, 5.8, 0.7], [13.6, 5.8, 0.7], [13.6, 8.6, 0.7]], { w: 2.2 });
  line(0, 'heat', [[15.2, 6.2, 0.45], [13.85, 6.2, 0.45], [13.85, 8.6, 0.45]], { w: 2.2, color: RET });
  line(0, 'heat', [[13.6, 7.9, 0.7], [13.0, 7.9, 0.7]], { w: 2 });

  /* ---------------- Fire safety ---------------- */
  var clashOrig = null, clashFix = null;
  [0, 1].forEach(function (l) {
    var z0 = l * FH, zc = z0 + 3.0, zs = zc - 0.12, zd = z0 + 2.7;
    line(l, 'fire', [[0.35, 8.3, z0], [0.35, 8.3, z0 + FH]], { w: 2.6 });
    box(l, 'fire', 0.05, 7.4, z0 + 0.8, 0.28, 0.75, 1.0);
    line(l, 'fire', [[0.35, 8.3, zs], [13.3, 8.3, zs]], { w: 2.2 });
    [2, 5, 9, 12].forEach(function (x) {
      var pts = [[x, 8.3, zs], [x, 1.0, zs]];
      if (l === 1 && x === 5) {
        clashOrig = line(l, 'fire', pts, { w: 1.6 });
        clashFix = line(l, 'fire', [[x, 8.3, zs], [x, 7.25, zs], [x, 7.25, zd - 0.45], [x, 5.95, zd - 0.45], [x, 5.95, zs], [x, 1.0, zs]], { w: 1.6 });
        clashFix.classList.add('clash-fix');
      } else line(l, 'fire', pts, { w: 1.6 });
      [7.0, 5.2, 3.4, 1.6].forEach(function (y) { dot(l, 'fire', x, y, zs - 0.08, 2.3); });
    });
    dot(l, 'fire', 4.2, 5.4, zc, 3.4, '#fff'); dot(l, 'fire', 10.4, 2.6, zc, 3.4, '#fff');
  });

  /* ---------------- PV & energy ---------------- */
  for (var r = 0; r < 2; r++) {
    for (var c = 0; c < 6; c++) {
      var x = 0.9 + c * 1.25, y0 = 0.9 + r * 1.9;
      poly(2, 'pv', [[x, y0, 2 * FH + 0.75], [x + 1.1, y0, 2 * FH + 0.75], [x + 1.1, y0 + 1.25, 2 * FH + 0.15], [x, y0 + 1.25, 2 * FH + 0.15]], 'rgba(70,120,230,.55)', { stroke: COLORS.pv, sw: 1 });
    }
  }
  line(2, 'pv', [[0.6, 0.6, 2 * FH + 0.15], [0.6, 0.6, 2 * FH]], { w: 2 });
  line(1, 'pv', [[0.6, 0.6, 2 * FH], [0.6, 0.6, FH]], { w: 2 });
  line(0, 'pv', [[0.6, 0.6, FH], [0.6, 0.6, 1.6], [2.4, 0.3, 1.6]], { w: 2 });
  box(0, 'pv', 2.4, 0.05, 1.1, 0.6, 0.2, 0.7);
  box(0, 'pv', 3.3, 0.05, 0.1, 0.9, 0.35, 1.3);
  line(0, 'pv', [[3.0, 0.3, 1.3], [3.3, 0.3, 1.3]], { w: 2 });
  // EV charger & parking bay
  box(0, 'pv', 2.9, 10.0, 0, 0.35, 0.3, 1.4);
  line(0, 'pv', [[1.0, 10.6, 0], [5.6, 10.6, 0], [5.6, 13.4, 0], [1.0, 13.4, 0], [1.0, 10.6, 0]], { w: 1.2, dash: '4 4' });
  line(0, 'pv', [[3.07, 10.0, 0.05], [3.07, 0.4, 0.05], [3.07, 0.4, 1.3]], { w: 1.4, dash: '3 3' });

  /* ---------------- Labels ---------------- */
  var LABELS = [
    ['struct', 1, [14, 9, FH], 'Πλάκα ορόφου', 20, 20], ['struct', 0, [14, 0, 2.2], 'Υποστυλώματα', 22, -6],
    ['elec', 0, [1.4, 0.4, 1.4], 'Γενικός πίνακας', -24, -20], ['elec', 1, [13.5, 4.5, FH + 3], 'Σχάρα καλωδίων', 20, -14], ['elec', 1, [8.5, 7, FH + 3], 'Φωτιστικά', 18, 18],
    ['hvac', 2, [10.6, 6.4, 2 * FH + 1.3], 'Κεντρική μονάδα αερισμού', 18, -18], ['hvac', 1, [8, 8.3, FH + 2.7], 'Στόμια', 22, 16],
    ['heat', 0, [15.9, 5.9, 1.3], 'Αντλία θερμότητας', 18, -16], ['heat', 0, [12.5, 7.9, 1.9], 'Μπόιλερ ΖΝΧ', -20, -24], ['heat', 1, [3.7, 6.7, FH], 'Ενδοδαπέδια', -26, 18],
    ['fire', 1, [12, 1.6, FH + 2.9], 'Καταιονητήρες', 20, -12], ['fire', 0, [0.2, 7.8, 1.6], 'Πυροσβεστική φωλιά', -26, 10], ['fire', 1, [4.2, 5.4, FH + 3], 'Ανιχνευτής καπνού', -30, -16],
    ['pv', 2, [4.7, 2.8, 2 * FH + 0.5], 'Φωτοβολταϊκά πλαίσια', -20, -20], ['pv', 0, [3.75, 0.2, 1.4], 'Inverter & μπαταρία', 18, -24], ['pv', 0, [3.07, 10.15, 1.4], 'Φορτιστής αυτοκινήτου', 18, 18]
  ];
  var labelEls = {};
  var explode = { e: 0 };
  var labelData = LABELS.map(function (L) {
    var g = el('g', { 'class': 'lbl', opacity: 0 }, labelLayer);
    var ln = el('line', {}, g), c = el('circle', { r: 2.6 }, g), t = el('text', {}, g);
    t.textContent = L[3];
    (labelEls[L[0]] = labelEls[L[0]] || []).push(g);
    return { L: L, ln: ln, c: c, t: t };
  });
  function placeLabels() {
    labelData.forEach(function (d) {
      var q = P(d.L[2][0], d.L[2][1], d.L[2][2]);
      var x = q[0], y = q[1] - d.L[1] * explode.e, tx = x + d.L[4], ty = y + d.L[5];
      d.c.setAttribute('cx', x.toFixed(1)); d.c.setAttribute('cy', y.toFixed(1));
      d.ln.setAttribute('x1', x.toFixed(1)); d.ln.setAttribute('y1', y.toFixed(1));
      d.ln.setAttribute('x2', tx.toFixed(1)); d.ln.setAttribute('y2', ty.toFixed(1));
      d.t.setAttribute('x', (tx + (d.L[4] < 0 ? -4 : 4)).toFixed(1));
      d.t.setAttribute('y', (ty + 4).toFixed(1));
      d.t.setAttribute('text-anchor', d.L[4] < 0 ? 'end' : 'start');
    });
  }

  // clash marker (floor 1, sprinkler branch x=5 vs duct main y=6.6)
  var clashPt = P(5, 6.6, FH + 2.75);
  var clashG = el('g', { opacity: 0 }, labelLayer);
  var ring = el('circle', { 'class': 'clash-ring', r: 13, stroke: '#FF3B5C' }, clashG);
  var ring2 = el('circle', { 'class': 'clash-ring', r: 13, stroke: '#FF3B5C', opacity: 0.5 }, clashG);
  var clashTxt = el('text', { 'text-anchor': 'start' }, clashG);
  clashTxt.textContent = 'Σύγκρουση: καταιονισμός με αεραγωγό';
  var fixTxt = el('text', { 'text-anchor': 'start', opacity: 0, fill: '#7BE08A' }, clashG);
  fixTxt.textContent = 'Επιλύθηκε: νέα όδευση σωλήνα';

  function applyExplode() {
    levels.forEach(function (g, l) { g.setAttribute('transform', 'translate(0 ' + (-l * explode.e).toFixed(1) + ')'); });
    placeLabels();
    var cy = clashPt[1] - explode.e;
    [ring, ring2].forEach(function (r) { r.setAttribute('cx', clashPt[0].toFixed(1)); r.setAttribute('cy', cy.toFixed(1)); });
    [clashTxt, fixTxt].forEach(function (t) { t.setAttribute('x', (clashPt[0] + 20).toFixed(1)); t.setAttribute('y', (cy - 18).toFixed(1)); });
  }

  // viewBox from bounds at max explode
  var EXP_MAX = 62, EXP_MID = 34;
  explode.e = EXP_MID; applyExplode();
  var bb = root.getBBox();
  var pad = 18;
  svg.setAttribute('viewBox', [bb.x - pad - 10, bb.y - pad - 20, bb.width + pad * 2 + 20, bb.height + pad * 2 + 20].map(function (v) { return v.toFixed(0); }).join(' '));
  explode.e = EXP_MAX; applyExplode();

  /* ---------------- Step UI ---------------- */
  var stepEls = Array.prototype.slice.call(section.querySelectorAll('.bim-step'));
  var legendBtns = Array.prototype.slice.call(section.querySelectorAll('.bim__legend button'));
  var progressBar = section.querySelector('.bim__progress i');
  var hud = section.querySelector('.bim__hud');
  var NSTEPS = stepEls.length; // 7
  var current = -1;
  function setStep(k) {
    if (k === current) return;
    current = k;
    stepEls.forEach(function (s, i) { s.classList.toggle('is-active', i === k); });
    legendBtns.forEach(function (b, i) { b.classList.toggle('is-on', k === NSTEPS - 1 ? true : i + 1 <= k && i + 1 === k); });
    if (hud) hud.textContent = 'Στάδιο ' + (k + 1) + ' από ' + NSTEPS;
  }

  var drawables = {};
  SYSTEMS.forEach(function (s) {
    drawables[s] = { d: [], f: [] };
    sysG[s].forEach(function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('.d'), function (p) { if (!p.classList.contains('clash-fix')) drawables[s].d.push(p); });
      Array.prototype.forEach.call(g.querySelectorAll('.f'), function (p) { drawables[s].f.push(p); });
    });
  });
  function allSys(s) { return sysG[s]; }

  if (!hasGSAP || reduced) {
    section.classList.add('no-pin');
    explode.e = 0; applyExplode();
    if (clashOrig) clashOrig.style.opacity = 0;
    stepEls.forEach(function (s) { s.classList.add('is-active'); });
    legendBtns.forEach(function (b) { b.classList.add('is-on'); });
    if (progressBar) progressBar.style.transform = 'scaleX(1)';
    return;
  }

  // initial hidden state
  SYSTEMS.forEach(function (s) {
    drawables[s].d.concat(clashFix ? [clashFix] : []).forEach(function (p) {
      if (p === clashFix && s !== 'fire') return;
      p.setAttribute('pathLength', '1');
      p.style.strokeDasharray = p.getAttribute('stroke-dasharray') ? '' : '1';
      p.style.strokeDashoffset = p.getAttribute('stroke-dasharray') ? '' : '1';
      if (p.getAttribute('stroke-dasharray')) p.style.opacity = 0;
    });
    gsap.set(drawables[s].f, { opacity: 0 });
  });
  if (clashFix) { clashFix.setAttribute('pathLength', '1'); clashFix.style.strokeDasharray = '1'; clashFix.style.strokeDashoffset = '1'; }
  setStep(0);

  function drawSys(tl, s, at) {
    var solid = drawables[s].d.filter(function (p) { return !p.getAttribute('stroke-dasharray'); });
    var dashed = drawables[s].d.filter(function (p) { return p.getAttribute('stroke-dasharray'); });
    tl.to(solid, { strokeDashoffset: 0, duration: 0.6, stagger: { amount: 0.25 }, ease: 'power1.inOut' }, at);
    if (dashed.length) tl.to(dashed, { opacity: 1, duration: 0.3 }, at + 0.2);
    tl.to(drawables[s].f, { opacity: 1, duration: 0.3, stagger: { amount: 0.25 } }, at + 0.25);
    if (labelEls[s]) tl.to(labelEls[s], { opacity: 1, duration: 0.2 }, at + 0.5);
  }

  var tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section.querySelector('.bim__stage'), start: 'top top', end: '+=' + (NSTEPS * 85) + '%',
      pin: true, scrub: 0.6,
      onUpdate: function (self) {
        setStep(Math.min(NSTEPS - 1, Math.floor(self.progress * NSTEPS * 0.999)));
        if (progressBar) progressBar.style.transform = 'scaleX(' + self.progress.toFixed(3) + ')';
      }
    }
  });
  tl.eventCallback('onUpdate', applyExplode);

  // step 0: structure + collapse explode
  drawSys(tl, 'struct', 0);
  tl.to(explode, { e: EXP_MID, duration: 0.8, ease: 'power2.inOut' }, 0.15);
  // steps 1..5: one system each, previous fade back
  ['elec', 'hvac', 'heat', 'fire', 'pv'].forEach(function (s, i) {
    var at = i + 1;
    var prev = SYSTEMS.slice(1, i + 1);
    if (prev.length) tl.to(prev.map(allSys).reduce(function (a, b) { return a.concat(b); }, []), { opacity: 0.18, duration: 0.25 }, at);
    var prevLabels = SYSTEMS.slice(0, i + 1).map(function (p) { return labelEls[p] || []; }).reduce(function (a, b) { return a.concat(b); }, []);
    tl.to(prevLabels, { opacity: 0, duration: 0.2 }, at);
    if (i === 0) tl.to(allSys('struct'), { opacity: 0.55, duration: 0.25 }, at);
    drawSys(tl, s, at + 0.05);
  });
  // step 6: coordination
  var at6 = 6;
  tl.to(SYSTEMS.slice(1).map(allSys).reduce(function (a, b) { return a.concat(b); }, []), { opacity: 1, duration: 0.3 }, at6)
    .to(labelEls.pv, { opacity: 0, duration: 0.2 }, at6)
    .to(explode, { e: 0, duration: 0.45, ease: 'power2.inOut' }, at6)
    .to(clashG, { opacity: 1, duration: 0.15 }, at6 + 0.4)
    .fromTo(ring2, { attr: { r: 13 }, opacity: 0.6 }, { attr: { r: 30 }, opacity: 0, duration: 0.25 }, at6 + 0.45)
    .to(clashOrig, { opacity: 0, duration: 0.15 }, at6 + 0.65)
    .to(clashFix, { strokeDashoffset: 0, duration: 0.2 }, at6 + 0.7)
    .to(clashTxt, { opacity: 0, duration: 0.1 }, at6 + 0.75)
    .to(fixTxt, { opacity: 1, duration: 0.1 }, at6 + 0.8)
    .to([ring, ring2], { attr: { stroke: '#7BE08A' }, duration: 0.1 }, at6 + 0.8)
    .fromTo(ring2, { attr: { r: 13 }, opacity: 0.6 }, { attr: { r: 30 }, opacity: 0, duration: 0.15 }, at6 + 0.82)
    .to({}, { duration: 0.15 });

  // legend jumps to a step
  legendBtns.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var st = tl.scrollTrigger;
      var target = st.start + (st.end - st.start) * ((i + 1.6) / NSTEPS);
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.2 }); else window.scrollTo({ top: target, behavior: 'smooth' });
    });
  });
})();
if (window.ScrollTrigger) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
