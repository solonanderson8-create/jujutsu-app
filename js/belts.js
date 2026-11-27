/*
 * BELT LEVELS — shows moves up to your belt, and fades the ones above it.
 *
 * A rank is a single number so it's easy to compare, like floors in a
 * building: white 0 stripes = floor 0, white 4 stripes = floor 4,
 * blue 0 stripes = floor 5 … black 4 stripes = floor 24.
 * A move is "locked" when its floor is above yours (and belt levels are on).
 *
 * Your setting is saved on this device: { on, rank }.
 */
(function () {
  'use strict';

  const BELTS = [
    { id: 'white', name: 'White' },
    { id: 'blue', name: 'Blue' },
    { id: 'purple', name: 'Purple' },
    { id: 'brown', name: 'Brown' },
    { id: 'black', name: 'Black' },
  ];
  const KEY = 'jj-belt';

  const toRank = (belt, stripes) => BELTS.findIndex(b => b.id === belt) * 5 + stripes;
  const parse = text => { const [belt, s] = text.split(' '); return toRank(belt, +s); };
  const beltOf = rank => BELTS[Math.floor(rank / 5)];
  const stripesOf = rank => rank % 5;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  const Belts = {
    BELTS,
    toRank,
    beltOf,
    stripesOf,
    setting: load(),                          // null until the person picks (first visit)

    get chosen() { return !!this.setting; },
    get on() { return !this.setting || this.setting.on !== false; },   // on by default
    get rank() { return this.setting ? this.setting.rank : 0; },

    save(setting) {
      this.setting = setting;
      try { localStorage.setItem(KEY, JSON.stringify(setting)); } catch (e) {}
      if (JJ.Sync) JJ.Sync.changed();
    },
    reload() { this.setting = load(); },   // after sync brings in changes from another device

    // The rank a move is usually taught at.
    rankOf(id) { return parse(JJ.levels[id] || 'white 0'); },
    label(rank) {
      const s = stripesOf(rank);
      return `${beltOf(rank).name} belt` + (s ? ` · ${s} stripe${s > 1 ? 's' : ''}` : '');
    },

    // Is this move above your level? (Never, when belt levels are off.)
    locked(id) {
      const n = JJ.byId[id];
      return !!n && n.type === 'technique' && this.on && this.rankOf(id) > this.rank;
    },

    // How many moves you can see at a given rank.
    countUpTo(rank) { return JJ.data.techniques.filter(t => this.rankOf(t.id) <= rank).length; },

    // A little belt drawing: coloured belt, dark tab, white stripes on the tab.
    beltHTML(rank, extraClass = '') {
      const b = beltOf(rank), s = stripesOf(rank);
      return `<span class="belt belt-${b.id} ${extraClass}" aria-hidden="true"><span class="belt-tab">${'<i></i>'.repeat(s)}</span></span>`;
    },
  };

  JJ.Belts = Belts;
})();
