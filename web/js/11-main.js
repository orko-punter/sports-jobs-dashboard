// ---------------------------------------------------------------- navigation, routing, events, boot
let D = null;
const route = { view: null, panel: null, id: null };
const VIEWS = {
  'for-you': { label: 'For you', render: vForYou, nav: true },
  jobs: { label: 'All jobs', render: vAll, bind: bindAll, nav: true },
  companies: { label: 'Companies', render: vCompanies, bind: bindCompanies, nav: true },
  saved: { label: 'Saved', render: vSaved, nav: true },
  start: { label: 'Your answers', render: vStart },
  about: { label: 'About the data', render: vAbout },
};
// links from earlier versions of the site keep working
const ALIAS = { overview: 'for-you', consulting: 'companies', network: 'companies', explore: 'jobs' };

function renderNav() {
  const nSaved = Object.keys(S.saved).length;
  const cur = route.view === 'start' ? 'for-you' : route.view;
  $('#nav').innerHTML = Object.entries(VIEWS).filter(([, v]) => v.nav).map(([k, v]) =>
    `<a href="#/${k}" ${cur === k ? 'aria-current="page"' : ''}>${v.label}${k === 'saved' && nSaved ? `<span class="n num">${nSaved}</span>` : ''}</a>`).join('');
}
function renderFoot() {
  $('#foot').innerHTML = `<span>${D.generated ? `Updated ${relTime(D.generated)}` : 'Refresh time unknown'}</span>
    <span>${D.companies.length} companies · ${D.companies.filter(c => c.live).length} live feeds</span>
    <a href="#/about">About the data</a><span style="margin-left:auto">For London Business School students</span>`;
}
function renderBanner() {
  $('#banner').innerHTML = D.stale ? `<div class="banner"><div>${ico('alert')}<span>This data is ${D.generated ? `from ${relTime(D.generated)}` : 'of unknown age'}, so some roles may have closed. <a href="#/about">Details</a></span></div></div>` : '';
}

function renderView() {
  const v = VIEWS[route.view];
  $('#main').innerHTML = v.render();
  if (v.bind) v.bind();
  renderNav(); renderBanner();
}

function onRoute() {
  const [rawView, panel, id] = location.hash.replace(/^#\/?/, '').split('/');
  const view = ALIAS[rawView] || rawView;
  const nextView = VIEWS[view] ? view : 'for-you';
  const changed = nextView !== route.view;
  route.view = nextView; route.panel = panel || null; route.id = id ? decodeURIComponent(id) : null;
  if (changed) {
    if (nextView === 'start') QD = null;
    if (nextView === 'for-you') FY.n = 25;
    renderView();
    window.scrollTo(0, 0);
    if (!route.panel) $('#main').focus({ preventScroll: true });
    document.title = `${VIEWS[nextView].label} · Touchline`;
  }
  if (route.panel === 'job' && D.byId.has(route.id)) { const j = D.byId.get(route.id); markViewed(j.id); showDrawer(jobPanel(j)); }
  else if (route.panel === 'company' && D.byCo.has(route.id)) showDrawer(companyPanel(D.byCo.get(route.id)));
  else {
    if (route.panel) toast(route.panel === 'job' ? 'That role is no longer listed' : 'Company not found');
    hideDrawer();
    if (!changed) refreshInPlace();
  }
}

// Re-draw the current view without losing scroll position or the search box
function refreshInPlace() {
  const y = window.scrollY;
  if (route.view === 'jobs') updateAll();
  else if (route.view === 'companies') updateCompanies();
  else $('#main').innerHTML = VIEWS[route.view].render();
  window.scrollTo(0, y);
}
function afterChange() {
  renderNav();
  refreshInPlace();
  if (!$('#drawer').hidden) {
    const body = $('.d-body'), st = body ? body.scrollTop : 0;
    if (route.panel === 'job' && D.byId.has(route.id)) $('#drawer').innerHTML = jobPanel(D.byId.get(route.id));
    else if (route.panel === 'company' && D.byCo.has(route.id)) $('#drawer').innerHTML = companyPanel(D.byCo.get(route.id));
    if ($('.d-body')) $('.d-body').scrollTop = st;
  }
}

const go = (panel, id) => { location.hash = `#/${route.view}/${panel}/${encodeURIComponent(id)}`; };

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, j = el.dataset.id ? D.byId.get(el.dataset.id) : null;
  const c = el.dataset.co ? D.byCo.get(el.dataset.co) : null;
  switch (a) {
    case 'open-job': if (j) go('job', j.id); break;
    case 'open-co': if (c) go('company', c.id); break;
    case 'close': e.preventDefault(); location.hash = closeHref(); break;
    case 'save': if (j) toggleSave(j); break;
    case 'unsave': delete S.saved[el.dataset.id]; Store.save(); afterChange(); break;
    case 'hide': if (j) toggleHide(j); break;
    case 'unhide': delete S.hidden[el.dataset.id]; Store.save(); afterChange(); break;
    case 'watch': if (c) toggleWatch(c.name); break;
    case 'share': if (j) shareJob(j); break;
    case 'outreach': if (j) copyText(outreachNote(j), 'Note copied. Fill in the [brackets]'); break;
    case 'copy-saved': copyText(Object.keys(S.saved).map(id => { const x = D.byId.get(id) || S.saved[id]; return `${x.title} | ${x.company} | ${x.location || ''}\n${x.url}`; }).join('\n\n'), 'List copied'); break;
    case 'saved-tab': S.savedTab = el.dataset.v; Store.save(); $('#main').innerHTML = vSaved(); break;
    // questions
    case 'q': { const k = el.dataset.k, v = el.dataset.v; QD[k] = QD[k].includes(v) ? QD[k].filter(x => x !== v) : [...QD[k], v];
      if (k === 'cat' && !QD.cat.includes(CONSULTING)) QD.adv = [];
      const y = window.scrollY; $('#main').innerHTML = vStart(); window.scrollTo(0, y); break; }
    case 'q-stretch': { QD.stretch = el.dataset.v === '1'; const y = window.scrollY; $('#main').innerHTML = vStart(); window.scrollTo(0, y); break; }
    case 'q-done': S.profile = QD; Store.save(); QD = null; if (route.view === 'for-you') { renderView(); window.scrollTo(0, 0); } else location.hash = '#/for-you'; break;
    case 'q-skip': S.profile = { ...DEFAULT_P }; Store.save(); QD = null; renderView(); window.scrollTo(0, 0); break;
    case 'q-cancel': QD = null; break;
    // For you
    case 'fy-sort': FY.sort = el.dataset.v; FY.n = 25; $('#main').innerHTML = vForYou(); break;
    case 'fy-more': FY.n += 25; refreshInPlace(); break;
    // All jobs
    case 'aj-by': AJ.by = el.dataset.v; AJ.all = {}; $$('[data-act="aj-by"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === AJ.by))); updateAll(); break;
    case 'aj-clear': AJ.q = ''; $('#aq').value = ''; updateAll(); break;
    case 'g-all': AJ.all[el.dataset.g] = true; updateAll(); break;
    case 'browse': e.preventDefault(); AJ.q = el.dataset.q; AJ.wide = true; hideDrawer();
      if (route.view === 'jobs') { renderView(); } else location.hash = '#/jobs'; break;
  }
});
$('#scrim').addEventListener('click', () => { location.hash = closeHref(); });

document.addEventListener('keydown', e => {
  const pal = !$('#palette').hidden;
  if (e.key === 'Escape') {
    if (pal) return closePalette();
    if (!$('#drawer').hidden) { location.hash = closeHref(); return; }
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal ? closePalette() : openPalette(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === '/' && !typing && !pal) { e.preventDefault(); if ($('#aq') && $('#drawer').hidden) $('#aq').focus(); else openPalette(); return; }
  if (e.key === 'Tab') {
    const box = pal ? $('#palette') : !$('#drawer').hidden ? $('#drawer') : null;
    if (!box) return;
    const f = $$('a[href],button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])', box).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

// ---------------------------------------------------------------- search palette (⌘K)
let palItems = [], palSel = 0;
function openPalette() { $('#palette').hidden = false; $('#palette-q').value = ''; renderPalette(); $('#palette-q').focus(); }
function closePalette() { $('#palette').hidden = true; }
function renderPalette() {
  const toks = $('#palette-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hit = s => toks.every(t => s.toLowerCase().includes(t));
  let groups;
  if (!toks.length) {
    const viewed = S.viewed.map(id => D.byId.get(id)).filter(Boolean).slice(0, 5);
    groups = [['Recently viewed', viewed.map(j => ({ t: j.title, s: j.company, run: () => { location.hash = `#/${route.view}/job/${j.id}`; } }))],
      ['Go to', Object.entries(VIEWS).filter(([k]) => k !== 'start').map(([k, v]) => ({ t: v.label, run: () => { location.hash = `#/${k}`; } }))]];
  } else {
    const js = sortJobs(D.jobs.filter(j => hit(`${j.title} ${j.company} ${j.location}`)), 'relevance').slice(0, 7);
    const cs = D.companies.filter(c => hit(`${c.name} ${c.category} ${c.hq}`)).slice(0, 5);
    groups = [['Jobs', js.map(j => ({ t: j.title, s: `${j.company} · ${shortLoc(j)}`, r: j.match ? '' : 'Outside rules', run: () => { location.hash = `#/${route.view}/job/${j.id}`; } }))],
      ['Companies', cs.map(c => ({ t: c.name, s: catLabel(c.category), r: c.live ? plural(c.matches.length, 'role') : 'Check by hand', run: () => { location.hash = `#/${route.view}/company/${c.id}`; } }))]];
  }
  palItems = groups.flatMap(g => g[1]); palSel = 0;
  let i = 0;
  $('#palette-list').innerHTML = palItems.length ? groups.filter(g => g[1].length).map(([h, items]) => `<h4>${h}</h4>${items.map(x => `<div class="pitem" role="option" data-i="${i}" aria-selected="${i++ === 0}"><div><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</div>${x.r ? `<span class="r">${esc(x.r)}</span>` : ''}</div>`).join('')}`).join('')
    : '<p class="muted" style="padding:20px 12px">No jobs or companies match.</p>';
}
$('#palette-q').addEventListener('input', renderPalette);
$('#palette-q').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % Math.max(1, palItems.length);
    $$('.pitem').forEach(p => p.setAttribute('aria-selected', String(+p.dataset.i === palSel)));
    const cur = $(`.pitem[data-i="${palSel}"]`); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  if (e.key === 'Enter' && palItems[palSel]) { closePalette(); palItems[palSel].run(); }
});
$('#palette-list').addEventListener('click', e => { const p = e.target.closest('.pitem'); if (p) { closePalette(); palItems[+p.dataset.i].run(); } });
$('#palette').addEventListener('click', e => { if (e.target.id === 'palette') closePalette(); });
$('#cmd-open').addEventListener('click', openPalette);

// ---------------------------------------------------------------- theme
function effectiveDark() { return S.theme ? S.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme() {
  if (S.theme) document.documentElement.dataset.theme = S.theme; else delete document.documentElement.dataset.theme;
  $('#theme-btn').innerHTML = ico(effectiveDark() ? 'sun' : 'moon');
  $('#theme-btn').setAttribute('aria-label', effectiveDark() ? 'Switch to light theme' : 'Switch to dark theme');
  document.querySelector('meta[name="theme-color"]').content = effectiveDark() ? '#111110' : '#fafaf8';
}
$('#theme-btn').addEventListener('click', () => { S.theme = effectiveDark() ? 'light' : 'dark'; Store.save(); applyTheme(); });

// ---------------------------------------------------------------- boot
(async function boot() {
  applyTheme();
  try { D = await loadData(); }
  catch (err) {
    $('#main').innerHTML = emptyState('Could not load the jobs data', `${esc(err.message)}. Run <code>python3 pipeline.py</code> and open <code>dashboard.html</code>.`, '<button class="btn" type="button" onclick="location.reload()">Try again</button>');
    return;
  }
  renderFoot();
  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
