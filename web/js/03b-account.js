// ---------------------------------------------------------------- profiles: email sign-in with a code (Supabase)
// Talks to Supabase's REST endpoints directly, so the page needs no library. Turned off when auth.json is empty.
const AUTH_CFG = window.__AUTH__ && window.__AUTH__.url && window.__AUTH__.key ? window.__AUTH__ : null;
const authOn = () => !!AUTH_CFG;

const Auth = (() => {
  const KEY = 'touchline:auth';
  let sess = null;
  try { sess = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* no storage */ }
  const keep = () => { try { sess ? localStorage.setItem(KEY, JSON.stringify(sess)) : localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  async function call(path, { method = 'GET', body, token, prefer, keepalive } = {}) {
    const h = { apikey: AUTH_CFG.key, 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    if (prefer) h.Prefer = prefer;
    const r = await fetch(AUTH_CFG.url + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, keepalive });
    const txt = await r.text();
    let d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) { /* not JSON */ }
    if (!r.ok) {
      const err = new Error((d && (d.msg || d.error_description || d.message || d.error)) || `Request failed (${r.status})`);
      err.status = r.status; err.code = d && (d.error_code || d.code); throw err;
    }
    return d;
  }
  const setSess = d => {
    sess = { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email: d.user.email, uid: d.user.id };
    keep();
  };
  async function token() {
    if (!sess) throw new Error('Not signed in');
    if (Date.now() < sess.exp - 60000) return sess.access;
    try { setSess(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: sess.refresh } })); }
    catch (e) { if (e.status >= 400 && e.status < 500) { sess = null; keep(); } throw e; }
    return sess.access;
  }
  const row = () => `/rest/v1/profiles?id=eq.${encodeURIComponent(sess.uid)}`;

  return {
    get user() { return sess; },
    sendCode: email => call('/auth/v1/otp', { method: 'POST', body: { email, create_user: true } }),
    async verify(email, code) { setSess(await call('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code } })); },
    async signOut() {
      try { await call('/auth/v1/logout', { method: 'POST', token: await token() }); } catch (e) { /* signed out locally anyway */ }
      sess = null; keep();
    },
    async load() { const r = await call(`${row()}&select=*`, { token: await token() }); return (r && r[0]) || null; },
    async put(data, keepalive) {
      const t = keepalive ? sess.access : await token();
      await call('/rest/v1/profiles?on_conflict=id', { method: 'POST', token: t, keepalive, prefer: 'resolution=merge-duplicates,return=minimal',
        body: { id: sess.uid, email: sess.email, ...data, updated_at: new Date().toISOString() } });
    },
    async wipe() { await call(row(), { method: 'DELETE', token: await token() }); },
  };
})();

// ---------------------------------------------------------------- keeping the profile in step with this browser
// Answers, saved, hidden and watched companies live in the profile. Everything else (theme, recently viewed) stays local.
const Sync = { state: 'idle', at: null, last: '', timer: null };
const syncData = () => ({ name: S.name || null, answers: S.profile, saved: S.saved, hidden: S.hidden, watch: S.watch });

function queueSync() {
  if (!authOn() || !Auth.user || Sync.state === 'pulling') return;
  if (JSON.stringify(syncData()) === Sync.last) return;
  clearTimeout(Sync.timer);
  Sync.timer = setTimeout(pushSync, 800);
}
async function pushSync() {
  clearTimeout(Sync.timer); Sync.timer = null;
  if (!Auth.user) return;
  const data = syncData(), json = JSON.stringify(data);
  Sync.state = 'saving'; paintSync();
  try { await Auth.put(data); Sync.last = json; Sync.state = 'ok'; Sync.at = new Date(); }
  catch (e) { Sync.state = 'error'; Sync.err = e.message; if (!Auth.user) afterAuth(); }
  paintSync();
}
// Bring the profile into this browser. On a fresh sign-in, roles saved here before signing in are kept too.
async function pullSync(fresh) {
  if (!Auth.user) return;
  Sync.state = 'pulling'; paintSync();
  try {
    const r = await Auth.load();
    if (r) {
      if (r.answers) S.profile = r.answers;
      S.saved = fresh ? { ...(r.saved || {}), ...S.saved } : (r.saved || {});
      S.hidden = fresh ? { ...(r.hidden || {}), ...S.hidden } : (r.hidden || {});
      S.watch = fresh ? [...new Set([...(r.watch || []), ...S.watch])] : (r.watch || []);
      S.name = r.name || S.name || '';
      Store.save();
    }
    Sync.state = 'ok'; Sync.at = new Date();
    Sync.last = r && !fresh ? JSON.stringify(syncData()) : '';
  } catch (e) { Sync.state = 'error'; Sync.err = e.message; }
  paintSync();
  if (Sync.state === 'ok') queueSync();
  if (D) afterChange();
}
// Send anything still waiting when the tab closes
window.addEventListener('pagehide', () => {
  if (Sync.timer && Auth.user && Date.now() < Auth.user.exp) { try { Auth.put(syncData(), true); } catch (e) { /* best effort */ } }
});

function syncLabel() {
  if (Sync.state === 'saving' || Sync.state === 'pulling') return 'Saving…';
  if (Sync.state === 'error') return `Not saved: ${esc(Sync.err || 'connection problem')}. It will retry on your next change.`;
  return Sync.at ? `Saved ${relTime(Sync.at)}` : 'Up to date';
}
function paintSync() { const el = $('#sync-state'); if (el) el.innerHTML = syncLabel(); }
function paintAcct() {
  const b = $('#acct-btn'); if (!b) return;
  b.hidden = !authOn();
  b.textContent = Auth.user ? 'Profile' : 'Sign in';
  b.setAttribute('aria-current', route.view === 'account' ? 'page' : 'false');
  b.title = Auth.user ? Auth.user.email : 'Save your answers and roles to your email';
}
function afterAuth() { paintAcct(); if (D && route.view === 'account') renderView(); else if (D) afterChange(); }

// ---------------------------------------------------------------- the Profile page
const AC = { step: 'email', email: '', busy: false, err: '', sentAt: 0 };

function vAccount() {
  if (!authOn()) return `<div class="view narrow"><div class="head"><div><h1>Profiles are off</h1>
    <p class="lede">This copy of the site has no sign-in set up, so answers and saved roles stay in this browser.</p></div></div></div>`;
  if (Auth.user) {
    const p = P(), u = Auth.user;
    return `<div class="view narrow"><div class="head"><div><h1>Your profile</h1>
      <p class="lede">Signed in as <b>${esc(u.email)}</b>. Changes save automatically, and the same profile loads on any device you sign in on.</p></div></div>
      <dl class="deflist acct-list">
        <dt><label for="acct-name">Name</label></dt>
        <dd><input class="field" id="acct-name" type="text" maxlength="80" autocomplete="name" placeholder="Optional" value="${esc(S.name || '')}"></dd>
        <dt>Your answers</dt>
        <dd>${hasProfile() ? profileTags(p).map(esc).join('<span class="sep">·</span>') : 'Not answered yet'} <a class="link" href="#/start">${hasProfile() ? 'Change' : 'Answer now'}</a></dd>
        <dt>Saved roles</dt><dd><a class="link" href="#/saved">${plural(Object.keys(S.saved).length, 'role')}</a></dd>
        <dt>Watching</dt><dd>${plural(S.watch.length, 'company', 'companies')}</dd>
        <dt>Hidden roles</dt><dd>${plural(Object.keys(S.hidden).length, 'role')}</dd>
        <dt>Status</dt><dd id="sync-state">${syncLabel()}</dd>
      </dl>
      <div class="acct-actions">
        <button class="btn" type="button" data-act="acct-out">Sign out</button>
        <button class="btn ghost danger" type="button" data-act="acct-delete">Delete my profile</button>
      </div>
      <p class="muted small">Signing out keeps a copy in this browser. Deleting removes your answers, saved roles and watchlist from the server.</p></div>`;
  }
  const err = AC.err ? `<p class="form-err" role="alert">${esc(AC.err)}</p>` : '';
  if (AC.step === 'code') {
    return `<div class="view narrow"><div class="head"><div><h1>Check your email</h1>
      <p class="lede">We sent a sign-in code to <b>${esc(AC.email)}</b>. It can take a minute to arrive, so check spam too.</p></div></div>
      <form class="acct-form" id="acct-form" data-step="code" novalidate>
        <label for="acct-code">Code</label>
        <div class="acct-row"><input class="field code" id="acct-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="10" placeholder="123456" required>
        <button class="btn primary" type="submit" ${AC.busy ? 'disabled' : ''}>${AC.busy ? 'Checking…' : 'Sign in'}</button></div>${err}
      </form>
      <p class="muted small acct-alt"><button class="link" type="button" data-act="acct-resend">Send a new code</button><span class="sep">·</span><button class="link" type="button" data-act="acct-back">Use a different email</button></p></div>`;
  }
  return `<div class="view narrow"><div class="head"><div><h1>Save your profile</h1>
    <p class="lede">Sign in with your email to keep your answers, saved roles and watched companies, and pick them up on any device. No password: we email you a code.</p></div></div>
    <form class="acct-form" id="acct-form" data-step="email" novalidate>
      <label for="acct-email">Email</label>
      <div class="acct-row"><input class="field" id="acct-email" name="email" type="email" autocomplete="email" placeholder="you@london.edu" value="${esc(AC.email)}" required>
      <button class="btn primary" type="submit" ${AC.busy ? 'disabled' : ''}>${AC.busy ? 'Sending…' : 'Send code'}</button></div>${err}
    </form>
    <p class="muted small">Your email is used only to sign you in. Nothing is shared, and you can delete your profile at any time.</p></div>`;
}

function friendlyAuthError(e) {
  if (e.status === 429 || /rate limit|security purposes/i.test(e.message)) return 'Too many codes requested. Wait a minute and try again.';
  if (/expired|invalid/i.test(e.message) || e.code === 'otp_expired') return 'That code is wrong or has expired. Check it, or send a new one.';
  if (e instanceof TypeError) return 'Could not reach the sign-in service. Check your connection.';
  return e.message;
}
async function sendCode(email) {
  AC.busy = true; AC.err = ''; AC.email = email; renderView();
  try { await Auth.sendCode(email); AC.step = 'code'; AC.sentAt = Date.now(); }
  catch (e) { AC.err = friendlyAuthError(e); }
  AC.busy = false; renderView();
  const f = $(AC.step === 'code' ? '#acct-code' : '#acct-email'); if (f) f.focus();
}
async function verifyCode(code) {
  AC.busy = true; AC.err = ''; renderView();
  try {
    await Auth.verify(AC.email, code);
    AC.step = 'email'; AC.busy = false;
    await pullSync(true);
    toast('Signed in. Your profile is saved');
    afterAuth();
    return;
  } catch (e) { AC.err = friendlyAuthError(e); }
  AC.busy = false; renderView();
  const f = $('#acct-code'); if (f) f.focus();
}

function bindAccount() {
  const form = $('#acct-form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    if (AC.busy) return;
    if (form.dataset.step === 'email') {
      const v = $('#acct-email').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { AC.err = 'Enter a valid email address.'; AC.email = v; renderView(); $('#acct-email').focus(); return; }
      sendCode(v);
    } else {
      const v = $('#acct-code').value.replace(/\D/g, '');
      if (v.length < 6) { AC.err = 'Enter the code from the email.'; renderView(); $('#acct-code').focus(); return; }
      verifyCode(v);
    }
  });
  const name = $('#acct-name');
  if (name) name.addEventListener('change', () => { S.name = name.value.trim(); Store.save(); });
}

async function accountAction(a) {
  switch (a) {
    case 'acct-back': AC.step = 'email'; AC.err = ''; renderView(); $('#acct-email').focus(); break;
    case 'acct-resend': {
      const wait = 60 - Math.round((Date.now() - AC.sentAt) / 1000);
      if (wait > 0) { toast(`You can ask for a new code in ${wait}s`); break; }
      await sendCode(AC.email); if (!AC.err) toast('New code sent'); break;
    }
    case 'acct-out':
      if (Sync.timer) await pushSync();
      await Auth.signOut(); Sync.state = 'idle'; Sync.last = ''; toast('Signed out. Your answers stay in this browser'); afterAuth(); break;
    case 'acct-delete':
      if (!confirm('Delete your profile? Your answers, saved roles and watchlist are removed from the server. A copy stays in this browser.')) break;
      try { clearTimeout(Sync.timer); Sync.timer = null; await Auth.wipe(); await Auth.signOut(); Sync.state = 'idle'; Sync.last = ''; toast('Profile deleted'); afterAuth(); }
      catch (e) { toast(`Could not delete: ${e.message}`); }
      break;
  }
}
