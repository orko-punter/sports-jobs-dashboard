# Sports Business Jobs Dashboard

Post-MBA sports business roles in London and Europe for London Business School students:
strategy, partnerships, media rights, commercial and deals roles at sports consultancies,
agencies, rights holders, clubs, media/data companies and investors.

## How it works

`pipeline.py` (Python standard library only):

1. Loads the company shortlist from `companies.json`
2. Reads open jobs from each company's careers system (Greenhouse, Lever, Ashby, Workable,
   SmartRecruiters, Pinpoint, Teamtailor, Workday, BambooHR, UKG, Applied, Oleeo, or the
   company's own vacancies page)
3. Tags and filters by location (London > UK > Europe), seniority (post-MBA) and function
4. Marks jobs that are new since the last run
5. Writes the dashboard plus JSON files, with LinkedIn search links for alumni and hiring teams

## Run it locally

```bash
python3 pipeline.py
open dashboard.html
```

## Hosted version

The **Refresh jobs** GitHub Action runs the pipeline and publishes `site/` to GitHub Pages:

| File | What it is |
| --- | --- |
| `index.html` | The dashboard |
| `new_jobs.json` | Matching roles that are new since the previous run (for alerts) |
| `jobs.json` | Every UK/Europe job with tags, plus the company list |

Trigger it from n8n (see below) or with **Actions → Refresh jobs → Run workflow** on GitHub.

### n8n

1. **HTTP Request** node: `POST https://api.github.com/repos/<owner>/<repo>/actions/workflows/refresh.yml/dispatches`
   - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`
   - JSON body: `{"ref": "main"}`
   - Token: a fine-grained personal access token for this repository with **Actions: Read and write**
2. **Wait** node: 3 minutes
3. **HTTP Request** node: `GET https://<owner>.github.io/<repo>/new_jobs.json`
4. Send the `jobs` list on by email, Slack, etc. (`count` is 0 when nothing is new)

## Adding a company

Add an entry to `companies.json`. Give it a `source` if its careers site uses one of the
supported systems; without one it appears on the dashboard as "check by hand".
