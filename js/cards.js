/*
 * FLASHCARD ENGINE — builds the questions, tracks how well you know each one,
 * and decides when you've earned a stripe test.
 *
 * Cards are made from the moves data automatically, so every new move added
 * to data.js brings its own cards — like a vending machine that restocks itself.
 *
 * Remembering (spaced repetition, the "Leitner box"): picture a box with
 * numbered slots. A new card starts in slot 0. Right answer → it moves up a
 * slot and waits longer before coming back. Wrong → back to slot 0, so it
 * returns soon. A card in slot 2+ (right on two different days) is "mastered".
 */
(function () {
  'use strict';

  const KEY = 'jj-cards';
  const DAY = 24 * 60 * 60 * 1000;
  const WAIT = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];   // how long each slot waits
  const MASTERED = 2;
  const PASS = 0.8;            // 80% to unlock the test, and 80% to pass it
  const TEST_SIZE = 20;

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const posName = pl => JJ.positionOf(pl).name;

  // ---------------------------------------------------------------------------
  // BUILDING CARDS
  // ---------------------------------------------------------------------------
  let cache = null;
  function allCards() {
    if (cache) return cache;
    const { techniques, positions } = JJ.data;
    const B = JJ.Belts;
    const cards = [];
    const many = t => t.places.length > 1;

    techniques.forEach(t => {
      const rank = B.rankOf(t.id);
      t.places.forEach(pl => {
        const from = many(t) ? ` from ${posName(pl)}` : '';
        if (pl.success.length) cards.push({
          id: `works:${t.id}@${pl.category}`, type: 'works', move: t.id, place: pl.category, rank,
          prompt: `${t.name}${from} worked. Where can you go next?`, answer: pl.success.slice(),
        });
        if (pl.fail.length) cards.push({
          id: `fails:${t.id}@${pl.category}`, type: 'fails', move: t.id, place: pl.category, rank,
          prompt: `${t.name}${from} didn't work. What can you try instead?`, answer: pl.fail.slice(),
        });
      });
      cards.push({
        id: `desc:${t.id}`, type: 'desc', move: t.id, rank,
        prompt: 'Which move is this?', quote: maskName(t), answer: [t.id],
      });
      cards.push({
        id: `where:${t.id}`, type: 'where', move: t.id, rank,
        prompt: `Where is ${t.name} done from?`, answer: [...new Set(t.places.map(pl => JJ.positionOf(pl).id))],
      });
    });
    cache = cards;
    return cards;
  }

  // Hide the move's own name (and nickname) in its description: "____".
  function maskName(t) {
    const words = [t.name, t.name.replace(/\s*\(.*\)\s*/, ''), ...((t.name.match(/\((.*)\)/) || []).slice(1))]
      .filter(w => w && w.length > 2)
      .sort((a, b) => b.length - a.length);
    let text = t.desc;
    words.forEach(w => {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      text = text.replace(re, '____');
    });
    return text;
  }

  // The answer choices for a card: the right ones mixed with believable wrong ones.
  function options(card) {
    const t = JJ.byId[card.move];
    const right = new Set(card.answer);
    if (card.type === 'where') {
      const wrong = shuffle(JJ.data.positions.map(p => p.id).filter(id => !right.has(id)));
      return shuffle([...right, ...wrong.slice(0, Math.max(1, 5 - right.size))]);
    }
    if (card.type === 'desc') {
      // Wrong names: moves from the same position first (harder), then any.
      const near = new Set(t.places.map(pl => JJ.positionOf(pl).id));
      const pool = JJ.data.techniques.filter(m => m.id !== t.id);
      const local = shuffle(pool.filter(m => m.places.some(pl => near.has(JJ.positionOf(pl).id))));
      const rest = shuffle(pool.filter(m => !local.includes(m)));
      return shuffle([t.id, ...[...local, ...rest].slice(0, 3).map(m => m.id)]);
    }
    // works / fails: never offer anything this move links to anywhere (it might
    // be a fair answer), nor the move itself. Prefer options from nearby.
    const linked = new Set([t.id]);
    t.places.forEach(pl => ['success', 'fail', 'related'].forEach(k => pl[k].forEach(id => linked.add(id))));
    const targets = new Set();
    JJ.data.techniques.forEach(m => m.places.forEach(pl => [...pl.success, ...pl.fail].forEach(id => targets.add(id))));
    const place = JJ.placeOf(t, card.place);
    const here = JJ.positionOf(place).id;
    linked.add(here);          // "stay where you are" is a fair answer, so never offer it as a wrong one
    const pool = [...targets].filter(id => !linked.has(id));
    const isNear = id => {
      const n = JJ.byId[id];
      return n.type === 'position' ? n.id === here : n.places.some(pl => JJ.positionOf(pl).id === here);
    };
    const local = shuffle(pool.filter(isNear)), rest = shuffle(pool.filter(id => !isNear(id)));
    const wrong = [...local.slice(0, 2), ...rest].slice(0, Math.max(1, 5 - right.size));
    return shuffle([...right, ...wrong]);
  }

  // ---------------------------------------------------------------------------
  // MEMORY (saved on this device)
  // ---------------------------------------------------------------------------
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let memory = load();
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) {}
    if (JJ.Sync) JJ.Sync.changed();
  };
  const stateOf = id => memory[id] || { box: 0, due: 0, right: 0, wrong: 0 };

  function record(card, correct) {
    const s = { ...stateOf(card.id) };
    if (correct) { s.box = Math.min(WAIT.length - 1, s.box + 1); s.right++; }
    else { s.box = 0; s.wrong++; }
    s.due = Date.now() + WAIT[s.box];
    s.seen = Date.now();
    memory[card.id] = s;
    save();
  }

  // Is the set of picked answers exactly right?
  const isCorrect = (card, picked) =>
    picked.length === card.answer.length && picked.every(id => card.answer.includes(id));

  // ---------------------------------------------------------------------------
  // LEVELS AND PROMOTION
  // ---------------------------------------------------------------------------
  // The next rank above yours that actually has moves (some stripes have none yet).
  function nextRank(rank) {
    const ranks = [...new Set(JJ.data.techniques.map(t => JJ.Belts.rankOf(t.id)))].sort((a, b) => a - b);
    return ranks.find(r => r > rank);
  }

  // Everything needed to show progress toward the next stripe.
  function progress() {
    const rank = JJ.Belts.rank;
    const next = nextRank(rank);
    const cards = allCards();
    const target = next === undefined ? [] : cards.filter(c => c.rank > rank && c.rank <= next);
    const mastered = target.filter(c => stateOf(c.id).box >= MASTERED).length;
    const now = Date.now();
    const pool = studyPool();
    return {
      rank, next,
      targetTotal: target.length,
      mastered,
      ready: target.length > 0 && mastered / target.length >= PASS,
      due: pool.filter(c => memory[c.id] && stateOf(c.id).due <= now).length,
      fresh: pool.filter(c => !memory[c.id]).length,
      knownAtLevel: cards.filter(c => c.rank <= rank && stateOf(c.id).box >= MASTERED).length,
      totalAtLevel: cards.filter(c => c.rank <= rank).length,
    };
  }

  // Cards you can study: everything up to your rank, plus the next stripe's
  // cards (that's how you learn what's needed to earn it).
  function studyPool() {
    const next = nextRank(JJ.Belts.rank);
    const top = next === undefined ? JJ.Belts.rank : next;
    return allCards().filter(c => c.rank <= top);
  }

  // A study session: cards that are due first, then up to 8 new ones, taken
  // half from your level and half from your next stripe, so the progress bar
  // toward the next stripe moves from the very first session.
  function buildSession(size = 15) {
    const now = Date.now();
    const rank = JJ.Belts.rank;
    const pool = studyPool();
    const due = shuffle(pool.filter(c => memory[c.id] && stateOf(c.id).due <= now));
    const unseen = pool.filter(c => !memory[c.id]);
    const byRank = list => shuffle(list).sort((a, b) => a.rank - b.rank);
    const mine = byRank(unseen.filter(c => c.rank <= rank));
    const ahead = byRank(unseen.filter(c => c.rank > rank));
    const fresh = [];
    while (fresh.length < 8 && (mine.length || ahead.length)) {   // alternate: one of each
      if (mine.length) fresh.push(mine.shift());
      if (ahead.length && fresh.length < 8) fresh.push(ahead.shift());
    }
    return shuffle([...due.slice(0, size), ...fresh].slice(0, size));
  }

  // A stripe test: mostly the next stripe's cards, plus a few from your level.
  function buildTest() {
    const { rank, next } = progress();
    const cards = allCards();
    const target = shuffle(cards.filter(c => c.rank > rank && c.rank <= next));
    const review = shuffle(cards.filter(c => c.rank <= rank));
    const fromTarget = Math.min(target.length, Math.round(TEST_SIZE * 0.75));
    return shuffle([...target.slice(0, fromTarget), ...review.slice(0, TEST_SIZE - fromTarget)]);
  }

  function promote(rank) {
    JJ.Belts.save({ on: JJ.Belts.on, rank });
  }

  JJ.Cards = {
    allCards, options, isCorrect, record, stateOf, progress, buildSession, buildTest, promote,
    PASS, MASTERED,
    reset() { memory = {}; save(); },   // for testing
    reload() { memory = load(); cache = null; },   // after sync brings in changes from another device
  };
})();
