// ---------------------------------------------------------------- data loading + processing
// The pipeline embeds the data in the page (window.__DATA__). Without it (e.g. the bare template),
// fall back to fetching jobs.json next to the page.
async function loadData() {
  let raw = window.__DATA__;
  if (!raw) {
    const r = await fetch('jobs.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(`jobs.json returned HTTP ${r.status}`);
    raw = await r.json();
  }
  return normalise(raw);
}

function normalise(raw) {
  if (!raw || !Array.isArray(raw.jobs) || !Array.isArray(raw.companies)) throw new Error('The data file is missing its jobs or companies list.');
  const meta = raw.meta || {};
  const genIso = meta.generated_iso || (raw.generated ? raw.generated.replace(' UTC', 'Z').replace(' ', 'T') : null);
  const generated = genIso && !isNaN(Date.parse(genIso)) ? new Date(genIso) : null;

  const companies = raw.companies.filter(c => c && c.name).map(c => {
    const status = String(c.status || '');
    return {
      ...c, id: slug(c.name), people: Array.isArray(c.people) ? c.people : [], contacts: Array.isArray(c.contacts) ? c.contacts : [],
      live: status.startsWith('ok'), manual: status === 'manual', error: status.startsWith('error'),
      jobs: [], matches: [], newMatches: [],
    };
  });
  const byName = new Map(companies.map(c => [c.name, c]));

  // Same company + title + location with different links = one role listed twice. Show it once and keep every link.
  let malformed = 0;
  const groups = new Map(), jobs = [];
  for (const j of raw.jobs) {
    if (!j || !j.title || !j.url || !j.company) { malformed++; continue; }
    const key = `${j.company}|${j.title}|${j.location}`.toLowerCase();
    const g = groups.get(key);
    if (g) { g.alts.push(j.url); g.new = g.new && !!j.new; continue; }
    const co = byName.get(j.company) || null;
    const job = {
      id: hashId(j.url), company: j.company, co, category: j.category || (co && co.category) || 'Other',
      title: j.title, location: j.location && j.location !== '-' ? j.location : '', loc: j.loc_tag || 'Unknown',
      sen: j.seniority || 'Unclear', fns: Array.isArray(j.functions) ? j.functions : [], relevant: !!j.relevant,
      match: 'match' in j ? !!j.match : (!!j.relevant && ['Post-MBA', 'Stretch'].includes(j.seniority) && ['London', 'UK', 'Europe', 'Remote'].includes(j.loc_tag)),
      url: j.url, posted: j.posted || '', postedDate: j.posted_date || isoPrefix(j.posted), firstSeen: j.first_seen || null,
      dept: j.dept || '', peopleUrl: j.people_url || '', new: !!j.new, alts: [],
    };
    groups.set(key, job); jobs.push(job);
  }
  for (const j of jobs) {
    if (!j.co) continue;
    j.co.jobs.push(j);
    if (j.match) { j.co.matches.push(j); if (j.new) j.co.newMatches.push(j); }
  }
  const functions = Array.isArray(meta.functions) && meta.functions.length ? meta.functions : countBy(jobs, j => j.fns).map(x => x[0]);
  const ageH = generated ? (Date.now() - generated) / 36e5 : null;
  return {
    meta, generated, ageH, stale: ageH == null || ageH > 36, firstRun: !!meta.first_run,
    companies, jobs, matches: jobs.filter(j => j.match), functions, malformed,
    dupes: jobs.filter(j => j.alts.length).length,
    byId: new Map(jobs.map(j => [j.id, j])), byCo: new Map(companies.map(c => [c.id, c])),
  };
}

const LOC_W = { London: 40, UK: 28, Remote: 22, Europe: 18, Unknown: 0 };
const SEN_W = { 'Post-MBA': 30, Stretch: 18, Unclear: 8, Junior: 0, Senior: 2 };
// Relevance for a post-MBA LBS student: London first, post-MBA level, core sport-business functions, fresh listings.
function score(j) {
  let s = (LOC_W[j.loc] || 0) + (SEN_W[j.sen] || 0) + (j.match ? 20 : 0) + (j.new ? 8 : 0);
  if (j.fns.some(f => CORE_FN.has(f))) s += 15; else if (j.fns.length) s += 6;
  if (ageDays(j.postedDate || j.firstSeen) <= 14) s += 6;
  if (isWatched(j.company)) s += 5;
  return s;
}
const dateOf = j => j.postedDate || j.firstSeen || '';
function dateLabel(j) {
  if (j.postedDate) return `Posted ${fmtShort(j.postedDate)}`;
  if (j.posted) return j.posted;
  if (j.firstSeen) return `First seen ${fmtShort(j.firstSeen)}`;
  return '';
}
const netLink = (c, key) => c && c.people.find(p => p.key === key || (!p.key && p.label.toLowerCase().includes(key)));

// Facts from the dataset only: no invented statistics.
function whyInteresting(j) {
  const out = [];
  if (j.loc === 'London') out.push('Based in London.');
  else if (j.loc === 'UK') out.push(`UK-based (${j.location || 'outside London'}).`);
  else if (j.loc === 'Europe') out.push(`Based in Europe (${j.location}). Check relocation and language needs.`);
  else if (j.loc === 'Remote') out.push('Listed as remote.');
  if (j.sen === 'Post-MBA') out.push('The title reads as post-MBA level.');
  if (j.sen === 'Stretch') out.push('A stretch role (director / head of / principal). Worth a look with strong pre-MBA experience.');
  if (j.fns.length) out.push(`Function: ${j.fns.join(', ')}.`);
  if (j.new) out.push('New since the previous refresh.');
  const others = j.co ? j.co.matches.filter(x => x !== j).length : 0;
  if (others) out.push(`${j.company} has ${plural(others, 'other matched role')} open right now.`);
  if (j.co && j.co.why) out.push(j.co.why + '.');
  return out;
}
