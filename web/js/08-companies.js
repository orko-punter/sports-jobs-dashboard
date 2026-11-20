// ---------------------------------------------------------------- view: Companies
const CF = { q: '', watch: false, open: {} };

function vCompanies() {
  const live = D.companies.filter(c => c.live).length;
  return `<div class="view">
  <div class="head"><div><span class="eyebrow">Who's hiring</span><h1>Who's <em>hiring</em></h1>
    <p class="lede"><b>${D.companies.length}</b> sport business employers. ${live} have job feeds we read every day; for the rest, check their careers site.</p></div></div>
  <div class="toolbar" style="margin-bottom:20px">
    <label class="search"><span class="sr">Search companies</span>${ico('search', 'i-sm')}<input id="cq" type="search" placeholder="Search companies…" value="${esc(CF.q)}" autocomplete="off"></label>
    <label class="check"><input type="checkbox" id="co-watch" ${CF.watch ? 'checked' : ''}>Watching only (${S.watch.length})</label>
  </div>
  <div id="co-groups"></div></div>`;
}

function coRow(c) {
  const status = c.live ? (c.matches.length ? `<span class="roles">${plural(c.matches.length, 'role')}</span>` : '<span>No roles now</span>')
    : c.error ? '<span class="err">Feed failed</span>' : '<span class="hand">Check by hand</span>';
  return `<div class="co-row"><button class="hit" type="button" data-act="open-co" data-co="${esc(c.id)}" aria-label="${esc(c.name)}"></button>
    <div style="min-width:0;position:relative;pointer-events:none"><b>${esc(c.name)}</b>${isWatched(c.name) ? ' <span class="muted" title="Watching">★</span>' : ''}<div class="why">${esc(c.why || c.hq || '')}</div></div>
    <div class="side">${status}${ext(c.careers_url, `<span>Careers</span>${ico('ext', 'i-sm')}`, 'btn sm', `aria-label="${esc(c.name)} careers site"`)}</div></div>`;
}

function updateCompanies() {
  const box = $('#co-groups'); if (!box) return;
  const q = CF.q.trim().toLowerCase();
  const list = D.companies.filter(c => (!CF.watch || isWatched(c.name)) && (!q || `${c.name} ${c.why} ${c.hq} ${catLabel(c.category)} ${c.advisory_type ? advLabel(c.advisory_type) : ''}`.toLowerCase().includes(q)))
    .sort((a, b) => b.matches.length - a.matches.length || (b.live - a.live) || a.name.localeCompare(b.name));
  if (!list.length) { box.innerHTML = emptyState('No companies found', CF.watch && !S.watch.length ? 'You are not watching any company yet. Open one and press Watch.' : 'Try a different search.'); return; }
  const cats = [...CATS.map(c => c[0]), ...new Set(list.map(c => c.category).filter(c => !CATS.some(x => x[0] === c)))];
  const filtering = !!q || CF.watch;
  box.innerHTML = cats.map(cat => {
    const cs = list.filter(c => c.category === cat);
    if (!cs.length) return '';
    const m = cs.reduce((a, c) => a + c.matches.length, 0), open = filtering || !!CF.open[cat];
    const body = cat === CONSULTING
      ? ADV.map(k => { const s = cs.filter(c => c.advisory_type === k); return s.length ? `<p class="subhead">${esc(advLabel(k))}</p><p class="gdesc" style="margin:0 0 4px">${esc(advDesc(k))}</p><div class="cos">${s.map(coRow).join('')}</div>` : ''; }).join('')
        + (cs.some(c => !ADV.includes(c.advisory_type)) ? `<div class="cos">${cs.filter(c => !ADV.includes(c.advisory_type)).map(coRow).join('')}</div>` : '')
      : `<div class="cos">${cs.map(coRow).join('')}</div>`;
    return `<details class="group" data-cat="${esc(cat)}" ${open ? 'open' : ''}><summary style="--cat:${catColor(cat)}"><span class="sw" aria-hidden="true"></span><h2>${esc(catLabel(cat))}</h2><span class="c">${cs.length} · ${plural(m, 'role')}</span>${ico('arrow', 'chev i-sm')}</summary><div class="gbody">${body}</div></details>`;
  }).join('');
}

function bindCompanies() {
  $('#cq').addEventListener('input', debounce(e => { CF.q = e.target.value; updateCompanies(); }, 120));
  $('#co-watch').addEventListener('change', e => { CF.watch = e.target.checked; updateCompanies(); });
  $('#co-groups').addEventListener('toggle', e => { const g = e.target.closest('.group'); if (g && !CF.q.trim() && !CF.watch) CF.open[g.dataset.cat] = g.open; }, true);
  updateCompanies();
}
