# Sports Business Jobs Dashboard

Post-MBA sports business roles in London and Europe for London Business School students:
strategy, partnerships, media rights, commercial and deals roles at sports consultancies,
agencies, rights holders, clubs, media/data companies and investors.

## How it works

**Touchline** has two halves: a Python data engine and a static frontend.

`pipeline.py` (Python standard library only):

1. Loads the company shortlist from `companies.json`
2. Reads open jobs from each company's careers system (Greenhouse, Lever, Ashby, Workable,
   SmartRecruiters, Pinpoint, Teamtailor, Workday, BambooHR, UKG, Applied, Oleeo, or the
   company's own vacancies page)
3. Tags and filters by location (London > UK > Europe), seniority (post-MBA) and function
4. Marks jobs that are new since the last run, and records when each listing was first seen
5. Writes the JSON files and builds the dashboard, with LinkedIn search links for alumni and hiring teams

The frontend lives in `web/` and is inlined into one self-contained HTML file at build time,
so it works opened from disk, on GitHub Pages, or anywhere else, with no server or backend:

| File | Role |
| --- | --- |
| `web/index.html` | Page shell (top bar, panel, search) |
| `web/styles.css` | Light and dark themes and components |
| `web/js/01-utils.js` | Helpers and constants |
| `web/js/02-data.js` | Data loading, validation, de-duplication, relevance score |
| `web/js/03-store.js` | Answers, saved and hidden jobs, watchlist (browser `localStorage`) |
| `web/js/03b-account.js` | Optional profiles: email sign-in with a code, and syncing to Supabase |
| `web/js/04-filters.js` | The viewer's answers, matching and sorting |
| `web/js/05-components.js` | Job rows, toasts, copy and share |
| `web/js/06…09-*.js` | Views: questions + For you, All jobs, Companies, Saved + About the data |
| `web/js/10-drawer.js` | Job and company panels |
| `web/js/11-main.js` | Navigation, hash routing, keyboard shortcuts, ⌘K search, boot |

The JS files share one scope and are concatenated in filename order.

### Sections

- **For you**: first-time visitors answer four questions (kind of work, where, kind of organisation, level; plus
  the consulting segment if they pick consulting). Only roles that fit are shown; answers can be changed any time
- **All jobs**: every matched role, grouped by organisation type, function, location or company, with search and
  an option to include every UK & Europe listing
- **Companies**: all companies grouped by type (consulting firms by segment), with a panel per company that holds
  open roles and LinkedIn routes to people
- **Saved**: saved roles, watched companies and hidden roles
- **Profile** (top right, when set up): sign in with an emailed code to keep answers, saved roles and watched companies on any device
- **About the data** (footer link): freshness, rules, coverage table and limits

Shareable links: `#/jobs/job/<id>` and `#/companies/company/<slug>` open a panel directly.

## Run it locally

```bash
cd ~/sports-jobs-dashboard
python3 pipeline.py          # fetch everything and build
open dashboard.html
```

Working on the design only? `python3 pipeline.py --build` rebuilds the page from the last
`data/jobs.json` in a second, without fetching anything.

## Hosted version

Dashboard: https://orko-punter.github.io/sports-jobs-dashboard/
Mirror on Vercel: https://touchline-sports-careers.vercel.app

The same run also deploys `site/` to Vercel when the repository has the secrets `VERCEL_TOKEN`
(a token from vercel.com/account/tokens), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Without the token, that step is skipped.

The **Refresh jobs** GitHub Action runs the pipeline and publishes `site/` to GitHub Pages:

| File | What it is |
| --- | --- |
| `index.html` | The dashboard |
| `new_jobs.json` | Matching roles that are new since the previous run (for alerts) |
| `jobs.json` | Every UK/Europe job with tags (`match`, `posted_date`, `first_seen`), the company list and run `meta` |
| `seen_urls.json`, `first_seen.json` | State for "new" detection and first-seen dates, read back by the next run |

Trigger it from n8n (see below) or with **Actions → Refresh jobs → Run workflow** on GitHub.

### n8n

Import `n8n/refresh-jobs-workflow.json` into n8n (it contains the steps below), then attach a
Header Auth credential to the **Start GitHub refresh** node: name `Authorization`, value `Bearer <token>`.


1. **HTTP Request** node: `POST https://api.github.com/repos/orko-punter/sports-jobs-dashboard/actions/workflows/refresh.yml/dispatches`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`
   - JSON body: `{"ref": "main"}`
   - Token: a fine-grained personal access token for this repository with **Actions: Read and write**
2. **Wait** node: 4 minutes
3. **HTTP Request** node: `GET https://orko-punter.github.io/sports-jobs-dashboard/new_jobs.json`
4. Send the `jobs` list on by email, Slack, etc. (`count` is 0 when nothing is new)

## Sports consulting

"Consulting" is defined by what a firm does, not its name: any firm whose product is advice, valuation,
research or analytics bought by teams, leagues, rights holders, broadcasters or sports investors.
Each such firm in `companies.json` has an `advisory_type`, one of six segments (definitions under `advisory_types`):

| Segment | Examples |
| --- | --- |
| `strategy`: sports strategy & commercial advisory | Two Circles, CAA Portas, Deloitte SBG, ColganBauer, The Sports Consultancy |
| `media`: media, rights & valuation | O&O, Altman Solon, MTM, Ampere, Brand Finance, Enders |
| `analytics`: performance & recruitment analytics | Twenty First Group, Analytics FC, LCP Sports, Hudl/StatsBomb, Stats Perform |
| `research`: fan, sponsorship & market research | Nielsen Sports, YouGov Sport, Gemba, Futures |
| `deals`: sports M&A & investment advisory | Raine, Inner Circle Sports, Tifosy, Houlihan Lokey |
| `generalist`: generalist firms with sports/TMT practices | BCG, Bain, McKinsey, Oliver Wyman, Roland Berger, Kearney, L.E.K., OC&C |

Role rules: at these firms consulting titles count even without a function keyword (Associate, Engagement
Manager, Senior Consultant, Insight, Valuation). At generalist firms only sport/media/TMT practice roles and pure
generalist consultant roles count; roles in unrelated practices are dropped. On the site, picking
"Consulting & Advisory" in the questions adds a follow-up for the segment, and Companies lists consulting firms by segment.

## Profiles (email sign-in)

Viewers can sign in with their email: they get a one-time code, and their answers, saved roles, hidden roles and
watched companies are stored in a Supabase table so they load on any device. Without sign-in, everything stays in the browser.
Profiles are off until `auth.json` is filled in. To turn them on:

1. Create a free project at supabase.com
2. **SQL Editor**: run `supabase/schema.sql` (creates `profiles`, where each person can read and write only their own row)
3. **Authentication → Emails → Templates**: in both **Magic Link** and **Confirm signup**, put the code in the email,
   for example `<p>Your Touchline code is <b>{{ .Token }}</b></p>` (the default templates only send a link)
4. **Authentication → Emails → SMTP settings**: add your own email sender (e.g. Resend or Postmark). Supabase's built-in
   sender is for testing and only sends a few emails an hour
5. **Project Settings → API**: copy the project URL and the anon (publishable) key into `auth.json`. Both are public by
   design; the row-level security in the schema is what protects the data. `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   environment variables override the file

Then rebuild (`python3 pipeline.py --build`) or run the workflow. A **Sign in** button appears in the top bar.

## Adding a company

Add an entry to `companies.json`. Give it a `source` if its careers site uses one of the
supported systems; without one it appears on the dashboard as "check by hand".

For large employers where sport is only part of the business (Nike, Red Bull, Fever, Ankura), add `focus_keywords`:
a regex that a role's title or department must match. A Workday source can take a fourth field of search terms
separated by `;` (e.g. `nike.wd1.myworkdayjobs.com|nike|nke|strategy;sports marketing`) when the full feed is too big to read.

To show verified people on a company (instead of only search links), add a `contacts` list,
for example `"contacts": [{"name": "…", "role": "…", "url": "https://www.linkedin.com/in/…", "note": "LBS MBA 2021"}]`.
Only add people you have verified yourself.

## Data honesty

- Nothing is invented: every number on the page is computed from the latest run.
- Missing data is labelled as missing (for example "Not given in the feed"), not shown as zero. Companies with failed feeds say so.
- The page warns when data is more than 36 hours old.
- Saved jobs that disappear from a later refresh stay in Saved, marked "Not in latest refresh".
- People links are LinkedIn searches. LinkedIn is never scraped, and nobody is presented as an alumnus.
