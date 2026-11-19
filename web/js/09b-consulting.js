// ---------------------------------------------------------------- view: Sports consulting & advisory
// "Consulting" = what a firm does (advice, valuation, research, analytics sold to sport), not what it is called.
let CS = 'all';
// A consulting role is advisory / strategy work (the Strategy & Consulting function), at an advisory firm
const isConsultingRole = j => !!j.adv && j.fns.includes('Strategy & Consulting');
function vConsulting() {
  const firms = D.companies.filter(c => c.advisory_type);
  const segs = ADV.filter(k => firms.some(c => c.advisory_type === k));
  const inSeg = x => CS === 'all' || x === CS;
  const roles = sortJobs(D.matches.filter(j => isConsultingRole(j) && inSeg(j.adv) && !isHidden(j.id)), 'relevance');
  const elsewhere = sortJobs(D.matches.filter(j => !j.adv && j.fns.includes('Strategy & Consulting') && !isHidden(j.id)), 'relevance');
  const live = firms.filter(c => c.live).length, byHand = firms.filter(c => !c.live).length;
  const allRoles = D.matches.filter(isConsultingRole).length;
  return `<div class="view">
  <div class="page-head"><div><h1>Sports consulting & advisory</h1>
    <p>Firms whose product is <b>advice, valuation, research or analytics</b> bought by teams, leagues, rights holders, broadcasters and sports investors. They're grouped by what they do, whatever they call themselves.</p></div></div>
  <div class="card fresh-card" style="gap:28px">
    <div><div class="eyebrow">Firms tracked</div><div class="big num">${firms.length}</div></div>
    <div><div class="eyebrow">Live job feeds</div><div class="big num">${live}</div></div>
    <div><div class="eyebrow">Check by hand</div><div class="big num">${byHand}</div></div>
    <div><div class="eyebrow">Matched consulting roles</div><div class="big num">${allRoles}</div></div>
    <p class="muted" style="flex:1;min-width:240px;font-size:13px">At these firms, generic consulting titles count (Associate, Engagement Manager, Senior Consultant, Insight, Valuation). Generalist firms only count roles that mention sport, media, TMT or deals.</p>
  </div>

  <div class="seg" role="group" aria-label="Consulting segment" style="margin-top:20px;max-width:100%;overflow-x:auto">
    <button type="button" data-act="cs" data-v="all" aria-pressed="${CS === 'all'}">All segments<span class="c">${allRoles}</span></button>
    ${segs.map(k => `<button type="button" data-act="cs" data-v="${k}" aria-pressed="${CS === k}">${esc(advLabel(k))}<span class="c">${D.matches.filter(j => isConsultingRole(j) && j.adv === k).length}</span></button>`).join('')}
  </div>
  ${CS !== 'all' ? `<p class="muted" style="margin-top:10px">${esc(advDesc(CS))}</p>` : ''}

  <section class="section">
    <div class="section-head"><div><h2>Open consulting roles</h2><p>Advisory and strategy roles (post-MBA level, London and Europe) at the firms below. Their sales and operations roles are in Explore.</p></div>
      ${roles.length ? `<button class="link" type="button" data-act="preset" data-preset='${esc(JSON.stringify({ adv: CS === 'all' ? ADV : [CS], fn: ['Strategy & Consulting'] }))}'>Filter in Explore ${ico('arrow', 'i-sm')}</button>` : ''}</div>
    ${roles.length ? `<div class="jlist">${roles.slice(0, 30).map(jobRow).join('')}</div>`
      : `<div class="card">${emptyState('No matched roles in this segment right now', 'Many advisory firms hire through their own sites or LinkedIn. Use each firm’s careers link below, and watch the ones you care about.')}</div>`}
  </section>

  <section class="section">
    <div class="section-head"><div><h2>Consulting-style roles at other employers</h2><p>In-house strategy, insight and consulting roles at clubs, leagues, media and investors.</p></div>
      ${elsewhere.length ? `<button class="link" type="button" data-act="preset" data-preset='{"fn":["Strategy & Consulting"]}'>All ${elsewhere.length} ${ico('arrow', 'i-sm')}</button>` : ''}</div>
    ${elsewhere.length ? `<div class="jlist">${elsewhere.slice(0, 8).map(jobRow).join('')}</div>` : `<div class="card">${emptyState('None right now', 'No in-house strategy roles match the post-MBA rules in this refresh.')}</div>`}
  </section>

  ${segs.filter(inSeg).map(k => {
    const cs = firms.filter(c => c.advisory_type === k).sort((a, b) => b.matches.length - a.matches.length || (b.live - a.live) || a.name.localeCompare(b.name));
    return `<section class="cgroup"><div class="cgroup-head"><h2>${esc(advLabel(k))}</h2><span class="muted">${plural(cs.length, 'firm')}</span></div>
      <p class="muted" style="margin:-6px 0 12px;max-width:80ch;font-size:13px">${esc(advDesc(k))}</p>
      <div class="cgrid">${cs.map(companyCard).join('')}</div></section>`;
  }).join('')}
  </div>`;
}
