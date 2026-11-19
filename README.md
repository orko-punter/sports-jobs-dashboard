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
| `web/index.html` | Page shell (sidebar, top bar, panels, palette) |
| `web/styles.css` | Design tokens (light + dark) and components |
| `web/js/01-utils.js` | Helpers and constants |
| `web/js/02-data.js` | Data loading, validation, de-duplication, relevance score |
| `web/js/03-store.js` | Saved jobs, hidden jobs, watchlist, history, steps (browser `localStorage`) |
| `web/js/04-filters.js` | Filtering, faceted counts, sorting |
| `web/js/05-components.js` | Job rows/cards, company cards, toasts, copy/share |
| `web/js/06…09-*.js` | Views: Overview, Explore jobs, Companies + Networking, Saved + Methodology |
| `web/js/10-drawer.js` | Job and company side panels |
| `web/js/11-main.js` | Navigation, hash routing, keyboard shortcuts, ⌘K search, boot |

The JS files share one scope and are concatenated in filename order.

### Sections

- **Overview**: headline numbers, top matches, recently discovered roles, a computed intelligence brief, roles by function/location/type, companies to explore
- **Explore jobs**: search, faceted filters (location, seniority, function, organisation type, new, saved, hidden), sorting, and a detail panel per role with apply, copy, share, hide, networking links, an outreach note and a next-steps checklist
- **Companies**: all companies grouped by type, including those with no open roles, with a detail panel per company
- **Networking**: LinkedIn search routes per company (LBS alumni, recruiters, commercial, strategy, partnerships, hiring managers, your connections)
- **Saved**: saved jobs (with progress), watchlist, recently viewed and hidden jobs
- **Methodology**: freshness, feed errors, platforms, filtering rules, full coverage table, limitations

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

## Adding a company

Add an entry to `companies.json`. Give it a `source` if its careers site uses one of the
supported systems; without one it appears on the dashboard as "check by hand".

To show verified people on a company (instead of only search links), add a `contacts` list,
for example `"contacts": [{"name": "…", "role": "…", "url": "https://www.linkedin.com/in/…", "note": "LBS MBA 2021"}]`.
Only add people you have verified yourself.

## Data honesty

- Nothing is invented: every number on the page is computed from the latest run.
- Missing data is labelled as missing (for example "Not given in the feed"), not shown as zero. Companies with failed feeds say so.
- The page warns when data is more than 36 hours old.
- Saved jobs that disappear from a later refresh stay in Saved, marked "Not in latest refresh".
- People links are LinkedIn searches. LinkedIn is never scraped, and nobody is presented as an alumnus.
