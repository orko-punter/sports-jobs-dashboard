#!/usr/bin/env python3
"""Sports business job pipeline for LBS students.

Steps
  1. Load the company shortlist (companies.json)
  2. Pull every open job from each company's careers system (public ATS feeds)
  3. Tag + filter jobs: location (London > Europe), seniority (post-MBA), function
  4. Attach "people to contact" search links per company / job
  5. Write data/jobs.json and build the dashboard (web/ sources inlined into one HTML file)

Usage:  python3 pipeline.py            # run everything
        python3 pipeline.py --check    # print a per-company source report only
        python3 pipeline.py --build    # rebuild the page from the last data (no fetching)
Standard library only - no installs needed.
"""
import html, json, os, re, shutil, ssl, sys, time, urllib.parse, urllib.request
import concurrent.futures as cf
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

def _ssl_ctx():
    for f in ("/etc/ssl/cert.pem", "/etc/ssl/certs/ca-certificates.crt"):
        if os.path.exists(f):
            return ssl.create_default_context(cafile=f)
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()
CTX = _ssl_ctx()

def fetch(url, data=None, accept="application/json"):
    req = urllib.request.Request(url, data=data, headers={
        "User-Agent": UA, "Accept": accept, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
        return r.read().decode("utf-8", "ignore")

def fetch_json(url, data=None):
    return json.loads(fetch(url, data))

def strip_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

# ---------------------------------------------------------------- step 2: connectors
# Each returns a list of dicts: title, location, url, posted (ISO date or ""), dept, remote(bool)

def src_greenhouse(slug):
    d = fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs")
    return [dict(title=j["title"], location=(j.get("location") or {}).get("name", ""),
                 url=j["absolute_url"], posted=(j.get("first_published") or j.get("updated_at") or "")[:10],
                 dept="") for j in d["jobs"]]

def src_lever(slug):
    d = fetch_json(f"https://api.lever.co/v0/postings/{slug}?mode=json")
    out = []
    for j in d:
        c = j.get("categories", {})
        locs = c.get("allLocations") or [c.get("location", "")]
        out.append(dict(title=j["text"], location=" / ".join(l for l in locs if l), url=j["hostedUrl"],
                        posted=datetime.fromtimestamp(j.get("createdAt", 0) / 1000, timezone.utc).date().isoformat(),
                        dept=c.get("team", "") or c.get("department", ""),
                        remote=j.get("workplaceType") == "remote"))
    return out

def src_ashby(slug):
    d = fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    out = []
    for j in d["jobs"]:
        locs = [j.get("location", "")] + [s.get("location", "") for s in j.get("secondaryLocations", [])]
        out.append(dict(title=j["title"], location=" / ".join(l for l in locs if l), url=j["jobUrl"],
                        posted=(j.get("publishedAt") or "")[:10], dept=j.get("department", ""),
                        remote=bool(j.get("isRemote"))))
    return out

def src_workable(slug):
    d = fetch_json(f"https://apply.workable.com/api/v1/widget/accounts/{slug}")
    out = []
    for j in d["jobs"]:
        locs = j.get("locations") or [{"city": j.get("city"), "country": j.get("country")}]
        loc = " / ".join(", ".join(x for x in (l.get("city"), l.get("country")) if x) for l in locs)
        out.append(dict(title=j["title"], location=loc, url=j["url"], posted=(j.get("published_on") or "")[:10],
                        dept=j.get("department", ""), remote=bool(j.get("telecommuting"))))
    return out

def src_smartrecruiters(slug):
    out, offset = [], 0
    while True:
        d = fetch_json(f"https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100&offset={offset}")
        for j in d["content"]:
            l = j.get("location", {})
            out.append(dict(title=j["name"], location=", ".join(x for x in (l.get("city"), l.get("country", "").upper()) if x),
                            url=f"https://jobs.smartrecruiters.com/{slug}/{j['id']}", posted=(j.get("releasedDate") or "")[:10],
                            dept=(j.get("department") or {}).get("label", ""), remote=bool(l.get("remote"))))
        offset += 100
        if offset >= d.get("totalFound", 0) or offset > 1000:
            return out

def src_pinpoint(slug):
    d = fetch_json(f"https://{slug}.pinpointhq.com/postings.json")
    out = []
    for j in d["data"]:
        l = j.get("location") or {}
        out.append(dict(title=j["title"], location=l.get("name") or l.get("city") or "", url=j["url"],
                        posted="", dept=((j.get("job") or {}).get("department") or {}).get("name", ""),
                        remote=j.get("workplace_type") == "remote"))
    return out

def src_teamtailor(slug):
    """slug is either 'company' (company.teamtailor.com) or a full careers host like 'careers.example.com'."""
    host = slug if "." in slug else f"{slug}.teamtailor.com"
    xml = fetch(f"https://{host}/jobs.rss", accept="application/rss+xml")
    root = ET.fromstring(xml)
    ns = {"tt": "https://teamtailor.com/locations"}
    out = []
    for it in root.iter("item"):
        locs = [", ".join(filter(None, [(l.findtext("tt:city", "", ns) or ""), (l.findtext("tt:country", "", ns) or "")]))
                for l in it.findall(".//tt:location", ns)]
        pub = it.findtext("pubDate") or ""
        try:
            pub = datetime.strptime(pub[:25].strip(), "%a, %d %b %Y %H:%M:%S").date().isoformat()
        except ValueError:
            pub = ""
        out.append(dict(title=it.findtext("title", ""), location=" / ".join(l for l in locs if l),
                        url=it.findtext("link", ""), posted=pub, dept=it.findtext("tt:department", "", ns) or ""))
    return out

def src_recruitee(slug):
    d = fetch_json(f"https://{slug}.recruitee.com/api/offers/")
    return [dict(title=j["title"], location=j.get("location", ""), url=j["careers_url"],
                 posted=(j.get("published_at") or "")[:10], dept=j.get("department") or "",
                 remote=bool(j.get("remote"))) for j in d["offers"]]

def src_personio(slug):
    xml = fetch(f"https://{slug}.jobs.personio.de/xml", accept="application/xml")
    root = ET.fromstring(xml)
    return [dict(title=p.findtext("name", ""), location=p.findtext("office", ""),
                 url=f"https://{slug}.jobs.personio.de/job/{p.findtext('id')}",
                 posted=(p.findtext("createdAt") or "")[:10], dept=p.findtext("department", "") or "")
            for p in root.iter("position")]

def src_workday(spec):
    """spec = 'host|tenant|site[|search]', e.g. 'wwecorp.wd5.myworkdayjobs.com|wwecorp|IMG'.
    `search` may hold several terms separated by ';' (for very large employers); results are merged."""
    host, tenant, site, *rest = spec.split("|")
    out, seen = [], set()
    for search in (rest[0].split(";") if rest else [""]):
        offset = 0
        while True:
            body = json.dumps({"appliedFacets": {}, "limit": 20, "offset": offset, "searchText": search.strip()}).encode()
            d = fetch_json(f"https://{host}/wday/cxs/{tenant}/{site}/jobs", body)
            for j in d.get("jobPostings", []):
                url = f"https://{host}/en-US/{site}{j.get('externalPath', '')}"
                if not j.get("title") or url in seen:
                    continue
                seen.add(url)
                out.append(dict(title=j["title"], location=j.get("locationsText", ""), url=url,
                                posted=j.get("postedOn", ""), dept=""))
            if offset == 0:
                total = d.get("total", 0)  # Workday only reports the total on the first page
            offset += 20
            if offset >= total or offset >= 400 or not d.get("jobPostings"):
                break
    return out


SOURCES = dict(greenhouse=src_greenhouse, lever=src_lever, ashby=src_ashby, workable=src_workable,
               smartrecruiters=src_smartrecruiters, pinpoint=src_pinpoint, teamtailor=src_teamtailor,
               recruitee=src_recruitee, personio=src_personio, workday=src_workday)

# Connectors below take the whole source dict from companies.json.

def src_bamboohr(src):
    slug = src["id"]
    d = fetch_json(f"https://{slug}.bamboohr.com/careers/list")
    out = []
    for j in d["result"]:
        l = j.get("location") or {}
        loc = ", ".join(x for x in (l.get("city"), l.get("state"), l.get("country")) if x)
        out.append(dict(title=j["jobOpeningName"], location=loc, url=f"https://{slug}.bamboohr.com/careers/{j['id']}",
                        posted="", dept=j.get("departmentLabel") or "", remote=bool(j.get("isRemote"))))
    return out

def src_ukg(src):
    """UKG Ready / workforceready.eu careers page. id = numeric company id."""
    cid = src["id"]
    host = src.get("host", "secure.workforceready.eu")
    d = fetch_json(f"https://{host}/ta/rest/ui/recruitment/companies/%7C{cid}/job-requisitions?offset=1&size=200&sort=desc&lang=en-GB")
    out = []
    for j in d.get("job_requisitions", []):
        l = j.get("location") or {}
        out.append(dict(title=j["job_title"], location=", ".join(x for x in (l.get("city"), l.get("country")) if x),
                        url=f"https://{host}/ta/{cid}.careers?ShowJob={j['id']}", posted="", dept=""))
    return out

def src_atom(src):
    """Atom/RSS job feed (e.g. Oleeo / tal.net). Location parsed from entry content with `location_re`."""
    xml = fetch(src["id"], accept="application/atom+xml")
    root = ET.fromstring(xml)
    A = "{http://www.w3.org/2005/Atom}"
    loc_re = re.compile(src.get("location_re", r"Location:\s*(.+?)(?:\s+Closing Date|\s+Salary|$)"))
    out = []
    for e in root.iter(f"{A}entry"):
        content = strip_html(ET.tostring(e.find(f"{A}content"), encoding="unicode", method="text") if e.find(f"{A}content") is not None else "")
        m = loc_re.search(content)
        link = e.find(f"{A}link")
        out.append(dict(title=e.findtext(f"{A}title", ""), location=(m.group(1).strip() if m else src.get("default_location", "")),
                        url=link.get("href") if link is not None else src["id"], posted=(e.findtext(f"{A}published") or "")[:10], dept=""))
    return out

def src_html(src):
    """Careers page with jobs in the HTML. `pattern` is a regex with named groups title, url, optional location/dept.
    `default_location` fills missing locations; `pages` lists extra URLs to read; `location_from_url` takes the
    location from a '-in-<place>-jid-' style URL slug."""
    out, seen = [], set()
    pages = [src["id"]] + src.get("pages", [])
    if src.get("page_param"):  # e.g. "page": read ?page=1,2,3... until a page adds nothing new
        sep = "&" if "?" in src["id"] else "?"
        pages = [f"{src['id']}{sep}{src['page_param']}={n}" for n in range(1, 21)]
    for page in pages:
        h = fetch(page, accept=src.get("accept", "text/html"))
        before = len(out)
        for m in re.finditer(src["pattern"], h, re.S):
            g = m.groupdict()
            url = urllib.parse.urljoin(page, html.unescape(g.get("url") or page))
            title = strip_html(g.get("title", ""))
            if not title or url in seen or title.lower() in ("read more", "view details", "apply", "find out more"):
                continue
            seen.add(url)
            loc = strip_html(g.get("location") or "")
            if not loc and src.get("location_from_url"):
                s = re.search(r"-in-(.+?)-jid-", url)
                loc = s.group(1).replace("-", " ").title() if s else ""
            out.append(dict(title=title, location=loc or src.get("default_location", ""), url=url, posted="",
                            dept=strip_html(g.get("dept") or "")))
        if src.get("page_param") and len(out) == before:
            break
    return out

FULL_SOURCES = dict(bamboohr=src_bamboohr, ukg=src_ukg, atom=src_atom, html=src_html)

# ---------------------------------------------------------------- step 3: tagging + filters
LONDON = re.compile(r"\blondon\b", re.I)
UK = re.compile(r"\b(united kingdom|uk|england|gb|great britain|manchester|liverpool|birmingham|leeds|edinburgh|glasgow|bristol|brackley|silverstone|grove|woking|banbury|northern ireland|belfast|bangor|wales|cardiff|scotland)\b", re.I)
EUROPE = re.compile(r"\b(europe|emea|paris|france|madrid|barcelona|spain|amsterdam|netherlands|zurich|zürich|geneva|lausanne|nyon|switzerland|milan|rome|italy|munich|berlin|hamburg|frankfurt|cologne|düsseldorf|germany|dublin|ireland|lisbon|portugal|monaco|stockholm|sweden|copenhagen|denmark|brussels|belgium|vienna|austria|warsaw|poland|oslo|norway|helsinki|finland|prague|luxembourg|budapest|athens|greece|tallinn|estonia|st\.? gallen|zug|bucharest|romania|ljubljana|slovenia)\b", re.I)
NON_EU = re.compile(r"\b(usa|united states|new york|nyc|los angeles|california|texas|florida|canada|toronto|australia|sydney|melbourne|india|singapore|hong kong|japan|tokyo|china|dubai|uae|saudi|riyadh|doha|qatar|brazil|mexico|south africa|philippines|thailand|bangkok|colombia|argentina|chicago|atlanta|boston|miami|seattle|denver|nashville|dallas|houston|montevideo|uruguay)\b", re.I)
REMOTE = re.compile(r"\bremote\b", re.I)

def location_tag(loc, remote):
    if LONDON.search(loc):
        return "London"
    if UK.search(loc):
        return "UK"
    if EUROPE.search(loc):
        return "Europe"
    if (remote or REMOTE.search(loc)) and not NON_EU.search(loc):
        return "Remote"
    if not loc.strip() or re.fullmatch(r"\s*\d+ locations\s*", loc, re.I):
        return "Unknown"
    return "Other"

TOO_JUNIOR = re.compile(r"\b(intern|internship|graduate|grad scheme|apprentice|apprenticeship|trainee|junior|jr\.?|placement|work experience|entry[- ]level|stagiaire|stage|praktikum|praktikant|werkstudent|summer|off-cycle|consulting analyst|assistant(?! manager)|coordinator|co-ordinator|administrator|admin|receptionist|executive assistant|volunteer|student|seasonal|casual|matchday)\b", re.I)
TOO_SENIOR = re.compile(r"\b(chief|ceo|cfo|coo|cmo|cto|vice president|vp|svp|evp|managing director|partner|executive director|general manager|president|global head)\b", re.I)
STRETCH = re.compile(r"\b(head of|director|principal)\b", re.I)
TARGET = re.compile(r"\b(manager|associate|consultant|lead|senior|strategist|specialist|product owner|programme|program)\b", re.I)

def seniority_tag(title):
    if TOO_JUNIOR.search(title):
        return "Junior"
    if re.search(r"\bassociate director\b", title, re.I):
        return "Stretch"
    if TOO_SENIOR.search(title):
        return "Senior"
    if STRETCH.search(title):
        return "Stretch"
    if TARGET.search(title):
        return "Post-MBA"
    return "Unclear"

FUNCTIONS = {
    "Strategy & Consulting": r"strateg|consult|transformation|corporate development|corp dev|business planning|insight|advisory|research|economist",
    "Partnerships & Sponsorship": r"partnership|sponsor|brand partner|commercial partner|activation|account (manager|director)|client (services|partner|lead)",
    "Media Rights & Content": r"media rights|rights|broadcast|distribution|licens|content (strategy|partnership|acquisition)|programming|media sales",
    "Commercial & BD": r"commercial|business development|\bbd\b|revenue|sales (manager|director|lead)|monetis|monetiz|growth|pricing|ticketing|hospitality sales",
    "Deals & Investment": r"investment|investor|m&a|mergers|acquisition|deal|private equity|capital|fund|valuation|corporate finance|ventures",
    "Marketing & Fan": r"marketing|brand|fan (engagement|experience)|crm|audience|digital|social|communications|campaign",
    "Product & Data": r"product manager|product owner|product lead|data (strategy|product|analyst)|analytics|performance analysis",
    "Operations & Events": r"operations|event|tournament|competition|venue|project manager|programme manager|program manager",
}
FUNC_RE = {k: re.compile(v, re.I) for k, v in FUNCTIONS.items()}
EXCLUDE_FUNC = re.compile(r"\b(engineer|engineering|developer|devops|software|sre|qa|tester|chef|cook|kitchen|nurse|physio|physiotherapist|doctor|medical|coach|coaching|scout|scouting|steward|security officer|warehouse|driver|mechanic|technician|machinist|fabricat|composite|aerodynam|electrician|plumber|cleaner|groundsman|grounds|kit|catering|bartender|barista|server|retail|store|cashier|customer service|call centre|payroll|bookkeeper|accounts payable|accounts receivable|tax|legal counsel|lawyer|solicitor|paralegal|it support|helpdesk|infrastructure|network|cyber|video editor|camera|producer|commentator|presenter|journalist|writer|editor|graphic designer|animator|freelance|data engineer|machine learning|ml |scientist|trader|trading|odds|quant|sportsbook|risk analyst|fraud|compliance analyst|hr|human resources|people systems|people partner|talent acquisition|recruit\w*|reward|copywriter|production|on-screen|host broadcast|customer success|solutions consultant|dynamics consultant|salesforce|workday|accountant|lawyer|painter|decorator|planner|support officer|designer|design manager|it manager|it|technology specialist|test programme|test program|finance project|creative project|art director)\b", re.I)

# At consulting / advisory firms (companies.json "advisory_type") the career track itself is advisory, so generic
# consulting titles count even without a function keyword ("Associate", "Engagement Manager", "Senior Consultant").
ADVISORY_ROLE = re.compile(r"\b(consult\w*|advis\w*|strateg\w*|insights?|analytics|valuation|research|economist|economics|engagement manager|"
                           r"case team|project leader|principal|associate|client (lead|partner|strategy|director|manager)|"
                           r"transaction\w*|deals?|m&a|corporate finance|investment|pricing)\b", re.I)
# Generalist firms: practice-specific roles outside sport / media / TMT are not a route into sports work
OTHER_SECTOR = re.compile(r"\b(industrial\w*|transport\w*|energy|utilities|infrastructure|health\s?care|life sciences?|pharma\w*|biotech|"
                          r"financial services|insurance|banking|securities|public sector|government|defen[cs]e|aerospace|automotive|"
                          r"chemicals?|construction|mining|real estate|oil|e-?discovery|cyber\w*|forensic\w*|compliance|regulat\w*|tax|"
                          r"actuarial|pensions?|restructuring|arbitration|competition|antitrust)\b", re.I)

# Practices at generalist firms that work on sports / media deals and rights
SPORTS_PRACTICE = re.compile(r"\b(sports?|media|entertainment|tmt|telecoms?|telecommunications|broadcast\w*|gaming|"
                             r"technology,? media|leisure)\b", re.I)
GENERIC_WORDS = re.compile(r"\b(senior|sr|experienced|advanced|management|consultants?|consultante?|confirm[ée]e?|project|manager|associates?|"
                           r"engagement|principal|strategy|strategic|all|levels?|business|areas?|genders?|m/f/d|m/w/d|f/h|h/f|"
                           r"deine|bewerbung|als|minimum|ans|d'exp[ée]rience|professionnelle|years?|experience|office|hybrid|"
                           r"arrangement|generalist|and|or|for|the|in|at|team|\d+)\b", re.I)

def generalist_entry(title, company):
    """True when a generalist firm's title names no practice at all, e.g. 'Senior Consultant (m/f/d) - Austria'."""
    t = re.sub(r"\([^)]*\)", " ", title)
    for word in re.split(r"[^\w.]+", company.split("(")[0]):
        if len(word) > 2:
            t = re.sub(re.escape(word), " ", t, flags=re.I)
    t = LONDON.sub(" ", UK.sub(" ", EUROPE.sub(" ", t)))
    t = GENERIC_WORDS.sub(" ", t)
    return len(re.sub(r"[^a-zA-Zà-ÿ]", "", t)) < 3

def function_tags(title, dept):
    tags = [k for k, r in FUNC_RE.items() if r.search(title)]
    return tags or [k for k, r in FUNC_RE.items() if r.search(dept or "")]

# ---------------------------------------------------------------- step 4: people links
def li_people(keywords):
    return "https://www.linkedin.com/search/results/people/?keywords=" + urllib.parse.quote(keywords)

def google(q):
    return "https://www.google.com/search?q=" + urllib.parse.quote(q)

def people_links(company):
    """LinkedIn / Google search links for getting into a company. Searches only: nothing is scraped,
    and nobody is presented as an alumnus or contact unless LinkedIn's own results show it."""
    n = company.get("linkedin_name") or company["name"]
    q = f'"{n}"'
    links = [
        dict(key="lbs", label="LBS alumni", url=li_people(f'{q} "London Business School"')),
        dict(key="recruiters", label="Recruiters / talent team", url=li_people(f"{q} talent acquisition OR recruiter")),
        dict(key="commercial", label="Commercial leadership", url=li_people(f'{q} "chief commercial" OR "commercial director" OR "head of commercial"')),
        dict(key="strategy", label="Strategy team", url=li_people(f"{q} strategy OR \"corporate development\"")),
        dict(key="partnerships", label="Partnerships team", url=li_people(f"{q} partnerships OR sponsorship")),
        dict(key="hiring", label="Hiring managers", url=li_people(f"{q} head OR director London")),
        dict(key="connections", label="Your 1st/2nd-degree connections", url=li_people(q) + "&network=%5B%22F%22%2C%22S%22%5D"),
        dict(key="employees", label="All employees", url=li_people(q)),
        dict(key="company", label="LinkedIn company page", url="https://www.linkedin.com/search/results/companies/?keywords=" + urllib.parse.quote(n)),
        dict(key="jobs", label="Jobs on LinkedIn", url="https://www.linkedin.com/jobs/search/?keywords=" + urllib.parse.quote(n) + "&location=" + urllib.parse.quote("United Kingdom")),
    ]
    if company.get("website"):
        links.append(dict(key="team_page", label="Team page on company site", url=google(f"site:{company['website']} team OR people OR leadership")))
    return links

def job_people_link(company, job):
    n = company.get("linkedin_name") or company["name"]
    f = (job["functions"] or ["strategy"])[0].split(" & ")[0]
    return li_people(f'"{n}" {f} manager OR director OR head')

def posted_date(posted, now):
    """ISO date from the feed's posted value, or None when the feed gives none or only a range ("30+ days")."""
    if not posted:
        return None
    m = re.match(r"(\d{4}-\d{2}-\d{2})", posted)
    if m:
        return m.group(1)
    p = posted.lower()
    if "today" in p:
        return now.date().isoformat()
    if "yesterday" in p:
        return (now - timedelta(days=1)).date().isoformat()
    m = re.search(r"(\d+) days? ago", p)
    if m and "+" not in p:
        return (now - timedelta(days=int(m.group(1)))).date().isoformat()
    return None

# ---------------------------------------------------------------- runner
def run_company(c):
    src = c.get("source")
    if not src:
        return c, [], "manual"
    try:
        fn = FULL_SOURCES.get(src["type"])
        jobs = fn(src) if fn else SOURCES[src["type"]](src["id"])
        return c, jobs, f"ok ({len(jobs)})"
    except Exception as e:
        return c, [], f"error: {type(e).__name__}: {str(e)[:80]}"

def rebuild_only():
    """--build: regenerate the dashboard from the last data/jobs.json without fetching (for UI work)."""
    data = json.load(open(os.path.join(ROOT, "data", "jobs.json")))
    page = build_page(data)
    open(os.path.join(ROOT, "dashboard.html"), "w").write(page)
    os.makedirs(os.path.join(ROOT, "site"), exist_ok=True)
    open(os.path.join(ROOT, "site", "index.html"), "w").write(page)
    print("Rebuilt dashboard.html and site/index.html from data/jobs.json")

def main():
    if "--build" in sys.argv:
        return rebuild_only()
    check = "--check" in sys.argv
    shortlist = json.load(open(os.path.join(ROOT, "companies.json")))
    companies, rule = shortlist["companies"], shortlist.get("rule", "")
    advisory_types = shortlist.get("advisory_types", {})
    print(f"Step 1  loaded {len(companies)} companies")
    with cf.ThreadPoolExecutor(16) as ex:
        results = list(ex.map(run_company, companies))

    all_jobs, comp_out = [], []
    for c, jobs, status in results:
        if check:
            print(f"  {c['name']:<32} {status:<14} " + " | ".join(f"{j['title'][:40]} @ {j['location'][:25]}" for j in jobs[:3]))
        kept = 0
        for j in jobs:
            j["title"] = strip_html(j["title"])
            loc = location_tag(j.get("location", ""), j.get("remote"))
            sen = seniority_tag(j["title"])
            funcs = function_tags(j["title"], j.get("dept", ""))
            adv = c.get("advisory_type")
            advisory_track = bool(adv) and bool(ADVISORY_ROLE.search(j["title"]))
            if advisory_track and "Strategy & Consulting" not in funcs:
                funcs = ["Strategy & Consulting"] + funcs
            excluded = bool(EXCLUDE_FUNC.search(j["title"]))
            if c.get("focus_keywords") and not re.search(c["focus_keywords"], j["title"] + " " + j.get("dept", ""), re.I):
                excluded = True  # firm where sport is a niche: only keep roles that mention it
            if adv == "generalist":
                text = j["title"] + " " + j.get("dept", "")
                in_practice = bool(SPORTS_PRACTICE.search(text)) or generalist_entry(j["title"], c["name"])
                if not advisory_track or OTHER_SECTOR.search(text) or not in_practice:
                    excluded = True  # generalist consultancy: sport / media / TMT practice roles, or pure generalist entry roles
            if loc in ("Other",):
                continue  # outside London/Europe: drop at source to keep the file small
            rec = dict(company=c["name"], category=c["category"], title=j["title"], location=j.get("location", "") or "-",
                       loc_tag=loc, seniority=sen, functions=funcs, relevant=bool(funcs) and not excluded,
                       url=j["url"], posted=j.get("posted", ""), dept=strip_html(j.get("dept", "")), advisory_type=adv)
            rec["people_url"] = job_people_link(c, rec)
            all_jobs.append(rec)
            kept += 1
        comp_out.append(dict(name=c["name"], category=c["category"], hq=c.get("hq", ""), website=c.get("website", ""),
                             careers_url=c.get("careers_url", ""), why=c.get("why", ""), status=status,
                             linkedin_name=c.get("linkedin_name") or c["name"], contacts=c.get("contacts", []),
                             advisory_type=c.get("advisory_type"),
                             source=(c.get("source") or {}).get("type", "manual"),
                             jobs_total=len(jobs), jobs_europe=kept, people=people_links(c)))
    if check:
        return
    print(f"Step 2  fetched {sum(r[1].__len__() for r in results)} jobs from {sum(1 for r in results if r[1])} live sources")
    match = [j for j in all_jobs if j["relevant"] and j["seniority"] in ("Post-MBA", "Stretch") and j["loc_tag"] in ("London", "UK", "Europe", "Remote")]
    print(f"Step 3  {len(all_jobs)} jobs in UK/Europe, {len(match)} match post-MBA + function rules")

    # "New since last run": compare against every job URL seen before (kept across runs, so a feed that
    # fails one day doesn't make all its jobs look new the next). Previous state comes from the published
    # site when PREV_SITE_URL is set (GitHub Actions), otherwise from the local data/ folder.
    match_ids = {id(j) for j in match}
    seen, first_run, first_seen = load_seen()
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    for j in all_jobs:
        j["new"] = not first_run and j["url"] not in seen
        j["match"] = id(j) in match_ids
        j["posted_date"] = posted_date(j["posted"], now)
        if j["url"] not in first_seen and (first_run or j["url"] not in seen):
            first_seen[j["url"]] = today  # first time the tracker saw this listing
        j["first_seen"] = first_seen.get(j["url"])  # None = seen before first-seen dates were recorded
    new_matches = [j for j in match if j["new"]]
    seen = sorted(seen | {j["url"] for j in all_jobs})

    order = {"London": 0, "UK": 1, "Remote": 2, "Europe": 3, "Unknown": 4}
    all_jobs.sort(key=lambda j: (not j["new"], order.get(j["loc_tag"], 9), j["posted"] == "", "".join(chr(255 - ord(ch)) for ch in j["posted"])))
    generated = now.strftime("%Y-%m-%d %H:%M UTC")
    live = [c for c in comp_out if c["status"].startswith("ok")]
    meta = dict(generated_iso=now.isoformat(timespec="seconds"), companies=len(comp_out), live_sources=len(live),
                manual=sum(1 for c in comp_out if c["status"] == "manual"),
                errors=[dict(name=c["name"], status=c["status"]) for c in comp_out if c["status"].startswith("error")],
                fetched=sum(c["jobs_total"] for c in comp_out), uk_europe=len(all_jobs), matches=len(match),
                new_matches=len(new_matches), first_run=first_run, rule=rule, functions=list(FUNCTIONS),
                advisory_types=advisory_types)
    data = dict(generated=generated, meta=meta, companies=comp_out, jobs=all_jobs)
    new_data = dict(generated=generated, count=len(new_matches), first_run=first_run,
                    jobs=[{k: j[k] for k in ("company", "title", "location", "loc_tag", "seniority", "functions", "url", "people_url")}
                          for j in new_matches])
    page = build_page(data)

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    json.dump(data, open(os.path.join(ROOT, "data", "jobs.json"), "w"), indent=1)
    json.dump(new_data, open(os.path.join(ROOT, "data", "new_jobs.json"), "w"), indent=1)
    json.dump(seen, open(os.path.join(ROOT, "data", "seen_urls.json"), "w"))
    json.dump({u: d for u, d in first_seen.items() if u in set(seen)}, open(os.path.join(ROOT, "data", "first_seen.json"), "w"))
    open(os.path.join(ROOT, "dashboard.html"), "w").write(page)

    # site/ is what GitHub Pages serves: the dashboard plus JSON files n8n can read.
    site = os.path.join(ROOT, "site")
    os.makedirs(site, exist_ok=True)
    open(os.path.join(site, "index.html"), "w").write(page)
    for f in ("jobs.json", "new_jobs.json", "seen_urls.json", "first_seen.json"):
        shutil.copy(os.path.join(ROOT, "data", f), os.path.join(site, f))
    print(f"Step 4  {len(new_matches)} new matches since last run" + (" (first run: nothing marked new)" if first_run else ""))
    print("Step 5  wrote dashboard.html, data/*.json and site/ (people links included)")

def load_seen():
    """Previous run's state: (seen URLs, first_run, {url: first-seen date}).
    Read from the published site when PREV_SITE_URL is set (GitHub Actions), else from local data/."""
    url = os.environ.get("PREV_SITE_URL", "").rstrip("/")
    def read(name):
        if url:
            return fetch_json(f"{url}/{name}")
        return json.load(open(os.path.join(ROOT, "data", name)))
    try:
        seen, first_run = set(read("seen_urls.json")), False
    except Exception:
        return set(), True, {}
    try:
        first_seen = dict(read("first_seen.json"))
    except Exception:
        first_seen = {}  # older runs did not record dates
    return seen, first_run, first_seen

def build_page(data):
    """Inline web/styles.css, web/js/*.js and the data into web/index.html -> one self-contained page
    that works from disk (file://), on GitHub Pages, or anywhere else."""
    web = os.path.join(ROOT, "web")
    page = open(os.path.join(web, "index.html")).read()
    css = open(os.path.join(web, "styles.css")).read()
    # web/js/*.js are modules sharing one scope (utils, data, store, filters, ui, views, main), in file order
    jsdir = os.path.join(web, "js")
    js = "(()=>{'use strict';\n" + "\n".join(open(os.path.join(jsdir, f)).read() for f in sorted(os.listdir(jsdir)) if f.endswith(".js")) + "\n})();"
    blob = json.dumps(data, separators=(",", ":")).replace("</", "<\\/")
    return (page.replace("/*__STYLES__*/", css)
                .replace("/*__APP__*/", js.replace("</script", "<\\/script"))
                .replace("/*__DATA__*/null", blob))

if __name__ == "__main__":
    main()
