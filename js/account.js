/*
 * ACCOUNT SCREEN — the person button in the top bar and its pop-up card:
 *   signed out → type your email → type the 6-digit code you were sent
 *   signed in  → sync status, download your data, sign out, delete account
 * The real work (talking to the server) is in sync.js.
 */
(function () {
  'use strict';

  const S = JJ.Sync;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const btn = $('#account-btn'), dialog = $('#account-dialog'), body = dialog.querySelector('.account-body');
  let step = 'email', email = '', busy = false, msg = '', msgBad = false;

  const STATUS = {
    'signed-out': 'Not signed in. Notes are saved on this device only.',
    syncing: 'Syncing…',
    synced: 'Up to date on all your devices.',
    offline: "Offline. Changes are saved here and will sync when you're back online.",
    error: 'Sync hit a problem. It will try again.',
  };
  const ago = ms => {
    const s = Math.round((Date.now() - ms) / 1000);
    return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // ---- The top-bar button: a person icon with a small status light ------------
  function renderBtn() {
    btn.hidden = !S.enabled;
    btn.dataset.status = S.status;
    btn.setAttribute('aria-label', S.user() ? `Account: ${S.user().email}. ${STATUS[S.status] || ''}` : 'Sign in to sync your notes');
  }

  // ---- The card -------------------------------------------------------------------
  function render() {
    const u = S.user();
    const note = msg ? `<p class="account-msg${msgBad ? ' bad' : ''}" role="status">${esc(msg)}</p>` : '<p class="account-msg" role="status"></p>';
    const privacy = '<a href="privacy.html" target="_blank" rel="noopener">What is stored, and who can see it</a>';
    const download = '<button class="link-btn" data-act="export">Download a copy of my data</button>';

    if (!u && step === 'email') {
      body.innerHTML = `
        <h2 id="account-title">Sign in to sync</h2>
        <p class="muted">Keep your notes, journal, flashcards and belt the same on your phone, iPad and computer. We'll email you a 6-digit code, so there's no password to remember.</p>
        <form class="account-form" data-form="email">
          <label for="acct-email">Email</label>
          <input id="acct-email" class="field" type="email" autocomplete="email" inputmode="email" required value="${esc(email)}" placeholder="you@example.com">
          <button class="btn btn-primary btn-wide" ${busy ? 'disabled' : ''}>${busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
        ${note}
        <p class="muted small">Notes already on this device are added to your account when you sign in. ${privacy}.</p>
        <div class="account-links">${download}</div>`;
    } else if (!u) {
      body.innerHTML = `
        <h2 id="account-title">Check your email</h2>
        <p class="muted">We sent a code to <b>${esc(email)}</b>. Type it here. (It can take a minute. Check spam too.)</p>
        <form class="account-form" data-form="code">
          <label for="acct-code">Code</label>
          <input id="acct-code" class="field code-field" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,12}" required placeholder="123456">
          <button class="btn btn-primary btn-wide" ${busy ? 'disabled' : ''}>${busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        ${note}
        <div class="account-links">
          <button class="link-btn" data-act="resend">Send a new code</button>
          <button class="link-btn" data-act="change-email">Use a different email</button>
        </div>`;
    } else if (step === 'delete') {
      body.innerHTML = `
        <h2 id="account-title">Delete your account?</h2>
        <p>This permanently deletes your account and everything synced to it: notes, journal, videos, flashcard progress and belt. It also clears them from this device. <b>It can't be undone.</b></p>
        <p class="muted small">Want to keep a copy first? ${download}</p>
        <form class="account-form" data-form="delete">
          <label for="acct-confirm">Type DELETE to confirm</label>
          <input id="acct-confirm" class="field" type="text" autocomplete="off" autocapitalize="characters" required>
          <button class="btn btn-danger btn-wide" ${busy ? 'disabled' : ''}>${busy ? 'Deleting…' : 'Delete my account forever'}</button>
        </form>
        ${note}
        <div class="account-links"><button class="link-btn" data-act="cancel-delete">Cancel</button></div>`;
    } else {
      const when = S.status === 'synced' && S.lastSync ? ` (${ago(S.lastSync)})` : '';
      body.innerHTML = `
        <h2 id="account-title">Your account</h2>
        <p class="account-who">Signed in as <b>${esc(u.email)}</b></p>
        <p class="sync-line" data-status="${S.status}"><span class="sync-light" aria-hidden="true"></span>${esc(STATUS[S.status] || '')}${when}</p>
        ${S.status === 'error' && S.error ? `<p class="muted small">Details: ${esc(S.error)}</p>` : ''}
        <button class="btn btn-wide" data-act="sync" ${S.status === 'syncing' ? 'disabled' : ''}>Sync now</button>
        ${note}
        <div class="account-links">${download}</div>
        <hr>
        <label class="account-check"><input type="checkbox" id="acct-wipe"> Also remove my notes from this device (on a shared or borrowed device)</label>
        <button class="btn btn-wide" data-act="signout" ${busy ? 'disabled' : ''}>Sign out</button>
        <hr>
        <div class="account-links">${privacy}</div>
        <button class="link-btn danger" data-act="delete">Delete my account…</button>`;
    }
  }

  function say(text, bad = false) { msg = text; msgBad = bad; render(); }
  const friendly = e => e.offline ? "No internet connection. Try again when you're online."
    : /expired|invalid|token/i.test(e.message) ? 'That code is wrong or has expired. Check it, or send a new one.'
    : /rate|too many|seconds/i.test(e.message) ? 'Too many tries. Wait a minute, then try again.'
    : e.message;

  async function run(fn) {
    if (busy) return;
    busy = true; msg = ''; render();
    try { await fn(); } catch (e) { busy = false; return say(friendly(e), true); }
    busy = false; render();
  }

  function download() {
    const data = JSON.stringify(S.exportData(), null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'jujutsu-flow-data-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---- Input ------------------------------------------------------------------
  body.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target.dataset.form;
    if (form === 'email') {
      email = body.querySelector('#acct-email').value.trim();
      run(async () => { await S.sendCode(email); step = 'code'; msg = ''; });
    } else if (form === 'code') {
      const code = body.querySelector('#acct-code').value;
      run(async () => {
        try { await S.verifyCode(email, code); } catch (e) { if (!S.user()) throw e; }   // signed in; a sync hiccup retries later
        step = 'email';
        msg = 'Signed in. Your notes will now sync.'; msgBad = false;
      });
    } else if (form === 'delete') {
      if (body.querySelector('#acct-confirm').value.trim().toUpperCase() !== 'DELETE') return say('Type DELETE (in capitals) to confirm.', true);
      run(async () => { await S.deleteAccount(); location.reload(); });
    }
  });

  body.addEventListener('click', e => {
    const act = (e.target.closest('[data-act]') || {}).dataset?.act;
    if (!act) return;
    if (act === 'export') download();
    else if (act === 'resend') run(async () => { await S.sendCode(email); msg = 'New code sent.'; msgBad = false; });
    else if (act === 'change-email') { step = 'email'; msg = ''; render(); }
    else if (act === 'sync') { msg = ''; S.syncNow().catch(() => {}); }
    else if (act === 'signout') {
      const wipe = body.querySelector('#acct-wipe').checked;
      run(async () => { await S.signOut({ removeData: wipe }); if (wipe) location.reload(); step = 'email'; });
    }
    else if (act === 'delete') { step = 'delete'; msg = ''; render(); }
    else if (act === 'cancel-delete') { step = 'email'; msg = ''; render(); }
  });

  function open() {
    msg = '';
    if (S.user() && step !== 'delete') step = 'email';
    render();
    dialog.hidden = false;
    const first = body.querySelector('input, button');
    if (first) first.focus();
  }
  function close() { dialog.hidden = true; if (step === 'delete') step = 'email'; }

  btn.addEventListener('click', open);
  dialog.querySelector('.modal-close').addEventListener('click', close);
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dialog.hidden) close(); });

  // Redraw when the sync status changes, but never while someone is typing.
  const typing = () => { const a = document.activeElement; return a && body.contains(a) && a.matches('input'); };
  S.onStatus = () => { renderBtn(); if (!dialog.hidden && !busy && !typing()) render(); };
  renderBtn();
  JJ.Account = { open, close };
})();
