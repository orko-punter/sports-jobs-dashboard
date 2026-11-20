// ---------------------------------------------------------------- utils + constants
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ico = (n, cls = '') => `<span class="i i-${n} ${cls}" aria-hidden="true"></span>`;
const plural = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
function hashId(s) { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

const DAY = 864e5;
const isoPrefix = s => (/^\d{4}-\d{2}-\d{2}/.exec(s || '') || [null])[0];
const fmtDate = iso => iso ? new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
const fmtShort = iso => iso ? new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
const ageDays = iso => iso ? Math.floor((Date.now() - Date.parse(iso.slice(0, 10) + 'T00:00:00Z')) / DAY) : Infinity;
function relTime(date) {
  if (!date) return 'unknown';
  const m = Math.round((Date.now() - date) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h}h ago`;
  return `${Math.round(h / 24)} days ago`;
}
const initials = n => {
  const w = String(n).replace(/\(.*?\)/g, '').replace(/[·.&+\-]/g, ' ').split(/\s+/).filter(x => /\w/.test(x));
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '')[1] || '')).toUpperCase();
};
const countBy = (arr, fn) => {
  const m = new Map();
  for (const x of arr) for (const k of [].concat(fn(x))) m.set(k, (m.get(k) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0]));
};
const listJoin = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const CATS = [
  ['Consulting & Advisory', 'Consulting & Advisory'],
  ['Agencies & Rights Marketing', 'Agencies & Rights Marketing'],
  ['Leagues & Rights Holders', 'Leagues & Rights Holders'],
  ['Clubs & Teams', 'Clubs & Teams'],
  ['Media & Data', 'Media & Data'],
  ['Investors & Banks', 'Investors & Banks'],
  ['Brands & Apparel', 'Brands & Apparel'],
  ['Venues, Events & Ticketing', 'Venues, Events & Ticketing'],
  ['Sports Tech & Platforms', 'Sports Tech & Platforms'],
];
// Each organisation type gets a kit colour, used on job cards and group headers
const CAT_COLOR = {
  'Consulting & Advisory': '#e0531f', 'Agencies & Rights Marketing': '#2f6fde', 'Leagues & Rights Holders': '#0e8a4b',
  'Clubs & Teams': '#c4245c', 'Media & Data': '#7b52d6', 'Investors & Banks': '#b38209', 'Brands & Apparel': '#0f97a5',
  'Venues, Events & Ticketing': '#9a6a43', 'Sports Tech & Platforms': '#4b5bd6',
};
const CAT_SHORT = {
  'Consulting & Advisory': 'Consulting', 'Agencies & Rights Marketing': 'Agency', 'Leagues & Rights Holders': 'League / rights holder',
  'Clubs & Teams': 'Club', 'Media & Data': 'Media & data', 'Investors & Banks': 'Investor', 'Brands & Apparel': 'Brand',
  'Venues, Events & Ticketing': 'Venue & events', 'Sports Tech & Platforms': 'Sports tech',
};
const CAT_HINT = {
  'Consulting & Advisory': 'Strategy, valuation, analytics and deal advisers', 'Agencies & Rights Marketing': 'Sponsorship, rights sales and athlete agencies',
  'Leagues & Rights Holders': 'Leagues, federations and event owners', 'Clubs & Teams': 'Football clubs, franchises and teams',
  'Media & Data': 'Broadcasters, streamers and sports data', 'Investors & Banks': 'Funds, banks and sports investors',
  'Brands & Apparel': 'Kit makers and sponsor brands', 'Venues, Events & Ticketing': 'Stadiums, live events and ticketing',
  'Sports Tech & Platforms': 'Officiating, video and fan platforms',
};
// ...and a soft pastel of the same colour for card backgrounds
const CAT_TINT = {
  'Consulting & Advisory': '#ffdcc8', 'Agencies & Rights Marketing': '#d7e5ff', 'Leagues & Rights Holders': '#cdeecd',
  'Clubs & Teams': '#ffd3df', 'Media & Data': '#e4d9ff', 'Investors & Banks': '#ffeba8', 'Brands & Apparel': '#c8f0ec',
  'Venues, Events & Ticketing': '#efdcc9', 'Sports Tech & Platforms': '#dadeff',
};
const catTint = c => CAT_TINT[c] || '#e7e4dc';
const catColor = c => CAT_COLOR[c] || '#8a877d';
const catLabel = c => (CATS.find(x => x[0] === c) || [c, c])[1];
const ADV = ['strategy', 'media', 'analytics', 'research', 'deals', 'generalist'];
const advLabel = k => (D && D.advTypes[k] && D.advTypes[k][0]) || k;
const advDesc = k => (D && D.advTypes[k] && D.advTypes[k][1]) || '';
const LOCS = ['London', 'UK', 'Europe', 'Remote', 'Unknown'];
const LOC_LABEL = { London: 'London', UK: 'UK (outside London)', Europe: 'Europe', Remote: 'Remote', Unknown: 'Location not stated' };
const SENS = ['Post-MBA', 'Stretch', 'Unclear', 'Junior', 'Senior'];
const SEN_DEF = {
  'Post-MBA': 'Title reads as manager, associate, consultant, lead, senior, strategist, specialist or programme level: the usual post-MBA entry points.',
  'Stretch': 'Head of, director, principal or associate director. Reachable with strong pre-MBA experience.',
  'Unclear': 'The title carries no seniority signal. Read the listing to judge the level.',
  'Junior': 'Intern, graduate, assistant, coordinator, trainee and similar.',
  'Senior': 'Chief, VP, managing director, partner, general manager and similar.',
};
const CORE_FN = new Set(['Strategy & Consulting', 'Partnerships & Sponsorship', 'Media Rights & Content', 'Commercial & BD', 'Deals & Investment']);
const SRC = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workable: 'Workable', smartrecruiters: 'SmartRecruiters',
  pinpoint: 'Pinpoint', teamtailor: 'Teamtailor', recruitee: 'Recruitee', personio: 'Personio', workday: 'Workday',
  bamboohr: 'BambooHR', ukg: 'UKG Ready', atom: 'Oleeo (Atom feed)', html: 'Company careers page', manual: 'No feed (check by hand)',
};
