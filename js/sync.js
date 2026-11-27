/*
 * ACCOUNTS + SYNC — sign in with an emailed code, and keep notes, journal,
 * videos, flashcards and belt the same on every device.
 *
 * How it works, like carbon-copy paper:
 *   - Everything is still saved on the device first, so the app works offline.
 *   - Each note, journal entry, video link, flashcard and the belt setting is a
 *     separate small "record". When something changes, only that record is
 *     sent to your account in the cloud. Other devices fetch what changed.
 *   - Two devices only clash if the SAME record was changed on both before
 *     syncing; then the newest change wins (flashcards keep the most recent
 *     study, the belt keeps the higher rank).
 *
 * This file talks to Supabase directly with fetch() — no extra library.
 * Settings (project URL + public key) live in js/config.js.
 */
(function () {
  'use strict';

  const cfg = JJ.config || {};
  const URL_ = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  const KEY_ = cfg.supabaseAnonKey || '';
  const AUTH = 'jj-auth', BASE = 'jj-sync-base', META = 'jj-sync-meta';

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null || v === '' ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
    json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; },
  };

  const Sync = {
    enabled: !!(URL_ && KEY_),
    status: 'off',          // off | signed-out | syncing | synced | offline | error
    error: '',
    lastSync: 0,
    onStatus: () => {},     // the account button/dialog redraws
    onApplied: () => {},    // something arrived from another device: redraw what's on screen
  };
  let session = ls.json(AUTH, null);   // { access_token, refresh_token, expires_at, user: { id, email } }

  // ---------------------------------------------------------------------------
  // RECORDS — turn what's saved on this device into small records, and back
  // ---------------------------------------------------------------------------
  const rk = (kind, key) => kind + '|' + key;
  const NOTE = 'jj-notes-list:', VIDEO = 'jj-video:';

  function readLocal() {
    const out = new Map();
    const put = (kind, key, data) => out.set(rk(kind, key), { kind, key: String(key), data });
    ls.keys().forEach(k => {
      if (k && k.startsWith(NOTE)) {
        const move = k.slice(NOTE.length);
        ls.json(k, []).forEach(n => n && n.id && put('note', n.id, { ...n, move }));
      } else if (k && k.startsWith(VIDEO)) {
        const url = ls.get(k);
        if (url) put('video', k.slice(VIDEO.length), { url });
      }
    });
    ls.json('jj-journal', []).forEach(e => e && e.id && put('journal', e.id, e));
    Object.entries(ls.json('jj-cards', {})).forEach(([id, s]) => put('card', id, s));
    const belt = ls.json('jj-belt', null);
    if (belt) put('setting', 'belt', belt);
    return out;
  }

  // Write one record (or its deletion) into the device's own storage.
  function applyLocal(kind, key, data) {
    if (kind === 'note') {
      // Find the note wherever it is, take it out, then put the new version in.
      ls.keys().filter(k => k && k.startsWith(NOTE)).forEach(k => {
        const list = ls.json(k, []);
        const kept = list.filter(n => n.id !== key);
        if (kept.length !== list.length) ls.set(k, kept.length ? JSON.stringify(kept) : null);
      });
      if (data && data.move) {
        const { move, ...note } = data;
        const list = ls.json(NOTE + move, []);
        list.push(note);
        ls.set(NOTE + move, JSON.stringify(list));
      }
    } else if (kind === 'journal') {
      const list = ls.json('jj-journal', []).filter(e => e.id !== key);
      if (data) list.push(data);
      ls.set('jj-journal', list.length ? JSON.stringify(list) : null);
    } else if (kind === 'video') {
      ls.set(VIDEO + key, data ? data.url : null);
    } else if (kind === 'card') {
      const cards = ls.json('jj-cards', {});
      if (data) cards[key] = data; else delete cards[key];
      ls.set('jj-cards', JSON.stringify(cards));
    } else if (kind === 'setting' && key === 'belt') {
      ls.set('jj-belt', data ? JSON.stringify(data) : null);
    }
  }

  // A short fingerprint of a record, to notice when it changed.
  // (Keys are sorted, so the same data always gives the same fingerprint.)
  const stable = v => v && typeof v === 'object'
    ? (Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
      : '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}')
    : JSON.stringify(v);
  const hash = data => {
    const s = stable(data);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + s.length.toString(36);
  };

  // When the same record changed here AND on another device: which one wins?
  function resolve(kind, key, local, remote, localTime) {
    if (kind === 'card' && local.data && remote.data) {
      return (remote.data.seen || 0) > (local.data.seen || 0) ? 'remote' : 'local';
    }
    if (kind === 'setting' && key === 'belt' && local.data && remote.data) {
      // Rank never drops: keep the higher one.
      return { ...local.data, rank: Math.max(local.data.rank || 0, remote.data.rank || 0) };
    }
    return remote.changed_at > localTime ? 'remote' : 'local';
  }

  // ---------------------------------------------------------------------------
  // TALKING TO SUPABASE
  // ---------------------------------------------------------------------------
  async function call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
    const h = { apikey: KEY_, 'Content-Type': 'application/json', ...headers };
    if (auth && session) h.Authorization = 'Bearer ' + session.access_token;
    let res;
    try {
      res = await fetch(URL_ + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      const err = new Error('No connection'); err.offline = true; throw err;
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) {
      const msg = (json && (json.msg || json.error_description || json.message || json.error)) || ('Error ' + res.status);
      const err = new Error(msg); err.status = res.status; throw err;
    }
    return json;
  }

  function keepSession(s) {
    session = {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
      user: { id: s.user.id, email: s.user.email },
    };
    ls.set(AUTH, JSON.stringify(session));
  }

  async function freshToken() {
    if (!session) throw new Error('Not signed in');
    if (session.expires_at * 1000 - Date.now() > 60000) return;
    try {
      keepSession(await call('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', auth: false, body: { refresh_token: session.refresh_token },
      }));
    } catch (e) {
      if (!e.offline && e.status >= 400 && e.status < 500) forget();   // the login expired or was revoked
      throw e;
    }
  }

  // ---------------------------------------------------------------------------
  // SIGNING IN AND OUT
  // ---------------------------------------------------------------------------
  Sync.user = () => session && session.user;

  Sync.sendCode = email => call('/auth/v1/otp', {
    method: 'POST', auth: false, body: { email: email.trim(), create_user: true },
  });

  Sync.verifyCode = async (email, code) => {
    const s = await call('/auth/v1/verify', {
      method: 'POST', auth: false, body: { type: 'email', email: email.trim(), token: code.replace(/\s+/g, '') },
    });
    const meta = ls.json(META, {});
    // A different person used this device before: their notes are already in
    // their own account, so clear them off the device instead of mixing them in.
    if (meta.userId && meta.userId !== s.user.id) clearLocalData();
    keepSession(s);
    if (meta.userId !== s.user.id) {
      ls.set(BASE, null);
      ls.set(META, JSON.stringify({ userId: s.user.id }));
    }
    setStatus('syncing');
    return Sync.syncNow();
  };

  function forget() {
    session = null;
    ls.set(AUTH, null);
    setStatus('signed-out');
  }

  Sync.signOut = async ({ removeData = false } = {}) => {
    if (session) {
      try { await Sync.syncNow(); } catch (e) {}                  // send any last changes first
      try { await call('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
    }
    forget();
    if (removeData) clearLocalData();
  };

  Sync.deleteAccount = async () => {
    await freshToken();
    await call('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
    forget();
    clearLocalData();
  };

  // Everything personal this app keeps on the device.
  function clearLocalData() {
    ls.keys().forEach(k => {
      if (k && (k.startsWith(NOTE) || k.startsWith(VIDEO) || k.startsWith('jj-notes:'))) ls.set(k, null);
    });
    ['jj-journal', 'jj-cards', 'jj-belt', BASE, META].forEach(k => ls.set(k, null));
  }
  Sync.clearLocalData = clearLocalData;

  // A copy of all your data as a file (works signed in or not).
  Sync.exportData = () => ({
    app: 'Jujutsu Flow', exported: new Date().toISOString(),
    account: session ? session.user.email : null,
    records: [...readLocal().values()],
  });

  // ---------------------------------------------------------------------------
  // SYNCING
  // ---------------------------------------------------------------------------
  function setStatus(s, error = '') {
    Sync.status = s;
    Sync.error = error;
    Sync.onStatus();
  }

  let running = null, again = false, timer = 0;

  // The app calls this whenever it saves something.
  Sync.changed = () => {
    if (!Sync.enabled) return;
    const meta = ls.json(META, {});
    meta.touched = Date.now();
    ls.set(META, JSON.stringify(meta));
    if (!session) return;
    clearTimeout(timer);
    timer = setTimeout(() => Sync.syncNow().catch(() => {}), 2500);   // wait for typing to settle
  };

  Sync.syncNow = () => {
    if (!Sync.enabled || !session) return Promise.resolve();
    if (running) { again = true; return running; }
    running = doSync()
      .then(() => { Sync.lastSync = Date.now(); setStatus('synced'); })
      .catch(e => { setStatus(e.offline ? 'offline' : session ? 'error' : 'signed-out', e.message); throw e; })
      .finally(() => {
        running = null;
        if (again) { again = false; Sync.syncNow().catch(() => {}); }
      });
    return running;
  };

  async function doSync() {
    setStatus('syncing');
    await freshToken();
    const me = session.user.id;
    const meta = ls.json(META, {});
    const base = ls.json(BASE, {});
    const localTime = meta.touched || Date.now();

    // 1. What changed on this device since the last sync?
    const local = readLocal();
    const dirty = new Map();
    local.forEach((r, k) => { if (base[k] !== hash(r.data)) dirty.set(k, r); });
    Object.keys(base).forEach(k => {
      if (!local.has(k)) {
        const i = k.indexOf('|');
        dirty.set(k, { kind: k.slice(0, i), key: k.slice(i + 1), data: null, deleted: true });
      }
    });

    // 2. Fetch what changed in the account since we last looked.
    //    (Look back an extra minute in case a slow save landed late; seeing a
    //    record twice is harmless.)
    let applied = 0, newest = meta.lastPull || null;
    const since = meta.lastPull ? new Date(Date.parse(meta.lastPull) - 60000).toISOString() : null;
    for (let offset = 0; ; offset += 1000) {
      const q = '/rest/v1/records?select=kind,key,data,deleted,changed_at,server_at&order=server_at.asc,kind.asc,key.asc'
        + (since ? '&server_at=gte.' + encodeURIComponent(since) : '') + '&limit=1000&offset=' + offset;
      const rows = await call(q);
      rows.forEach(row => {
        const k = rk(row.kind, row.key);
        if (!newest || row.server_at > newest) newest = row.server_at;
        const mine = dirty.get(k);
        const theirs = row.deleted ? null : row.data;
        if (mine) {
          if (!mine.deleted && theirs && hash(mine.data) === hash(theirs)) { dirty.delete(k); base[k] = hash(theirs); return; }
          const win = resolve(row.kind, row.key, mine, row, localTime);
          if (win === 'local') return;                              // ours is newer: it gets sent below
          if (win !== 'remote') {                                    // a merge of both
            applyLocal(row.kind, row.key, win); applied++;
            dirty.set(k, { kind: row.kind, key: row.key, data: win });
            return;
          }
          dirty.delete(k);
        }
        const current = local.get(k);
        if (hash(current ? current.data : null) !== hash(theirs)) { applyLocal(row.kind, row.key, theirs); applied++; }
        if (theirs) base[k] = hash(theirs); else delete base[k];
      });
      if (rows.length < 1000) break;
    }

    // 3. Send this device's changes, in batches.
    const out = [...dirty.values()];
    for (let i = 0; i < out.length; i += 300) {
      const batch = out.slice(i, i + 300);
      await call('/rest/v1/records?on_conflict=user_id,kind,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: batch.map(r => ({
          user_id: me, kind: r.kind, key: r.key,
          data: r.deleted ? null : r.data, deleted: !!r.deleted, changed_at: localTime,
        })),
      });
      batch.forEach(r => { const k = rk(r.kind, r.key); if (r.deleted) delete base[k]; else base[k] = hash(r.data); });
      ls.set(BASE, JSON.stringify(base));
    }

    ls.set(BASE, JSON.stringify(base));
    ls.set(META, JSON.stringify({ ...ls.json(META, {}), userId: me, lastPull: newest }));
    if (applied) Sync.onApplied();
  }

  // ---------------------------------------------------------------------------
  // START UP: sync when the app opens, comes back to the screen, or reconnects
  // ---------------------------------------------------------------------------
  Sync.start = () => {
    if (!Sync.enabled) return;
    // These do nothing while signed out, so they're safe to set up once.
    const soon = () => Sync.syncNow().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
    addEventListener('online', soon);
    setInterval(() => { if (document.visibilityState === 'visible') soon(); }, 60000);
    if (session) soon(); else setStatus('signed-out');
  };

  Sync._readLocal = readLocal;   // for tests
  JJ.Sync = Sync;
})();
