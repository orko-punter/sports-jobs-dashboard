// ---------------------------------------------------------------- navigation, routing, events, boot
let D = null;
const route = { view: null, panel: null, id: null };
const VIEWS = {
  overview: { label: 'Overview', icon: 'home', render: vOverview },
  jobs: { label: 'Explore jobs', short: 'Jobs', icon: 'briefcase', render: vJobs, bind: bindJobs },
  companies: { label: 'Companies', icon: 'building', render: vCompanies, bind: () => { bindCoToolbar('cq', updateCompanies); updateCompanies(); } },
  network: { label: 'Networking', short: 'Network', icon: 'users', render: vNetwork, bind: () => { bindCoToolbar('nq', updateNetwork); updateNetwork(); } },
  saved: { label: 'Saved', icon: 'bookmark', render: vSaved },
  about: { label: 'Methodology', icon: 'info', render: vAbout },
};

function renderNav() {
  const counts = { jobs: [D.matches.length, false], saved: [Object.keys(S.saved).length, false], companies: [D.companies.length, false] };
  const nNew = D.matches.filter(j => j.new).length;
  if (nNew) counts.jobs = [`${nNew} new`, true];
  $('#nav').innerHTML = Object.entries(VIEWS).map(([k, v]) => `${k === 'about' ? '<div class="nav-sep"></div>' : ''}<a href="#/${k}" ${route.view === k ? 'aria-current="page"' : ''}>${ico(v.icon)}<span>${v.label}</span>${counts[k] && counts[k][0] ? `<span class="count ${counts[k][1] ? 'hot' : ''}">${counts[k][0]}</span>` : ''}</a>`).join('');
  $('#tabbar').innerHTML = ['overview', 'jobs', 'companies', 'network', 'saved'].map(k => {
    const v = VIEWS[k], badge = k === 'saved' ? Object.keys(S.saved).length : k === 'jobs' ? nNew : 0;
    return `<a href="#/${k}" ${route.view === k ? 'aria-current="page"' : ''}>${ico(v.icon)}<span>${v.short || v.label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
  }).join('');
  $('#side-fresh').innerHTML = `<b><span class="dot ${D.stale ? 'warn' : ''}"></span>${D.generated ? `Updated ${relTime(D.generated)}` : 'Refresh time unknown'}</b>${D.generated ? esc(D.generated.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : ''} · ${D.companies.filter(c => c.live).length} live feeds`;
}

function renderBanner() {
  const errs = D.companies.filter(c => c.error);
  let html = '';
  if (D.stale) html = `<div class="banner" role="alert">${ico('alert')}<div><b>Stale data.</b> ${D.generated ? `Last refreshed ${relTime(D.generated)}` : 'The refresh time is unknown'}. The daily refresh may not have run, so some listings may have closed. <a href="#/about">Details</a></div></div>`;
  else if (errs.length && route.view === 'overview') html = `<div class="banner" style="background:var(--surface-2);color:var(--ink-2);border-color:var(--line)">${ico('info')}<div>${plural(errs.length, 'feed')} failed in the latest refresh (${esc(listJoin(errs.map(c => c.name)))}), so ${errs.length === 1 ? 'its' : 'their'} roles are missing today. <a href="#/about">Coverage</a></div></div>`;
  $('#banner').innerHTML = html;
}

function renderView() {
  const v = VIEWS[route.view];
  $('#main').innerHTML = v.render();
  if (v.bind) v.bind();
  renderNav(); renderBanner();
}

function onRoute() {
  const [view, panel, id] = location.hash.replace(/^#\/?/, '').split('/');
  const nextView = VIEWS[view] ? view : 'overview';
  const changed = nextView !== route.view;
  route.view = nextView; route.panel = panel || null; route.id = id ? decodeURIComponent(id) : null;
  if (changed) {
    openRail(false);
    renderView();
    window.scrollTo(0, 0);
    if (!route.panel) $('#main').focus({ preventScroll: true });
    document.title = `${VIEWS[nextView].label} · Touchline`;
  }
  if (route.panel === 'job' && D.byId.has(route.id)) { const j = D.byId.get(route.id); markViewed(j.id); showDrawer(jobPanel(j)); }
  else if (route.panel === 'company' && D.byCo.has(route.id)) showDrawer(companyPanel(D.byCo.get(route.id)));
  else {
    if (route.panel) toast(route.panel === 'job' ? 'That role is no longer in the latest refresh' : 'Company not found');
    hideDrawer();
    if (!changed && route.view === 'jobs') updateJobs(); // reflect "viewed" state
  }
}

// After save / hide / watch: refresh what's on screen without losing place
function afterChange() {
  renderNav();
  $$('[data-act="save"]').forEach(b => b.setAttribute('aria-pressed', String(isSaved(b.dataset.id))));
  $$('[data-act="watch"]').forEach(b => { const c = D.byCo.get(b.dataset.co); if (c) b.setAttribute('aria-pressed', String(isWatched(c.name))); });
  const y = window.scrollY;
  if (route.view === 'jobs') updateJobs();
  else if (route.view === 'companies') updateCompanies();
  else if (route.view === 'network') updateNetwork();
  else if (route.view === 'saved' || route.view === 'overview') { $('#main').innerHTML = VIEWS[route.view].render(); window.scrollTo(0, y); }
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
    case 'copy': if (j) copyText(j.url, 'Application link copied'); break;
    case 'share': if (j) shareJob(j); break;
    case 'outreach': if (j) copyText(outreachNote(j), 'Outreach note copied. Fill in the [brackets]'); break;
    case 'copy-saved': copyText(Object.keys(S.saved).map(id => { const x = D.byId.get(id) || S.saved[id]; return `${x.title} | ${x.company} | ${x.location || ''}\n${x.url}`; }).join('\n\n'), 'Saved list copied'); break;
    case 'preset': e.preventDefault(); hideDrawer(); goJobs(JSON.parse(el.dataset.preset || '{}')); break;
    case 'scope': F.scope = el.dataset.v; pageSize = 50; persistFilters(); updateJobs(); break;
    case 'clear': F = { ...DEFAULT_F, scope: F.scope, sort: F.sort }; persistFilters(); $('#q') && ($('#q').value = ''); updateJobs(); break;
    case 'unchip': { const k = el.dataset.k; if (Array.isArray(F[k])) F[k] = F[k].filter(x => x !== el.dataset.v); else if (k === 'q') { F.q = ''; $('#q').value = ''; } else F[k] = false; persistFilters(); updateJobs(); break; }
    case 'more': pageSize += 50; updateJobs(); break;
    case 'rail-open': openRail(true); break;
    case 'rail-close': openRail(false); break;
    case 'saved-tab': S.savedTab = el.dataset.v; Store.save(); $('#main').innerHTML = vSaved(); break;
    case 'co-clear': CF = { q: '', cat: '', watch: false, sort: CF.sort }; renderView(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.step != null) {
    const arr = S.steps[t.dataset.id] || [];
    arr[+t.dataset.step] = t.checked; S.steps[t.dataset.id] = arr; Store.save();
    const h = t.closest('.d-sec').querySelector('h3 .muted'); if (h) h.textContent = `· ${stepsDone(t.dataset.id)}/${arr.length > 5 ? arr.length : 5}`;
  }
});
$('#scrim').addEventListener('click', () => { if ($('#rail.open')) openRail(false); else location.hash = closeHref(); });

// focus trap inside the open panel / palette
document.addEventListener('keydown', e => {
  const pal = !$('#palette').hidden;
  if (e.key === 'Escape') {
    if (pal) return closePalette();
    if ($('#rail.open')) return openRail(false);
    if (!$('#drawer').hidden) { location.hash = closeHref(); return; }
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal ? closePalette() : openPalette(); return; }
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === '/' && !typing && !pal) { e.preventDefault(); if (route.view === 'jobs' && $('#drawer').hidden) $('#q').focus(); else openPalette(); return; }
  if (e.key === 'Tab') {
    const box = pal ? $('#palette') : !$('#drawer').hidden ? $('#drawer') : $('#rail.open');
    if (!box) return;
    const f = $$('a[href],button:not([disabled]),input,select,[tabindex]:not([tabindex="-1"])', box).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

// ---------------------------------------------------------------- command palette (⌘K)
let palItems = [], palSel = 0;
function openPalette() { $('#palette').hidden = false; $('#palette-q').value = ''; renderPalette(); $('#palette-q').focus(); }
function closePalette() { $('#palette').hidden = true; }
function renderPalette() {
  const toks = $('#palette-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hit = s => toks.every(t => s.toLowerCase().includes(t));
  let groups;
  if (!toks.length) {
    const viewed = S.viewed.map(id => D.byId.get(id)).filter(Boolean).slice(0, 4);
    groups = [['Go to', Object.entries(VIEWS).map(([k, v]) => ({ icon: v.icon, t: v.label, run: () => { location.hash = `#/${k}`; } }))],
      ['Recently viewed', viewed.map(j => ({ icon: 'briefcase', t: j.title, s: j.company, run: () => { location.hash = `#/${route.view}/job/${j.id}`; } }))]];
  } else {
    const js = sortJobs(D.jobs.filter(j => hit(`${j.title} ${j.company} ${j.location}`)), 'relevance').slice(0, 7);
    const cs = D.companies.filter(c => hit(`${c.name} ${c.category} ${c.hq}`)).slice(0, 5);
    groups = [['Jobs', js.map(j => ({ icon: 'briefcase', t: j.title, s: `${j.company} · ${j.location || j.loc}`, r: j.match ? j.sen : 'Outside rules', run: () => { location.hash = `#/${route.view}/job/${j.id}`; } }))],
      ['Companies', cs.map(c => ({ icon: 'building', t: c.name, s: catLabel(c.category), r: c.live ? plural(c.matches.length, 'match', 'matches') : 'Check by hand', run: () => { location.hash = `#/${route.view}/company/${c.id}`; } }))]];
  }
  palItems = groups.flatMap(g => g[1]); palSel = 0;
  let i = 0;
  $('#palette-list').innerHTML = palItems.length ? groups.filter(g => g[1].length).map(([h, items]) => `<h4>${h}</h4>${items.map(x => `<div class="pitem" role="option" data-i="${i}" aria-selected="${i++ === 0}">${ico(x.icon)}<div style="min-width:0"><b>${esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ''}</div>${x.r ? `<span class="r">${esc(x.r)}</span>` : ''}</div>`).join('')}`).join('')
    : `<div class="empty" style="padding:28px">${'<p>No jobs or companies match.</p>'}</div>`;
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
}
$('#theme-btn').addEventListener('click', () => { S.theme = effectiveDark() ? 'light' : 'dark'; Store.save(); applyTheme(); });

window.addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });

// ---------------------------------------------------------------- boot
(async function boot() {
  applyTheme();
  try { D = await loadData(); }
  catch (err) {
    $('#main').innerHTML = `<div class="card" style="margin-top:24px">${emptyState('Could not load the jobs data', `${esc(err.message)}. If you opened the template directly, run <code>python3 pipeline.py</code> and open <code>dashboard.html</code> instead.`, '<button class="btn dark" type="button" onclick="location.reload()">Try again</button>')}</div>`;
    $('.empty .ill').innerHTML = ico('alert');
    return;
  }
  window.addEventListener('hashchange', onRoute);
  onRoute();
})();
