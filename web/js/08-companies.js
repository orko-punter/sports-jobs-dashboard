// ---------------------------------------------------------------- views: Companies + Networking
let CF = { q: '', cat: '', watch: false, sort: 'matches' };
const coSort = {
  matches: (a, b) => b.matches.length - a.matches.length || b.jobs.length - a.jobs.length || a.name.localeCompare(b.name),
  newest: (a, b) => b.newMatches.length - a.newMatches.length || b.matches.length - a.matches.length || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
};
function filterCos() {
  const q = CF.q.trim().toLowerCase();
  return D.companies.filter(c => (!CF.cat || c.category === CF.cat) && (!CF.watch || isWatched(c.name))
    && (!q || `${c.name} ${c.why} ${c.hq} ${catLabel(c.category)}`.toLowerCase().includes(q)));
}
const cosToolbar = (id, sorts = true) => `<div class="toolbar">
    <label class="search"><span class="sr">Search companies</span>${ico('search')}<input id="${id}" type="search" placeholder="Search companies…" value="${esc(CF.q)}" autocomplete="off"></label>
    <label class="sr" for="${id}-cat">Organisation type</label>
    <select class="select" id="${id}-cat"><option value="">All organisation types</option>${CATS.map(([k, l]) => `<option value="${esc(k)}" ${CF.cat === k ? 'selected' : ''}>${esc(l)} (${D.companies.filter(c => c.category === k).length})</option>`).join('')}</select>
    ${sorts ? `<label class="sr" for="${id}-sort">Sort</label><select class="select" id="${id}-sort"><option value="matches" ${CF.sort === 'matches' ? 'selected' : ''}>Most matched roles</option><option value="newest" ${CF.sort === 'newest' ? 'selected' : ''}>Most new roles</option><option value="name" ${CF.sort === 'name' ? 'selected' : ''}>A–Z</option></select>` : ''}
    <label class="switch" style="gap:8px">${ico('star', 'i-sm')}<span>Watchlist (${S.watch.length})</span><input type="checkbox" id="${id}-watch" ${CF.watch ? 'checked' : ''}></label>
  </div>`;
function bindCoToolbar(id, rerender) {
  $(`#${id}`).addEventListener('input', debounce(e => { CF.q = e.target.value; rerender(); }, 120));
  $(`#${id}-cat`).addEventListener('change', e => { CF.cat = e.target.value; rerender(); });
  const s = $(`#${id}-sort`); if (s) s.addEventListener('change', e => { CF.sort = e.target.value; rerender(); });
  $(`#${id}-watch`).addEventListener('change', e => { CF.watch = e.target.checked; rerender(); });
}

function vCompanies() {
  return `<div class="view">
  <div class="page-head"><div><h1>Company intelligence</h1><p>${D.companies.length} employers across consulting, rights holders, clubs, media and investors. Every company stays listed, including those with no roles open today.</p></div></div>
  ${cosToolbar('cq')}<div id="co-results"></div></div>`;
}
function updateCompanies() {
  const list = filterCos().sort(coSort[CF.sort]);
  if (!list.length) { $('#co-results').innerHTML = `<div class="card">${emptyState('No companies found', CF.watch && !S.watch.length ? 'Your watchlist is empty. Star a company to follow it.' : 'Try a different search or organisation type.', '<button class="btn" type="button" data-act="co-clear">Reset</button>')}</div>`; return; }
  const cats = [...CATS.map(c => c[0]), ...new Set(list.map(c => c.category).filter(c => !CATS.some(x => x[0] === c)))];
  $('#co-results').innerHTML = cats.map(cat => {
    const cs = list.filter(c => c.category === cat);
    if (!cs.length) return '';
    const m = cs.reduce((a, c) => a + c.matches.length, 0);
    return `<section class="cgroup"><div class="cgroup-head"><h2>${esc(catLabel(cat))}</h2><span class="muted">${plural(cs.length, 'company', 'companies')} · ${plural(m, 'matched role')}</span></div><div class="cgrid">${cs.map(companyCard).join('')}</div></section>`;
  }).join('');
}

function vNetwork() {
  const contacts = D.companies.flatMap(c => c.contacts.map(p => ({ ...p, company: c })));
  return `<div class="view">
  <div class="page-head"><div><h1>Networking & getting in</h1><p>Most sport business hires come through people. For each company, open a ready-made LinkedIn search for the people most likely to help.</p></div></div>
  <div class="note">${ico('info')}<div>These buttons open <b>LinkedIn searches</b>; nothing is scraped. Results depend on your own LinkedIn network and LinkedIn's matching. Nobody is labelled an LBS alumnus here unless LinkedIn's results show it, so check each profile before you reach out.</div></div>
  <section class="section"><div class="section-head"><h2>A simple playbook</h2></div>
    <div class="playbook">
      <div class="card step"><div class="n">1</div><h3>Map the team</h3><p>Use <b>Strategy</b>, <b>Commercial</b> and <b>Partnerships</b> searches to see who sits in the team you want to join, and at what levels.</p></div>
      <div class="card step"><div class="n">2</div><h3>Warm route first</h3><p>Start with <b>LBS alumni</b> and <b>your connections</b>. Ask for 15 minutes of perspective, not a job. Copy the outreach note from any job page.</p></div>
      <div class="card step"><div class="n">3</div><h3>Reach the hiring side</h3><p>Once a role is live, contact the <b>recruiter</b> or <b>hiring manager</b>, mentioning the conversation you've already had with the team.</p></div>
    </div></section>
  ${contacts.length ? `<section class="section"><div class="section-head"><h2>Verified contacts</h2><p>Added by hand in companies.json.</p></div><div class="contacts">${contacts.map(p => `<a class="contact" href="${esc(p.url || '#')}" target="_blank" rel="noopener noreferrer">${monogram(p.name || '?', 'sm')}<div><b>${esc(p.name)}</b> <span class="muted">${esc(p.role || '')} · ${esc(p.company.name)}</span>${p.note ? `<div class="muted">${esc(p.note)}</div>` : ''}</div></a>`).join('')}</div></section>` : ''}
  <section class="section"><div class="section-head"><div><h2>Networking routes by company</h2><p>Watchlist first, then by matched roles.</p></div></div>
    ${cosToolbar('nq', false)}<div class="card ntable" id="net-results"></div></section>
  </div>`;
}
function updateNetwork() {
  const list = filterCos().sort((a, b) => isWatched(b.name) - isWatched(a.name) || coSort.matches(a, b));
  $('#net-results').innerHTML = list.length ? list.map(c => `<div class="nrow">
    <div class="who">${monogram(c.name, 'sm')}<button type="button" data-act="open-co" data-co="${esc(c.id)}"><b>${esc(c.name)}</b><small>${c.manual ? 'No feed: check careers site' : c.error ? 'Feed failed this refresh' : plural(c.matches.length, 'matched role')} · ${esc(catLabel(c.category))}</small></button>${watchBtn(c)}</div>
    <div class="nacts">${NET_MAIN.map(([k, label, icn]) => { const l = netLink(c, k); return l ? `<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.label)}">${ico(icn, 'i-sm')}${esc(label)}</a>` : ''; }).join('')}</div>
  </div>`).join('') : emptyState('No companies found', 'Try a different search or organisation type.', '<button class="btn" type="button" data-act="co-clear">Reset</button>');
}
