// ---------------------------------------------------------------- filtering + sorting
const DEFAULT_F = { scope: 'match', q: '', loc: [], sen: [], fn: [], cat: [], adv: [], newOnly: false, savedOnly: false, showHidden: false, sort: 'relevance' };
let F = { ...DEFAULT_F, ...(S.filters || {}) };
for (const k of ['loc', 'sen', 'fn', 'cat', 'adv']) if (!Array.isArray(F[k])) F[k] = [];
const persistFilters = () => { S.filters = F; Store.save(); };

// skip = one facet to ignore, so each facet's counts show what you would get by ticking that option
function applyFilters(jobs, f, skip) {
  const toks = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return jobs.filter(j => {
    if (f.scope === 'match' && !j.match) return false;
    if (!f.showHidden && isHidden(j.id)) return false;
    if (skip !== 'loc' && f.loc.length && !f.loc.includes(j.loc)) return false;
    if (skip !== 'sen' && f.sen.length && !f.sen.includes(j.sen)) return false;
    if (skip !== 'fn' && f.fn.length && !j.fns.some(x => f.fn.includes(x))) return false;
    if (skip !== 'cat' && f.cat.length && !f.cat.includes(j.category)) return false;
    if (skip !== 'adv' && f.adv.length && !f.adv.includes(j.adv)) return false;
    if (f.newOnly && !j.new) return false;
    if (f.savedOnly && !isSaved(j.id)) return false;
    if (toks.length) {
      const hay = `${j.title} ${j.company} ${j.location} ${j.loc} ${j.fns.join(' ')} ${j.dept} ${catLabel(j.category)} ${j.adv ? advLabel(j.adv) : ''}`.toLowerCase();
      if (!toks.every(t => hay.includes(t))) return false;
    }
    return true;
  });
}

const SORTS = {
  relevance: { label: 'Best match', fn: (a, b) => score(b) - score(a) || a.title.localeCompare(b.title) },
  newest: { label: 'Newest', fn: (a, b) => (b.new - a.new) || dateOf(b).localeCompare(dateOf(a)) || score(b) - score(a) },
  company: { label: 'Company A–Z', fn: (a, b) => a.company.localeCompare(b.company) || score(b) - score(a) },
  location: { label: 'Location', fn: (a, b) => LOCS.indexOf(a.loc) - LOCS.indexOf(b.loc) || a.location.localeCompare(b.location) || score(b) - score(a) },
};
const sortJobs = (jobs, key) => jobs.slice().sort((SORTS[key] || SORTS.relevance).fn);
const activeFilterCount = f => f.loc.length + f.sen.length + f.fn.length + f.cat.length + f.adv.length + (f.newOnly ? 1 : 0) + (f.savedOnly ? 1 : 0) + (f.q.trim() ? 1 : 0);

// Jump to Explore with a preset (used by KPIs, insights, company pages)
function goJobs(preset) {
  F = { ...DEFAULT_F, sort: F.sort, ...preset };
  persistFilters();
  if (route.view === 'jobs') { renderView(); } else location.hash = '#/jobs';
}
