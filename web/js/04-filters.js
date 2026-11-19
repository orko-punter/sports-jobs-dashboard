// ---------------------------------------------------------------- your answers + filtering
// A profile is the viewer's answers to the four questions. An empty answer means "any".
const Q_LOCS = [['London', 'London'], ['UK', 'Rest of the UK'], ['Europe', 'Mainland Europe'], ['Remote', 'Remote']];
const DEFAULT_P = { fn: [], loc: [], cat: [], adv: [], stretch: true };
const hasProfile = () => !!S.profile;
const P = () => ({ ...DEFAULT_P, ...(S.profile || {}) });
const CONSULTING = 'Consulting & Advisory';

function fits(j, p = P()) {
  if (!j.match || isHidden(j.id)) return false;
  if (p.fn.length && !j.fns.some(f => p.fn.includes(f))) return false;
  if (p.loc.length && !p.loc.includes(j.loc)) return false;
  if (p.cat.length && !p.cat.includes(j.category)) return false;
  if (p.adv.length && j.category === CONSULTING && !p.adv.includes(j.adv)) return false;
  if (!p.stretch && j.sen !== 'Post-MBA') return false;
  return true;
}
// Plain-language summary of a profile, for the For you header
function profileTags(p = P()) {
  const t = [];
  t.push(p.fn.length ? listJoin(p.fn) : 'Any function');
  t.push(p.loc.length ? listJoin(p.loc.map(l => (Q_LOCS.find(x => x[0] === l) || [l, l])[1])) : 'London, UK & Europe');
  t.push(p.cat.length ? listJoin(p.cat.map(catLabel)) : 'Any organisation');
  if (p.cat.includes(CONSULTING) && p.adv.length) t.push(listJoin(p.adv.map(advLabel)));
  t.push(p.stretch ? 'Post-MBA + stretch' : 'Post-MBA level');
  return t;
}

function searchJobs(jobs, q) {
  const toks = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return jobs;
  return jobs.filter(j => {
    const hay = `${j.title} ${j.company} ${j.location} ${j.loc} ${j.fns.join(' ')} ${j.dept} ${catLabel(j.category)} ${j.adv ? advLabel(j.adv) : ''}`.toLowerCase();
    return toks.every(t => hay.includes(t));
  });
}

const SORTS = {
  relevance: (a, b) => score(b) - score(a) || a.title.localeCompare(b.title),
  newest: (a, b) => (b.new - a.new) || dateOf(b).localeCompare(dateOf(a)) || score(b) - score(a),
};
const sortJobs = (jobs, key) => jobs.slice().sort(SORTS[key] || SORTS.relevance);
