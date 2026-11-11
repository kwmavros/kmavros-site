/* KMavros — interactions & motion */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = root.classList.contains('reduced');
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'main' ? 0 : -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(el);
    });
  });

  /* ---------------- Header ---------------- */
  var header = $('.site-header');
  var hero = $('.hero');
  var lastY = 0;
  function onScrollHeader() {
    var y = window.scrollY;
    var heroH = hero ? hero.offsetHeight - 90 : 200;
    header.classList.toggle('is-solid', y > heroH);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove('is-hidden');
    }
    lastY = y;
  }

  var toggle = $('.menu-toggle');
  function closeMenu() {
    document.body.classList.remove('menu-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Άνοιγμα μενού'); }
    if (lenis) lenis.start();
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού');
      header.classList.remove('is-hidden');
      if (lenis) open ? lenis.stop() : lenis.start();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------------- Pipe navigation ---------------- */
  var pipe = $('.pipe-nav');
  var valves = pipe ? $$('a', pipe) : [];
  var pipeSections = valves.map(function (a) { return document.getElementById(a.dataset.target); });
  var fill = pipe ? $('.pipe-nav__fill', pipe) : null;
  valves.forEach(function (a, i) {
    a.parentElement.style.top = (i / (valves.length - 1) * 100) + '%';
  });
  var darkSections = $$('[data-dark]');

  function onScrollPipe() {
    if (!pipe) return;
    var mid = window.scrollY + window.innerHeight * 0.45;
    var idx = 0, frac = 0;
    for (var i = 0; i < pipeSections.length; i++) {
      var top = pipeSections[i].getBoundingClientRect().top + window.scrollY;
      if (mid >= top) idx = i;
    }
    if (idx < pipeSections.length - 1) {
      var a = pipeSections[idx].getBoundingClientRect().top + window.scrollY;
      var b = pipeSections[idx + 1].getBoundingClientRect().top + window.scrollY;
      frac = Math.min(1, Math.max(0, (mid - a) / (b - a)));
    }
    var p = (idx + frac) / (pipeSections.length - 1);
    fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
    valves.forEach(function (v, i) { v.classList.toggle('is-active', i <= idx); });
    // dark/light context at the pipe position
    var pr = pipe.getBoundingClientRect();
    var cy = pr.top + pr.height / 2;
    var onDark = darkSections.some(function (s) { var r = s.getBoundingClientRect(); return r.top <= cy && r.bottom >= cy; });
    pipe.classList.toggle('on-dark', onDark);
  }

  /* nav active state */
  var navLinks = $$('.nav ul a');
  function onScrollNav() {
    var mid = window.innerHeight * 0.4;
    navLinks.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      var r = el.getBoundingClientRect();
      a.setAttribute('aria-current', r.top <= mid && r.bottom >= mid ? 'true' : 'false');
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScrollHeader(); onScrollPipe(); onScrollNav(); ticking = false; });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- Hero drawing ---------------- */
  var drawing = $('#drawing');
  var lines = drawing ? $$('.ln', drawing) : [];
  var annos = drawing ? $$('.anno text', drawing) : [];

  if (drawing && hasGSAP && !reduced) {
    lines.forEach(function (el) {
      el.setAttribute('pathLength', '1');
      el.style.strokeDasharray = '1';
      el.style.strokeDashoffset = '1';
    });
    gsap.set(annos, { opacity: 0 });
    gsap.set('.hero h1 .line > span', { yPercent: 110 });
    gsap.set(['.hero__kicker', '.hero__lead', '.hero__actions', '.hero__area'], { opacity: 0, y: 24 });

    var tl = gsap.timeline({ delay: 0.15 });
    tl.to('.hero__kicker', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' })
      .to('.hero h1 .line > span', { yPercent: 0, duration: 1.05, stagger: 0.13, ease: 'power4.out' }, '-=0.45')
      .to(['.hero__lead', '.hero__actions', '.hero__area'], { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, '-=0.6')
      .to(lines, { strokeDashoffset: 0, duration: 1.1, stagger: 0.04, ease: 'power2.inOut' }, 0.2)
      .to(annos, { opacity: 1, duration: 0.5, stagger: 0.05 }, '-=0.9')
      .add(function () {
        drawing.classList.add('is-live');
        lines.forEach(function (el) { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; el.removeAttribute('pathLength'); });
      }, '-=0.5');

    // subtle depth on pointer move
    if (finePointer && hero) {
      var qx = gsap.quickTo(drawing, 'x', { duration: 0.9, ease: 'power3' });
      var qy = gsap.quickTo(drawing, 'y', { duration: 0.9, ease: 'power3' });
      hero.addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        qx(nx * -18); qy(ny * -12);
        hero.style.setProperty('--gx', (nx * 24).toFixed(1) + 'px');
        hero.style.setProperty('--gy', (ny * 24).toFixed(1) + 'px');
      });
    }

    // hero parallax on scroll
    gsap.to('.hero__copy', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__art', { yPercent: 10, scale: 1.05, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  } else if (drawing) {
    drawing.classList.add('is-live');
  }

  /* ---------------- Statement: word-by-word ---------------- */
  var statement = $('[data-words]');
  if (statement) {
    var words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    if (hasGSAP && !reduced) {
      gsap.to($$('.w', statement), {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 }
      });
    } else {
      $$('.w', statement).forEach(function (w) { w.style.opacity = 1; });
    }
  }

  /* ---------------- Image reveals & parallax ---------------- */
  if (hasGSAP && !reduced) {
    $$('.reveal-img').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });
    $$('[data-parallax]').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------- Counters ---------------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.dataset.count, 10);
    if (!hasGSAP || reduced) { el.textContent = target; return; }
    var obj = { v: 0 };
    el.textContent = '0';
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: function () {
        gsap.to(obj, { v: target, duration: target > 20 ? 2 : 1.4, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(obj.v); } });
      }
    });
  });

  /* ---------------- Services tabs + accordion ---------------- */
  var tabs = $$('.tabs [role="tab"]');
  var pill = $('.tabs__pill');
  function placePill(tab) {
    if (!pill || !tab) return;
    pill.style.left = tab.offsetLeft + 'px';
    pill.style.width = tab.offsetWidth + 'px';
  }
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on && hasGSAP && !reduced) {
        gsap.fromTo($$('.svc', panel), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out' });
      }
    });
    placePill(tab);
    if (hasGSAP) ScrollTrigger.refresh();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { e.preventDefault(); n.focus(); selectTab(n); }
    });
  });
  placePill(tabs[0]);
  window.addEventListener('resize', function () { placePill($('.tabs [aria-selected="true"]')); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placePill($('.tabs [aria-selected="true"]')); });

  $$('.svc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentElement;
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (hasGSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 520);
    });
  });

  /* ---------------- Energy comparison ---------------- */
  var MODES = [
    {
      colors: ['#F7C531', '#F39A2B', '#F0752A', '#E8545A', '#B33A3E'],
      caption: 'Το κόστος ανεβαίνει',
      desc: 'Η ενέργεια χάνεται, οι λογαριασμοί ανεβαίνουν και η θέρμανση εξαρτάται από ακριβό ρεύμα ή καύσιμα. Το σπίτι λειτουργεί χωρίς σχέδιο: καταναλώνει περισσότερο και αποδίδει λιγότερο.',
      points: [
        ['Κατανάλωση χωρίς έλεγχο', 'Η ενέργεια καταναλώνεται χωρίς στρατηγική και πραγματική εικόνα κόστους.'],
        ['Εξάρτηση από ακριβό ρεύμα', 'Θέρμανση και ζεστό νερό βασίζονται αποκλειστικά στο δίκτυο.'],
        ['Αυξανόμενοι λογαριασμοί', 'Το κόστος ανεβαίνει με κάθε αύξηση τιμών, χωρίς προβλεψιμότητα.'],
        ['Χρήματα που δεν επιστρέφουν', 'Ό,τι πληρώνετε για ενέργεια φεύγει, χωρίς να γίνεται επένδυση.'],
        ['Χωρίς ενεργειακή αυτονομία', 'Το σπίτι παραμένει ευάλωτο σε αυξήσεις και αλλαγές τιμών.']
      ]
    },
    {
      colors: ['#F7C531', '#9BD65B', '#22B565', '#167A60', '#0E5544'],
      caption: 'Η επένδυση αποδίδει',
      desc: 'Σωστή μελέτη, υβριδικά φωτοβολταϊκά και αντλία θερμότητας δουλεύουν μαζί. Θέρμανση και ζεστό νερό με ελάχιστο ενεργειακό κόστος, σχεδιασμένα για το δικό σας σπίτι.',
      points: [
        ['Σωστή μελέτη & σχεδιασμός', 'Το σύστημα προσαρμόζεται στις πραγματικές ανάγκες του χώρου.'],
        ['Παραγωγή δικής σας ενέργειας', 'Τα φωτοβολταϊκά καλύπτουν μεγάλο μέρος της κατανάλωσης.'],
        ['Έξυπνη θέρμανση & ζεστό νερό', 'Η αντλία θερμότητας αξιοποιεί την παραγόμενη ενέργεια.'],
        ['Ελάχιστο ενεργειακό κόστος', 'Η ενέργεια που αγοράζετε από το δίκτυο μειώνεται δραστικά.'],
        ['Απόδοση & ενεργειακή αυτονομία', 'Η επένδυση δουλεύει για εσάς, κάθε μέρα.']
      ]
    }
  ];
  var RADII = [122, 152, 182, 156, 132];
  var CX = 200, CY = 200, R0 = 26;
  var wedgesG = $('#wedges');
  var pointsEl = $('#points');
  var descEl = $('#energy-desc');
  var capEl = $('#gauge-cap');
  var sw = $('#energy-switch');
  var mode = 0;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function pt(deg, r) { var a = deg * Math.PI / 180; return [CX + r * Math.cos(a), CY - r * Math.sin(a)]; }
  function textColor(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#24292F' : '#FFFFFF';
  }

  var wedgeEls = [];
  if (wedgesG) {
    RADII.forEach(function (r, i) {
      var a0 = 180 - i * 36 - 1.6, a1 = 180 - (i + 1) * 36 + 1.6;
      var p0 = pt(a0, R0), p1 = pt(a0, r), p2 = pt(a1, r), p3 = pt(a1, R0);
      var d = 'M' + p0.join(' ') + ' L' + p1.join(' ') + ' A' + r + ' ' + r + ' 0 0 1 ' + p2.join(' ') +
              ' L' + p3.join(' ') + ' A' + R0 + ' ' + R0 + ' 0 0 0 ' + p0.join(' ') + 'Z';
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'wedge');
      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', MODES[0].colors[i]);
      var mid = pt((a0 + a1) / 2, r - 24);
      var t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', mid[0]); t.setAttribute('y', mid[1] + 4.5);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'num-dot');
      t.setAttribute('fill', textColor(MODES[0].colors[i]));
      t.textContent = String(i + 1);
      g.appendChild(path); g.appendChild(t);
      wedgesG.appendChild(g);
      wedgeEls.push({ g: g, path: path, text: t });
    });
  }

  function renderPoints(m) {
    pointsEl.innerHTML = MODES[m].points.map(function (p, i) {
      var c = MODES[m].colors[i];
      return '<li><span class="n" style="--c:' + c + ';color:' + textColor(c) + '">' + (i + 1) + '</span><div><strong>' + p[0] + '</strong><span class="t">' + p[1] + '</span></div></li>';
    }).join('');
  }
  if (pointsEl) renderPoints(0);

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    sw.setAttribute('aria-checked', String(m === 1));
    $('#lbl-conv').classList.toggle('on', m === 0);
    $('#lbl-smart').classList.toggle('on', m === 1);
    var data = MODES[m];
    if (hasGSAP && !reduced) {
      var tl2 = gsap.timeline();
      tl2.to(wedgeEls.map(function (w) { return w.g; }), { scale: 0.2, opacity: 0, duration: 0.3, stagger: 0.04, ease: 'power2.in', svgOrigin: CX + ' ' + CY })
        .add(function () {
          wedgeEls.forEach(function (w, i) { w.path.setAttribute('fill', data.colors[i]); w.text.setAttribute('fill', textColor(data.colors[i])); });
          capEl.textContent = data.caption;
        })
        .to(wedgeEls.map(function (w) { return w.g; }), { scale: 1, opacity: 1, duration: 0.7, stagger: 0.07, ease: 'back.out(1.6)', svgOrigin: CX + ' ' + CY })
        .fromTo(capEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, '<');
      gsap.to([descEl, pointsEl], {
        opacity: 0, y: 10, duration: 0.25, onComplete: function () {
          descEl.textContent = data.desc;
          renderPoints(m);
          gsap.fromTo(descEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45 });
          gsap.set(pointsEl, { opacity: 1, y: 0 });
          gsap.fromTo($$('li', pointsEl), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
        }
      });
    } else {
      wedgeEls.forEach(function (w, i) { w.path.setAttribute('fill', data.colors[i]); w.text.setAttribute('fill', textColor(data.colors[i])); });
      capEl.textContent = data.caption;
      descEl.textContent = data.desc;
      renderPoints(m);
    }
  }
  if (sw) {
    sw.addEventListener('click', function () { setMode(mode === 0 ? 1 : 0); });
    $$('.switch-row .lbl').forEach(function (l) { l.addEventListener('click', function () { setMode(+l.dataset.mode); }); });
  }
  // gauge entrance
  if (hasGSAP && !reduced && wedgeEls.length) {
    gsap.set(wedgeEls.map(function (w) { return w.g; }), { scale: 0, opacity: 0, svgOrigin: CX + ' ' + CY });
    ScrollTrigger.create({
      trigger: '#gauge', start: 'top 80%', once: true,
      onEnter: function () {
        gsap.to(wedgeEls.map(function (w) { return w.g; }), { scale: 1, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'back.out(1.5)', svgOrigin: CX + ' ' + CY });
        gsap.fromTo($$('li', pointsEl), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, delay: 0.2 });
      }
    });
  }

  /* ---------------- Video: play only when visible ---------------- */
  var video = $('.pv__video video');
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          video.preload = 'auto';
          if (!reduced) { var pr = video.play(); if (pr && pr.catch) pr.catch(function () {}); }
        } else { video.pause(); }
      });
    }, { threshold: 0.35 }).observe(video);
    if (reduced) video.setAttribute('controls', '');
  }

  /* ---------------- Process (sticky images) ---------------- */
  var steps = $$('.step');
  var stepImgs = $$('.process__media img');
  if (hasGSAP) {
    steps.forEach(function (st, i) {
      ScrollTrigger.create({
        trigger: st, start: 'top 60%', end: 'bottom 40%',
        onToggle: function (self) {
          if (!self.isActive) return;
          steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
          stepImgs.forEach(function (im, j) { im.classList.toggle('is-active', j <= i); });
        }
      });
    });
  }

  /* ---------------- Build sequence (pinned scrub) ---------------- */
  var build = $('#build');
  if (build && hasGSAP && !reduced) {
    var frames = $$('.build__frame img', build);
    var bars = $$('.build__bar li', build);
    var fills = bars.map(function (b) { return $('i', b); });
    var tl3 = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.build__stage', start: 'top top', end: '+=260%', pin: true, scrub: 0.5,
        onUpdate: function (self) {
          var k = Math.min(3, Math.floor(self.progress * 4 + 0.02));
          bars.forEach(function (b, j) { b.classList.toggle('is-on', j <= k); });
        }
      }
    });
    tl3.to(fills[0], { scaleX: 1, duration: 1 })
       .to(frames[1], { opacity: 1, duration: 0.6 }, 1).to(fills[1], { scaleX: 1, duration: 1 }, 1)
       .to(frames[2], { opacity: 1, duration: 0.6 }, 2).to(fills[2], { scaleX: 1, duration: 1 }, 2)
       .to(frames[3], { opacity: 1, duration: 0.6 }, 3).to(fills[3], { scaleX: 1, duration: 1 }, 3)
       .fromTo('.build__frame', { scale: 0.94 }, { scale: 1, duration: 4 }, 0);
  } else if (build) {
    $$('.build__bar li i', build).forEach(function (i) { i.style.transform = 'scaleX(1)'; });
    $$('.build__bar li', build).forEach(function (l) { l.classList.add('is-on'); });
  }

  /* ---------------- Section headings ---------------- */
  if (hasGSAP && !reduced) {
    $$('.section-head h2, .build__head h2').forEach(function (h) {
      gsap.from(h, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && hasGSAP && !reduced) {
    $$('.magnetic').forEach(function (b) {
      var mx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
      var my = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.25);
        my((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
  }

  /* ---------------- Contact form ---------------- */
  // Uses FormSubmit (free, no backend). The first message triggers an activation email to mavroskm@gmail.com.
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/mavroskm@gmail.com';
  var form = $('#contact-form');
  var status = $('#form-status');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form__status';
      if (!form.checkValidity()) {
        var bad = form.querySelector(':invalid');
        status.textContent = bad && bad.type === 'checkbox' ? 'Για να στείλετε το μήνυμα, αποδεχτείτε την Πολιτική Απορρήτου.'
          : bad && bad.type === 'email' ? 'Συμπληρώστε ένα έγκυρο email.' : 'Συμπληρώστε ονοματεπώνυμο, email και μήνυμα.';
        status.classList.add('err');
        if (bad) bad.focus();
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return;
      data._subject = 'Νέο μήνυμα από το kmavros.gr';
      data._template = 'table';
      data._captcha = 'false';
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.textContent = 'Αποστολή…';
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && String(res.j.success) === 'true') {
            status.textContent = 'Το μήνυμα στάλθηκε. Θα επικοινωνήσουμε μαζί σας σύντομα.';
            status.classList.add('ok');
            form.reset();
          } else { throw new Error(); }
        })
        .catch(function () {
          status.innerHTML = 'Το μήνυμα δεν στάλθηκε. Καλέστε μας στο <a href="tel:+306970217780">697 021 7780</a> ή γράψτε στο <a href="mailto:mavroskm@gmail.com">mavroskm@gmail.com</a>.';
          status.classList.add('err');
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  if (hasGSAP) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
