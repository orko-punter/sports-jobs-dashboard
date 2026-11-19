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
  setTimeout(() => { d.hidden = true; sc.hidden = true; }, 200);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
const closeHref = () => `#/${route.view}`;
const dHead = crumb => `<div class="d-head"><span>${crumb}</span><a class="icon-btn" href="${closeHref()}" data-act="close" aria-label="Close">${ico('x')}</a></div>`;
const fact = (dt, dd) => `<dt>${esc(dt)}</dt><dd>${dd || '<span class="missing">Not given</span>'}</dd>`;
const outLink = (url, label, small) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}${small ? `<small>${esc(small)}</small>` : ''}</span>${ico('ext', 'i-sm')}</a>` : '';

function jobPanel(j) {
  const c = j.co, more = c ? sortJobs(c.matches.filter(x => x !== j), 'relevance').slice(0, 4) : [];
  const lbs = netLink(c, 'lbs'), conn = netLink(c, 'connections'), rec = netLink(c, 'recruiters');
  return `${dHead(esc(catLabel(j.category)))}<div class="d-body">
    <h2 id="drawer-title">${esc(j.title)}</h2>
    <p class="d-sub">${c ? `<button type="button" data-act="open-co" data-co="${esc(c.id)}">${esc(j.company)}</button>` : esc(j.company)}${j.location ? ' · ' + esc(j.location) : ''}</p>
    <div class="d-actions">
      ${ext(j.url, `Apply on company site ${ico('ext', 'i-sm')}`, 'btn primary')}
      ${saveBtn(j, 'btn icon')}
      <button class="btn icon" type="button" data-act="share" data-id="${j.id}" aria-label="Share" title="Share">${ico('share')}</button>
      <button class="btn icon" type="button" data-act="hide" data-id="${j.id}" aria-label="${isHidden(j.id) ? 'Restore' : 'Hide'} this role" title="${isHidden(j.id) ? 'Restore' : 'Not for me'}">${ico(isHidden(j.id) ? 'eye' : 'eyeoff')}</button>
    </div>
    ${j.match ? '' : '<p class="muted" style="font-size:13.5px">This listing is outside the post-MBA, function or location rules.</p>'}

    <section class="d-sec"><h3>Details</h3><dl class="facts">
      ${fact('Level', esc(j.sen))}${fact('Function', esc(j.fns.join(', ')))}
      ${fact('Posted', esc(j.postedDate ? fmtDate(j.postedDate) : j.posted))}${fact('First seen', j.firstSeen ? esc(fmtDate(j.firstSeen)) : '')}
      ${j.dept ? fact('Department', esc(j.dept)) : ''}
    </dl></section>

    <section class="d-sec"><h3>Get an introduction</h3><div class="linklist">
      ${outLink(j.peopleUrl, 'People in this team', 'LinkedIn search')}
      ${lbs ? outLink(lbs.url, 'LBS alumni at ' + j.company, 'LinkedIn search') : ''}
      ${conn ? outLink(conn.url, 'Your connections there', 'LinkedIn search') : ''}
      ${rec ? outLink(rec.url, 'Recruiters', 'LinkedIn search') : ''}
      <button type="button" data-act="outreach" data-id="${j.id}"><span>Copy an outreach note<small>A short message to adapt</small></span>${ico('copy', 'i-sm')}</button>
    </div></section>

    ${c && c.why ? `<section class="d-sec"><h3>About ${esc(c.name)}</h3><p style="color:var(--ink-2)">${esc(c.why)}.</p></section>` : ''}
    ${more.length ? `<section class="d-sec"><h3>More at ${esc(j.company)}</h3><div class="linklist">${more.map(x => `<button type="button" data-act="open-job" data-id="${x.id}"><span>${esc(x.title)}<small>${esc(shortLoc(x))}</small></span>${ico('arrow', 'i-sm')}</button>`).join('')}</div></section>` : ''}
    ${j.alts.length ? `<section class="d-sec"><h3>Also listed at</h3><div class="linklist">${j.alts.map(u => outLink(u, u.replace(/^https?:\/\//, '').slice(0, 56))).join('')}</div></section>` : ''}
    <p class="d-note">From ${esc(j.company)}'s careers feed${D.generated ? `, ${esc(fmtDate(D.generated.toISOString()))}` : ''}. Check it's still open before applying.</p>
  </div>`;
}

function companyPanel(c) {
  const ms = sortJobs(c.matches, 'relevance'), others = c.jobs.length - c.matches.length;
  const status = c.live ? `Jobs read daily from ${esc(SRC[c.source] || c.source)}` : c.manual ? 'No public job feed: check the careers site' : 'The job feed failed in the last refresh';
  return `${dHead(esc(catLabel(c.category)))}<div class="d-body">
    <h2 id="drawer-title">${esc(c.name)}</h2>
    <p class="d-sub">${[c.advisory_type ? advLabel(c.advisory_type) : '', c.hq].filter(Boolean).map(esc).join(' · ')}</p>
    <div class="d-actions">${ext(c.careers_url, `Careers site ${ico('ext', 'i-sm')}`, 'btn primary')}${watchBtn(c, 'btn')}</div>
    ${c.why ? `<p style="color:var(--ink-2);margin-top:12px">${esc(c.why)}.</p>` : ''}
    <section class="d-sec"><h3>Open roles</h3>
      ${ms.length ? `<div class="linklist">${ms.map(x => `<button type="button" data-act="open-job" data-id="${x.id}"><span>${esc(x.title)}${x.new ? '<span class="new">New</span>' : ''}<small>${esc(shortLoc(x))}</small></span>${ico('arrow', 'i-sm')}</button>`).join('')}</div>`
        : `<p class="muted">${c.live ? 'Nothing matches the post-MBA rules right now.' : status + '.'}</p>`}
      ${others > 0 ? `<button class="link" type="button" style="margin-top:12px" data-act="browse" data-q="${esc(c.name)}">See all ${c.jobs.length} UK & Europe listings</button>` : ''}
      ${c.live ? `<p class="d-note" style="margin-top:12px">${status}.</p>` : ''}
    </section>
    ${c.contacts.length ? `<section class="d-sec"><h3>Contacts</h3><div class="linklist">${c.contacts.map(p => outLink(p.url, p.name, [p.role, p.note].filter(Boolean).join(' · '))).join('')}</div></section>` : ''}
    <section class="d-sec"><h3>People to talk to</h3><div class="linklist">
      ${[['lbs', 'LBS alumni'], ['connections', 'Your connections'], ['strategy', 'Strategy team'], ['commercial', 'Commercial leadership'], ['partnerships', 'Partnerships team'], ['recruiters', 'Recruiters'], ['hiring', 'Hiring managers']]
        .map(([k, l]) => { const n = netLink(c, k); return n ? outLink(n.url, l, 'LinkedIn search') : ''; }).join('')}
    </div><p class="d-note" style="margin-top:10px">These open LinkedIn searches. Results depend on your network; nobody is verified here.</p></section>
  </div>`;
}
