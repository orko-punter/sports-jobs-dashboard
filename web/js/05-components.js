// ---------------------------------------------------------------- shared UI components
const monogram = (name, size = '') => `<span class="mono-badge ${size}" aria-hidden="true">${esc(initials(name))}</span>`;
const senPill = s => `<span class="pill ${s === 'Post-MBA' ? 'mba' : s === 'Stretch' ? 'stretch' : 'quiet'}">${esc(s)}</span>`;
const locPill = j => `<span class="pill ${j.loc === 'London' ? 'london' : ''}">${ico('pin', 'i-sm')}${esc(j.loc === 'Unknown' ? 'Location not stated' : j.loc)}</span>`;
const newPill = j => j.new ? '<span class="pill new">New</span>' : '';
const fnText = j => j.fns.length ? esc(j.fns[0]) + (j.fns.length > 1 ? ` <span class="muted">+${j.fns.length - 1}</span>` : '') : '<span class="muted">No function tag</span>';
const ext = (href, label, cls = 'btn sm', extra = '') => href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" ${extra}>${label}</a>` : '';

const saveBtn = (j, cls = 'btn icon sm ghost') =>
  `<button class="${cls}" type="button" data-act="save" data-id="${j.id}" aria-pressed="${isSaved(j.id)}" aria-label="Save ${esc(j.title)}" title="Save">${ico('bookmark')}</button>`;
const hideBtn = j =>
  `<button class="btn icon sm ghost hide-btn" type="button" data-act="hide" data-id="${j.id}" aria-label="${isHidden(j.id) ? 'Restore' : 'Hide'} ${esc(j.title)}" title="${isHidden(j.id) ? 'Restore' : 'Not for me: hide'}">${ico(isHidden(j.id) ? 'eye' : 'eyeoff')}</button>`;
const watchBtn = (c, cls = 'btn icon sm ghost') =>
  `<button class="${cls}" type="button" data-act="watch" data-co="${esc(c.id)}" aria-pressed="${isWatched(c.name)}" aria-label="Watch ${esc(c.name)}" title="Add to watchlist">${ico('star')}${cls.includes('icon') ? '' : '<span>Watch</span>'}</button>`;

function jobRow(j, opts = {}) {
  const date = dateLabel(j);
  const prog = opts.progress ? (() => { const d = stepsDone(j.id), t = jobSteps(j).length; return `<span><span class="progress"><i style="width:${pct(d, t)}%"></i></span>${d}/${t} steps</span>`; })() : '';
  return `<article class="jrow${isHidden(j.id) ? ' is-hidden' : ''}${S.viewed.includes(j.id) ? ' viewed' : ''}">
    <button class="hit" type="button" data-act="open-job" data-id="${j.id}" aria-label="Open ${esc(j.title)} at ${esc(j.company)}"></button>
    ${monogram(j.company, 'sm')}
    <div style="min-width:0">
      <h3>${esc(j.title)} ${newPill(j)}</h3>
      <div class="meta"><span class="co">${esc(j.company)}</span>
        <span>${ico('pin', 'i-sm')}${esc(j.location || LOC_LABEL[j.loc])}</span>
        ${senPill(j.sen)}<span>${fnText(j)}</span>${date ? `<span>${ico('clock', 'i-sm')}${esc(date)}</span>` : ''}${prog}</div>
    </div>
    <div class="acts">${saveBtn(j)}${hideBtn(j)}${ext(j.url, `Apply ${ico('ext', 'i-sm')}`, 'btn sm apply', `aria-label="Apply for ${esc(j.title)} on the company site"`)}</div>
  </article>`;
}

function jobCard(j) {
  const date = dateLabel(j);
  return `<article class="jcard">
    <button class="hit" type="button" data-act="open-job" data-id="${j.id}" aria-label="Open ${esc(j.title)} at ${esc(j.company)}"></button>
    <div class="top">${monogram(j.company)}<div style="min-width:0;flex:1"><h3>${esc(j.title)}</h3><div class="co">${esc(j.company)}</div></div></div>
    <div class="tags">${newPill(j)}${locPill(j)}${senPill(j.sen)}${j.fns[0] ? `<span class="pill quiet">${esc(j.fns[0])}</span>` : ''}</div>
    <div class="foot"><span>${esc(date || catLabel(j.category))}</span><div class="acts">${saveBtn(j)}</div></div>
  </article>`;
}

function companyStats(c) {
  if (c.manual) return `<div class="stats"><div class="na" style="grid-column:1/-1"><b>Not tracked automatically</b><span>No public jobs feed. Check the careers site.</span></div></div>`;
  if (c.error) return `<div class="stats"><div class="na" style="grid-column:1/-1"><b>Feed failed in the last refresh</b><span>Counts unavailable, not zero. Check the careers site.</span></div></div>`;
  return `<div class="stats">
    <div><b>${c.matches.length}</b><span>Matched roles</span></div>
    <div><b>${D.firstRun ? '—' : c.newMatches.length}</b><span>New</span></div>
    <div><b>${c.jobs.length}</b><span>UK & Europe</span></div></div>`;
}
function companyCard(c) {
  return `<article class="ccard">
    <button class="hit" type="button" data-act="open-co" data-co="${esc(c.id)}" aria-label="Open ${esc(c.name)}"></button>
    <div class="top">${monogram(c.name)}<div style="min-width:0"><h3>${esc(c.name)}</h3><div class="sub">${esc(catLabel(c.category))}${c.hq ? ' · ' + esc(c.hq) : ''}</div></div></div>
    <p class="why">${esc(c.why || '')}</p>
    ${companyStats(c)}
    <div class="acts">${ext(c.careers_url, `Careers ${ico('ext', 'i-sm')}`)}${ext((netLink(c, 'lbs') || {}).url, `${ico('grad', 'i-sm')} LBS alumni`)}${watchBtn(c)}</div>
  </article>`;
}

function emptyState(title, body, buttons = '') {
  return `<div class="empty"><div class="ill">${ico('search')}</div><h3>${esc(title)}</h3><p>${body}</p>${buttons ? `<div class="btns">${buttons}</div>` : ''}</div>`;
}

function netLinks(c, keys = NET.map(n => n[0]), cls = 'netlink') {
  return keys.map(k => {
    const n = NET.find(x => x[0] === k) || [k, k, 'users'];
    const l = netLink(c, k);
    if (!l) return '';
    return `<a class="${cls}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${ico(n[2])}<span>${esc(n[1])}<small>${esc(l.label)}</small></span>${ico('ext')}</a>`;
  }).join('');
}

// ---------------------------------------------------------------- toasts, clipboard, share
function toast(msg, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ico('check')}<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), action ? 5000 : 2600);
}
async function copyText(text, msg = 'Copied') {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e2) { toast('Copy failed: select the text manually'); t.remove(); return; }
    t.remove();
  }
  toast(msg);
}
const shareUrl = j => location.protocol.startsWith('http') ? `${location.origin}${location.pathname}#/jobs/job/${j.id}` : j.url;
async function shareJob(j) {
  const data = { title: `${j.title} at ${j.company}`, text: `${j.title} at ${j.company} (${j.location || j.loc})`, url: shareUrl(j) };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e.name === 'AbortError') return; } }
  copyText(`${data.text}\n${data.url}`, 'Share link copied');
}
function outreachNote(j) {
  const fn = (j.fns[0] || 'commercial').split(' & ')[0].toLowerCase();
  return `Hi [Name],

I'm an MBA student at London Business School focused on ${fn} roles in sport. I saw that ${j.company} is hiring a ${j.title}${j.location ? ` in ${j.location}` : ''}, and I'd really value 15 minutes of your perspective on the team and what makes candidates stand out.

Would you be open to a short call in the next couple of weeks?

Thanks,
[Your name]`;
}
