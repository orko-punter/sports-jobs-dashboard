// ---------------------------------------------------------------- Questions & answers: a sticky panel on the right
// Shared by everyone who uses the site (stored in Supabase). Reading is open; asking and answering need sign-in.
const QA = { posts: [], loaded: false, loading: false, err: '', open: {}, sheet: false, busy: false, draft: '', timer: null };
const QA_VIEWS = ['for-you', 'jobs', 'companies', 'saved'];
const qaOn = () => authOn() && QA_VIEWS.includes(route.view);
const qaAuthor = () => (S.name || '').trim() || 'LBS student';

function qaThreads() {
  const qs = QA.posts.filter(p => !p.parent_id);
  const ans = id => QA.posts.filter(p => p.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  return qs.map(q => ({ ...q, answers: ans(q.id) }));
}

function qaPostHtml(p, isAnswer) {
  const mine = Auth.user && p.user_id === Auth.user.uid;
  return `<div class="qa-meta"><b>${esc(p.author)}</b><span>${esc(relTime(new Date(p.created_at)))}</span>
    ${mine ? `<button class="qa-del" type="button" data-act="qa-del" data-id="${esc(p.id)}" aria-label="Delete your ${isAnswer ? 'answer' : 'question'}">Delete</button>` : ''}</div>`;
}

function qaListHtml() {
  if (QA.err && !QA.loaded) return `<p class="qa-empty">Couldn't load questions: ${esc(QA.err)} <button class="link" type="button" data-act="qa-reload">Try again</button></p>`;
  if (!QA.loaded) return '<p class="qa-empty">Loading questions…</p>';
  const ts = qaThreads();
  if (!ts.length) return `<p class="qa-empty">No questions yet. Ask the first one: about a company, a role, interviews or how people got in.</p>`;
  return ts.map(q => {
    const open = !!QA.open[q.id], n = q.answers.length;
    return `<article class="qa-q${open ? ' open' : ''}">
      <p class="qa-body">${esc(q.body)}</p>
      ${qaPostHtml(q, false)}
      <button class="qa-toggle" type="button" data-act="qa-open" data-id="${esc(q.id)}" aria-expanded="${open}">
        ${n ? plural(n, 'answer') : 'No answers yet'}${ico('arrow', 'i-sm')}</button>
      ${open ? `<div class="qa-answers">
        ${q.answers.map(a => `<div class="qa-a"><p class="qa-body">${esc(a.body)}</p>${qaPostHtml(a, true)}</div>`).join('')}
        ${Auth.user ? `<form class="qa-reply" data-id="${esc(q.id)}"><label class="sr" for="qa-r-${esc(q.id)}">Your answer</label>
          <textarea id="qa-r-${esc(q.id)}" rows="2" maxlength="1000" placeholder="Write an answer…" required></textarea>
          <button class="btn sm primary" type="submit">Answer</button></form>`
        : `<a class="link small" href="#/account">Sign in to answer</a>`}
      </div>` : ''}
    </article>`;
  }).join('');
}

function qaPanelHtml() {
  const n = QA.posts.filter(p => !p.parent_id).length;
  const ask = Auth.user
    ? `<form class="qa-ask" id="qa-ask">
        <label class="sr" for="qa-q">Ask a question</label>
        <textarea id="qa-q" rows="3" maxlength="1000" placeholder="Ask about a company, a role, interviews…" required>${esc(QA.draft)}</textarea>
        <div class="qa-row"><span class="muted small">Posting as <b>${esc(qaAuthor())}</b> · <a class="link" href="#/account">Change</a></span>
        <button class="btn sm primary" type="submit" ${QA.busy ? 'disabled' : ''}>${QA.busy ? 'Posting…' : 'Ask'}</button></div>
      </form>`
    : `<div class="qa-signin"><p>Ask the cohort about companies, roles and interviews. Sign in with your email to ask or answer.</p>
        <a class="btn sm primary" href="#/account">Sign in to ask</a></div>`;
  return `<div class="qa-box" role="complementary" aria-labelledby="qa-title">
    <div class="qa-head"><div><span class="eyebrow">Ask the cohort</span><h2 id="qa-title">Questions <em>&amp; answers</em></h2></div>
      <button class="icon-btn qa-x" type="button" data-act="qa-sheet" aria-label="Close questions">${ico('x')}</button></div>
    ${ask}
    <div class="qa-list" id="qa-list" aria-live="polite">${qaListHtml()}</div>
  </div>
  <button class="qa-fab" type="button" data-act="qa-sheet" aria-expanded="${QA.sheet}" aria-controls="qa">${ico('users', 'i-sm')} Questions${n ? `<span class="n">${n}</span>` : ''}</button>`;
}

// Show or hide the panel for the current view, and keep it fresh while visible
function renderQA() {
  const box = $('#qa'), shell = $('#shell');
  const on = qaOn();
  shell.classList.toggle('with-qa', on);
  box.hidden = !on;
  document.body.classList.toggle('qa-sheet-open', on && QA.sheet);
  if (!on) { clearInterval(QA.timer); QA.timer = null; return; }
  box.innerHTML = qaPanelHtml();
  box.classList.toggle('sheet-open', QA.sheet);
  bindQA();
  if (!QA.loaded && !QA.loading) loadQA();
  if (!QA.timer) QA.timer = setInterval(() => { if (document.visibilityState === 'visible' && qaOn()) loadQA(); }, 60000);
}
function paintQAList() {
  const l = $('#qa-list'); if (!l) return;
  const st = l.scrollTop; l.innerHTML = qaListHtml(); l.scrollTop = st;
  const n = QA.posts.filter(p => !p.parent_id).length, fab = $('.qa-fab');
  if (fab) fab.innerHTML = `${ico('users', 'i-sm')} Questions${n ? `<span class="n">${n}</span>` : ''}`;
  bindQAReplies();
}
async function loadQA() {
  QA.loading = true;
  try { QA.posts = await Auth.qaList() || []; QA.loaded = true; QA.err = ''; }
  catch (e) { QA.err = e.message; }
  QA.loading = false; paintQAList();
}

function bindQA() {
  const f = $('#qa-ask');
  if (f) {
    const t = $('#qa-q');
    t.addEventListener('input', () => { QA.draft = t.value; });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const body = t.value.trim();
      if (body.length < 3) { toast('Write a little more first'); t.focus(); return; }
      QA.busy = true; renderQA();
      try { const p = await Auth.qaPost(body, null, qaAuthor()); if (p) QA.posts.unshift(p); QA.draft = ''; toast('Question posted'); }
      catch (err) { toast(`Couldn't post: ${err.message}`); }
      QA.busy = false; renderQA();
    });
  }
  bindQAReplies();
}
function bindQAReplies() {
  $$('.qa-reply').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const t = $('textarea', f), body = t.value.trim();
    if (body.length < 3) { toast('Write a little more first'); t.focus(); return; }
    const b = $('button', f); b.disabled = true; b.textContent = 'Posting…';
    try { const p = await Auth.qaPost(body, f.dataset.id, qaAuthor()); if (p) QA.posts.push(p); toast('Answer posted'); paintQAList(); }
    catch (err) { toast(`Couldn't post: ${err.message}`); b.disabled = false; b.textContent = 'Answer'; }
  }));
}

async function qaAction(a, el) {
  switch (a) {
    case 'qa-open': QA.open[el.dataset.id] = !QA.open[el.dataset.id]; paintQAList();
      if (QA.open[el.dataset.id]) { const t = $(`#qa-r-${CSS.escape(el.dataset.id)}`); if (t) t.focus({ preventScroll: true }); } break;
    case 'qa-sheet': QA.sheet = !QA.sheet; renderQA(); if (QA.sheet) { const h = $('#qa-title'); if (h) h.scrollIntoView({ block: 'nearest' }); } break;
    case 'qa-reload': QA.err = ''; paintQAList(); loadQA(); break;
    case 'qa-del':
      if (!confirm('Delete this post? Any answers to a question go with it.')) break;
      try { await Auth.qaDelete(el.dataset.id); QA.posts = QA.posts.filter(p => p.id !== el.dataset.id && p.parent_id !== el.dataset.id); toast('Deleted'); paintQAList(); }
      catch (err) { toast(`Couldn't delete: ${err.message}`); }
      break;
  }
}
