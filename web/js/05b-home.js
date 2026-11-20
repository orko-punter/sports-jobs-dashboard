// ---------------------------------------------------------------- view: Home (the front door)
// A spinning ring of hiring companies, count-up numbers, a sentence that sharpens as you scroll,
// and one pastel card per kind of organisation. Everything still works with motion turned off.
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOME = { paused: false };

const STORY = 'Every morning we read the careers pages of {cos} sports businesses, keep the roles that fit a post-MBA move, and drop the rest. No recruiters, no reposts, no guesswork: just {roles} live roles, each one link away from the company that posted it.';

function vHome() {
  const live = D.companies.filter(c => c.live).length;
  const ring = D.companies.filter(c => c.matches.length).sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name)).slice(0, 12);
  const cats = CATS.map(c => c[0]).map(c => {
    const js = D.matches.filter(j => j.category === c && !isHidden(j.id));
    return { c, n: js.length, cos: countBy(js, j => j.company).map(x => x[0]) };
  }).filter(x => x.n);
  const fresh = sortJobs(D.matches.filter(j => !isHidden(j.id)), 'newest').slice(0, 5);
  const words = STORY.replace('{cos}', D.companies.length).replace('{roles}', D.matches.length).split(' ');
  const stat = (n, label) => `<div class="hstat rv"><b class="num" data-n="${n}">${reduceMotion() ? n : 0}</b><span>${label}</span></div>`;

  return `<div class="home">
  <section class="hero">
    <h1 class="hero-h"><span class="ln">Find your <em>next move</em></span><span class="ln">in the <em>business</em> of sport</span></h1>
    <p class="hero-sub">Post-MBA roles in strategy, partnerships, media rights and deals, from ${D.companies.length} sports businesses across London and Europe.</p>
    <div class="hero-cta">
      <a class="pill light lg" href="#/start">${hasProfile() ? 'Change my answers' : 'Find my roles'} ${ico('arrow')}</a>
      <a class="pill line lg" href="${hasProfile() ? '#/for-you' : '#/jobs'}">${hasProfile() ? 'See my shortlist' : `Browse all ${D.matches.length}`}</a>
    </div>
    <div class="ring-stage${reduceMotion() ? ' flat' : ''}" id="ring-stage">
      <div class="ring" id="ring" style="--n:${ring.length}">${ring.map((c, i) => `
        <button class="ring-card" type="button" data-act="open-co" data-co="${esc(c.id)}" style="--i:${i};--tint:${catTint(c.category)};--ink-c:${catColor(c.category)}">
          <span class="rc-cat">${esc(CAT_SHORT[c.category] || c.category)}</span>
          <b>${esc(c.name)}</b>
          <span class="rc-n"><i class="num">${c.matches.length}</i> open ${c.matches.length === 1 ? 'role' : 'roles'}</span>
        </button>`).join('')}</div>
    </div>
    ${reduceMotion() ? '' : `<button class="ring-toggle" type="button" data-act="ring-pause" aria-pressed="false" aria-label="Pause the carousel">${ico('pause')}<span>Pause</span></button>`}
  </section>

  <section class="hstats">
    ${stat(D.matches.length, 'roles that pass the <em>post-MBA</em> rules')}
    ${stat(D.companies.length, 'sports businesses <em>tracked</em>')}
    ${stat(live, 'careers feeds read <em>every morning</em>')}
  </section>

  <section class="story"><p class="reveal" id="reveal">${words.map(w => `<span>${esc(w)}</span>`).join(' ')}</p></section>

  <section class="hsec">
    <h2 class="sec-h rv">Every corner of the <em>industry</em></h2>
    <div class="bento">${cats.map((x, i) => `
      <button class="bcard rv${i === 0 ? ' wide' : ''}${i && i === cats.length - 1 ? [' ', ' full', ' wide'][(cats.length + 1) % 3] : ''}" type="button" data-act="browse-cat" data-cat="${esc(x.c)}" style="--tint:${catTint(x.c)};--ink-c:${catColor(x.c)}">
        <span class="b-n num">${x.n}</span>
        <span class="b-t">${esc(catLabel(x.c))}</span>
        <span class="b-cos">${x.cos.slice(0, 3).map(esc).join(' · ')}${x.cos.length > 3 ? ` +${x.cos.length - 3}` : ''}</span>
        <span class="b-go">See roles ${ico('arrow', 'i-sm')}</span>
      </button>`).join('')}</div>
  </section>

  <section class="hsec">
    <div class="sec-row rv"><h2 class="sec-h">Fresh <em>this week</em></h2><a class="pill" href="#/jobs">All roles ${ico('arrow', 'i-sm')}</a></div>
    <div class="jobs">${fresh.map(jobRow).join('')}</div>
  </section>

  <section class="cta-band rv">
    <h2>Four questions.<br><em>Your shortlist.</em></h2>
    <p>Tell us the work, the city and the kind of organisation. We'll show only the roles that fit.</p>
    <a class="pill light lg" href="#/start">Start now ${ico('arrow')}</a>
  </section>
  </div>`;
}

function bindHome() {
  // ring radius follows the card width so the cards sit edge to edge on any screen
  const ring = $('#ring');
  if (ring) {
    const fit = () => {
      const n = +getComputedStyle(ring).getPropertyValue('--n') || 12, w = ring.offsetWidth;
      ring.style.setProperty('--r', `${Math.round((w + 22) / (2 * Math.tan(Math.PI / n)))}px`);
    };
    fit(); window.addEventListener('resize', fit);
    if (HOME.paused) setRingPaused(true);
  }
  // numbers count up, sections rise in, once each, as they come into view
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    const b = e.target.querySelector('b[data-n]'); if (b) countUp(b);
  }), { threshold: .2 });
  $$('.home .rv').forEach(el => io.observe(el));
  // the story sentence sharpens word by word as it scrolls through the screen
  const rv = $('#reveal');
  if (rv) {
    const ws = $$('span', rv);
    if (reduceMotion()) ws.forEach(w => w.classList.add('on'));
    else {
      let raf = 0;
      const paint = () => {
        raf = 0; if (!document.contains(rv)) return window.removeEventListener('scroll', onScroll);
        const r = rv.getBoundingClientRect(), vh = innerHeight;
        const p = Math.min(1, Math.max(0, (vh * .82 - r.top) / (r.height + vh * .25)));
        const k = Math.round(p * ws.length);
        ws.forEach((w, i) => w.classList.toggle('on', i < k));
      };
      const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
      window.addEventListener('scroll', onScroll, { passive: true }); paint();
    }
  }
}

function countUp(b) {
  const to = +b.dataset.n;
  if (reduceMotion() || !to) { b.textContent = to; return; }
  const t0 = performance.now(), dur = 1300;
  const step = t => { const p = Math.min(1, (t - t0) / dur); b.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function setRingPaused(on) {
  HOME.paused = on;
  const st = $('#ring-stage'), b = $('.ring-toggle');
  if (st) st.classList.toggle('paused', on);
  if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', `${on ? 'Play' : 'Pause'} the carousel`); b.innerHTML = `${ico(on ? 'play' : 'pause')}<span>${on ? 'Play' : 'Pause'}</span>`; }
}
