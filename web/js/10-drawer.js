// ---------------------------------------------------------------- side panels: job + company
let lastFocus = null;
function showDrawer(html) {
  const d = $('#drawer'), sc = $('#scrim');
  if (d.hidden) lastFocus = document.activeElement;
  d.innerHTML = html; d.hidden = false; sc.hidden = false;
  requestAnimationFrame(() => { d.classList.add('on'); sc.classList.add('on'); });
  document.body.style.overflow = 'hidden';
  $('.d-body', d).scrollTop = 0;
  $('[data-act="close"]', d).focus({ preventScroll: true });
}
function hideDrawer() {
  const d = $('#drawer'), sc = $('#scrim');
  if (d.hidden) return;
  d.classList.remove('on'); sc.classList.remove('on');
  document.body.style.overflow = '';
  setTimeout(() => { d.hidden = true; if (!$('#rail.open')) sc.hidden = true; }, 220);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
const closeHref = () => `#/${route.view}`;
const dHead = crumb => `<div class="d-head"><span class="crumb">${crumb}</span><a class="btn icon sm ghost" href="${closeHref()}" data-act="close" aria-label="Close panel">${ico('x')}</a></div>`;
const fact = (dt, dd) => `<div><dt>${esc(dt)}</dt><dd>${dd || '<span class="missing">Not given in the feed</span>'}</dd></div>`;

function jobPanel(j) {
  const c = j.co, steps = jobSteps(j), done = S.steps[j.id] || [];
  const more = c ? sortJobs(c.matches.filter(x => x !== j), 'relevance').slice(0, 4) : [];
  return `${dHead(`${esc(catLabel(j.category))} · ${esc(j.company)}`)}<div class="d-body">
    <div class="d-title">${monogram(j.company, 'lg')}<div style="min-width:0"><h2 id="drawer-title">${esc(j.title)}</h2>
      <div class="co">${c ? `<button type="button" data-act="open-co" data-co="${esc(c.id)}">${esc(j.company)}</button>` : esc(j.company)}${j.location ? ' · ' + esc(j.location) : ''}</div></div></div>
    <div class="d-tags">${newPill(j)}${locPill(j)}${senPill(j.sen)}${j.fns.map(f => `<span class="pill quiet">${esc(f)}</span>`).join('')}${j.match ? '' : '<span class="pill info" title="Fails at least one post-MBA, function or location rule">Outside matched rules</span>'}</div>
    <div class="d-actions">
      ${ext(j.url, `Apply<span class="hide-sm">&nbsp;on company site</span> ${ico('ext', 'i-sm')}`, 'btn primary')}
      ${saveBtn(j, 'btn icon')}
      <button class="btn icon" type="button" data-act="copy" data-id="${j.id}" aria-label="Copy application link" title="Copy application link">${ico('link')}</button>
      <button class="btn icon" type="button" data-act="share" data-id="${j.id}" aria-label="Share this role" title="Share">${ico('share')}</button>
      <button class="btn icon" type="button" data-act="hide" data-id="${j.id}" aria-label="${isHidden(j.id) ? 'Restore' : 'Hide'} this role" title="${isHidden(j.id) ? 'Restore' : 'Not for me: hide'}">${ico(isHidden(j.id) ? 'eye' : 'eyeoff')}</button>
    </div>

    <section class="d-sec"><h3>At a glance</h3><dl class="facts">
      ${fact('Location', esc(j.location || ''))}${fact('Location group', esc(LOC_LABEL[j.loc]))}
      ${fact('Seniority', `${esc(j.sen)}<div class="muted" style="font-weight:400;font-size:12px">${esc(SEN_DEF[j.sen] || '')}</div>`)}${fact('Function', esc(j.fns.join(', ')))}
      ${fact('Posted', esc(j.postedDate ? fmtDate(j.postedDate) + (j.posted && !isoPrefix(j.posted) ? ` (${j.posted})` : '') : j.posted))}${fact('First seen by tracker', j.firstSeen ? esc(fmtDate(j.firstSeen)) : '<span class="missing">Before first-seen dates were recorded</span>')}
      ${fact('Department', esc(j.dept))}${fact('Source', esc(c ? SRC[c.source] || c.source : ''))}
    </dl></section>

    <section class="d-sec"><h3>Why it might be interesting</h3><ul class="why-list">${whyInteresting(j).map(t => `<li>${ico('check', 'i-sm')}<span>${esc(t)}</span></li>`).join('')}</ul></section>

    <section class="d-sec"><h3>Who can help you get in</h3>
      <div class="netgrid">
        ${j.peopleUrl ? `<a class="netlink" href="${esc(j.peopleUrl)}" target="_blank" rel="noopener noreferrer">${ico('briefcase')}<span>Find the hiring team<small>${esc((j.fns[0] || 'Team').split(' & ')[0])} managers and heads</small></span>${ico('ext')}</a>` : ''}
        ${netLinks(c, ['lbs', 'connections', 'recruiters'])}
        ${(() => { const l = netLink(c, 'employees'); return l ? `<a class="netlink" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ico('users')}<span>Company employees<small>Everyone at ${esc(j.company)} on LinkedIn</small></span>${ico('ext')}</a>` : ''; })()}
      </div>
      <button class="btn sm" type="button" data-act="outreach" data-id="${j.id}" style="margin-top:10px">${ico('copy', 'i-sm')} Copy outreach note</button>
    </section>

    <section class="d-sec"><h3>Your next steps <span class="muted" style="text-transform:none;letter-spacing:0">· ${stepsDone(j.id)}/${steps.length}</span></h3>
      <div class="checklist">${steps.map((s, i) => `<label><input type="checkbox" data-step="${i}" data-id="${j.id}" ${done[i] ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('')}</div></section>

    ${c ? `<section class="d-sec"><h3>About ${esc(c.name)}</h3><p style="color:var(--ink-2)">${esc(c.why || '')}</p>
      <dl class="facts" style="margin-top:10px">${fact('Type', esc(catLabel(c.category)))}${fact('HQ', esc(c.hq))}</dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" type="button" data-act="open-co" data-co="${esc(c.id)}">Company profile ${ico('arrow', 'i-sm')}</button>${ext(c.careers_url, `Careers site ${ico('ext', 'i-sm')}`)}${watchBtn(c, 'btn sm')}</div></section>` : ''}

    ${j.alts.length ? `<section class="d-sec"><h3>Also listed at</h3>${j.alts.map(u => `<div>${ext(u, `${esc(u.replace(/^https?:\/\//, '').slice(0, 60))}… ${ico('ext', 'i-sm')}`, 'link')}</div>`).join('')}</section>` : ''}
    ${more.length ? `<section class="d-sec"><h3>More matched roles at ${esc(j.company)}</h3><div class="minilist">${more.map(x => `<button type="button" data-act="open-job" data-id="${x.id}"><span>${esc(x.title)}</span><small>${esc(x.loc)} · ${esc(x.sen)}</small></button>`).join('')}</div></section>` : ''}
    <p class="d-foot-note">Details come from ${esc(j.company)}'s careers feed${D.generated ? ` as of ${esc(fmtDate(D.generated.toISOString()))}` : ''}. Check on the company site that the role is still open before applying.</p>
  </div>`;
}

function companyPanel(c) {
  const ms = sortJobs(c.matches, 'relevance'), others = c.jobs.length - c.matches.length;
  const status = c.live ? `<span class="pill mba">Live feed · ${esc(SRC[c.source] || c.source)}</span>` : c.manual ? '<span class="pill stretch">No public feed: check by hand</span>' : `<span class="pill err">Feed failed: ${esc(c.status.replace(/^error:\s*/, '').slice(0, 60))}</span>`;
  return `${dHead(esc(catLabel(c.category)))}<div class="d-body">
    <div class="d-title">${monogram(c.name, 'lg')}<div><h2 id="drawer-title">${esc(c.name)}</h2><div class="co">${esc(catLabel(c.category))}${c.hq ? ' · HQ ' + esc(c.hq) : ''}</div></div></div>
    <div class="d-tags">${status}${isWatched(c.name) ? '<span class="pill">On your watchlist</span>' : ''}</div>
    <div class="d-actions">${ext(c.careers_url, `Careers site ${ico('ext', 'i-sm')}`, 'btn primary')}${watchBtn(c, 'btn')}${ext((netLink(c, 'company') || {}).url, `LinkedIn ${ico('ext', 'i-sm')}`, 'btn')}</div>
    ${c.why ? `<section class="d-sec"><h3>Why it's on the list</h3><p style="color:var(--ink-2)">${esc(c.why)}.</p></section>` : ''}
    <section class="d-sec"><h3>Open roles</h3>${companyStats(c)}
      ${ms.length ? `<div class="minilist" style="margin-top:10px">${ms.map(x => `<button type="button" data-act="open-job" data-id="${x.id}"><span>${esc(x.title)} ${newPill(x)}</span><small>${esc(x.location || x.loc)} · ${esc(x.sen)}</small></button>`).join('')}</div>`
        : c.live ? '<p class="muted" style="margin-top:10px">No roles match the post-MBA rules right now.</p>' : ''}
      ${others > 0 ? `<button class="link" type="button" style="margin-top:10px" data-act="preset" data-preset='${esc(JSON.stringify({ scope: 'all', q: c.name }))}'>See all ${c.jobs.length} UK & Europe listings ${ico('arrow', 'i-sm')}</button>` : ''}
    </section>
    ${c.contacts.length ? `<section class="d-sec"><h3>Verified contacts</h3><div class="contacts">${c.contacts.map(p => `<a class="contact" href="${esc(p.url || '#')}" target="_blank" rel="noopener noreferrer"><div><b>${esc(p.name)}</b> <span class="muted">${esc(p.role || '')}</span></div></a>`).join('')}</div></section>` : ''}
    <section class="d-sec"><h3>Networking routes</h3><div class="netgrid">${netLinks(c, ['lbs', 'connections', 'recruiters', 'hiring', 'commercial', 'strategy', 'partnerships', 'employees', 'jobs', 'team_page'])}</div>
      <p class="d-foot-note" style="margin-top:10px">LinkedIn searches: results depend on your network. No profile is verified here.</p></section>
  </div>`;
}
// labels for the extra keys used only in the company panel
NET.push(['employees', 'All employees', 'users'], ['jobs', 'Jobs on LinkedIn', 'briefcase'], ['team_page', 'Team page', 'search']);
const NET_MAIN = NET.slice(0, 7);
