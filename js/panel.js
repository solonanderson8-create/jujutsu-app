/*
 * THE PANEL — the detail sheet that slides in when you tap a move or position.
 * Shows: description, video, where to go next, and your personal notes.
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

  const Panel = {
    onNavigate: () => {},
    onClose: () => {},
  };

  Panel.init = function (root) {
    this.root = root;
    this.body = root.querySelector('.panel-body');
    root.querySelector('.panel-close').addEventListener('click', () => this.onClose());
    this.body.addEventListener('click', e => {
      const chip = e.target.closest('[data-go]');
      if (chip) this.onNavigate(chip.dataset.go);
    });
  };

  Panel.close = function () {
    this.root.classList.remove('open');
    this.current = null;
  };

  Panel.open = function (id) {
    const n = JJ.byId[id];
    this.current = id;
    this.body.innerHTML = n.type === 'position' ? positionHTML(n) : techniqueHTML(n);
    this.body.scrollTop = 0;
    this.root.classList.add('open');
    bindNotes(this.body, id);
    if (n.type === 'technique') bindVideo(this.body, n);
  };

  // A clickable "chip" that jumps to another technique or position.
  function chip(id, extra) {
    const n = JJ.byId[id];
    const pos = n.type === 'position' ? n : JJ.byId[JJ.byId[n.category].position];
    const tag = n.type === 'position' ? '<span class="chip-tag">position</span>' : '';
    const off = n.type === 'technique' && JJ.filter !== 'all' && !n[JJ.filter] ? ' off' : '';
    return `<button class="chip${off}" data-go="${n.id}" style="--c:${pos.color}">
      <span class="dot"></span>${esc(n.name)}${tag}${extra ? `<span class="chip-tag">${esc(extra)}</span>` : ''}</button>`;
  }

  function chipList(ids, empty) {
    return ids.length
      ? `<div class="chips">${ids.map(id => chip(id)).join('')}</div>`
      : `<p class="muted">${empty}</p>`;
  }

  function techniqueHTML(t) {
    const cat = JJ.byId[t.category];
    const pos = JJ.byId[cat.position];
    const badges = (t.gi ? '<span class="badge gi">Gi</span>' : '') + (t.nogi ? '<span class="badge nogi">No-Gi</span>' : '');
    return `
      <div class="crumb"><button class="crumb-link" data-go="${pos.id}" style="--c:${pos.color}"><span class="dot"></span>${esc(pos.name)}</button>
        <span class="crumb-sep">›</span> ${esc(cat.name)}</div>
      <h2>${esc(t.name)}</h2>
      <div class="badges">${badges}</div>
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

      ${notesHTML()}
      ${communityHTML()}`;
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
      ${notesHTML()}`;
  }

  function notesHTML() {
    return `
      <section class="notes">
        <h3>My notes</h3>
        <textarea class="notes-input" rows="5" placeholder="What clicked for you? Details your coach mentioned? Write it here."></textarea>
        <p class="muted small notes-status">Saved on this device.</p>
      </section>`;
  }

  function communityHTML() {
    return `
      <section class="community">
        <h3>Community notes</h3>
        <p class="muted">Coming later. Sharing notes between people needs an online database. This version keeps everything on your device.</p>
      </section>`;
  }

  function bindNotes(body, id) {
    const box = body.querySelector('.notes-input');
    const status = body.querySelector('.notes-status');
    const key = 'jj-notes:' + id;
    box.value = store.get(key);
    let timer;
    box.addEventListener('input', () => {
      status.textContent = 'Saving…';
      clearTimeout(timer);
      timer = setTimeout(() => { store.set(key, box.value.trim() ? box.value : ''); status.textContent = 'Saved on this device.'; }, 400);
    });
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
      } else if (url) {
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
