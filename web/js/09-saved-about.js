// ---------------------------------------------------------------- views: Saved + Methodology
function savedRow(id, snapObj, extra = '') {
  const j = D.byId.get(id);
  if (j) return jobRow(j, { progress: !extra });
  // Saved earlier but missing from the latest refresh: say so instead of dropping it
  return `<article class="jrow"><span class="mono-badge sm" aria-hidden="true">${esc(initials(snapObj.company))}</span>
    <div style="min-width:0"><h3>${esc(snapObj.title)} <span class="pill err">Not in latest refresh</span></h3>
    <div class="meta"><span class="co">${esc(snapObj.company)}</span><span>${esc(snapObj.location || '')}</span><span>Saved ${esc(fmtShort(snapObj.at))}. The listing may have closed.</span></div></div>
    <div class="acts">${ext(snapObj.url, `Check listing ${ico('ext', 'i-sm')}`)}<button class="btn icon sm ghost" type="button" data-act="${extra || 'unsave'}" data-id="${id}" aria-label="Remove">${ico('x')}</button></div></article>`;
}

function vSaved() {
  const tabs = [['jobs', 'Saved jobs', Object.keys(S.saved).length], ['watch', 'Watchlist', S.watch.length], ['viewed', 'Recently viewed', S.viewed.filter(id => D.byId.has(id)).length], ['hidden', 'Hidden', Object.keys(S.hidden).length]];
  const t = tabs.some(x => x[0] === S.savedTab) ? S.savedTab : 'jobs';
  let body = '';
  if (t === 'jobs') {
    const ids = Object.keys(S.saved).sort((a, b) => (S.saved[b].at || '').localeCompare(S.saved[a].at || ''));
    body = ids.length ? `<div class="toolbar" style="justify-content:flex-end"><button class="btn sm" type="button" data-act="copy-saved">${ico('copy', 'i-sm')} Copy list</button></div><div class="jlist">${ids.map(id => savedRow(id, S.saved[id])).join('')}</div>`
      : `<div class="card">${emptyState('No saved jobs yet', `Use the ${ico('bookmark', 'i-sm')} button on any role to build a shortlist. Saved jobs stay in this browser.`, '<a class="btn dark" href="#/jobs">Explore jobs</a>')}</div>`;
  } else if (t === 'watch') {
    const cs = D.companies.filter(c => isWatched(c.name));
    body = cs.length ? `<div class="cgrid">${cs.map(companyCard).join('')}</div>` : `<div class="card">${emptyState('Your watchlist is empty', `Star companies with ${ico('star', 'i-sm')} to follow their roles. Watched companies rank higher in Best match.`, '<a class="btn dark" href="#/companies">Browse companies</a>')}</div>`;
  } else if (t === 'viewed') {
    const js = S.viewed.map(id => D.byId.get(id)).filter(Boolean);
    body = js.length ? `<div class="jlist">${js.map(jobRow).join('')}</div>` : `<div class="card">${emptyState('Nothing viewed yet', 'Roles you open will appear here.')}</div>`;
  } else {
    const ids = Object.keys(S.hidden);
    body = ids.length ? `<div class="jlist">${ids.map(id => D.byId.get(id) ? jobRow(D.byId.get(id)) : savedRow(id, S.hidden[id], 'unhide')).join('')}</div>` : `<div class="card">${emptyState('No hidden jobs', `Hide roles that aren't for you with ${ico('eyeoff', 'i-sm')}. They disappear from your lists but are never deleted.`)}</div>`;
  }
  return `<div class="view"><div class="page-head"><div><h1>Saved</h1><p>Your shortlist, watchlist and history. Stored only in this browser: nothing is uploaded.</p></div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${k === t}" data-act="saved-tab" data-v="${k}">${l}<span class="c">${n}</span></button>`).join('')}</div>${body}</div>`;
}

function vAbout() {
  const M = D.meta, cos = D.companies;
  const srcCounts = countBy(cos.filter(c => c.source !== 'manual'), c => SRC[c.source] || c.source);
  const statusPill = c => c.live ? `<span class="pill mba">Live</span>` : c.manual ? `<span class="pill stretch">Check by hand</span>` : `<span class="pill err" title="${esc(c.status)}">Feed error</span>`;
  const errs = cos.filter(c => c.error);
  const freshTxt = D.generated ? `${D.generated.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} (${relTime(D.generated)})` : 'Unknown';
  return `<div class="view">
  <div class="page-head"><div><h1>Intelligence & methodology</h1><p>How the data is collected and filtered, what it covers, and where its limits are.</p></div></div>
  <div class="card fresh-card">
    <span class="dot ${D.stale ? 'warn' : ''}"></span>
    <div style="flex:1;min-width:220px"><div class="eyebrow">Last successful refresh</div><div class="big">${esc(freshTxt)}</div>
      <p class="muted">${D.stale ? 'This data is more than 36 hours old. The daily refresh may not have run, so some listings may have closed.' : 'Data is fresh.'} The <b>Refresh jobs</b> GitHub Action rebuilds this page; n8n triggers it daily at 07:00, and it can also be run by hand.</p></div>
    <div style="display:grid;gap:2px;font-size:13px" class="num">
      <span><b>${M.fetched ?? '—'}</b> listings fetched</span><span><b>${M.live_sources ?? cos.filter(c => c.live).length}</b> live feeds</span>
      <span><b>${D.jobs.length}</b> in UK & Europe</span><span><b>${D.matches.length}</b> matched</span></div>
  </div>
  ${errs.length ? `<div class="banner" style="margin:12px 0 0">${ico('alert')}<div><b>${plural(errs.length, 'feed')} failed in the latest refresh:</b> ${errs.map(c => `${esc(c.name)} <span class="mono">(${esc(c.status.replace(/^error:\s*/, ''))})</span>`).join('; ')}. ${errs.length === 1 ? 'Its' : 'Their'} roles are missing from this refresh, not zero.</div></div>` : `<p class="muted" style="margin-top:10px">${ico('check', 'i-sm')} Every live feed returned data in the latest refresh.</p>`}

  <section class="section"><div class="section-head"><h2>How it works</h2></div>
  <ol class="card steps-list">
    <li><div><b>Shortlist.</b> ${esc(M.rule || 'A hand-picked list of sport business employers.')}</div></li>
    <li><div><b>Collect.</b> Each company's public careers system is read directly (no LinkedIn or job-board scraping). ${cos.filter(c => c.live || c.error).length} companies have a machine-readable feed.</div></li>
    <li><div><b>Tag.</b> Every listing gets a location group, a seniority level and function tags, based on its title, location and department.</div></li>
    <li><div><b>Filter.</b> A role is <b>matched</b> when it has a sport-business function, is not an excluded discipline, reads as Post-MBA or Stretch, and is in London, the UK, Europe or remote.</div></li>
    <li><div><b>Compare.</b> Listing links are checked against every link seen in earlier refreshes; unseen links are marked <span class="pill new">New</span>.</div></li>
  </ol></section>

  <section class="section"><div class="section-head"><h2>Hiring platforms monitored</h2></div>
    <div class="chips">${srcCounts.map(([s, n]) => `<span class="pill">${esc(s)} <span class="muted num">${n}</span></span>`).join('')}<span class="pill stretch">No feed (check by hand) <span class="num">${cos.filter(c => c.manual).length}</span></span></div></section>

  <section class="section"><div class="section-head"><h2>Seniority levels</h2><p>Judged from the job title only.</p></div>
    <dl class="card deflist">${SENS.map(s => `<dt>${senPill(s)}</dt><dd>${esc(SEN_DEF[s])}</dd>`).join('')}</dl></section>

  <section class="section"><div class="section-head"><h2>Filtering rules</h2></div>
    <dl class="card deflist">
      <dt>Location</dt><dd>London first, then the rest of the UK, mainland Europe and remote. Listings outside Europe are dropped. Listings with no usable location ("Location not stated") are kept in All UK & Europe but never matched.</dd>
      <dt>Function</dt><dd>${D.functions.map(esc).join(' · ')}. Tags come from title keywords (or the department when the title gives none). A role can have several.</dd>
      <dt>Excluded</dt><dd>Engineering, software, IT, data science, coaching and medical, HR and recruiting, legal, finance operations, production and design, retail and matchday roles, even when a function keyword appears.</dd>
      <dt>Generalist firms</dt><dd>For broad consultancies (e.g. Oliver Wyman, Roland Berger, Kearney) only roles that mention sport, media, entertainment, TMT, deals or private equity are kept.</dd>
      <dt>Duplicates</dt><dd>${D.dupes ? `${plural(D.dupes, 'role')} appear more than once with different links (same company, title and location). Each is shown once with every link kept.` : 'No duplicate listings in this refresh.'}${D.malformed ? ` ${plural(D.malformed, 'record')} without a title, link or company could not be shown.` : ''}</dd>
    </dl></section>

  <section class="section"><div class="section-head"><div><h2>Coverage: all ${cos.length} companies</h2><p>${cos.filter(c => c.manual).length} companies have no public feed (often bot protection or a closed system) and must be checked by hand.</p></div></div>
    <div class="card tbl-wrap"><table><thead><tr><th>Company</th><th>Type</th><th>Source</th><th>Status</th><th class="n">Fetched</th><th class="n">UK & EU</th><th class="n">Matched</th></tr></thead><tbody>
    ${cos.slice().sort((a, b) => CATS.findIndex(c => c[0] === a.category) - CATS.findIndex(c => c[0] === b.category) || a.name.localeCompare(b.name)).map(c => `<tr>
      <td><button class="link" type="button" data-act="open-co" data-co="${esc(c.id)}" style="color:var(--ink)">${esc(c.name)}</button></td><td class="muted">${esc(catLabel(c.category))}</td>
      <td>${esc(SRC[c.source] || c.source)}</td><td>${statusPill(c)}${c.manual ? ` ${ext(c.careers_url, `Careers ${ico('ext', 'i-sm')}`, 'link')}` : ''}</td>
      ${c.live ? `<td class="n">${c.jobs_total}</td><td class="n">${c.jobs_europe}</td><td class="n">${c.matches.length}</td>` : '<td class="n muted">—</td><td class="n muted">—</td><td class="n muted">—</td>'}</tr>`).join('')}
    </tbody></table></div></section>

  <section class="section"><div class="section-head"><h2>Limitations</h2></div>
    <div class="card" style="padding:16px 20px"><ul class="limits" style="margin:0;padding-left:18px">
      <li>This is an <b>opportunity discovery tool</b>. A listing here is not a guarantee that it is still accepting applications; always confirm on the company site.</li>
      <li>Seniority and function are inferred from job titles, so some roles will be misjudged. Use All UK & Europe to see everything.</li>
      <li>Companies without a public feed (${cos.filter(c => c.manual).length}) are not searched automatically. Their roles will not appear here.</li>
      <li>"New" means not seen in any earlier refresh. A failed feed doesn't make its jobs reappear as new. Posting dates come from the feed when it gives them; "first seen" is when this tracker first found the listing.</li>
      <li>People links are LinkedIn searches, not verified contacts. Saved jobs, watchlist and hidden jobs live only in this browser.</li>
    </ul></div></section>
  </div>`;
}
