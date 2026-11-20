// ---------------------------------------------------------------- views: Saved + About the data
function goneRow(id, s, act) {
  return `<article class="job"><div style="min-width:0"><h3>${esc(s.title)}</h3>
    <div class="meta"><span class="co">${esc(s.company)}</span><span>Not in the latest refresh, so it may have closed</span></div></div>
    <div class="side">${ext(s.url, 'Check', 'link')}<button class="icon-btn" type="button" data-act="${act}" data-id="${id}" aria-label="Remove">${ico('x')}</button></div></article>`;
}

function vSaved() {
  const tabs = [['jobs', 'Saved', Object.keys(S.saved).length], ['watch', 'Watching', S.watch.length], ['hidden', 'Hidden', Object.keys(S.hidden).length]];
  const t = tabs.some(x => x[0] === S.savedTab) ? S.savedTab : 'jobs';
  let body;
  if (t === 'jobs') {
    const ids = Object.keys(S.saved).sort((a, b) => (S.saved[b].at || '').localeCompare(S.saved[a].at || ''));
    body = ids.length ? `<div class="jobs">${ids.map(id => D.byId.get(id) ? jobRow(D.byId.get(id)) : goneRow(id, S.saved[id], 'unsave')).join('')}</div>
      <div class="more-row"><button class="btn sm" type="button" data-act="copy-saved">${ico('copy', 'i-sm')} Copy list</button></div>`
      : emptyState('Nothing saved yet', `Press ${ico('bookmark', 'i-sm')} on any role to keep it here.`, '<a class="btn" href="#/for-you">See your roles</a>');
  } else if (t === 'watch') {
    const cs = D.companies.filter(c => isWatched(c.name));
    body = cs.length ? `<div class="cos">${cs.map(coRow).join('')}</div>` : emptyState('Not watching any company', 'Open a company and press Watch. Watched companies rank higher in your list.', '<a class="btn" href="#/companies">Browse companies</a>');
  } else {
    const ids = Object.keys(S.hidden);
    body = ids.length ? `<div class="jobs">${ids.map(id => D.byId.get(id) ? jobRow(D.byId.get(id)) : goneRow(id, S.hidden[id], 'unhide')).join('')}</div>`
      : emptyState('No hidden roles', 'Roles you hide from a job page are kept here, never deleted.');
  }
  return `<div class="view"><div class="head"><div><span class="eyebrow">Your bench</span><h1>Your <em>saved</em> roles</h1><p class="lede">${!authOn() ? 'Kept in this browser only. Nothing is uploaded.' : Auth.user ? `Saved to your profile (${esc(Auth.user.email)}), so they follow you to any device.` : 'Kept in this browser. <a class="link" href="#/account">Sign in with your email</a> to keep them on any device.'}</p></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${k === t}" data-act="saved-tab" data-v="${k}">${l}<span class="c">${n}</span></button>`).join('')}</div>${body}</div>`;
}

function vAbout() {
  const M = D.meta, cos = D.companies, errs = cos.filter(c => c.error);
  const freshTxt = D.generated ? `${D.generated.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} (${relTime(D.generated)})` : 'unknown';
  const st = c => c.live ? '<span class="ok">Live</span>' : c.manual ? '<span class="hand">By hand</span>' : `<span class="err" title="${esc(c.status)}">Failed</span>`;
  return `<div class="view">
  <div class="head"><div><h1>About the data</h1><p class="lede">How roles are collected and filtered, and what this can't see.</p></div></div>
  <div class="prose">
    <p>Last refresh: <b>${esc(freshTxt)}</b>. ${D.stale ? 'That is more than 36 hours ago, so some listings may have closed.' : ''} It runs every morning at 07:00 and reads each company's own careers system directly. LinkedIn and job boards are never scraped.</p>
    <p>${M.fetched ?? '—'} listings fetched from ${cos.filter(c => c.live).length} live feeds; ${D.jobs.length} are in the UK or Europe and ${D.matches.length} pass the rules below. ${errs.length ? `<span class="err">${plural(errs.length, 'feed')} failed this time (${esc(listJoin(errs.map(c => c.name)))}), so ${errs.length === 1 ? 'its' : 'their'} roles are missing, not zero.</span>` : 'Every live feed returned data.'}</p>
  </div>

  <section class="section"><h2>The rules</h2><p class="sub">A role is matched when all of these hold.</p>
    <dl class="deflist">
      <dt>Location</dt><dd>London, the rest of the UK, mainland Europe or remote. Listings with no usable location are never matched.</dd>
      <dt>Level</dt><dd><b>Post-MBA:</b> ${esc(SEN_DEF['Post-MBA'])} <b>Stretch:</b> ${esc(SEN_DEF.Stretch)} Judged from the title only.</dd>
      <dt>Function</dt><dd>${D.functions.map(esc).join(', ')}. Tagged from title keywords, or the department when the title gives none.</dd>
      <dt>Excluded</dt><dd>Engineering, IT, data science, coaching and medical, HR, legal, finance operations, production and design, retail and matchday roles.</dd>
      <dt>Consulting</dt><dd>Defined by what a firm does, not its name: advice, valuation, research or analytics bought by teams, leagues, rights holders, broadcasters or investors. At generalist firms (Oliver Wyman, Roland Berger, L.E.K.) only sport, media or TMT practice roles and generalist consultant intakes count.</dd>
      <dt>New</dt><dd>Not seen in any earlier refresh.${D.dupes ? ` ${plural(D.dupes, 'role')} listed twice with different links are shown once.` : ''}</dd>
    </dl></section>

  <section class="section"><h2>Coverage</h2><p class="sub">${cos.filter(c => c.manual).length} companies have no public feed and need checking by hand.</p>
    <div class="tbl-wrap"><table><thead><tr><th>Company</th><th>Type</th><th>Source</th><th>Status</th><th class="n">UK & EU</th><th class="n">Matched</th></tr></thead><tbody>
    ${cos.slice().sort((a, b) => CATS.findIndex(c => c[0] === a.category) - CATS.findIndex(c => c[0] === b.category) || a.name.localeCompare(b.name)).map(c => `<tr>
      <td><button class="link" type="button" data-act="open-co" data-co="${esc(c.id)}" style="color:var(--ink)">${esc(c.name)}</button></td><td class="muted">${esc(catLabel(c.category))}</td>
      <td class="muted">${esc(SRC[c.source] || c.source)}</td><td>${st(c)}</td>
      ${c.live ? `<td class="n num">${c.jobs_europe}</td><td class="n num">${c.matches.length}</td>` : '<td class="n muted">—</td><td class="n muted">—</td>'}</tr>`).join('')}
    </tbody></table></div></section>

  <section class="section"><h2>Limits</h2>
    <ul class="prose" style="padding-left:18px;margin:8px 0 0">
      <li>A listing here is not proof it's still open. Confirm on the company site.</li>
      <li>Level and function come from job titles, so some roles will be misjudged. All jobs can show everything.</li>
      <li>People links are LinkedIn searches, not verified contacts.</li>
    </ul></section>
  </div>`;
}
