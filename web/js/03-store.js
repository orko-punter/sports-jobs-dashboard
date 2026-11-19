// ---------------------------------------------------------------- user preferences (this browser only)
const Store = (() => {
  const KEY = 'touchline:v1';
  const s = { saved: {}, hidden: {}, viewed: [], watch: [], steps: {}, filters: null, theme: null, savedTab: 'jobs' };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode: run without storage */ }
  return { s, save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } } };
})();
const S = Store.s;
const snap = j => ({ title: j.title, company: j.company, url: j.url, location: j.location, at: new Date().toISOString().slice(0, 10) });
const isSaved = id => !!S.saved[id];
const isHidden = id => !!S.hidden[id];
const isWatched = name => S.watch.includes(name);

function toggleSave(j) {
  if (S.saved[j.id]) { delete S.saved[j.id]; toast('Removed from saved'); }
  else { S.saved[j.id] = snap(j); toast('Saved', { label: 'View saved', fn: () => { S.savedTab = 'jobs'; location.hash = '#/saved'; } }); }
  Store.save(); afterChange();
}
function toggleHide(j) {
  if (S.hidden[j.id]) { delete S.hidden[j.id]; toast('Job restored'); }
  else { S.hidden[j.id] = snap(j); toast('Hidden from your lists', { label: 'Undo', fn: () => toggleHide(j) }); }
  Store.save(); afterChange();
}
function toggleWatch(name) {
  const i = S.watch.indexOf(name);
  if (i >= 0) { S.watch.splice(i, 1); toast(`Stopped watching ${name}`); }
  else { S.watch.push(name); toast(`Watching ${name}`); }
  Store.save(); afterChange();
}
function markViewed(id) {
  S.viewed = [id, ...S.viewed.filter(x => x !== id)].slice(0, 20);
  Store.save();
}
function jobSteps(j) {
  const fn = (j.fns[0] || 'the role').split(' & ')[0].toLowerCase();
  return ['Read the full listing on the company site', `Find 2–3 LBS alumni or connections at ${j.company}`,
    'Send a short outreach note', `Tailor your CV to ${fn}`, 'Submit the application'];
}
const stepsDone = id => (S.steps[id] || []).filter(Boolean).length;
