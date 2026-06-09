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
- Configured HTML, index-page, and PDF connectors with scrape runs, content hashing, and graceful failures
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
- `pdf-parse` PDF text extraction
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

List configured source IDs and connector types:

```bash
npm run source:list
```

In the app, open [http://localhost:3000/admin/ingest](http://localhost:3000/admin/ingest)
and use **Run scrape** beside a source or **Run all active sources**.

Each connector fetches only its configured URL. An `IndexPage` connector may additionally
fetch at most two direct PDF/document links present on that page. It never follows HTML
pages recursively. Requests use a descriptive user agent, a 20-second timeout, a short
pause between linked documents, and a 20 MB PDF limit.

Documents record the final URL, title, HTTP status, content type, fetch time, document
type, extracted text, extraction status, and a SHA-256 hash of normalized text plus URL.
A repeated hash records a scrape run and duplicate count but does not create another
document or another set of signals.

Successful and partial documents are passed to the existing deterministic extractor.
Signals are assigned automatically only when the full tracked project name appears.
Weaker municipality, project-type, and name-word matches are marked **Needs Review** with
a suggested project but remain unassigned. Other matches enter the unassigned review
queue. An administrator can assign either kind to an existing project.

Failures and pages with insufficient or error-page text are recorded as `Failed` or
`Partial` scrape runs. They remain visible in the admin logs and Sources page without
interrupting other sources.

## Configured live sources

The source registry is in `src/config/monitored-sources.ts`.

| Source ID | Public page |
| --- | --- |
| `live-orange-county-public-works` | Orange County Department of Public Works |
| `live-orange-county-legislature` | Orange County Legislature |
| `live-dutchess-county-public-works` | Dutchess County Department of Public Works |
| `live-dutchess-capital-plan` | Dutchess County Capital Plan 2026-2030 PDF |
| `live-ulster-public-works-committee` | Ulster County Public Works and Capital Projects Committee |
| `live-ulster-active-bids` | Ulster County active commodity bids |
| `live-ulster-capital-plan` | Ulster County Capital Improvement Program 2026-2031 PDF |
| `live-nysdot-construction-results` | NYSDOT construction opportunities and results |
| `live-nys-comptroller-audits` | NYS Comptroller local government audits |
| `live-poughkeepsie-planning-board` | Town of Poughkeepsie Planning Board |

### Live test results

Tested June 9, 2026:

| Source | Result | Documents exposed | New rule matches in clean connector pass |
| --- | --- | ---: | ---: |
| Orange County Public Works | Success | HTML + 1 linked PDF | 0 |
| Orange County Legislature | Success | 1 HTML page | 0 |
| Dutchess County Public Works | Success | HTML + 2 linked PDFs | 2 |
| Dutchess County Capital Plan | Success | 1 direct PDF | 1 |
| Ulster Public Works Committee | Success | HTML + 2 linked PDFs | 1 |
| Ulster active commodity bids | Partial | JavaScript shell, no readable server text | 0 |
| Ulster Capital Improvement Program | Success | 1 direct PDF | 3 |
| NYSDOT construction results | Success | 1 HTML page | 0 |
| NYS Comptroller audits | Success | 1 HTML page | 0 |
| Poughkeepsie Planning Board | Success | HTML + 2 linked agenda PDFs | 2 |

The initial PDF test exposed a parser buffer-transfer issue; parsing metadata and text
sequentially fixed it. The final full run completed with nine successes, one partial, and
no failed sources. An immediate repeat run imported zero documents and zero signals,
recording every fetched document as a duplicate.

See `docs/live-sources.md` for connector details and current limitations.

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
- `src/lib/scraper.ts` — bounded HTML/PDF fetch, linked-document parsing, and content hashing
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
- Live project matching requires an exact full name for automatic assignment. Suggested
  fuzzy matches remain unassigned and require review.
- PDF extraction works for text-based PDFs only. Scanned/image-only PDFs need OCR.
- JavaScript-rendered listings may yield partial runs with little or no server HTML.
- Index connectors inspect only the configured page and at most two direct document links.
- Published dates depend on page/PDF metadata and otherwise fall back to fetch date.
- No authentication, scheduled collection, OCR, broad crawling, or notification delivery.
- Source layout changes, bot protection, TLS errors, redirects, and transient outages may
  produce partial or failed runs.
- Weekly prioritization uses severity and recency only.

## Recommended next steps

1. Replace JSON persistence with Postgres and migrations.
2. Add authenticated organizations, review assignments, and audit history.
3. Add OCR, JavaScript-rendered source adapters, retry policy, and optional scheduled runs.
4. Add entity resolution for owners, vendors, funding programs, and project aliases.
5. Add a source-cited LLM interpretation layer behind human review and deterministic fallback.
6. Add notification preferences, saved filters, and weekly email delivery.
7. Validate scoring and wording with civil engineering, construction, and municipal finance users.
