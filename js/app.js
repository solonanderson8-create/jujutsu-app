/*
 * THE APP — wires the graph, the panel, search, filters and buttons together.
 */
(function () {
  'use strict';

  const { Graph, Panel, store } = JJ;
  const $ = s => document.querySelector(s);
  const panelEl = $('#panel');
  // When this matches, the panel is a bottom sheet (phones, portrait tablets).
  // Keep in sync with the matching @media rule in styles.css.
  const SHEET_QUERY = '(max-width: 719px), (orientation: portrait) and (max-width: 1100px)';
  const isSheet = () => matchMedia(SHEET_QUERY).matches;
  const isNarrow = () => innerWidth < 720;

  // The part of the screen not covered by the panel. The camera centers here.
  Graph.safeArea = () => {
    const open = panelEl.classList.contains('open');
    if (!open) return { x: 0, y: 0, w: innerWidth, h: innerHeight };
    if (isSheet()) return { x: 0, y: 0, w: innerWidth, h: innerHeight - panelEl.offsetHeight };
    return { x: 0, y: 0, w: innerWidth - panelEl.offsetWidth, h: innerHeight };
  };

  // ---- Selecting things -----------------------------------------------------
  // `place` = which spot of a move (a move can sit in several positions).
  // Left out, the app picks the spot nearest to where you're looking.
  function select(id, place, { fly = true } = {}) {
    if (JJ.renamed[id]) {                              // old links to merged moves still work
      place = place || JJ.renamedPlace[id];
      id = JJ.renamed[id];
    }
    const n = JJ.byId[id];
    if (!n) return;
    if (n.type === 'category') { Graph.focusNode(id); return; }  // categories just zoom in
    if (n.type === 'technique') place = Graph.spotFor(id, place).cat.id;
    else place = undefined;
    Graph.select({ id, place });
    Panel.open(id, place);
    journalBtn.classList.remove('active');
    if (fly) Graph.focusNode(id, place);
    const many = n.type === 'technique' && n.places.length > 1;
    history.replaceState(null, '', '#' + id + (many ? '@' + place : ''));
  }

  function clear() {
    Graph.select(null);
    Panel.close();
    journalBtn.classList.remove('active');
    history.replaceState(null, '', location.pathname + location.search);
  }

  Graph.onSelect = (id, place) => select(id, place);
  Graph.onBackground = () => { if (Graph.selected) clear(); };
  Panel.onNavigate = (id, place) => select(id, place);
  Panel.onClose = clear;

  // ---- Training journal -------------------------------------------------------
  const journalBtn = $('#journal-btn');
  function openJournal(entryId) {
    Graph.select(null);
    Panel.openJournal(entryId);
    journalBtn.classList.add('active');           // "you are here" colour while it's open
    history.replaceState(null, '', '#journal');
  }
  Panel.onJournal = openJournal;
  journalBtn.addEventListener('click', () => {
    if (Panel.mode === 'journal') clear(); else openJournal();
  });

  // ---- Level "gearbox" --------------------------------------------------------
  const levelBtns = document.querySelectorAll('.level-btn');
  Graph.onLevel = level => levelBtns.forEach((b, i) => b.classList.toggle('active', i === level));
  levelBtns.forEach((b, i) => b.addEventListener('click', () => Graph.setLevel(i)));

  $('#zoom-in').addEventListener('click', () => Graph.zoomBy(1.6));
  $('#zoom-out').addEventListener('click', () => Graph.zoomBy(1 / 1.6));
  $('#zoom-fit').addEventListener('click', () => Graph.fitAll());

  // ---- Filters: Gi / No-Gi and Top / Bottom -----------------------------------
  // Each button has data-key ("style" or "role") and data-value.
  const filterBtns = document.querySelectorAll('.filter-btn');
  function setFilter(key, value) {
    JJ.filter[key] = value;
    Graph.refreshFilter();
    filterBtns.forEach(b => {
      if (b.dataset.key === key) b.classList.toggle('active', b.dataset.value === value);
    });
    store.set('jj-filter-' + key, value === 'all' ? '' : value);
    if (Panel.current) Panel.open(Panel.current, Panel.place);  // refresh chip dimming
  }
  filterBtns.forEach(b => b.addEventListener('click', () => setFilter(b.dataset.key, b.dataset.value)));

  // ---- Colour themes ----------------------------------------------------------
  // The palettes themselves live in styles.css ([data-theme="…"] blocks).
  // A seasonal theme = one new block there + its name added here.
  const THEMES = ['light', 'dark'];
  const themeBtn = $('#theme-btn');
  function applyTheme(name, remember) {
    document.documentElement.dataset.theme = name;
    if (remember) store.set('jj-theme', name);
    const css = getComputedStyle(document.documentElement);
    document.querySelector('meta[name="theme-color"]').content = css.getPropertyValue('--surface').trim();
    themeBtn.setAttribute('aria-label', name === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    if (Graph.arrowHeads) Graph.refreshTheme();
  }
  themeBtn.addEventListener('click', () => {
    const now = document.documentElement.dataset.theme;
    applyTheme(THEMES[(THEMES.indexOf(now) + 1) % THEMES.length], true);
  });
  // Until someone picks a theme, follow the device's own light/dark setting.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!store.get('jj-theme')) applyTheme(e.matches ? 'dark' : 'light', false);
  });

  // ---- Search -----------------------------------------------------------------
  const input = $('#search');
  const results = $('#search-results');
  const searchable = [...JJ.data.positions, ...JJ.data.techniques];

  function showResults() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; return; }
    const hits = searchable.filter(n => n.name.toLowerCase().includes(q)).slice(0, 8);
    results.innerHTML = hits.length
      ? hits.map(n => {
          const pos = n.type === 'position' ? n : JJ.positionOf(n.places[0]);
          const sub = n.type === 'position' ? 'Position' : n.places.map(pl => JJ.positionOf(pl).name).join(' · ');
          return `<li><button data-id="${n.id}" style="--c:${pos.color}"><span class="dot"></span>
            <span>${n.name}</span><span class="muted small">${sub}</span></button></li>`;
        }).join('')
      : '<li class="muted small empty">No matches</li>';
    results.hidden = false;
  }
  input.addEventListener('input', showResults);
  input.addEventListener('focus', showResults);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const first = results.querySelector('button'); if (first) first.click(); }
    if (e.key === 'Escape') { input.value = ''; results.hidden = true; input.blur(); }
  });
  results.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    results.hidden = true;
    input.value = '';
    input.blur();
    select(b.dataset.id);
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.search')) results.hidden = true;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.activeElement !== input) clear();
    if (e.key === '/' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault(); input.focus();
    }
  });

  // ---- Legend + first-time hint -------------------------------------------
  $('#legend-toggle').addEventListener('click', () => $('#legend').classList.toggle('collapsed'));
  if (isNarrow()) $('#legend').classList.add('collapsed');

  const hint = $('#hint');
  if (!store.get('jj-hint-seen')) {
    hint.hidden = false;
    hint.querySelector('button').addEventListener('click', () => { hint.hidden = true; store.set('jj-hint-seen', '1'); });
  }

  // ---- Start up ---------------------------------------------------------------
  Graph.init($('#graph'));
  applyTheme(document.documentElement.dataset.theme, false);
  Panel.init(panelEl);
  setFilter('style', store.get('jj-filter-style') || 'all');
  setFilter('role', store.get('jj-filter-role') || 'all');

  addEventListener('resize', () => Graph.apply());

  const [startId, startPlace] = decodeURIComponent(location.hash.slice(1)).split('@');
  if (startId === 'journal') openJournal();
  else if (JJ.byId[JJ.renamed[startId] || startId]) select(startId, startPlace);

  // Offline support. Only works when served from a website (not a double-clicked file).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
