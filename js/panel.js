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
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const when = ms => new Date(ms).toLocaleString(undefined,
    { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const Panel = {
    onNavigate: () => {},
    onClose: () => {},
    page: 0,          // 0 = main page, 1 = notes page
    drafts: {},       // unsent note text per move, kept while the app is open
  };

  Panel.init = function (root) {
    this.root = root;
    this.body = root.querySelector('.panel-body');
    root.querySelector('.panel-close').addEventListener('click', () => this.onClose());
    this.body.addEventListener('click', e => {
      const chip = e.target.closest('[data-go]');
      if (chip) return this.onNavigate(chip.dataset.go);
      const tab = e.target.closest('[data-page]');
      if (tab) return this.showPage(+tab.dataset.page, true);
    });
  };

  Panel.close = function () {
    this.root.classList.remove('open');
    this.current = null;
  };

  Panel.open = function (id) {
    const n = JJ.byId[id];
    const same = id === this.current;
    const oldMain = same && this.body.querySelector('.page-main');
    const keepScroll = oldMain ? oldMain.scrollTop : 0;
    if (!same) this.page = 0;           // a new move always starts on its main page
    this.current = id;

    const mainLabel = n.type === 'position' ? 'Position' : 'Technique';
    this.body.innerHTML = `
      <div class="panel-tabs" role="tablist">
        <button role="tab" data-page="0">${mainLabel}</button>
        <button role="tab" data-page="1">Notes <span class="tab-count"></span></button>
      </div>
      <div class="pages">
        <div class="page page-main">${n.type === 'position' ? positionHTML(n) : techniqueHTML(n)}</div>
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
    const page = this.body.querySelector('.page-notes');
    this.body.querySelector('.tab-count').textContent = list.length ? '· ' + list.length : '';
    this.body.querySelector('.js-notes-pill').innerHTML = pillHTML(list);
    this.body.querySelector('.js-notes-teaser').innerHTML = teaserHTML(list);

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

  // Signposts on the main page that point to the Notes page.
  const PENCIL = '<svg class="icon-pencil" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>';

  function pillHTML(list) {
    const label = list.length ? `My notes · ${list.length}` : 'Add a note';
    return `${PENCIL}<span>${label}</span><span class="pill-arrow">›</span>`;
  }

  function teaserHTML(list) {
    const last = list[list.length - 1];
    const body = last
      ? `<p class="teaser-meta">Latest · ${esc(when(last.created))}</p><p class="teaser-text">${esc(last.text)}</p>`
      : '<p class="muted">Nothing yet. Write down what clicked, or what your coach told you.</p>';
    return `
      <h3>${PENCIL} My notes</h3>
      ${body}
      <button class="btn btn-primary teaser-go" data-page="1">${last ? 'Open notes' : 'Write a note'} <span aria-hidden="true">→</span></button>`;
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

  // A clickable "chip" that jumps to another technique or position.
  function chip(id, extra) {
    const n = JJ.byId[id];
    const pos = n.type === 'position' ? n : JJ.byId[JJ.byId[n.category].position];
    const tag = n.type === 'position' ? '<span class="chip-tag">position</span>' : '';
    const dot = n.type === 'technique' ? `dot role-${n.role}` : 'dot';
    const off = n.type === 'technique' && !JJ.matches(n) ? ' off' : '';
    return `<button class="chip${off}" data-go="${n.id}" style="--c:${pos.color}">
      <span class="${dot}"></span>${esc(n.name)}${tag}${extra ? `<span class="chip-tag">${esc(extra)}</span>` : ''}</button>`;
  }

  function chipList(ids, empty) {
    return ids.length
      ? `<div class="chips">${ids.map(id => chip(id)).join('')}</div>`
      : `<p class="muted">${empty}</p>`;
  }

  function techniqueHTML(t) {
    const cat = JJ.byId[t.category];
    const pos = JJ.byId[cat.position];
    const role = { top: 'You: Top', bottom: 'You: Bottom', neutral: 'Standing' }[t.role];
    const badges = `<span class="badge role ${t.role}"><span class="role-dot"></span>${role}</span>` +
      (t.gi ? '<span class="badge gi">Gi</span>' : '') + (t.nogi ? '<span class="badge nogi">No-Gi</span>' : '');
    return `
      <div class="crumb"><button class="crumb-link" data-go="${pos.id}" style="--c:${pos.color}"><span class="dot"></span>${esc(pos.name)}</button>
        <span class="crumb-sep">›</span> ${esc(cat.name)}</div>
      <h2>${esc(t.name)}</h2>
      <div class="badges">${badges}</div>
      <button class="notes-pill js-notes-pill" data-page="1"></button>
      <p class="desc">${esc(t.desc)}</p>

      <section class="links success">
        <h3><span class="icon">✓</span> If it works, go to</h3>
        ${chipList(t.success, 'This is a finish. If it works, they tap.')}
      </section>
      <section class="links fail">
        <h3><span class="icon">↻</span> If it fails, try</h3>
        ${chipList(t.fail, 'No backup linked yet.')}
      </section>
      <section class="links related">
        <h3><span class="icon">∼</span> Related moves</h3>
        ${chipList(t.related, 'None linked yet.')}
      </section>

      <section class="video">
        <h3>Video</h3>
        <div class="video-slot"></div>
        <div class="video-form">
          <input type="url" class="video-input" placeholder="Paste a YouTube link…" aria-label="Video link">
          <a class="btn" target="_blank" rel="noopener"
             href="https://www.youtube.com/results?search_query=${encodeURIComponent('bjj ' + t.name + ' tutorial')}">Search YouTube ↗</a>
        </div>
      </section>
      <section class="notes-teaser js-notes-teaser"></section>`;
  }

  function positionHTML(p) {
    const out = JJ.data.flows.filter(f => f.from === p.id);
    const inn = JJ.data.flows.filter(f => f.to === p.id);
    const flowChips = (list, key) => list.length
      ? `<div class="chips">${list.map(f => chip(f[key], f.label)).join('')}</div>`
      : '<p class="muted">None yet.</p>';
    const count = p.cats.reduce((s, c) => s + c.techs.length, 0);
    return `
      <div class="crumb"><span class="dot" style="--c:${p.color}"></span> Position · ${count} moves</div>
      <h2>${esc(p.name)}</h2>
      <button class="notes-pill js-notes-pill" data-page="1"></button>
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
        ${p.cats.map(c => `<h4>${esc(c.name)}</h4><div class="chips">${c.techs.map(t => chip(t.id)).join('')}</div>`).join('')}
      </section>
      <section class="notes-teaser js-notes-teaser"></section>`;
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
