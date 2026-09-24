/*
 * THE TRAINING JOURNAL — free writing about a whole class.
 *
 * Entries are saved on this device (localStorage), like move notes.
 * The "spotter" reads each entry and finds move and position names in it,
 * so the journal can link to them and each move's Notes tab can show the
 * entries that mention it. No AI: it's plain name-matching, like a magnet
 * that picks out the screws it recognises, trying the longest names first.
 */
(function () {
  'use strict';

  const KEY = 'jj-journal';
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const put = list => { try { list.length ? localStorage.setItem(KEY, JSON.stringify(list)) : localStorage.removeItem(KEY); } catch (e) {} };

  // ---- The spotter -----------------------------------------------------------
  // Every name a move or position can be written as, longest first.
  function buildSpotter() {
    const phrases = [];
    const add = (phrase, id) => {
      phrase = phrase.trim();
      if (phrase.length < 3) return;
      if (!phrases.some(p => p.phrase.toLowerCase() === phrase.toLowerCase())) phrases.push({ phrase, id });
    };
    [...JJ.data.techniques, ...JJ.data.positions].forEach(n => {
      add(n.name, n.id);
      const m = n.name.match(/^(.*?)\s*\((.*)\)\s*$/);   // "Trap & Roll (Upa)" → "Trap & Roll", "Upa"
      if (m) { add(m[1], n.id); add(m[2], n.id); }
    });
    Object.entries(JJ.aliases).forEach(([id, list]) => list.forEach(a => add(a, id)));
    phrases.sort((a, b) => b.phrase.length - a.phrase.length);

    const escape = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = p => escape(p)
      .replace(/(?:\\-|\s)+/g, '[\\s-]+')          // "knee on belly" = "knee-on-belly"
      .replace(/&/g, '(?:&|and)');                  // "Trap & Roll" = "trap and roll"
    const byPhrase = phrases.map(p => ({ ...p, re: new RegExp('^' + pattern(p.phrase) + '$', 'i') }));
    // Whole words only: "mount" shouldn't match inside "amount".
    const all = new RegExp('(^|[^A-Za-z0-9])(' + phrases.map(p => pattern(p.phrase)).join('|') + ')(?=$|[^A-Za-z0-9])', 'gi');
    return { all, idFor: text => (byPhrase.find(p => p.re.test(text)) || {}).id };
  }
  let spotter;
  const spot = () => spotter || (spotter = buildSpotter());

  // Find every mention in a piece of text: [{ start, end, id }]
  function findMentions(text) {
    const { all, idFor } = spot();
    const out = [];
    all.lastIndex = 0;
    let m;
    while ((m = all.exec(text))) {
      const start = m.index + m[1].length;
      out.push({ start, end: start + m[2].length, id: idFor(m[2]) });
      if (m[0].length === 0) all.lastIndex++;
    }
    return out.filter(x => x.id);
  }

  const Journal = {
    list: () => get().sort((a, b) => a.created - b.created),   // oldest first
    save: put,
    add(text) {
      const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), text, created: Date.now() };
      put([...get(), entry]);
      return entry;
    },
    update(id, changes) { put(get().map(e => e.id === id ? { ...e, ...changes } : e)); },
    remove(id) { put(get().filter(e => e.id !== id)); },

    findMentions,

    // The moves/positions an entry links to (in order, no repeats, minus any you unlinked).
    mentionsOf(entry) {
      const skip = new Set(entry.unlinked || []);
      const ids = [];
      findMentions(entry.text).forEach(m => { if (!skip.has(m.id) && !ids.includes(m.id)) ids.push(m.id); });
      return ids;
    },

    // Entries that mention a given move or position, oldest first.
    entriesAbout(id) { return this.list().filter(e => this.mentionsOf(e).includes(id)); },
  };

  JJ.Journal = Journal;
})();
