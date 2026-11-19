// ---------------------------------------------------------------- view: Explore jobs
// The shell renders once; updateJobs() refreshes counts, chips and results in place so focus is never lost.
let pageSize = 50;
function vJobs() {
  pageSize = 50;
  const all = D.jobs.filter(j => !isHidden(j.id) || F.showHidden);
  const group = (key, title, values, label = v => v) => `<div class="fgroup" role="group" aria-label="${title}"><h3>${title}</h3>
    ${values.map(v => `<label class="opt" data-opt="${key}|${esc(v)}"><input type="checkbox" data-f="${key}" value="${esc(v)}"><span>${esc(label(v))}</span><span class="c" data-count></span></label>`).join('')}</div>`;
  const cats = [...CATS.map(c => c[0]), ...new Set(D.jobs.map(j => j.category).filter(c => !CATS.some(x => x[0] === c)))];
  return `<div class="view">
  <div class="page-head"><div><h1>Explore jobs</h1><p>Every listing from the monitored careers feeds. <b>Matched roles</b> pass the post-MBA, function and location rules; <b>All UK & Europe</b> shows everything for transparency.</p></div>
    <div class="seg" role="group" aria-label="Which listings">
      <button type="button" data-act="scope" data-v="match" aria-pressed="${F.scope === 'match'}">Matched roles<span class="c">${D.matches.length}</span></button>
      <button type="button" data-act="scope" data-v="all" aria-pressed="${F.scope === 'all'}">All UK & Europe<span class="c">${all.length}</span></button>
    </div></div>
  <div class="explore">
    <aside class="rail" id="rail" aria-label="Filters">
      <div class="rail-head"><h2>Filters</h2><button class="btn icon sm ghost" type="button" data-act="rail-close" aria-label="Close filters">${ico('x')}</button></div>
      ${group('loc', 'Location', LOCS, v => LOC_LABEL[v])}
      ${group('sen', 'Seniority', SENS)}
      ${group('fn', 'Function', D.functions)}
      ${group('cat', 'Organisation type', cats, catLabel)}
      ${group('adv', 'Consulting segment', ADV, advLabel)}
      <div class="fgroup"><h3>Show</h3>
        <label class="switch"><span>New since last refresh</span><input type="checkbox" data-t="newOnly"></label>
        <label class="switch"><span>Saved only</span><input type="checkbox" data-t="savedOnly"></label>
        <label class="switch"><span>Include hidden <span class="muted" data-hidden-count></span></span><input type="checkbox" data-t="showHidden"></label>
      </div>
      <div class="rail-foot"><button class="btn" type="button" data-act="clear">Clear all</button><button class="btn dark" type="button" data-act="rail-close" data-show-n>Show roles</button></div>
    </aside>
    <section aria-label="Results">
      <div class="toolbar">
        <label class="search"><span class="sr">Search jobs</span>${ico('search')}<input id="q" type="search" placeholder="Search title, company, location…" value="${esc(F.q)}" autocomplete="off"><kbd>/</kbd></label>
        <button class="btn filters-btn" type="button" data-act="rail-open">${ico('filter', 'i-sm')} Filters <span data-fcount></span></button>
        <label class="sr" for="sort">Sort</label>
        <select class="select" id="sort">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}" ${F.sort === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
      </div>
      <div class="resbar" id="resbar" aria-live="polite"></div>
      <div id="results"></div>
    </section>
  </div></div>`;
}

function updateJobs() {
  const root = $('.explore'); if (!root) return;
  // facet counts
  for (const key of ['loc', 'sen', 'fn', 'cat', 'adv']) {
    const pool = applyFilters(D.jobs, F, key);
    $$(`[data-opt^="${key}|"]`, root).forEach(el => {
      const v = el.querySelector('input').value;
      const n = pool.filter(j => key === 'fn' ? j.fns.includes(v) : (key === 'loc' ? j.loc : key === 'sen' ? j.sen : key === 'adv' ? j.adv : j.category) === v).length;
      el.querySelector('[data-count]').textContent = n;
      el.querySelector('input').checked = F[key].includes(v);
      el.classList.toggle('zero', !n && !F[key].includes(v));
      el.hidden = !n && !F[key].includes(v) && (key === 'adv' || (F.scope === 'match' && key !== 'fn'));
    });
  }
  $$('[data-t]', root).forEach(el => { el.checked = !!F[el.dataset.t]; });
  const hiddenN = Object.keys(S.hidden).length;
  $('[data-hidden-count]', root).textContent = hiddenN ? `(${hiddenN})` : '';
  $$('[data-act="scope"]').forEach(b => b.setAttribute('aria-pressed', String(F.scope === b.dataset.v)));

  const res = sortJobs(applyFilters(D.jobs, F), F.sort);
  const n = activeFilterCount(F);
  $('[data-fcount]', root).textContent = n ? `(${n})` : '';
  $('[data-show-n]', root).textContent = `Show ${plural(res.length, 'role')}`;

  const chips = [];
  if (F.q.trim()) chips.push(['q', '', `“${F.q.trim()}”`]);
  for (const k of ['loc', 'sen', 'fn', 'cat', 'adv']) F[k].forEach(v => chips.push([k, v, k === 'cat' ? catLabel(v) : k === 'adv' ? advLabel(v) : k === 'loc' ? LOC_LABEL[v] : v]));
  if (F.newOnly) chips.push(['newOnly', '', 'New only']);
  if (F.savedOnly) chips.push(['savedOnly', '', 'Saved only']);
  $('#resbar').innerHTML = `<span><strong class="num">${res.length}</strong> ${res.length === 1 ? 'role' : 'roles'}${F.scope === 'match' ? ' matched' : ' in UK & Europe'}</span>
    ${chips.map(([k, v, l]) => `<button class="fchip" type="button" data-act="unchip" data-k="${k}" data-v="${esc(v)}" aria-label="Remove filter ${esc(l)}">${esc(l)}${ico('x')}</button>`).join('')}
    ${chips.length ? '<button class="link" type="button" data-act="clear">Clear all</button>' : ''}`;

  if (!res.length) {
    const wider = F.scope === 'match' ? applyFilters(D.jobs, { ...F, scope: 'all' }).length : 0;
    $('#results').innerHTML = `<div class="card">${emptyState('No roles match these filters',
      wider ? `${plural(wider, 'listing')} would show in <b>All UK & Europe</b>. They miss the post-MBA, function or location rules.` : 'Try removing a filter or searching for something broader.',
      `${chips.length ? '<button class="btn dark" type="button" data-act="clear">Clear filters</button>' : ''}${wider ? '<button class="btn" type="button" data-act="scope" data-v="all">Search all listings</button>' : ''}`)}</div>`;
    return;
  }
  $('#results').innerHTML = `<div class="jlist">${res.slice(0, pageSize).map(jobRow).join('')}</div>
    ${res.length > pageSize ? `<div class="more-row"><button class="btn" type="button" data-act="more">Show ${Math.min(50, res.length - pageSize)} more of ${res.length - pageSize}</button></div>` : ''}`;
}

function bindJobs() {
  const q = $('#q');
  q.addEventListener('input', debounce(() => { F.q = q.value; pageSize = 50; persistFilters(); updateJobs(); }, 120));
  $('#sort').addEventListener('change', e => { F.sort = e.target.value; persistFilters(); updateJobs(); });
  $('#rail').addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.f) { const a = F[t.dataset.f]; F[t.dataset.f] = t.checked ? [...a, t.value] : a.filter(x => x !== t.value); }
    if (t.dataset.t) F[t.dataset.t] = t.checked;
    pageSize = 50; persistFilters(); updateJobs();
  });
  updateJobs();
}
function openRail(open) {
  const r = $('#rail'); if (!r) return;
  r.classList.toggle('open', open);
  const sc = $('#scrim');
  if (open) { sc.hidden = false; requestAnimationFrame(() => sc.classList.add('on')); r.querySelector('input,button').focus(); }
  else if ($('#drawer').hidden) { sc.classList.remove('on'); setTimeout(() => { if ($('#drawer').hidden) sc.hidden = true; }, 200); }
}
