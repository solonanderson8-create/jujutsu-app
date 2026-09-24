/*
 * THE GRAPH — draws the map and handles zooming / panning.
 *
 * How zoom works (the "camera"):
 *   Everything lives on one big sheet of paper called the "world".
 *   The camera has a position (x, y) and a zoom level (k).
 *   k = 0.15 means the paper is shrunk to 15% so you see the whole map;
 *   k = 2 means it's blown up 2x so you see individual moves.
 *
 * Level of detail ("semantic zoom"):
 *   As k passes certain thresholds, layers fade in and out, like the
 *   gears of a gearbox: Positions -> Categories -> Techniques.
 */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const R = { pos: 190, cat: 28, tech: 13, catRing: 340 };  // sizes in world units
  const LOD = { cat: [0.3, 0.45], tech: [0.95, 1.25] };     // zoom where layers fade in
  const K_MIN = 0.04, K_MAX = 6;
  const LINK_KINDS = ['success', 'fail', 'related'];
  const ARROW_KINDS = ['flow', 'success', 'fail', 'related'];  // colours come from the theme (styles.css)

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const Graph = {
    view: { x: 0, y: 0, k: 0.2 },
    selected: null,
    hovered: null,
    level: -1,
    // These get replaced by app.js:
    safeArea: () => ({ x: 0, y: 0, w: innerWidth, h: innerHeight }),
    onSelect: () => {},
    onBackground: () => {},
    onLevel: () => {},
  };

  // ---------------------------------------------------------------------------
  // LAYOUT — work out where every category and technique sits.
  // Categories orbit their position; techniques orbit their category.
  // ---------------------------------------------------------------------------
  function layout() {
    const { positions, categories, techniques } = JJ.data;
    positions.forEach(p => { p.cats = categories.filter(c => c.position === p.id); });
    categories.forEach(c => { c.techs = techniques.filter(t => t.category === c.id); });

    positions.forEach(p => {
      const n = p.cats.length;
      let reach = 0;
      p.cats.forEach((c, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        c.x = p.x + R.catRing * Math.cos(a);
        c.y = p.y + R.catRing * Math.sin(a);
        const m = c.techs.length;
        c.ring = Math.max(110, m * 28);
        c.techs.forEach((t, j) => {
          const b = a + (j * 2 * Math.PI) / m + (m > 1 ? Math.PI / m : 0);
          t.x = c.x + c.ring * Math.cos(b);
          t.y = c.y + c.ring * Math.sin(b);
        });
        reach = Math.max(reach, R.catRing + c.ring);
      });
      p.r = reach + 70;  // radius of the dashed "zone" circle
    });
  }

  // ---------------------------------------------------------------------------
  // BUILD — create the SVG shapes once. Later we only move the camera.
  // ---------------------------------------------------------------------------
  Graph.init = function (svg) {
    this.svg = svg;
    layout();

    const defs = el('defs', {}, svg);
    this.arrowHeads = {};
    ARROW_KINDS.forEach(kind => {
      const m = el('marker', {
        id: 'arrow-' + kind, viewBox: '0 0 10 10', refX: 7, refY: 5,
        markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse',
      }, defs);
      this.arrowHeads[kind] = el('path', { d: 'M0,0 L10,5 L0,10 z' }, m);
    });
    this.refreshTheme();

    this.world = el('g', { class: 'world' }, svg);
    const L = this.layers = {};
    ['zones', 'zoneTitles', 'flows', 'catSpokes', 'techLayer', 'cats', 'bubbles', 'hi']
      .forEach(name => { L[name] = el('g', { class: 'layer-' + name }, this.world); });
    // Techniques get sub-layers so lines sit under the dots.
    L.techSpokes = el('g', {}, L.techLayer);
    L.techLinks = el('g', {}, L.techLayer);
    L.techs = el('g', {}, L.techLayer);

    const { positions, categories, techniques, flows } = JJ.data;

    positions.forEach(p => {
      el('circle', { cx: p.x, cy: p.y, r: p.r, class: 'zone', style: `--c:${p.color}` }, L.zones);
      const title = el('text', { x: p.x, y: p.y - p.r, class: 'zone-title', dy: '-0.5em', 'text-anchor': 'middle' }, L.zoneTitles);
      title.textContent = p.name;

      const g = el('g', { class: 'node pos-node', 'data-id': p.id, style: `--c:${p.color}` }, L.bubbles);
      el('circle', { cx: p.x, cy: p.y, r: R.pos }, g);
      const label = el('text', { x: p.x, y: p.y + R.pos, dy: '1.3em', 'text-anchor': 'middle' }, g);
      label.textContent = p.name;
      p.el = g;
    });

    categories.forEach(c => {
      const p = JJ.byId[c.position];
      el('line', { x1: p.x, y1: p.y, x2: c.x, y2: c.y, class: 'spoke', style: `--c:${p.color}` }, L.catSpokes);
      const g = el('g', { class: 'node cat-node', 'data-id': c.id, style: `--c:${p.color}` }, L.cats);
      el('circle', { cx: c.x, cy: c.y, r: R.cat }, g);
      const label = el('text', { x: c.x, y: c.y + R.cat, dy: '1.3em', 'text-anchor': 'middle' }, g);
      label.textContent = c.name;
      c.el = g;
    });

    techniques.forEach(t => {
      const c = JJ.byId[t.category];
      const p = JJ.byId[c.position];
      el('line', { x1: c.x, y1: c.y, x2: t.x, y2: t.y, class: 'spoke', style: `--c:${p.color}` }, L.techSpokes);
      const g = el('g', { class: 'node tech-node role-' + t.role, 'data-id': t.id, style: `--c:${p.color}` }, L.techs);
      el('circle', { cx: t.x, cy: t.y, r: R.tech }, g);
      const label = el('text', { x: t.x, y: t.y + R.tech, dy: '1.2em', 'text-anchor': 'middle' }, g);
      label.textContent = t.name;
      t.el = g;
    });

    // Faint "web" of every technique-to-technique link, like Obsidian.
    this.techLinks = [];
    techniques.forEach(t => {
      ['success', 'fail'].forEach(kind => t[kind].forEach(id => {
        const u = JJ.byId[id];
        if (u.type !== 'technique') return;
        const line = el('line', { x1: t.x, y1: t.y, x2: u.x, y2: u.y, class: 'tlink' }, L.techLinks);
        this.techLinks.push({ line, a: t, b: u });
      }));
    });

    // Big arrows between positions.
    this.flowEls = flows.map(f => {
      const g = el('g', { class: 'flow' }, L.flows);
      const path = el('path', { 'marker-end': 'url(#arrow-flow)' }, g);
      const text = el('text', { 'text-anchor': 'middle', dy: '0.35em' }, g);
      text.textContent = f.label;
      return { f, g, path, text };
    });

    // Hover + click on any node.
    svg.addEventListener('click', e => {
      if (this.dragged) return;
      const node = e.target.closest('.node');
      if (node) this.onSelect(node.dataset.id);
      else this.onBackground();
    });
    svg.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const node = e.target.closest('.tech-node, .pos-node');
      this.setHover(node ? node.dataset.id : null);
    });
    svg.addEventListener('pointerleave', () => this.setHover(null));

    this.bindCamera();
    this.fitAll(0);
  };

  // ---------------------------------------------------------------------------
  // CAMERA — apply the current view and fade layers in/out.
  // ---------------------------------------------------------------------------
  Graph.apply = function () {
    const { x, y, k } = this.view;
    this.world.setAttribute('transform', `translate(${x},${y}) scale(${k})`);

    // Text and line widths are divided by k so they stay the same size on
    // screen no matter how far you zoom (like labels on Google Maps).
    const s = this.svg.style;
    s.setProperty('--sw', 1 / k + 'px');
    s.setProperty('--fs-pos', 16 / k + 'px');
    s.setProperty('--fs-zone', 22 / k + 'px');
    s.setProperty('--fs-cat', 13.5 / k + 'px');
    s.setProperty('--fs-tech', 12.5 / k + 'px');
    s.setProperty('--fs-edge', 11.5 / k + 'px');

    const catT = smooth(LOD.cat[0], LOD.cat[1], k);
    const techT = smooth(LOD.tech[0], LOD.tech[1], k);
    const L = this.layers;
    setLayer(L.zones, 0.35 + 0.65 * catT);
    setLayer(L.zoneTitles, catT);
    setLayer(L.bubbles, 1 - catT);
    setLayer(L.catSpokes, catT);
    setLayer(L.cats, catT);
    setLayer(L.techLayer, techT);
    // Focus arrows stay visible at every zoom level. When zoomed out, "pins"
    // mark the focused move and its links so the arrows have visible ends.
    setLayer(L.hi, 1);
    this.techT = techT;
    setLayer(L.flows, 1 - 0.7 * techT);  // big arrows step back when you're looking at moves
    // Arrow labels only when zoomed in (or on hover) so the overview stays readable.
    this.svg.classList.toggle('overview', catT < 0.5);

    // Arrows between positions start at the bubble edge when zoomed out,
    // and at the dashed zone edge when zoomed in.
    this.catT = catT;
    this.flowEls.forEach(({ f, path, text }) => {
      const a = JJ.byId[f.from], b = JJ.byId[f.to];
      const c = curve(a, b, lerp(R.pos + 12, a.r, catT), lerp(R.pos + 18, b.r + 6, catT), 0.12);
      path.setAttribute('d', c.d);
      text.setAttribute('x', c.mx);
      text.setAttribute('y', c.my);
    });

    if (this.focusLinks.length) this.drawFocus();

    const level = k < (LOD.cat[0] + LOD.cat[1]) / 2 ? 0 : k < (LOD.tech[0] + LOD.tech[1]) / 2 ? 1 : 2;
    if (level !== this.level) { this.level = level; this.onLevel(level); }
  };

  function setLayer(g, o) {
    g.style.opacity = o;
    g.style.display = o < 0.01 ? 'none' : '';
    g.style.pointerEvents = o < 0.5 ? 'none' : '';
  }

  // A gently curved line from a to b, trimmed by ra / rb at each end.
  function curve(a, b, ra, rb, bend) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const cx = (a.x + b.x) / 2 - (dy / len) * len * bend;
    const cy = (a.y + b.y) / 2 + (dx / len) * len * bend;
    const sa = unit(cx - a.x, cy - a.y), eb = unit(cx - b.x, cy - b.y);
    const x1 = a.x + sa.x * ra, y1 = a.y + sa.y * ra;
    const x2 = b.x + eb.x * rb, y2 = b.y + eb.y * rb;
    return {
      d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`,
      mx: 0.25 * x1 + 0.5 * cx + 0.25 * x2,
      my: 0.25 * y1 + 0.5 * cy + 0.25 * y2,
    };
  }
  function unit(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }

  // ---------------------------------------------------------------------------
  // FOCUS — highlight a technique and draw its success / fail / related arrows.
  // ---------------------------------------------------------------------------
  Graph.select = function (id) { this.selected = id; this.refreshFocus(); };
  Graph.setHover = function (id) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.refreshFocus();
  };

  Graph.focusLinks = [];  // [{ from, to, kind }] for the focused technique

  Graph.refreshFocus = function () {
    const id = this.hovered || this.selected;
    this.focusLinks = [];
    this.layers.hi.textContent = '';
    this.svg.querySelectorAll('.lit, .sel').forEach(n => n.classList.remove('lit', 'sel'));
    this.svg.classList.toggle('has-focus', !!id);
    if (!id) return;

    const n = JJ.byId[id];
    const lit = x => x.el && x.el.classList.add('lit');
    lit(n);
    n.el.classList.add('sel');

    if (n.type === 'technique') {
      lit(JJ.byId[n.category]);
      LINK_KINDS.forEach(kind => n[kind].forEach(tid => {
        const u = JJ.byId[tid];
        lit(u);
        this.focusLinks.push({ from: n, to: u, kind });
      }));
      this.drawFocus();
    } else if (n.type === 'position') {
      this.flowEls.forEach(({ f, g }) => {
        if (f.from === id || f.to === id) {
          g.classList.add('lit');
          lit(JJ.byId[f.from]); lit(JJ.byId[f.to]);
        }
      });
    }
  };

  // Arrowheads live inside <marker>s, which don't reliably pick up CSS
  // colours on every browser, so copy the current theme's colours in by hand.
  Graph.refreshTheme = function () {
    const css = getComputedStyle(document.documentElement);
    ARROW_KINDS.forEach(kind => this.arrowHeads[kind].setAttribute('fill', css.getPropertyValue('--' + kind).trim()));
  };

  // Draw the focus arrows (and, when zoomed out, pins at each end).
  // Re-run on every zoom step because the pin size depends on the zoom.
  Graph.drawFocus = function () {
    const hi = this.layers.hi;
    hi.textContent = '';
    const k = this.view.k;
    const pinR = Math.max(R.tech, 6 / k);           // never smaller than 6px on screen
    const pinsShown = 1 - this.techT;               // pins fade out once real dots are visible
    const endR = u => u.type === 'position' ? lerp(R.pos + 10, u.r + 6, this.catT)
      : u.type === 'category' ? R.cat + 6 : pinR + 7 / k;

    this.focusLinks.forEach(({ from, to, kind }) => {
      const c = curve(from, to, pinR + 4 / k, endR(to), kind === 'fail' ? -0.18 : 0.18);
      if (kind !== 'related') el('path', { d: c.d, class: 'hi-casing' }, hi);  // thin outline so pale colours stay visible
      el('path', { d: c.d, class: 'hi-link ' + kind, 'marker-end': `url(#arrow-${kind})` }, hi);
    });

    if (pinsShown < 0.01) return;
    const pins = el('g', { class: 'pins', style: `opacity:${pinsShown}` }, hi);
    const techs = [this.focusLinks[0].from, ...this.focusLinks.map(l => l.to)]
      .filter((t, i, all) => t.type === 'technique' && all.indexOf(t) === i);
    // Label each pin unless it would sit on top of a label already placed
    // (the focused move goes first, so it always keeps its label).
    const placed = [];
    techs.forEach((t, i) => {
      const p = JJ.byId[JJ.byId[t.category].position];
      const g = el('g', { class: 'pin role-' + t.role + (i === 0 ? ' pin-main' : ''), 'data-id': t.id, style: `--c:${p.color}` }, pins);
      el('circle', { cx: t.x, cy: t.y, r: pinR }, g);
      const crowded = placed.some(q => Math.abs(q.x - t.x) * k < 90 && Math.abs(q.y - t.y) * k < 22);
      if (crowded) return;
      placed.push(t);
      const label = el('text', { x: t.x, y: t.y + pinR, dy: '1.2em', 'text-anchor': 'middle' }, g);
      label.textContent = t.name;
    });
  };

  // Filters (Gi / No-Gi, Top / Bottom): dim techniques that don't match.
  Graph.refreshFilter = function () {
    const match = JJ.matches;
    JJ.data.techniques.forEach(t => t.el.classList.toggle('off', !match(t)));
    this.techLinks.forEach(({ line, a, b }) => line.classList.toggle('off', !match(a) || !match(b)));
  };

  // ---------------------------------------------------------------------------
  // MOVEMENT — fly the camera smoothly to a spot.
  // ---------------------------------------------------------------------------
  function anchor() { const s = Graph.safeArea(); return { x: s.x + s.w / 2, y: s.y + s.h / 2, s }; }

  Graph.centerWorld = function () {
    const a = anchor(), v = this.view;
    return { x: (a.x - v.x) / v.k, y: (a.y - v.y) / v.k };
  };

  Graph.flyTo = function (wx, wy, k, dur = 650) {
    k = clamp(k, K_MIN, K_MAX);
    const a = anchor();
    cancelAnimationFrame(this.anim);
    if (!dur) { this.view = { k, x: a.x - wx * k, y: a.y - wy * k }; this.apply(); return; }
    const from = this.centerWorld(), k0 = this.view.k, t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;  // ease in-out
      const kk = Math.exp(lerp(Math.log(k0), Math.log(k), e));
      const cx = lerp(from.x, wx, e), cy = lerp(from.y, wy, e);
      this.view = { k: kk, x: a.x - cx * kk, y: a.y - cy * kk };
      this.apply();
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  };

  const fitK = r => { const s = anchor().s; return (Math.min(s.w, s.h) / (2 * r)) * 0.95; };

  Graph.fitAll = function (dur = 650) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    JJ.data.positions.forEach(p => {
      x0 = Math.min(x0, p.x - p.r); y0 = Math.min(y0, p.y - p.r);
      x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r);
    });
    const s = anchor().s;
    const k = Math.min(s.w / (x1 - x0), s.h / (y1 - y0)) * 0.95;
    this.flyTo((x0 + x1) / 2, (y0 + y1) / 2, Math.min(k, LOD.cat[0] - 0.02), dur);
  };

  Graph.focusNode = function (id) {
    const n = JJ.byId[id];
    if (n.type === 'position') this.flyTo(n.x, n.y, clamp(fitK(n.r + 60), LOD.cat[1] + 0.05, LOD.tech[0] - 0.05));
    else if (n.type === 'category') this.flyTo(n.x, n.y, Math.max(fitK(n.ring + 90), LOD.tech[1] + 0.1));
    else this.flyTo(n.x, n.y, Math.max(this.view.k, 1.6));
  };

  Graph.setLevel = function (level) {
    if (level === 0) return this.fitAll();
    const c = this.centerWorld();
    this.flyTo(c.x, c.y, level === 1 ? 0.7 : 1.7);
  };

  Graph.zoomBy = function (f) {
    const c = this.centerWorld();
    this.flyTo(c.x, c.y, this.view.k * f, 250);
  };

  // Zoom around a screen point (under the mouse / between two fingers).
  Graph.zoomAt = function (sx, sy, f) {
    const v = this.view;
    const k = clamp(v.k * f, K_MIN, K_MAX);
    const r = k / v.k;
    this.view = { k, x: sx - (sx - v.x) * r, y: sy - (sy - v.y) * r };
  };

  // ---------------------------------------------------------------------------
  // INPUT — mouse wheel, drag to pan, two-finger pinch.
  // ---------------------------------------------------------------------------
  Graph.bindCamera = function () {
    const svg = this.svg;
    const pts = new Map();
    let travel = 0;

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      cancelAnimationFrame(this.anim);
      // ctrlKey is set for trackpad pinch gestures, which send small deltas.
      this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      this.apply();
    }, { passive: false });

    svg.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { travel = 0; this.dragged = false; }
      cancelAnimationFrame(this.anim);
      svg.classList.add('grabbing');
    });

    window.addEventListener('pointermove', e => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };

      if (pts.size === 1) {
        this.view.x += cur.x - prev.x;
        this.view.y += cur.y - prev.y;
        travel += Math.hypot(cur.x - prev.x, cur.y - prev.y);
      } else if (pts.size === 2) {
        const other = [...pts.entries()].find(([id]) => id !== e.pointerId)[1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
        const d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
        const mx0 = (prev.x + other.x) / 2, my0 = (prev.y + other.y) / 2;
        const mx1 = (cur.x + other.x) / 2, my1 = (cur.y + other.y) / 2;
        this.view.x += mx1 - mx0;
        this.view.y += my1 - my0;
        this.zoomAt(mx1, my1, d1 / d0);
        travel += 10;
      }
      if (travel > 6) this.dragged = true;
      pts.set(e.pointerId, cur);
      this.apply();
    });

    const up = e => {
      pts.delete(e.pointerId);
      if (!pts.size) svg.classList.remove('grabbing');
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  JJ.Graph = Graph;
})();
