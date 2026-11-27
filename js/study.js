/*
 * FLASHCARD STUDY MODE — the full-screen screens you see.
 *   Hub     → your belt, progress to the next stripe, Study / Stripe test buttons
 *   Card    → one question, tap your answers, Check, see what was right
 *   Results → score; a passed stripe test promotes your belt
 * The thinking (which cards, what counts as mastered) lives in cards.js.
 */
(function () {
  'use strict';

  const C = () => JJ.Cards, B = () => JJ.Belts;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = id => JJ.byId[id].name;
  const TYPE_LABEL = { works: 'If it works', fails: 'If it fails', desc: 'Name the move', where: 'Where from?' };

  const Study = {
    onRankChange: () => {},    // app.js redraws the web and belt button
    onClose: () => {},
  };

  let root, run = null;        // run = the session or test in progress

  Study.init = function (el) {
    root = el;
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
  };

  Study.open = function () {
    root.hidden = false;
    document.body.classList.add('studying');
    showHub();
  };

  Study.close = function () {
    root.hidden = true;
    document.body.classList.remove('studying');
    run = null;
    Study.onClose();
  };

  // ---- Hub --------------------------------------------------------------------
  function showHub() {
    run = null;
    const p = C().progress();
    const pct = p.targetTotal ? Math.round((p.mastered / p.targetTotal) * 100) : 0;
    const need = Math.ceil(p.targetTotal * C().PASS);
    const offNote = B().on ? '' : '<p class="muted small">Belt levels are off, so every move shows on the web, but flashcards still track your rank.</p>';
    const toStudy = p.due + p.fresh;
    const next = p.next === undefined ? `
        <p>You've reached the top of what's in the app so far. More moves are on the way. Keep studying to stay sharp.</p>`
      : `
        <div class="next-row">
          <span class="muted">Next:</span> ${B().beltHTML(p.next)} <b>${esc(B().label(p.next))}</b>
        </div>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${p.targetTotal}" aria-valuenow="${p.mastered}">
          <span style="width:${pct}%"></span><i style="left:${C().PASS * 100}%" title="80% unlocks the stripe test"></i>
        </div>
        <p class="small">${p.mastered} of ${p.targetTotal} of its cards mastered. ${p.ready
          ? '<b>The stripe test is unlocked!</b>'
          : `Master ${need - p.mastered} more to unlock the stripe test. A card is mastered once you get it right on two different days.`}</p>`;

    root.innerHTML = `
      <div class="study-top">
        <h1>Flashcards</h1>
        <button class="study-close" data-act="close" aria-label="Close flashcards">×</button>
      </div>
      <div class="study-body hub">
        <div class="rank-card">
          ${B().beltHTML(p.rank, 'belt-huge')}
          <div><div class="muted small">Your rank</div><div class="rank-name">${esc(B().label(p.rank))}</div></div>
        </div>
        ${offNote}
        <section class="hub-section">${next}</section>
        <div class="hub-actions">
          <button class="btn btn-primary btn-big" data-act="study" ${toStudy ? '' : 'disabled'}>
            Study now <span class="btn-sub">${p.due} due · ${Math.min(p.fresh, 8)} new</span></button>
          <button class="btn btn-big" data-act="test" ${p.ready ? '' : 'disabled'}>
            Take the stripe test <span class="btn-sub">${p.ready ? 'Up to 20 questions · 80% to pass' : 'Locked until 80% mastered'}</span></button>
        </div>
        ${toStudy ? '' : '<p class="muted small center">Nothing due right now. Cards come back as their timers run out: check back tomorrow.</p>'}
        <p class="muted small center">You know ${p.knownAtLevel} of ${p.totalAtLevel} cards at your level.</p>
      </div>`;
  }

  // ---- Running a session or test --------------------------------------------------
  function start(mode) {
    const cards = mode === 'test' ? C().buildTest() : C().buildSession();
    if (!cards.length) return showHub();
    run = { mode, cards, i: 0, right: 0, retried: new Set(), checked: false, picked: [] };
    showCard();
  }

  function showCard() {
    const card = run.cards[run.i];
    run.opts = C().options(card);
    run.picked = [];
    run.checked = false;
    const single = card.type === 'desc';
    const total = run.cards.length;
    root.innerHTML = `
      <div class="study-top">
        <div class="study-count">${run.mode === 'test' ? 'Stripe test · ' : ''}Card ${run.i + 1} of ${total}</div>
        <button class="study-close" data-act="hub" aria-label="Stop and go back">×</button>
      </div>
      <div class="study-progress"><span style="width:${(run.i / total) * 100}%"></span></div>
      <div class="study-body">
        <div class="q-card">
          <div class="q-type">${TYPE_LABEL[card.type]}</div>
          <h2 class="q-prompt">${esc(card.prompt)}</h2>
          ${card.quote ? `<blockquote class="q-quote">${esc(card.quote)}</blockquote>` : ''}
          <p class="q-hint muted">${single ? 'Pick one.' : 'Select all that apply.'}</p>
          <div class="q-options" role="group">
            ${run.opts.map((id, i) => `
              <button class="opt" data-opt="${id}" aria-pressed="false">
                <span class="opt-key">${i + 1}</span><span class="opt-name">${esc(name(id))}</span>
                ${JJ.byId[id].type === 'position' ? '<span class="chip-tag">position</span>' : ''}
                <span class="opt-mark" aria-hidden="true"></span></button>`).join('')}
          </div>
          <div class="q-feedback" aria-live="polite"></div>
        </div>
        <button class="btn btn-primary btn-big q-go" data-act="check" disabled>${run.mode === 'test' ? 'Next' : 'Check'}</button>
      </div>`;
  }

  function togglePick(id) {
    if (run.checked) return;
    const single = run.cards[run.i].type === 'desc';
    if (single) run.picked = [id];
    else run.picked = run.picked.includes(id) ? run.picked.filter(x => x !== id) : [...run.picked, id];
    root.querySelectorAll('.opt').forEach(b => {
      const on = run.picked.includes(b.dataset.opt);
      b.classList.toggle('picked', on);
      b.setAttribute('aria-pressed', on);
    });
    root.querySelector('.q-go').disabled = !run.picked.length;
  }

  function check() {
    const card = run.cards[run.i];
    const ok = C().isCorrect(card, run.picked);
    C().record(card, ok);
    if (ok) run.right++;
    if (run.mode === 'test') return advance();

    // Study: show what was right, and send a missed card round again later this session.
    run.checked = true;
    if (!ok && !run.retried.has(card.id)) { run.retried.add(card.id); run.cards.push(card); }
    root.querySelectorAll('.opt').forEach(b => {
      const id = b.dataset.opt, isAns = card.answer.includes(id), picked = run.picked.includes(id);
      b.classList.add(isAns ? (picked ? 'right' : 'missed') : (picked ? 'wrong' : 'dim'));
      b.querySelector('.opt-mark').textContent = isAns ? (picked ? '✓' : '✓ missed') : (picked ? '✗' : '');
      b.disabled = true;
    });
    const answers = card.answer.map(name).join(', ');
    root.querySelector('.q-feedback').innerHTML = ok
      ? '<p class="fb fb-ok">Correct! This card will come back later.</p>'
      : `<p class="fb fb-no">Not quite. The answer${card.answer.length > 1 ? 's are' : ' is'}: <b>${esc(answers)}</b>. You'll see this card again soon.</p>`;
    const go = root.querySelector('.q-go');
    go.textContent = 'Next';
    go.dataset.act = 'next';
    go.disabled = false;
    go.focus();
  }

  function advance() {
    run.i++;
    if (run.i < run.cards.length) return showCard();
    run.mode === 'test' ? testResults() : studyResults();
  }

  // ---- Results ------------------------------------------------------------------
  function studyResults() {
    const unique = new Set(run.cards.map(c => c.id)).size;
    const p = C().progress();
    root.innerHTML = `
      <div class="study-top"><h1>Session done</h1><button class="study-close" data-act="close" aria-label="Close">×</button></div>
      <div class="study-body center">
        <div class="big-score">${run.right}<span>/${run.cards.length}</span></div>
        <p>${unique} cards studied. Missed ones come back sooner; right ones wait longer.</p>
        ${p.ready ? '<p><b>Your stripe test is unlocked.</b></p>' : ''}
        <button class="btn btn-primary btn-big" data-act="hub">Back to flashcards</button>
      </div>`;
  }

  function testResults() {
    const score = run.right / run.cards.length;
    const pass = score >= C().PASS;
    const before = B().rank, next = C().progress().next;
    if (pass && next !== undefined) {
      C().promote(next);
      Study.onRankChange();
    }
    root.innerHTML = pass ? `
      <div class="study-top"><h1>Stripe earned!</h1><button class="study-close" data-act="close" aria-label="Close">×</button></div>
      <div class="study-body center promo">
        ${B().beltHTML(B().rank, 'belt-huge')}
        <h2>${esc(B().label(B().rank))}</h2>
        <p>You scored ${Math.round(score * 100)}%. New moves are open on the web. Your coach still gives the real stripes, but you know the material.</p>
        <button class="btn btn-primary btn-big" data-act="hub">Back to flashcards</button>
      </div>` : `
      <div class="study-top"><h1>Not this time</h1><button class="study-close" data-act="close" aria-label="Close">×</button></div>
      <div class="study-body center">
        <div class="big-score">${Math.round(score * 100)}<span>%</span></div>
        <p>You need 80% to earn <b>${esc(B().label(next))}</b> (you're still ${esc(B().label(before))}). The cards you missed will come back sooner, so study them and try again.</p>
        <button class="btn btn-primary btn-big" data-act="hub">Back to flashcards</button>
      </div>`;
  }

  // ---- Input --------------------------------------------------------------------
  function onClick(e) {
    const opt = e.target.closest('[data-opt]');
    if (opt) return togglePick(opt.dataset.opt);
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === 'close') Study.close();
    else if (act === 'hub') showHub();
    else if (act === 'study') start('study');
    else if (act === 'test') start('test');
    else if (act === 'check') check();
    else if (act === 'next') advance();
  }

  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { run ? showHub() : Study.close(); return; }
    if (!run) return;
    if (/^[1-9]$/.test(e.key)) {
      const id = run.opts && run.opts[+e.key - 1];
      if (id) togglePick(id);
    } else if (e.key === 'Enter') {
      const go = root.querySelector('.q-go');
      if (go && !go.disabled) { e.preventDefault(); go.click(); }
    }
  }

  Study.current = () => run && run.cards[run.i];   // read-only peek, used by tests
  JJ.Study = Study;
})();
