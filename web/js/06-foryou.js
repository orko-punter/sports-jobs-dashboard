// ---------------------------------------------------------------- views: questions + For you
let QD = null;                       // draft answers while the questions are open
const FY = { sort: 'relevance', n: 25 };

function vStart() {
  if (!QD) { const p = P(); QD = { ...p, fn: [...p.fn], loc: [...p.loc], cat: [...p.cat], adv: [...p.adv] }; }
  const n = D.matches.filter(j => fits(j, QD)).length;
  // count for one option = roles you'd get with that option alone for this question, given your other answers
  const cnt = (k, v) => D.matches.filter(j => fits(j, { ...QD, [k]: [v] })).length;
  const chips = (k, opts) => `<div class="chips">${opts.map(([v, l]) =>
    `<button class="chip" type="button" data-act="q" data-k="${k}" data-v="${esc(v)}" aria-pressed="${QD[k].includes(v)}">${esc(l)}<span class="c num">${cnt(k, v)}</span></button>`).join('')}</div>`;
  const cats = CATS.map(c => c[0]).filter(c => D.matches.some(j => j.category === c));
  const advs = ADV.filter(k => D.matches.some(j => j.category === CONSULTING && j.adv === k));
  const q = (title, hint, body) => `<section class="q"><h2>${title}</h2>${hint ? `<p class="hint">${hint}</p>` : ''}${body}</section>`;
  return `<div class="view qs">
  <div class="head"><div><h1>What are you looking for?</h1>
    <p class="lede">Four quick questions, then you'll see only the roles that fit. Skip any question to keep everything. Your answers stay in this browser.</p></div></div>
  ${q('What kind of work?', 'Pick as many as you like.', chips('fn', D.functions.map(f => [f, f])))}
  ${q('Where?', '', chips('loc', Q_LOCS))}
  ${q('What kind of organisation?', '', chips('cat', cats.map(c => [c, catLabel(c)])))}
  ${QD.cat.includes(CONSULTING) && advs.length ? q('Which kind of consulting?', 'Firms are grouped by what they actually do for sport.', chips('adv', advs.map(k => [k, advLabel(k)]))) : ''}
  ${q('How senior?', '', `<div class="chips">
    <button class="chip" type="button" data-act="q-stretch" data-v="0" aria-pressed="${!QD.stretch}">Post-MBA level only</button>
    <button class="chip" type="button" data-act="q-stretch" data-v="1" aria-pressed="${QD.stretch}">Also stretch roles (Head of, Director)</button></div>`)}
  <div class="q-foot">
    <button class="btn primary" type="button" data-act="q-done">${n ? `Show ${plural(n, 'role')}` : 'No roles fit yet'}</button>
    ${hasProfile() ? '<a class="link" href="#/for-you" data-act="q-cancel">Cancel</a>' : '<button class="link" type="button" data-act="q-skip">Skip and show everything</button>'}
  </div></div>`;
}

function vForYou() {
  if (!hasProfile()) return vStart();
  const p = P();
  const list = sortJobs(D.matches.filter(j => fits(j, p)), FY.sort);
  const visible = D.matches.filter(j => !isHidden(j.id)).length;
  const nNew = list.filter(j => j.new).length;
  return `<div class="view">
  <div class="head"><div><h1>${list.length ? `${plural(list.length, 'role')} for you` : 'Nothing fits right now'}</h1>
    <p class="summary">${profileTags(p).map(esc).join('<span class="sep">·</span>')}<a class="link" href="#/start">Change answers</a>${authOn() && !Auth.user ? '<a class="link" href="#/account">Save to your email</a>' : ''}</p></div>
    ${list.length > 1 ? `<div class="seg" role="group" aria-label="Sort"><button type="button" data-act="fy-sort" data-v="relevance" aria-pressed="${FY.sort === 'relevance'}">Best match</button><button type="button" data-act="fy-sort" data-v="newest" aria-pressed="${FY.sort === 'newest'}">Newest</button></div>` : ''}
  </div>
  ${nNew ? `<p class="muted" style="margin:-12px 0 16px;font-size:14px">${plural(nNew, 'new role')} since the last refresh.</p>` : ''}
  ${list.length ? `<div class="jobs">${list.slice(0, FY.n).map(jobRow).join('')}</div>
    ${list.length > FY.n ? `<div class="more-row"><button class="btn sm" type="button" data-act="fy-more">Show ${Math.min(25, list.length - FY.n)} more</button></div>` : ''}`
    : emptyState('No open role matches all your answers', 'Try widening one of them, or browse everything.', '<a class="btn primary" href="#/start">Change answers</a><a class="btn" href="#/jobs">Browse all jobs</a>')}
  ${list.length && visible > list.length ? `<div class="after"><span>${plural(visible - list.length, 'other matched role')} ${visible - list.length === 1 ? "doesn't" : "don't"} fit your answers.</span><a class="link" href="#/jobs">Browse all jobs, grouped ${ico('arrow', 'i-sm')}</a></div>` : ''}
  </div>`;
}
