// ---------------------------------------------------------------- shared UI pieces
const ext = (href, label, cls = 'btn sm', extra = '') => href ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer" ${extra}>${label}</a>` : '';
const shortLoc = j => {
  const l = (j.location || '').replace(/\s*\([^)]*\)/g, '').replace(/^GBR - /, '');
  return l ? (l.length > 38 ? l.slice(0, 36) + '…' : l) : LOC_LABEL[j.loc];
};
const whenShort = j => j.postedDate ? fmtShort(j.postedDate) : j.firstSeen ? fmtShort(j.firstSeen) : '';

const saveBtn = (j, cls = 'icon-btn') =>
  `<button class="${cls}" type="button" data-act="save" data-id="${j.id}" aria-pressed="${isSaved(j.id)}" aria-label="${isSaved(j.id) ? 'Unsave' : 'Save'} ${esc(j.title)}" title="Save">${ico('bookmark')}</button>`;
const watchBtn = (c, cls = 'btn sm') =>
  `<button class="${cls}" type="button" data-act="watch" data-co="${esc(c.id)}" aria-pressed="${isWatched(c.name)}">${ico('star', 'i-sm')}<span>${isWatched(c.name) ? 'Watching' : 'Watch'}</span></button>`;

function jobRow(j) {
  const fn = j.fns[0] || '';
  return `<article class="job${isHidden(j.id) ? ' is-hidden' : ''}${S.viewed.includes(j.id) ? ' seen' : ''}">
    <button class="hit" type="button" data-act="open-job" data-id="${j.id}" aria-label="${esc(j.title)} at ${esc(j.company)}"></button>
    <div style="min-width:0;position:relative;pointer-events:none">
      <h3>${esc(j.title)}${j.new ? '<span class="new">New</span>' : ''}</h3>
      <div class="meta"><span class="co">${esc(j.company)}</span><span>${esc(shortLoc(j))}</span>${fn ? `<span>${esc(fn)}</span>` : ''}${j.sen === 'Stretch' ? '<span>Stretch</span>' : ''}${!j.match ? '<span>Outside the post-MBA rules</span>' : ''}</div>
    </div>
    <div class="side"><span class="when num">${esc(whenShort(j))}</span>${saveBtn(j)}</div>
  </article>`;
}

function emptyState(title, body, buttons = '') {
  return `<div class="empty"><h3>${esc(title)}</h3><p>${body}</p>${buttons ? `<div class="btns">${buttons}</div>` : ''}</div>`;
}

// ---------------------------------------------------------------- toasts, clipboard, share
function toast(msg, action) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.fn(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), action ? 5000 : 2400);
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
  copyText(`${data.text}\n${data.url}`, 'Link copied');
}
function outreachNote(j) {
  const fn = (j.fns[0] || 'commercial').split(' & ')[0].toLowerCase();
  return `Hi [Name],

I'm an MBA student at London Business School focused on ${fn} roles in sport. I saw that ${j.company} is hiring a ${j.title}${j.location ? ` in ${j.location}` : ''}, and I'd really value 15 minutes of your perspective on the team and what makes candidates stand out.

Would you be open to a short call in the next couple of weeks?

Thanks,
[Your name]`;
}
