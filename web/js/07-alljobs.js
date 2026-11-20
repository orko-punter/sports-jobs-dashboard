// ---------------------------------------------------------------- view: All jobs, grouped
const AJ = { q: '', by: 'cat', wide: false, open: {}, all: {} };
const GROUP_BY = { cat: 'Organisation', fn: 'Function', loc: 'Location', co: 'Company' };

function vAll() {
  return `<div class="view">
  <div class="head"><div><span class="eyebrow">The full list</span><h1>All jobs</h1>
    <p class="lede"><b>${D.matches.length}</b> roles pass the post-MBA, function and location rules, from ${D.companies.filter(c => c.live).length} companies with live feeds. Grouped so you can scan.</p></div></div>
  <div class="toolbar">
    <label class="search"><span class="sr">Search</span>${ico('search', 'i-sm')}<input id="aq" type="search" placeholder="Search title, company, city…" value="${esc(AJ.q)}" autocomplete="off"></label>
    <div class="seg" role="group" aria-label="Group by">${Object.entries(GROUP_BY).map(([k, l]) => `<button type="button" data-act="aj-by" data-v="${k}" aria-pressed="${AJ.by === k}">${l}</button>`).join('')}</div>
  </div>
  <label class="check" style="margin:6px 0 20px"><input type="checkbox" id="aj-wide" ${AJ.wide ? 'checked' : ''}>Include all ${D.jobs.length} UK & Europe listings, even outside the rules</label>
  <div id="groups"></div></div>`;
}

function groupsOf(jobs) {
  const m = new Map();
  const add = (k, j) => { if (!m.has(k)) m.set(k, []); m.get(k).push(j); };
  for (const j of jobs) {
    if (AJ.by === 'cat') add(j.category, j);
    else if (AJ.by === 'loc') add(j.loc, j);
    else if (AJ.by === 'co') add(j.company, j);
    else (j.fns.length ? j.fns : ['No function tag']).forEach(f => add(f, j));
  }
  const order = AJ.by === 'cat' ? CATS.map(c => c[0]) : AJ.by === 'loc' ? LOCS : AJ.by === 'fn' ? D.functions : null;
  const keys = [...m.keys()].sort((a, b) => order
    ? ((order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)) || m.get(b).length - m.get(a).length
    : m.get(b).length - m.get(a).length || a.localeCompare(b));
  return keys.map(k => [k, sortJobs(m.get(k), 'relevance')]);
}
const groupLabel = k => AJ.by === 'cat' ? catLabel(k) : AJ.by === 'loc' ? LOC_LABEL[k] || k : k;

function updateAll() {
  const box = $('#groups'); if (!box) return;
  const pool = searchJobs((AJ.wide ? D.jobs : D.matches).filter(j => !isHidden(j.id)), AJ.q);
  if (!pool.length) {
    box.innerHTML = emptyState('No roles found', AJ.q ? 'Try a broader search.' : 'Nothing in this refresh.', AJ.q ? '<button class="btn" type="button" data-act="aj-clear">Clear search</button>' : '');
    return;
  }
  const gs = groupsOf(pool), searching = !!AJ.q.trim();
  box.innerHTML = gs.map(([k, js], i) => {
    const id = `${AJ.by}:${k}`, open = searching || (id in AJ.open ? AJ.open[id] : i < 2);
    const showAll = AJ.all[id] || searching, shown = showAll ? js : js.slice(0, 5);
    return `<details class="group" data-g="${esc(id)}" ${open ? 'open' : ''}><summary ${AJ.by === 'cat' ? `style="--cat:${catColor(k)}"` : ''}><span class="sw" aria-hidden="true"></span><h2>${esc(groupLabel(k))}</h2><span class="c num">${js.length}</span>${ico('arrow', 'chev i-sm')}</summary>
      <div class="gbody"><div class="jobs">${shown.map(jobRow).join('')}</div>
      ${js.length > shown.length ? `<div class="more-row" style="padding-bottom:0"><button class="btn sm" type="button" data-act="g-all" data-g="${esc(id)}">Show all ${js.length} ${ico('arrow', 'i-sm')}</button></div>` : ''}</div></details>`;
  }).join('');
}

function bindAll() {
  const q = $('#aq');
  q.addEventListener('input', debounce(() => { AJ.q = q.value; updateAll(); }, 120));
  $('#aj-wide').addEventListener('change', e => { AJ.wide = e.target.checked; updateAll(); });
  $('#groups').addEventListener('toggle', e => { const g = e.target.closest('.group'); if (g && !AJ.q.trim()) AJ.open[g.dataset.g] = g.open; }, true);
  updateAll();
}
