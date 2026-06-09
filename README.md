# Civil Infrastructure Distress Watch

A working local prototype for monitoring public civil engineering and infrastructure
projects that may deserve review. The app turns source-backed observations into cautious
implications: what the evidence says, why it may matter, what consequence is possible,
what review action may be appropriate, and what alternative explanation should remain
in view.

The included Hudson Valley records are **fictional prototype data**. Project names,
source excerpts, organizations, vendors, URLs, budgets, and timelines are illustrative
and must not be used for real-world decisions.

## What is included

- Dashboard with project status counts, recent signals, top categories, and a review queue
- Searchable/filterable project watchlist
- Detailed project records with budget and schedule deltas, funding, vendors, events,
  source documents, evidence, interpretations, consequences, actions, and alternatives
- Searchable signal ledger
- Monitored source inventory with live connector health and imported document previews
- Configured HTML source connectors with scrape runs, content hashing, and graceful failures
- Manual ingest workflow with deterministic rule-based extraction and review-before-save
- Unassigned live-signal review and project assignment
- Deterministic weekly brief with Markdown export
- 18 fictional projects across Orange, Dutchess, Ulster, Sullivan, Putnam, Rockland, and
  Westchester counties
- 36 source-backed fictional signals and 36 linked source documents
- Unit tests for extraction and project status scoring

## Stack

- Next.js 16 App Router
- React 19 and strict TypeScript
- Tailwind CSS 4
- Cheerio HTML parsing
- File-backed local JSON persistence
- Vitest

No database server, authentication provider, paid service, or API key is required.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app starts from the bundled seed data. Saving an ingested document creates
`data/local-data.json`, which is intentionally ignored by Git.

## Run scraping

Run every active source:

```bash
npm run scrape
```

Run one source by its configured ID:

```bash
npm run scrape:source -- live-orange-county-legislature
```

In the app, open [http://localhost:3000/admin/ingest](http://localhost:3000/admin/ingest)
and use **Run scrape** beside a source or **Run all active sources**.

Each connector fetches only its configured URL. It does not crawl linked pages. The HTML
connector records the final URL, page title, HTTP status, fetch time, raw HTML, readable
text, and a SHA-256 content hash. A repeated hash records a successful scrape run but does
not create another document or another set of signals.

Successful and partial documents are passed to the existing deterministic extractor.
Signals are assigned automatically only when the full tracked project name appears in the
page. Otherwise they enter the unassigned review queue on the ingest page, where an
administrator can assign them to an existing project.

Failures and pages with insufficient or error-page text are recorded as `Failed` or
`Partial` scrape runs. They remain visible in the admin logs and Sources page without
interrupting other sources.

## Configured live sources

The source registry is in `src/config/monitored-sources.ts`.

| Source ID | Public page |
| --- | --- |
| `live-orange-county-legislature` | Orange County Legislature |
| `live-dutchess-county-legislature` | Dutchess County Legislature |
| `live-ulster-transportation-council` | Ulster County Transportation Council agendas |
| `live-town-newburgh-meetings` | Town of Newburgh meeting schedules |
| `live-poughkeepsie-planning-board` | Town of Poughkeepsie Planning Board |
| `live-nysdot-business` | NYSDOT contracting opportunities |
| `live-nys-comptroller-audits` | NYS Comptroller local government audits |

### Live test results

Tested June 8, 2026:

- All seven configured URLs returned usable HTML and imported one document each.
- The Town of Newburgh page produced one unassigned deterministic `litigation` signal.
- A second complete run imported zero documents, confirming content-hash deduplication.
- The initially indexed Dutchess URL returned a soft 404 with HTTP 200 and was replaced
  with the current department URL.
- The former Town of Poughkeepsie hostname failed TLS validation and redirected to the
  current `townofpoughkeepsie-ny.gov` hostname; the configured URL now uses the valid host.
- No configured source failed in the final test. Future HTTP, TLS, timeout, content-type,
  and low-text failures are stored in scrape logs rather than thrown through the app.

## Reset seed data

```bash
npm run seed
```

This removes the local writable dataset. The next request falls back to the bundled
fictional seed records in `src/data/seed.ts`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` only if you want to reserve a local key for future
development. The current app does not call OpenAI or any other external service.

```bash
OPENAI_API_KEY=
```

`src/lib/openai-placeholder.ts` marks the future integration boundary.

## Architecture

- `src/data/seed.ts` — typed fictional projects, signals, documents, sources, and events
- `src/config/monitored-sources.ts` — allowlisted live source URLs and connector metadata
- `src/lib/types.ts` — domain entities and shared enums
- `src/lib/repository.ts` — seed fallback, JSON migration, scrape runs, deduplication, and assignment
- `src/lib/extractor.ts` — deterministic phrase rules, implication copy, and status scoring
- `src/lib/scraper.ts` — bounded HTML fetch, readable-text parsing, and content hashing
- `src/lib/scrape-service.ts` — one-source/all-source orchestration and failure isolation
- `src/app/` — server-rendered App Router pages and local API route handlers
- `src/components/` — restrained UI primitives and client-side filtering/ingest workflows

Server Components read the dataset directly. Client Components are limited to filters
and the ingest workflow. The ingest API writes a complete local dataset atomically to a
single JSON file. This is deliberately simple and inspectable for a prototype.

## Signal model

Rules map public-record phrases such as `change order`, `time extension`, `reject all
bids`, `DEC approval`, `unsuitable soil`, `notice of claim`, and `resident concern` into:

- Category
- Severity and confidence
- Evidence excerpt
- Cautious interpretation
- Possible consequence
- Recommended review action
- Alternative explanation

Project status is derived using deterministic logic:

- **Watch** — one weak signal
- **Review** — one medium signal or multiple weak signals
- **Escalated** — a high-severity signal or repeated cost/schedule/scope pressure
- **Confirmed Issue** — explicit source language for an overrun, delay, claim,
  litigation, rebid, audit finding, or major rescope

The label “Confirmed Issue” confirms the cited issue, not overall project failure.

## Known limitations

- Seed records and URLs are fictional.
- Matching is phrase-based and does not resolve negation, document structure, or entities.
- File persistence is intended for one local user and is not concurrency-safe.
- Live project matching requires the full tracked project name; most live matches will be
  unassigned and require review.
- The connector supports HTML only. It does not parse linked PDFs, JavaScript-rendered
  content, feeds, APIs, or scanned documents.
- No authentication, scheduled collection, OCR, broad crawling, or notification delivery.
- Source layout changes, bot protection, TLS errors, redirects, and transient outages may
  produce partial or failed runs.
- Weekly prioritization uses severity and recency only.

## Recommended next steps

1. Replace JSON persistence with Postgres and migrations.
2. Add authenticated organizations, review assignments, and audit history.
3. Add PDF/OCR connectors, retry policy, and optional scheduled runs.
4. Add entity resolution for owners, vendors, funding programs, and project aliases.
5. Add a source-cited LLM interpretation layer behind human review and deterministic fallback.
6. Add notification preferences, saved filters, and weekly email delivery.
7. Validate scoring and wording with civil engineering, construction, and municipal finance users.
