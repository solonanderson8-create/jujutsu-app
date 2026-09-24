/*
 * THE PANEL — the "technique page" (or "position page") that slides in when
 * you tap something on the web. It holds two pages side by side on a sliding
 * tray: the main page (description, links, video) and the Notes page.
 * Swipe sideways or tap the tabs to slide between them.
 *
 * Notes and video links are saved in the browser (localStorage), so they
 * stay on this device only. Sharing them with other people needs a server;
 * that's a later step.
 */
(function () {
  'use strict';

  const store = {
    get(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } },
    set(key, val) { try { val ? localStorage.setItem(key, val) : localStorage.removeItem(key); } catch (e) {} },
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Pull the video id out of any common YouTube link shape.
  function youtubeId(url) {
    const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  // ---------------------------------------------------------------------------
  // NOTES STORE — each move keeps a list of timestamped notes:
  //   [{ id, text, created, edited? }]  (times are milliseconds since 1970)
  // ---------------------------------------------------------------------------
  const Notes = {
    key: id => 'jj-notes-list:' + id,
    list(id) {
      let list = [];
      try { list = JSON.parse(store.get(this.key(id)) || '[]'); } catch (e) {}
      // The first version stored one big text box per move. Bring it over once.
      const old = store.get('jj-notes:' + id);
      if (old && old.trim()) {
        list.unshift({ id: newId(), text: old.trim(), created: Date.now(), imported: true });
        this.save(id, list);
        store.set('jj-notes:' + id, '');
      }
      return list.sort((a, b) => a.created - b.created);  // oldest first
    },
    save(id, list) { store.set(this.key(id), list.length ? JSON.stringify(list) : ''); },
  };
  // Moves that were merged (e.g. two Armbars → one) bring their notes and video along.
  Notes.migrateRenamed = function () {
    Object.entries(JJ.renamed).forEach(([old, now]) => {
      const oldList = this.list(old);                    // also picks up the older single-box notes
      if (oldList.length) {
        this.save(now, [...this.list(now), ...oldList]);
        this.save(old, []);
      }
      const oldVideo = store.get('jj-video:' + old);
      if (oldVideo) {
        if (!store.get('jj-video:' + now)) store.set('jj-video:' + now, oldVideo);
        store.set('jj-video:' + old, '');
      }
    });
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const when = ms => new Date(ms).toLocaleString(undefined,
    { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const Panel = {
    onNavigate: () => {},
    onClose: () => {},
    onJournal: () => {},  // open the training journal (optionally at one entry)
    page: 0,          // 0 = main page, 1 = notes page
    drafts: {},       // unsent note text per move, kept while the app is open
  };

  Panel.init = function (root) {
    Notes.migrateRenamed();
    this.root = root;
    this.body = root.querySelector('.panel-body');
    root.querySelector('.panel-close').addEventListener('click', () => this.onClose());
    this.body.addEventListener('click', e => {
      const chip = e.target.closest('[data-go]');
      if (chip) return this.onNavigate(chip.dataset.go, chip.dataset.place);
      const entry = e.target.closest('[data-journal]');
      if (entry) return this.onJournal(entry.dataset.journal);
      const tab = e.target.closest('[data-page]');
      if (tab) return this.showPage(+tab.dataset.page, true);
    });
  };

  Panel.close = function () {
    this.root.classList.remove('open');
    this.current = null;
    this.mode = null;
  };

  // `place` = which of the move's places to show (for moves done from several positions).
  Panel.open = function (id, place) {
    const n = JJ.byId[id];
    const same = id === this.current;
    const oldMain = same && this.body.querySelector('.page-main');
    const keepScroll = oldMain && place === this.place ? oldMain.scrollTop : 0;
    if (!same) this.page = 0;           // a new move always starts on its main page
    this.current = id;
    this.place = place;
    this.mode = 'item';

    const mainLabel = n.type === 'position' ? 'Position' : 'Technique';
    this.body.innerHTML = `
      <div class="panel-tabs" role="tablist">
        <button role="tab" data-page="0">${mainLabel}</button>
        <button role="tab" data-page="1">Notes <span class="tab-count"></span></button>
      </div>
      <div class="pages">
        <div class="page page-main">${n.type === 'position' ? positionHTML(n) : techniqueHTML(n, place)}</div>
        <div class="page page-notes"></div>
      </div>`;
    this.root.classList.add('open');

    this.pages = this.body.querySelector('.pages');
    this.pages.addEventListener('scroll', () => {
      const i = Math.round(this.pages.scrollLeft / (this.pages.clientWidth || 1));
      if (i !== this.page) { this.page = i; this.markTab(); }
    }, { passive: true });

    if (n.type === 'technique') bindVideo(this.body, n);
    this.renderNotes();
    this.body.querySelector('.page-main').scrollTop = keepScroll;
    this.showPage(this.page, false);
    this.peekOnce();
  };

  // The first time a page opens on this device, the tray slides a little to
  // show the Notes page is there, then springs back (like tugging a drawer).
  Panel.peekOnce = function () {
    if (this.page !== 0 || store.get('jj-notes-peeked')) return;
    store.set('jj-notes-peeked', '1');
    const pages = this.pages, tab = this.body.querySelector('[data-page="1"]');
    setTimeout(() => {
      if (!pages.isConnected) return;
      pages.classList.add('peek');
      tab.classList.add('glow');
      setTimeout(() => pages.classList.remove('peek'), 1200);
      setTimeout(() => tab.classList.remove('glow'), 2400);
    }, 700);
  };

  // Slide the tray to page i (0 = main, 1 = notes).
  Panel.showPage = function (i, animate) {
    this.page = i;
    this.markTab();
    this.pages.scrollTo({ left: i * this.pages.clientWidth, behavior: animate ? 'smooth' : 'auto' });
  };

  Panel.markTab = function () {
    this.body.querySelectorAll('[data-page]').forEach(b => {
      const on = +b.dataset.page === this.page;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
  };

  // ---------------------------------------------------------------------------
  // NOTES PAGE — a timeline of your notes, oldest at the top, newest at the
  // bottom, with a box at the end to add a new one.
  // ---------------------------------------------------------------------------
  Panel.renderNotes = function (scrollToEnd) {
    const id = this.current;
    const n = JJ.byId[id];
    const list = Notes.list(id);
    const fromJournal = JJ.Journal.entriesAbout(id);
    const page = this.body.querySelector('.page-notes');
    const total = list.length + fromJournal.length;
    this.body.querySelector('.tab-count').textContent = total ? '· ' + total : '';

    page.innerHTML = `
      <h2>${esc(n.name)}</h2>
      <p class="muted small">Your notes, oldest first. Saved on this device.</p>
      <div class="note-list">
        ${list.length ? list.map(noteHTML).join('') : '<p class="muted note-empty">No notes yet. Add your first one below.</p>'}
      </div>
      <div class="note-compose">
        <textarea class="note-new" rows="4" placeholder="What clicked today? Details your coach mentioned?"></textarea>
        <button class="btn btn-primary note-add">Add note</button>
      </div>
      <section class="from-journal">
        <h3>${BOOK} From my training journal ${fromJournal.length ? `<span class="count">· ${fromJournal.length}</span>` : ''}</h3>
        ${fromJournal.length
          ? fromJournal.map(e => snippetHTML(e, id)).join('')
          : `<p class="muted">No journal entries mention ${esc(n.name)} yet. When you write about it in your training journal, it shows up here.</p>`}
      </section>
      ${communityHTML()}`;

    const box = page.querySelector('.note-new');
    box.value = this.drafts[id] || '';
    box.addEventListener('input', () => { this.drafts[id] = box.value; });
    const add = () => {
      const text = box.value.trim();
      if (!text) return box.focus();
      Notes.save(id, [...Notes.list(id), { id: newId(), text, created: Date.now() }]);
      delete this.drafts[id];
      this.renderNotes(true);
    };
    page.querySelector('.note-add').addEventListener('click', add);
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); });

    page.querySelector('.note-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const card = btn.closest('.note');
      const noteId = card.dataset.note;
      const act = btn.dataset.act;
      if (act === 'delete') {
        if (!confirm('Delete this note? This can\'t be undone.')) return;
        Notes.save(id, Notes.list(id).filter(x => x.id !== noteId));
        this.renderNotes();
      } else if (act === 'edit') {
        const note = Notes.list(id).find(x => x.id === noteId);
        card.classList.add('editing');
        card.querySelector('.note-body').innerHTML = `
          <textarea class="note-edit" rows="4"></textarea>
          <div class="note-edit-actions">
            <button class="btn" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="save">Save</button>
          </div>`;
        const ta = card.querySelector('.note-edit');
        ta.value = note.text;
        ta.focus();
      } else if (act === 'save') {
        const text = card.querySelector('.note-edit').value.trim();
        if (!text) return;
        Notes.save(id, Notes.list(id).map(x => x.id === noteId ? { ...x, text, edited: Date.now() } : x));
        this.renderNotes();
      } else if (act === 'cancel') {
        this.renderNotes();
      }
    });

    if (scrollToEnd) page.scrollTop = page.scrollHeight;
  };

  const BOOK = '<svg class="icon-book" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>';

  // A short piece of a journal entry around where it mentions `id`, with the mention in bold.
  function snippetHTML(entry, id) {
    const m = JJ.Journal.findMentions(entry.text).find(x => x.id === id);
    const text = entry.text;
    const from = Math.max(0, m.start - 70), to = Math.min(text.length, m.end + 110);
    const before = (from > 0 ? '…' : '') + text.slice(from, m.start);
    const after = text.slice(m.end, to) + (to < text.length ? '…' : '');
    return `
      <button class="journal-snippet" data-journal="${esc(entry.id)}">
        <span class="snippet-date">${esc(when(entry.created))}</span>
        <span class="snippet-text">${esc(before)}<b>${esc(text.slice(m.start, m.end))}</b>${esc(after)}</span>
        <span class="snippet-open">Open entry →</span>
      </button>`;
  }

  // ---------------------------------------------------------------------------
  // TRAINING JOURNAL PAGE — free writing about whole classes. Oldest first,
  // with the box for a new entry at the bottom (it opens scrolled down there).
  // ---------------------------------------------------------------------------
  Panel.openJournal = function (focusEntryId) {
    this.mode = 'journal';
    this.current = null;
    this.place = null;
    this.root.classList.add('open');
    this.renderJournal(focusEntryId);
  };

  Panel.renderJournal = function (focusEntryId) {
    const J = JJ.Journal;
    const list = J.list();
    this.body.innerHTML = `
      <div class="journal-head">
        <h2>${BOOK} Training journal</h2>
        <p class="muted small">Write about class. Moves and positions you mention turn into links. Saved on this device.</p>
      </div>
      <div class="journal-scroll">
        <div class="journal-list">
          ${list.length ? list.map(entryHTML).join('') : '<p class="muted note-empty">No entries yet. How did class go today?</p>'}
        </div>
        <div class="note-compose">
          <label class="compose-date">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</label>
          <textarea class="journal-new" rows="6" placeholder="What did you work on? What worked, what didn't? Mention moves by name, like ‘hit a scissor sweep’, and they’ll link up."></textarea>
          <button class="btn btn-primary journal-add">Save entry</button>
        </div>
      </div>`;

    const scroll = this.body.querySelector('.journal-scroll');
    const box = this.body.querySelector('.journal-new');
    box.value = this.drafts.__journal || '';
    box.addEventListener('input', () => { this.drafts.__journal = box.value; });
    const add = () => {
      const text = box.value.trim();
      if (!text) return box.focus();
      J.add(text);
      delete this.drafts.__journal;
      this.renderJournal();
    };
    this.body.querySelector('.journal-add').addEventListener('click', add);
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); });

    this.body.querySelector('.journal-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      const card = btn.closest('.journal-entry');
      const entryId = card.dataset.entry;
      const entry = J.list().find(x => x.id === entryId);
      const act = btn.dataset.act;
      if (act === 'delete') {
        if (!confirm('Delete this journal entry? This can\'t be undone.')) return;
        J.remove(entryId);
        this.renderJournal();
      } else if (act === 'unlink') {
        J.update(entryId, { unlinked: [...(entry.unlinked || []), btn.dataset.id] });
        this.renderJournal(entryId);
      } else if (act === 'edit') {
        card.querySelector('.entry-body').innerHTML = `
          <textarea class="note-edit" rows="6"></textarea>
          <div class="note-edit-actions">
            <button class="btn" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="save">Save</button>
          </div>`;
        const ta = card.querySelector('.note-edit');
        ta.value = entry.text;
        ta.focus();
      } else if (act === 'save') {
        const text = card.querySelector('.note-edit').value.trim();
        if (!text) return;
        J.update(entryId, { text, edited: Date.now() });
        this.renderJournal(entryId);
      } else if (act === 'cancel') {
        this.renderJournal(entryId);
      }
    });

    const target = focusEntryId && this.body.querySelector(`[data-entry="${CSS.escape(focusEntryId)}"]`);
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.classList.add('flash');
    } else {
      scroll.scrollTop = scroll.scrollHeight;     // open at the newest entry and the writing box
    }
  };

  // Entry text with every spotted move/position turned into a link.
  function linkify(entry) {
    const skip = new Set(entry.unlinked || []);
    let html = '', at = 0;
    JJ.Journal.findMentions(entry.text).forEach(m => {
      if (skip.has(m.id)) return;
      html += esc(entry.text.slice(at, m.start)) +
        `<button class="jlink" data-go="${m.id}">${esc(entry.text.slice(m.start, m.end))}</button>`;
      at = m.end;
    });
    return html + esc(entry.text.slice(at));
  }

  function entryHTML(entry) {
    const ids = JJ.Journal.mentionsOf(entry);
    const meta = entry.edited ? ` · edited ${esc(when(entry.edited))}` : '';
    const mentions = ids.length ? `
      <div class="entry-mentions">
        <span class="muted small">Linked:</span>
        ${ids.map(id => `<span class="mention-chip"><button data-go="${id}">${esc(JJ.byId[id].name)}</button><button class="unlink" data-act="unlink" data-id="${id}" aria-label="Unlink ${esc(JJ.byId[id].name)}" title="Not about this move? Unlink it">×</button></span>`).join('')}
      </div>` : '';
    return `
      <article class="journal-entry" data-entry="${esc(entry.id)}">
        <header>
          <time datetime="${new Date(entry.created).toISOString()}">${esc(when(entry.created))}</time>
          <span class="muted small">${meta}</span>
        </header>
        <div class="entry-body">
          <p class="note-text">${linkify(entry)}</p>
          ${mentions}
          <div class="note-actions">
            <button class="link-btn" data-act="edit">Edit</button>
            <button class="link-btn danger" data-act="delete">Delete</button>
          </div>
        </div>
      </article>`;
  }

  function noteHTML(note) {
    const meta = note.imported ? ' · moved from your old notes'
      : note.edited ? ` · edited ${esc(when(note.edited))}` : '';
    return `
      <article class="note" data-note="${esc(note.id)}">
        <header>
          <time datetime="${new Date(note.created).toISOString()}">${esc(when(note.created))}</time>
          <span class="muted small">${meta}</span>
        </header>
        <div class="note-body">
          <p class="note-text">${esc(note.text)}</p>
          <div class="note-actions">
            <button class="link-btn" data-act="edit">Edit</button>
            <button class="link-btn danger" data-act="delete">Delete</button>
          </div>
        </div>
      </article>`;
  }

  // A clickable "chip" that jumps to another move or position.
  // For a move, `place` picks which of its places (default: its first).
  function chip(id, extra, place) {
    const n = JJ.byId[id];
    const pl = n.type === 'technique' ? JJ.placeOf(n, place) : null;
    const pos = pl ? JJ.positionOf(pl) : n;
    const tag = n.type === 'position' ? '<span class="chip-tag">position</span>' : '';
    const dot = pl ? `dot role-${pl.role}` : 'dot';
    const off = pl && !JJ.matches(n, place ? pl : null) ? ' off' : '';
    const placeAttr = place ? ` data-place="${esc(place)}"` : '';
    return `<button class="chip${off}" data-go="${n.id}"${placeAttr} style="--c:${pos.color}">
      <span class="${dot}"></span>${esc(n.name)}${tag}${extra ? `<span class="chip-tag">${esc(extra)}</span>` : ''}</button>`;
  }

  function chipList(ids, empty) {
    return ids.length
      ? `<div class="chips">${ids.map(id => chip(id)).join('')}</div>`
      : `<p class="muted">${empty}</p>`;
  }

  const ROLE_LABEL = { top: 'You: Top', bottom: 'You: Bottom', neutral: 'Standing' };

  function techniqueHTML(t, placeId) {
    const pl = JJ.placeOf(t, placeId);
    const cat = JJ.byId[pl.category];
    const pos = JJ.positionOf(pl);
    const badges = `<span class="badge role ${pl.role}"><span class="role-dot"></span>${ROLE_LABEL[pl.role]}</span>` +
      (t.gi ? '<span class="badge gi">Gi</span>' : '') + (t.nogi ? '<span class="badge nogi">No-Gi</span>' : '');
    // Moves done from several positions get a switcher; links below follow the chosen place.
    const doneFrom = t.places.length < 2 ? '' : `
      <div class="done-from">
        <span class="done-from-label">Done from</span>
        ${t.places.map(p2 => {
          const ps = JJ.positionOf(p2);
          const on = p2 === pl;
          return `<button class="place-btn${on ? ' active' : ''}" data-go="${t.id}" data-place="${p2.category}"
            style="--c:${ps.color}" aria-pressed="${on}"><span class="dot role-${p2.role}"></span>${esc(ps.name)}</button>`;
        }).join('')}
      </div>`;
    const fromWhere = t.places.length > 1 ? ` from ${esc(pos.name)}` : '';
    return `
      <div class="crumb"><button class="crumb-link" data-go="${pos.id}" style="--c:${pos.color}"><span class="dot"></span>${esc(pos.name)}</button>
        <span class="crumb-sep">›</span> ${esc(cat.name)}</div>
      <h2>${esc(t.name)}</h2>
      <div class="badges">${badges}</div>
      ${doneFrom}
      <p class="desc">${esc(t.desc)}</p>

      <section class="links success">
        <h3><span class="icon">✓</span> If it works${fromWhere}, go to</h3>
        ${chipList(pl.success, 'This is a finish. If it works, they tap.')}
      </section>
      <section class="links fail">
        <h3><span class="icon">↻</span> If it fails${fromWhere}, try</h3>
        ${chipList(pl.fail, 'No backup linked yet.')}
      </section>
      <section class="links related">
        <h3><span class="icon">∼</span> Related moves</h3>
        ${chipList(pl.related, 'None linked yet.')}
      </section>

      <section class="video">
        <h3>Video</h3>
        <div class="video-slot"></div>
        <div class="video-form">
          <input type="url" class="video-input" placeholder="Paste a YouTube link…" aria-label="Video link">
          <a class="btn" target="_blank" rel="noopener"
             href="https://www.youtube.com/results?search_query=${encodeURIComponent('bjj ' + t.name + ' tutorial')}">Search YouTube ↗</a>
        </div>
      </section>`;
  }

  function positionHTML(p) {
    const out = JJ.data.flows.filter(f => f.from === p.id);
    const inn = JJ.data.flows.filter(f => f.to === p.id);
    const flowChips = (list, key) => list.length
      ? `<div class="chips">${list.map(f => chip(f[key], f.label)).join('')}</div>`
      : '<p class="muted">None yet.</p>';
    const count = p.cats.reduce((s, c) => s + c.spots.length, 0);
    return `
      <div class="crumb"><span class="dot" style="--c:${p.color}"></span> Position · ${count} moves</div>
      <h2>${esc(p.name)}</h2>
      <p class="desc">${esc(p.blurb)}</p>
      <section class="links success">
        <h3><span class="icon">→</span> From here you can go to</h3>
        ${flowChips(out, 'to')}
      </section>
      <section class="links related">
        <h3><span class="icon">←</span> You get here from</h3>
        ${flowChips(inn, 'from')}
      </section>
      <section class="links">
        <h3>Inside this position</h3>
        ${p.cats.map(c => `<h4>${esc(c.name)}</h4><div class="chips">${c.spots.map(sp => chip(sp.tech.id, '', c.id)).join('')}</div>`).join('')}
      </section>`;
  }

  function communityHTML() {
    return `
      <section class="community">
        <h3>Community notes</h3>
        <p class="muted">Coming later. Sharing notes between people needs an online database. This version keeps everything on your device.</p>
      </section>`;
  }

  function bindVideo(body, t) {
    const key = 'jj-video:' + t.id;
    const slot = body.querySelector('.video-slot');
    const input = body.querySelector('.video-input');
    const render = () => {
      const url = store.get(key) || t.video || '';
      input.value = store.get(key);
      const yt = url && youtubeId(url);
      if (yt) {
        slot.innerHTML = `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${yt}"
          title="${esc(t.name)} video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
      } else if (/^https?:\/\//i.test(url)) {
        slot.innerHTML = `<p><a href="${esc(url)}" target="_blank" rel="noopener">Open video ↗</a></p>`;
      } else {
        slot.innerHTML = '<p class="muted">No video yet. Find a good one, then paste the link below and it will show up here.</p>';
      }
    };
    input.addEventListener('change', () => { store.set(key, input.value.trim()); render(); });
    render();
  }

  JJ.Panel = Panel;
  JJ.store = store;
})();
