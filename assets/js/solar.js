/* KMavros — "Μια μέρα με τον ήλιο": PV + battery + EV + heat pump simulation */
(function () {
  'use strict';
  var root = document.getElementById('solar');
  if (!root) return;
  var reduced = document.documentElement.classList.contains('reduced');
  var NS = 'http://www.w3.org/2000/svg';
  var svg = root.querySelector('#solar-svg');
  var board = root.querySelector('.solar__board');
  var sunEl = root.querySelector('.solar__sun');
  var moonEl = root.querySelector('.solar__moon');
  var glowEl = root.querySelector('.solar__glow');
  var starsEl = root.querySelector('.solar__stars');
  var clockEl = root.querySelector('#solar-time');
  var phaseEl = root.querySelector('#solar-phase');
  var range = root.querySelector('#solar-range');
  var playBtn = root.querySelector('#solar-play');
  var chart = root.querySelector('#solar-chart');

  function fmt(n, d) { return n.toFixed(d == null ? 1 : d).replace('.', ','); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- Simulation (one value per minute, 05:00 → 23:59) ---------------- */
  var START = 5 * 60, END = 24 * 60 - 1, SR = 6.8, SS = 19.2;
  var BAT_CAP = 10, EV_CAP = 60, EV_KM_PER_KWH = 6.5;
  var sim = [];
  (function run() {
    var bat = 2.6, ev = 0.34 * EV_CAP, tank = 44;
    var pvSum = 0, evSum = 0, consSum = 0, selfSum = 0;
    for (var m = START; m <= END; m++) {
      var t = m / 60;
      var pv = (t > SR && t < SS) ? 4.5 * Math.pow(Math.sin(Math.PI * (t - SR) / (SS - SR)), 1.5) : 0;
      var house = 0.35 + (t >= 7 && t < 8.5 ? 0.7 : 0) + (t >= 13 && t < 14 ? 0.6 : 0) + (t >= 19 && t < 22.5 ? 0.9 : 0);
      var dhw = (t >= 10.5 && t < 14.5 && tank < 56) ? 1.5 : 0;
      var heat = ((t >= 6 && t < 7.5) || (t >= 17.5 && t < 22)) ? 1.1 : 0;
      var hp = dhw + heat;
      tank += dhw ? 0.06 : -0.004;
      if ((t >= 7.5 && t < 7.8) || (t >= 21 && t < 21.3)) tank -= 0.22;
      tank = Math.max(38, Math.min(57, tank));
      var load = house + hp, surplus = pv - load, evP = 0, batP = 0, grid = 0;
      if (surplus >= 0) {
        if (t >= 10.5 && t < 15.5 && ev < 0.85 * EV_CAP) evP = Math.min(3.7, surplus);
        surplus -= evP;
        batP = Math.min(3, surplus, (BAT_CAP - bat) * 60);
        surplus -= batP;
        grid = -surplus;
      } else {
        var need = -surplus;
        var dis = Math.min(3, need, Math.max(0, bat - 1) * 60);
        batP = -dis; grid = need - dis;
      }
      bat += batP / 60; ev += evP / 60;
      var cons = load + evP;
      pvSum += pv / 60; evSum += evP / 60; consSum += cons / 60; selfSum += (cons - Math.max(0, grid)) / 60;
      sim.push({
        m: m, t: t, pv: pv, house: house, hp: hp, heat: heat, ev: evP, bat: batP, grid: grid,
        batPct: bat / BAT_CAP, evPct: ev / EV_CAP, tank: tank, pvSum: pvSum,
        evKm: evSum * EV_KM_PER_KWH, self: consSum > 0 ? selfSum / consSum : 0, load: cons
      });
    }
  })();

  /* ---------------- Layouts ---------------- */
  var LAYOUTS = {
    wide: {
      vb: [900, 470], w: 196, h: 108,
      nodes: { pv: [130, 70], grid: [130, 235], bat: [130, 400], inv: [450, 235], ev: [770, 70], hp: [770, 235], house: [770, 400] }
    },
    narrow: {
      vb: [360, 640], w: 162, h: 104,
      nodes: { pv: [92, 60], grid: [268, 60], inv: [180, 220], bat: [92, 380], house: [268, 380], ev: [92, 560], hp: [268, 560] }
    }
  };
  var ICONS = {
    pv: 'M2 10h20l-2.5 9h-15z M8.5 10l-1 9 M15.5 10l1 9 M3.5 14.5h17 M12 2v2.5 M5.5 4.5l1.6 1.6 M18.5 4.5l-1.6 1.6',
    grid: 'M12 2l-5 20 M12 2l5 20 M8.6 9h6.8 M7.5 14h9 M4 22h16 M5 6h14',
    bat: 'M3 7h16v10H3z M21 10.5v3 M6.5 10.5v3 M9.5 10.5v3',
    inv: 'M3 3h18v18H3z M6 12c1.6-3.5 3.2-3.5 4.8 0s3.2 3.5 4.8 0 M6 17h12',
    ev: 'M3 17v-4.5l2.2-5.5h13.6l2.2 5.5V17z M7 17v2.5 M17 17v2.5 M3.5 12.5h17 M12.8 8.5l-2 3h2.4l-2 3',
    hp: 'M2 5h20v14H2z M10 12m-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0 M10 12l0 -3 M10 12l2.6 1.5 M10 12l-2.6 1.5 M18 8v8',
    house: 'M3 11l9-7.5 9 7.5 M5.5 9.5V21h13V9.5 M10 21v-6h4v6'
  };
  var TITLES = { pv: 'Φωτοβολταϊκά', grid: 'Δίκτυο', bat: 'Μπαταρία', inv: 'Υβριδικός inverter', ev: 'Ηλεκτρικό αυτοκίνητο', hp: 'Αντλία θερμότητας', house: 'Σπίτι' };
  var LINKS = [['pv', 'inv'], ['grid', 'inv'], ['bat', 'inv'], ['inv', 'ev'], ['inv', 'hp'], ['inv', 'house']];

  var ui = {}, links = [], layoutKey = null;

  function build() {
    var key = window.innerWidth < 700 ? 'narrow' : 'wide';
    if (key === layoutKey) return;
    layoutKey = key;
    var L = LAYOUTS[key];
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + L.vb[0] + ' ' + L.vb[1]);
    var gl = el('g', {}, svg), gd = el('g', {}, svg), gc = el('g', {}, svg);
    links = LINKS.map(function (pair) {
      var a = L.nodes[pair[0]], b = L.nodes[pair[1]];
      var dx = b[0] - a[0], dy = b[1] - a[1], d;
      if (Math.abs(dx) >= Math.abs(dy)) d = 'M' + a[0] + ' ' + a[1] + ' C' + (a[0] + dx * 0.55) + ' ' + a[1] + ' ' + (b[0] - dx * 0.55) + ' ' + b[1] + ' ' + b[0] + ' ' + b[1];
      else d = 'M' + a[0] + ' ' + a[1] + ' C' + a[0] + ' ' + (a[1] + dy * 0.55) + ' ' + b[0] + ' ' + (b[1] - dy * 0.55) + ' ' + b[0] + ' ' + b[1];
      var p = el('path', { d: d, 'class': 'lnk' }, gl);
      var dots = [];
      for (var i = 0; i < 6; i++) dots.push(el('circle', { r: 4.2, cx: -20, cy: -20, fill: '#F5A524' }, gd));
      return { a: pair[0], b: pair[1], path: p, len: p.getTotalLength(), dots: dots, phase: Math.random(), power: 0, color: '#F5A524' };
    });
    ui = {};
    Object.keys(L.nodes).forEach(function (k) {
      var c = L.nodes[k], w = k === 'inv' ? L.w + 14 : L.w, h = L.h;
      var g = el('g', { 'class': 'card' + (k === 'inv' ? ' hub' : ''), transform: 'translate(' + (c[0] - w / 2) + ' ' + (c[1] - h / 2) + ')' }, gc);
      el('rect', { 'class': 'bg', width: w, height: h, rx: 16 }, g);
      el('path', { 'class': 'ic', d: ICONS[k], transform: 'translate(14 13)' }, g);
      var tt = el('text', { 'class': 'tt', x: 46, y: 30 }, g); tt.textContent = TITLES[k];
      if (key === 'narrow') { tt.setAttribute('font-size', '11.5'); if (k === 'ev') tt.textContent = 'Αυτοκίνητο'; if (k === 'hp') tt.textContent = 'Αντλία θερμ.'; if (k === 'inv') tt.textContent = 'Inverter'; }
      var vv = el('text', { 'class': 'vv', x: 14, y: h - 38 }, g);
      var ss = el('text', { 'class': 'ss', x: 14, y: h - 18 }, g);
      if (key === 'narrow') { vv.setAttribute('font-size', '20'); ss.setAttribute('font-size', '10.5'); }
      var bar = null;
      if (k === 'bat' || k === 'ev') {
        el('rect', { 'class': 'bar-bg', x: 14, y: h - 10, width: w - 28, height: 4, rx: 2 }, g);
        bar = el('rect', { 'class': 'bar', x: 14, y: h - 10, width: 0, height: 4, rx: 2 }, g);
        vv.setAttribute('y', h - 44); ss.setAttribute('y', h - 23);
      }
      ui[k] = { v: vv, s: ss, bar: bar, barW: w - 28 };
    });
    render(true);
  }

  /* ---------------- State & rendering ---------------- */
  var idx = 13 * 60 - START;
  var lastRendered = -1;
  var AMBER = '#F5A524', GRIDBLUE = '#9FC2FF', GREEN = '#3DDC84';

  function mix(a, b, k) {
    var pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    var pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    return 'rgb(' + pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * k); }).join(',') + ')';
  }

  function render(force) {
    var i = Math.round(idx);
    if (!force && i === lastRendered) return;
    lastRendered = i;
    var s = sim[i];
    var hh = Math.floor(s.m / 60), mm = s.m % 60;
    clockEl.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    phaseEl.textContent = s.pv > 0.05 ? 'Τα φωτοβολταϊκά παράγουν' : (s.t < 12 ? 'Πριν την ανατολή' : 'Μετά τη δύση, από την μπαταρία');
    if (range && +range.value !== i) range.value = i;

    // sky
    var day = Math.max(0, Math.sin(Math.PI * (s.t - SR) / (SS - SR)));
    board.style.setProperty('--sky', mix('#071737', '#0B4AA6', Math.min(1, day * 1.6)));
    var twilight = Math.exp(-Math.pow(s.t - SR - 0.2, 2) / 0.35) + Math.exp(-Math.pow(s.t - SS + 0.2, 2) / 0.35);
    glowEl.style.opacity = Math.min(1, twilight).toFixed(2);
    starsEl.style.opacity = (1 - Math.min(1, day * 4)).toFixed(2);
    moonEl.style.opacity = s.t > 20 || s.t < 6 ? 0.9 : 0;
    var u = (s.t - SR) / (SS - SR);
    if (u > -0.02 && u < 1.02) {
      sunEl.style.opacity = 1;
      sunEl.style.left = (8 + u * 84) + '%';
      sunEl.style.top = (78 - Math.sin(Math.PI * Math.max(0, Math.min(1, u))) * 54) + 'px';
    } else sunEl.style.opacity = 0;

    // cards
    ui.pv.v.textContent = fmt(s.pv) + ' kW';
    ui.pv.s.textContent = 'Σήμερα ' + fmt(s.pvSum) + ' kWh';
    if (s.grid < -0.05) { ui.grid.v.textContent = fmt(-s.grid) + ' kW'; ui.grid.s.textContent = 'Πλεόνασμα προς το δίκτυο'; }
    else if (s.grid > 0.05) { ui.grid.v.textContent = fmt(s.grid) + ' kW'; ui.grid.s.textContent = 'Αγορά από το δίκτυο'; }
    else { ui.grid.v.textContent = '0 kW'; ui.grid.s.textContent = 'Καμία ανταλλαγή'; }
    ui.bat.v.textContent = Math.round(s.batPct * 100) + '%';
    ui.bat.s.textContent = s.bat > 0.05 ? 'Φορτίζει ' + fmt(s.bat) + ' kW' : s.bat < -0.05 ? 'Τροφοδοτεί ' + fmt(-s.bat) + ' kW' : 'Σε αναμονή';
    ui.bat.bar.setAttribute('width', (ui.bat.barW * s.batPct).toFixed(1));
    ui.inv.v.textContent = Math.round(s.self * 100) + '%';
    ui.inv.s.textContent = layoutKey === 'narrow' ? 'αυτάρκεια σήμερα' : 'ενέργεια χωρίς δίκτυο σήμερα';
    ui.ev.v.textContent = Math.round(s.evPct * 100) + '%';
    ui.ev.s.textContent = '+' + Math.round(s.evKm) + ' km από τον ήλιο';
    ui.ev.bar.setAttribute('width', (ui.ev.barW * s.evPct).toFixed(1));
    ui.hp.v.textContent = Math.round(s.tank) + '°C';
    ui.hp.s.textContent = s.heat > 0 ? 'Ζεστό νερό και θέρμανση' : 'Ζεστό νερό χρήσης';
    if (layoutKey === 'narrow') ui.hp.s.textContent = s.heat > 0 ? 'Θέρμανση ενεργή' : 'Ζεστό νερό';
    ui.house.v.textContent = fmt(s.house) + ' kW';
    ui.house.s.textContent = layoutKey === 'narrow' ? 'Συσκευές' : 'Φωτισμός & συσκευές';

    // link powers (positive = a → b)
    var fromGrid = s.grid > 0.05;
    var loadColor = fromGrid && s.pv < 0.05 && s.bat > -0.05 ? GRIDBLUE : AMBER;
    var P = { 'pv-inv': s.pv, 'grid-inv': s.grid, 'bat-inv': -s.bat, 'inv-ev': s.ev, 'inv-hp': s.hp, 'inv-house': s.house };
    links.forEach(function (l) {
      l.power = P[l.a + '-' + l.b];
      l.color = l.a === 'grid' ? (l.power > 0 ? GRIDBLUE : AMBER) : l.a === 'bat' ? GREEN : l.a === 'inv' ? loadColor : AMBER;
      l.path.setAttribute('class', 'lnk' + (Math.abs(l.power) > 0.05 ? ' on' : ''));
      l.dots.forEach(function (d) { d.setAttribute('fill', l.color); });
    });
    drawPlayhead(i);
  }

  function moveDots(dt) {
    links.forEach(function (l) {
      var p = Math.abs(l.power);
      var n = p < 0.05 ? 0 : Math.max(1, Math.min(6, Math.ceil(p * 1.4)));
      l.phase = (l.phase + dt * (0.18 + p * 0.07)) % 1;
      for (var i = 0; i < 6; i++) {
        var d = l.dots[i];
        if (i >= n || reduced) { d.setAttribute('cx', -50); continue; }
        var u = (l.phase + i / n) % 1;
        if (l.power < 0) u = 1 - u;
        var pt = l.path.getPointAtLength(u * l.len);
        d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1));
      }
    });
  }

  /* ---------------- Timeline chart ---------------- */
  var playhead = null, CW = 1000, CH = 54;
  function buildChart() {
    var maxP = 5.5, N = sim.length;
    var x = function (i) { return (i / (N - 1) * CW).toFixed(1); };
    var y = function (v) { return (CH - 4 - v / maxP * (CH - 8)).toFixed(1); };
    var area = 'M0 ' + (CH - 4), line = '';
    for (var i = 0; i < N; i += 5) { area += ' L' + x(i) + ' ' + y(sim[i].pv); line += (i ? ' L' : 'M') + x(i) + ' ' + y(sim[i].load); }
    area += ' L' + CW + ' ' + (CH - 4) + ' Z';
    chart.setAttribute('viewBox', '0 0 ' + CW + ' ' + CH);
    el('path', { d: area, fill: 'rgba(245,165,36,.6)', stroke: '#F5A524', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, chart);
    el('path', { d: line, fill: 'none', stroke: 'rgba(255,255,255,.75)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3', 'vector-effect': 'non-scaling-stroke' }, chart);
    playhead = el('line', { x1: 0, x2: 0, y1: 0, y2: CH, stroke: '#fff', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, chart);
  }
  function drawPlayhead(i) { if (playhead) { var xx = (i / (sim.length - 1) * CW).toFixed(1); playhead.setAttribute('x1', xx); playhead.setAttribute('x2', xx); } }

  /* ---------------- Playback ---------------- */
  var playing = false, inView = false, last = 0, started = false;
  var SPEED = 52; // simulated minutes per real second
  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  var ICON_AGAIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>';
  function setPlaying(v) {
    playing = v;
    var atEnd = idx >= sim.length - 1;
    playBtn.innerHTML = v ? ICON_PAUSE : (atEnd ? ICON_AGAIN : ICON_PLAY);
    playBtn.setAttribute('aria-label', v ? 'Παύση προσομοίωσης' : (atEnd ? 'Ξανά από την αρχή' : 'Αναπαραγωγή προσομοίωσης'));
  }
  playBtn.addEventListener('click', function () {
    if (!playing && idx >= sim.length - 1) idx = 60;
    setPlaying(!playing);
  });
  range.min = 0; range.max = sim.length - 1;
  range.addEventListener('input', function () { idx = +range.value; setPlaying(false); render(); });

  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (inView) {
      if (playing) {
        idx += dt * SPEED;
        if (idx >= sim.length - 1) { idx = sim.length - 1; setPlaying(false); }
        render();
      }
      moveDots(dt);
    }
    requestAnimationFrame(frame);
  }

  buildChart();
  build();
  setPlaying(false);
  window.addEventListener('resize', function () { build(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        inView = e.isIntersecting;
        if (inView && !started && !reduced) { started = true; idx = 60; render(); setPlaying(true); }
      });
    }, { threshold: 0.35 }).observe(board);
  } else inView = true;
  requestAnimationFrame(frame);
})();
