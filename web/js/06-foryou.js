// ---------------------------------------------------------------- views: questions + For you
let QD = null;                       // draft answers while the questions are open
let QSTEP = 0, QSTEP_NEXT = 0;       // which question is showing; QSTEP_NEXT lets For you jump straight to one
const FY = { sort: 'relevance', n: 25 };

function qSteps() {
  const cats = CATS.map(c => c[0]).filter(c => D.matches.some(j => j.category === c));
  const advs = ADV.filter(k => D.matches.some(j => j.category === CONSULTING && j.adv === k));
  const s = [
    { k: 'fn', t: 'What kind of <em>work</em>?', h: 'Pick as many as you like. Pick none to keep every function.', opts: D.functions.map(f => [f, f]) },
    { k: 'loc', t: 'Where do you want to <em>be</em>?', h: 'Every role is in London, the rest of the UK, mainland Europe or remote.', opts: Q_LOCS },
    { k: 'cat', t: 'What kind of <em>organisation</em>?', h: 'From clubs and leagues to the consultancies, agencies and investors around them.', opts: cats.map(c => [c, catLabel(c), CAT_HINT[c] || '']) },
  ];
  if (QD.cat.includes(CONSULTING) && advs.length) s.push({ k: 'adv', t: 'Which kind of <em>consulting</em>?', h: 'Firms are grouped by what they actually do for sport.', opts: advs.map(k => [k, advLabel(k), advDesc(k)]) });
  s.push({ k: 'stretch', t: 'How <em>senior</em>?', h: 'Stretch roles are a step up, and reachable with strong pre-MBA experience.', opts: [['0', 'Post-MBA level', 'Manager, associate, consultant, lead'], ['1', 'Include stretch roles', 'Also Head of, director, principal']] });
  return s;
}

function vStart() {
  if (!QD) { const p = P(); QD = { ...p, fn: [...p.fn], loc: [...p.loc], cat: [...p.cat], adv: [...p.adv] }; }
  const steps = qSteps();
  QSTEP = Math.max(0, Math.min(QSTEP, steps.length - 1));
  const st = steps[QSTEP], last = QSTEP === steps.length - 1;
  const n = D.matches.filter(j => fits(j, QD)).length;
  const isStretch = st.k === 'stretch';
  const cnt = v => D.matches.filter(j => fits(j, isStretch ? { ...QD, stretch: v === '1' } : { ...QD, [st.k]: [v] })).length;
  const on = v => isStretch ? QD.stretch === (v === '1') : QD[st.k].includes(v);
  const tiles = st.opts.map(([v, l, d]) => { const c = cnt(v);
    return `<button class="tile${c ? '' : ' zero'}" type="button" data-act="${isStretch ? 'q-stretch' : 'q'}" data-k="${st.k}" data-v="${esc(v)}" aria-pressed="${on(v)}">
      <span class="tick" aria-hidden="true">${ico('check', 'i-sm')}</span><b>${esc(l)}</b>${d ? `<small>${esc(d)}</small>` : ''}<span class="tc num">${plural(c, 'role')}</span></button>`; }).join('');
  return `<div class="view qs">
  <div class="q-top"><div class="progress">${steps.map((s, i) => `<button class="pseg ${i < QSTEP ? 'done' : i === QSTEP ? 'cur' : ''}" type="button" data-act="q-goto" data-step="${i}" aria-label="Question ${i + 1}: ${esc(s.t.replace(/<[^>]+>/g, ''))}"></button>`).join('')}</div>
    <span class="eyebrow">Question ${QSTEP + 1} of ${steps.length}</span></div>
  <h1 class="q-title" tabindex="-1">${st.t}</h1>
  <p class="lede">${esc(st.h)}</p>
  <div class="tiles" role="group" aria-label="${esc(st.t.replace(/<[^>]+>/g, ''))}">${tiles}</div>
  ${!isStretch && QD[st.k].length ? `<button class="link q-any" type="button" data-act="q-any" data-k="${st.k}">Clear: any is fine</button>` : ''}
  <div class="q-foot">
    <div class="q-count" aria-live="polite"><span class="big num" id="q-n">${n}</span><span>${n === 1 ? 'role matches' : 'roles match'}<br>your answers</span></div>
    <div class="q-nav">
      ${QSTEP ? `<button class="btn lg ghost" type="button" data-act="q-back">Back</button>` : ''}
      ${last ? `<button class="btn lg primary" type="button" data-act="q-done" ${n ? '' : 'disabled'}>${n ? 'Show my roles' : 'No roles fit'} ${ico('arrow')}</button>`
        : `<button class="btn lg primary" type="button" data-act="q-next">Next ${ico('arrow')}</button>`}
    </div>
  </div>
  <p class="q-skip">${hasProfile() ? '<a class="link" href="#/for-you" data-act="q-cancel">Cancel and keep my answers</a>' : '<button class="link" type="button" data-act="q-skip">Skip the questions and show everything</button>'}</p>
  </div>`;
}

function vForYou() {
  if (!hasProfile()) return vStart();
  const p = P();
  const list = sortJobs(D.matches.filter(j => fits(j, p)), FY.sort);
  const visible = D.matches.filter(j => !isHidden(j.id)).length;
  const nNew = list.filter(j => j.new).length;
  const nWeek = list.filter(j => ageDays(dateOf(j)) <= 7).length;
  const nCos = new Set(list.map(j => j.company)).size;
  const tags = profileTags(p);
  const stepOf = i => i < 3 ? i : i === tags.length - 1 ? 99 : 3;   // the level answer is always the last question
  return `<div class="view">
  <section class="board">
    <div>
      <span class="eyebrow">Your shortlist</span>
      <div class="score"><span class="big num">${list.length}</span><span class="score-l">${list.length === 1 ? 'role' : 'roles'}<br><em>for you</em></span></div>
      <div class="answers">${tags.map((t, i) => `<button class="ans" type="button" data-act="q-edit" data-step="${stepOf(i)}" title="Change this answer">${esc(t)}${ico('arrow', 'i-sm')}</button>`).join('')}</div>
    </div>
    <div class="board-side">
      <div class="stats">
        <div class="${nNew ? 'hot' : ''}"><b class="num">${nNew}</b><span>New since last refresh</span></div>
        <div><b class="num">${nWeek}</b><span>Posted in the last 7 days</span></div>
        <div><b class="num">${nCos}</b><span>${nCos === 1 ? 'Company' : 'Companies'} hiring</span></div>
      </div>
      <div class="board-actions">
        <a class="btn primary" href="#/start">${ico('filter', 'i-sm')} Edit answers</a>
        ${authOn() && !Auth.user ? `<a class="btn" href="#/account">${ico('bookmark', 'i-sm')} Save to your email</a>` : ''}
        <a class="btn" href="#/jobs">All ${D.matches.length} roles</a>
      </div>
    </div>
  </section>
  ${list.length ? `<div class="list-head"><h2>${FY.sort === 'newest' ? 'Newest first' : 'Best matches first'}</h2>
    ${list.length > 1 ? `<div class="seg" role="group" aria-label="Sort"><button type="button" data-act="fy-sort" data-v="relevance" aria-pressed="${FY.sort === 'relevance'}">Best match</button><button type="button" data-act="fy-sort" data-v="newest" aria-pressed="${FY.sort === 'newest'}">Newest</button></div>` : ''}</div>
    <div class="jobs">${list.slice(0, FY.n).map(jobRow).join('')}</div>
    ${list.length > FY.n ? `<div class="more-row"><button class="btn" type="button" data-act="fy-more">Show ${Math.min(25, list.length - FY.n)} more</button></div>` : ''}`
    : emptyState('No open role matches all your answers', 'Try widening one of them, or browse everything.', '<a class="btn primary" href="#/start">Change answers</a><a class="btn" href="#/jobs">Browse all jobs</a>')}
  ${list.length && visible > list.length ? `<div class="after"><span>${plural(visible - list.length, 'other matched role')} ${visible - list.length === 1 ? "doesn't" : "don't"} fit your answers.</span><a class="btn sm dark" href="#/jobs">Browse all jobs ${ico('arrow', 'i-sm')}</a></div>` : ''}
  </div>`;
}
