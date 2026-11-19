// ---------------------------------------------------------------- view: Overview
const PITCH = `<svg class="hero-pitch" viewBox="0 0 200 200" fill="none" stroke="#c8f23a" stroke-width="1.2" aria-hidden="true">
  <rect x="10" y="10" width="180" height="180" rx="2"/><path d="M10 100h180"/><circle cx="100" cy="100" r="28"/><circle cx="100" cy="100" r="1.6" fill="#c8f23a"/>
  <rect x="55" y="10" width="90" height="36"/><rect x="78" y="10" width="44" height="14"/><rect x="55" y="154" width="90" height="36"/><rect x="78" y="176" width="44" height="14"/>
  <path d="M80 46a22 22 0 0 0 40 0M80 154a22 22 0 0 1 40 0"/></svg>`;

function insights() {
  const M = D.matches, out = [];
  if (!M.length) return [{ icon: 'info', html: 'No roles match the post-MBA rules in this refresh. Try <b>All UK & Europe</b> in Explore.' }];
  const byCo = countBy(M, j => j.company);
  const top = byCo.slice(0, 3);
  out.push({ icon: 'building', html: `<b>${esc(top[0][0])}</b> has the most matched roles (${top[0][1]})${top.length > 1 ? `, followed by ${listJoin(top.slice(1).map(([c, n]) => `${esc(c)} (${n})`))}` : ''}.`,
    act: { label: `See ${top[0][0]} roles`, preset: { q: top[0][0] } } });
  const fns = countBy(M, j => j.fns);
  if (fns.length) out.push({ icon: 'chart', html: `<b>${esc(fns[0][0])}</b> is the most common function: ${fns[0][1]} of ${M.length} matched roles (${pct(fns[0][1], M.length)}%). Roles can sit in more than one function.`,
    act: { label: 'Filter to it', preset: { fn: [fns[0][0]] } } });
  const lc = Object.fromEntries(countBy(M, j => j.loc));
  out.push({ icon: 'pin', html: `<b>${pct(lc.London || 0, M.length)}%</b> of matched roles are in London; ${lc.UK || 0} elsewhere in the UK, ${lc.Europe || 0} in mainland Europe${lc.Remote ? `, ${lc.Remote} remote` : ''}.`,
    act: { label: 'London roles', preset: { loc: ['London'] } } });
  const recent = M.filter(j => ageDays(j.postedDate) <= 14);
  const recentCos = countBy(recent, j => j.company).map(x => x[0]);
  const undated = M.filter(j => !j.postedDate).length;
  out.push({ icon: 'clock', html: recentCos.length
    ? `<b>${plural(recentCos.length, 'company', 'companies')}</b> posted matched roles in the last 14 days: ${esc(listJoin(recentCos.slice(0, 5)))}${recentCos.length > 5 ? ` and ${recentCos.length - 5} more` : ''}.${undated ? ` ${undated} matched roles have no posting date in their feed.` : ''}`
    : `No matched role carries a posting date in the last 14 days. ${undated} have no posting date in their feed.`,
    act: { label: 'Sort by newest', preset: { sort: 'newest' } } });
  const multi = byCo.filter(x => x[1] > 1);
  if (multi.length) out.push({ icon: 'users', html: `<b>${plural(multi.length, 'company', 'companies')}</b> have more than one matched role open. A team that is hiring several people is a good target for alumni outreach.` });
  const nNew = M.filter(j => j.new).length;
  out.push({ icon: 'spark', html: D.firstRun ? 'This is the first tracked refresh, so nothing is marked new yet.'
    : nNew ? `<b>${plural(nNew, 'new matched role')}</b> since the previous refresh, at ${esc(listJoin(countBy(M.filter(j => j.new), j => j.company).map(x => x[0]).slice(0, 4)))}.`
    : 'No new matched roles since the previous refresh.', act: nNew ? { label: 'See new roles', preset: { newOnly: true } } : null });
  const manual = D.companies.filter(c => c.manual).length, errs = D.companies.filter(c => c.error);
  out.push({ icon: 'alert', html: `<b>${manual} of ${D.companies.length}</b> companies have no machine-readable careers feed and need checking by hand${errs.length ? `; ${plural(errs.length, 'feed')} failed this refresh (${esc(listJoin(errs.map(c => c.name)))})` : ''}.`,
    link: '#/about' });
  return out;
}

function bars(rows, total, facet) {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return rows.map(([k, n]) => `<button class="bar-row" type="button" data-act="preset" data-preset='${esc(JSON.stringify({ [facet]: [k] }))}' aria-label="${esc(k)}: ${n} roles. Show them">
    <span>${esc(facet === 'loc' ? LOC_LABEL[k] || k : facet === 'cat' ? catLabel(k) : k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(n / max) * 100}%;display:block"></span></span><b>${n}</b></button>`).join('');
}

function vOverview() {
  const M = D.matches, visible = M.filter(j => !isHidden(j.id));
  const nNew = M.filter(j => j.new).length, london = M.filter(j => j.loc === 'London').length, mba = M.filter(j => j.sen === 'Post-MBA').length;
  const live = D.companies.filter(c => c.live).length;
  const picks = sortJobs(visible, 'relevance').slice(0, 6);
  const recent = visible.slice().sort((a, b) => (b.new - a.new) || (b.firstSeen || '').localeCompare(a.firstSeen || '') || dateOf(b).localeCompare(dateOf(a))).slice(0, 6);
  const watched = D.companies.filter(c => isWatched(c.name));
  const explore = [...watched, ...D.companies.filter(c => !isWatched(c.name)).sort((a, b) => b.matches.length - a.matches.length || b.newMatches.length - a.newMatches.length)].slice(0, 6);
  const kpi = (val, label, sub, preset, accent) => `<${preset ? `a href="#/jobs" data-act="preset" data-preset='${esc(JSON.stringify(preset))}'` : 'div'} class="kpi"><b class="${accent ? 'accent' : ''}">${val}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</${preset ? 'a' : 'div'}>`;
  return `<div class="view">
  <section class="hero">${PITCH}
    <div class="eyebrow">Career intelligence · ${esc(D.generated ? `Updated ${relTime(D.generated)}` : 'Refresh time unknown')}</div>
    <h1>Your next opportunity <em>in sport.</em></h1>
    <p>${M.length} post-MBA sport business roles from ${live} live company feeds, filtered for London and Europe. Then the people who can get you in.</p>
    <div class="hero-actions">
      <a class="btn primary" href="#/jobs" data-act="preset" data-preset='{}'>Explore matched roles ${ico('arrow', 'i-sm')}</a>
      ${nNew ? `<a class="btn" href="#/jobs" data-act="preset" data-preset='{"newOnly":true}'>${ico('spark', 'i-sm')} ${plural(nNew, 'new role')}</a>` : ''}
      <a class="btn" href="#/network">${ico('users', 'i-sm')} Find people</a>
    </div>
    <div class="kpis">
      ${kpi(M.length, 'Relevant open roles', `of ${D.jobs.length} UK & Europe listings`, {})}
      ${kpi(D.firstRun ? '—' : nNew, 'New since last refresh', D.firstRun ? 'First run: baseline' : '', D.firstRun ? null : { newOnly: true }, nNew > 0)}
      ${kpi(london, 'In London', `${pct(london, M.length)}% of matched`, { loc: ['London'] })}
      ${kpi(mba, 'Post-MBA level', `${M.length - mba} stretch`, { sen: ['Post-MBA'] })}
      ${kpi(D.companies.length, 'Companies monitored', `${live} live · ${D.companies.filter(c => !c.live).length} by hand / failed`)}
      ${kpi(D.generated ? relTime(D.generated) : '—', 'Last refresh', D.generated ? esc(D.generated.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : 'Unknown')}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><div><h2>Top matches for a post-MBA profile</h2><p>Ranked by location (London first), seniority, function and freshness.</p></div><a class="link" href="#/jobs" data-act="preset" data-preset='{}'>View all ${M.length} ${ico('arrow', 'i-sm')}</a></div>
    ${picks.length ? `<div class="grid-jobs">${picks.map(jobCard).join('')}</div>` : `<div class="card">${emptyState('No matched roles right now', 'Nothing in this refresh passes the post-MBA filters.', '<a class="btn" href="#/jobs" data-act="preset" data-preset=\'{"scope":"all"}\'>Browse all listings</a>')}</div>`}
  </section>

  <section class="section two">
    <div>
      <div class="section-head"><div><h2>Recently discovered</h2><p>New and most recently seen matched roles.</p></div><a class="link" href="#/jobs" data-act="preset" data-preset='{"sort":"newest"}'>Newest first ${ico('arrow', 'i-sm')}</a></div>
      ${recent.length ? `<div class="jlist">${recent.map(jobRow).join('')}</div>` : `<div class="card">${emptyState('Nothing yet', 'New roles appear here after each refresh.')}</div>`}
    </div>
    <div>
      <div class="section-head"><div><h2>Intelligence brief</h2><p>Patterns in this refresh, computed from the data.</p></div></div>
      <div class="card brief"><ul>${insights().map(x => `<li><span class="k">${ico(x.icon, 'i-sm')}</span><div><div>${x.html}</div>${x.act ? `<button class="link" type="button" data-act="preset" data-preset='${esc(JSON.stringify(x.act.preset))}'>${esc(x.act.label)} ${ico('arrow', 'i-sm')}</button>` : x.link ? `<a class="link" href="${x.link}">Coverage details ${ico('arrow', 'i-sm')}</a>` : ''}</div></li>`).join('')}</ul></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><div><h2>Where the roles are</h2><p>Matched roles by function and location. Click a bar to filter.</p></div></div>
    <div class="two">
      <div class="card bars"><h3>By function</h3>${bars(countBy(M, j => j.fns), M.length, 'fn')}</div>
      <div class="card bars"><h3>By location</h3>${bars(LOCS.map(l => [l, M.filter(j => j.loc === l).length]).filter(x => x[1]), M.length, 'loc')}
        <h3 style="margin-top:10px">By organisation type</h3>${bars(countBy(M, j => j.category).map(([k, n]) => [k, n]), M.length, 'cat')}</div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><div><h2>${watched.length ? 'Your watchlist and companies to explore' : 'Companies to explore'}</h2><p>Most matched roles right now${watched.length ? ', watchlist first' : ''}.</p></div><a class="link" href="#/companies">All ${D.companies.length} companies ${ico('arrow', 'i-sm')}</a></div>
    <div class="cgrid">${explore.map(companyCard).join('')}</div>
  </section>
  </div>`;
}
