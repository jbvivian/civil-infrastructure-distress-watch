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
- Searchable signal ledger with origin, review, source, jurisdiction, and relevance filters
- Monitored source inventory with live connector health and imported document previews
- Configured HTML, index-page, and PDF connectors with scrape runs, content hashing, and graceful failures
- Manual ingest workflow with deterministic rule-based extraction and review-before-save
- Unassigned live-signal review, conservative project suggestions, promotion, dismissal, and assignment
- Source-document detail pages with entity summaries and highlighted trigger terms
- Periodical brief with a reporting window, new/still-open/undated sections, and Markdown export
- 18 fictional projects across Orange, Dutchess, Ulster, Sullivan, Putnam, Rockland, and
  Westchester counties
- 36 source-backed fictional signals and 36 linked source documents
- Sentence-level context evaluation that suppresses negated, tabular, definitional, and
  off-domain matches with a stated reason for each
- Event dating separate from crawl dating, with unresolved dates labelled
- Signal-level identity so re-crawls update rather than duplicate
- Unit tests for extraction, context suppression, event dating, signal identity, brief
  editions, and project status scoring
- `scripts/measure-extraction.ts` for measuring extractor changes against the local corpus

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

On an existing checkout with dependencies installed, `npm run dev` is sufficient to
restart the app. On a fresh checkout, use `npm ci` first. No API key or database server
is needed. Keep the terminal running while using the app.

Start at `/admin/ingest` to refresh sources and `/signals` with **Live-source only**
enabled to inspect real imported material. The dashboard and project watchlist still
include fictional demonstration projects. Preserve `data/local-data.json` to retain
imported documents and review decisions; `npm run seed` removes that local dataset.

The app starts from the bundled seed data. Saving an ingested document creates
`data/local-data.json`, which is intentionally ignored by Git.

Older local datasets are normalized when read. Missing review flags default from the
existing assignment, missing scoring and civil-firm relevance are generated
deterministically, and missing document entities and project status explanations are
backfilled. The normalized data is persisted on the next write; no migration command is
required.

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

## Signal review workflow

The Signals page and Admin review queue support four persistent states:

- **Needs Review** — extracted but not assigned
- **Assigned** — linked to a tracked project
- **Promoted** — manually placed at the front of the weekly brief
- **Dismissed** — hidden from default views and excluded from the brief, with a required reason

Use **Live-source only** or **Data origin: Scraped** to remove fictional seed records
from the working view. The Admin queue shows suggested-project reasoning and extracted
entities, supports one-click assignment, and lets a reviewer edit the civil-firm
relevance and opportunity type.

Open a document from a signal or from the Sources page at
`/sources/documents/[id]`. The page shows collection metadata, entity candidates, all
signals including dismissed items, and source text with matched rule terms highlighted.

See `docs/review-workflow.md` for the operating guide.

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
| `live-sullivan-county-bids` | Sullivan County current bid notices |
| `live-sullivan-county-proposals` | Sullivan County requests for proposals |

### Live test results

Retested October 28, 2026: eight of the twelve configured sources succeeded, three
returned HTTP 403 (Orange Public Works, Orange Legislature, and Ulster Public Works
Committee), and Ulster active bids remained partial with only 20 readable characters.
The two newly added Sullivan sources both imported successfully. The refresh imported
nine documents and one new signal. An Admin rerun of Sullivan bids skipped its existing
document as a duplicate. See `docs/live-sources.md` for the current source-by-source
results and instructions for adding another source.

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
- `src/lib/entities.ts` — conservative entity-candidate extraction
- `src/lib/signal-quality.ts` — scoring and commercial-relevance explanations
- `src/lib/review-workflow.ts` — filters, promotion, dismissal, and weekly prioritization
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

### Context evaluation

A term appearing somewhere in a document is not evidence. Matching is done at
sentence level and every occurrence is evaluated in context. An occurrence is
suppressed, with a stated reason, when it is:

- negated (`no change order will be required`, `to reduce the number of water main
  breaks`)
- inside a table of contents, budget table row, index line, or filename listing
- definitional or policy boilerplate (`a watershed generally includes ... wetlands`)
- in a plan, policy, or manual without any amount, identifier, or date that would make
  it a specific event
- an ambiguous term used outside the domain (`litigation` about an election law)
- a short fragment with no verb and no amount, identifier, or date

Specific evidence overrides formatting: a title-case agenda line is kept when it carries
both an action verb and a dollar amount or resolution number, because `Resolution No.
317 - Approving The Execution Of A Contract Amendment For $25,000.00` records an act
even though it looks like a heading.

Where a term appears several times, the strongest occurrence is reported rather than the
first one in the document. Confidence is scored from that context, so it describes the
evidence rather than restating that a string matched.

Run `npx tsx scripts/measure-extraction.ts --verbose` to replay the extractor across the
local corpus before and after any rule change. Rule changes without a measurement are
guesses.

### Event dating

Signals carry `eventDate` (when the event appears to have happened) alongside
`dateObserved` (when this system recorded it). The date is resolved from the evidence
sentence, then the document title, then document metadata. Where none resolves, the
fetch date is used and labelled `Fetch date (unresolved)` so it can be filtered rather
than mistaken for a real date.

### Signal identity

Each signal carries a `fingerprint` derived from its source, matched term, and
normalized evidence sentence, with `firstSeenAt`, `lastSeenAt`, and `timesSeen`.
Re-crawling a page that changed by one byte updates the existing signals instead of
appending duplicates, and a reviewer's assignment, promotion, or dismissal survives the
re-crawl.

### Project status

Project status is derived using deterministic logic:

- **Watch** — one weak signal
- **Review** — one medium signal or multiple weak signals
- **Escalated** — a high-severity signal or repeated cost/schedule/scope pressure
- **Documented Event** — explicit source language for an overrun, delay, claim,
  litigation, rebid, audit finding, or major rescope

“Documented Event” states that a source records the cited event. It is not a finding
that the project, the owner, or any vendor has done anything wrong, and it must not be
presented as one.

## Known limitations

- Seed records and URLs are fictional.
- Matching and entity extraction are regex/rule based. Negation, list and table
  formatting, definitional language, and off-domain use of ambiguous terms are handled;
  entity identity, document section structure, and ambiguous organization names are not.
- Context suppression trades recall for precision. On the June 2026 corpus it removed
  roughly two thirds of extractions, nearly all of which were table rows, glossary
  entries, and policy descriptions. Some genuine cues will be suppressed with them.
  `scripts/measure-extraction.ts` exists so this trade is measured rather than assumed.
- The corpus is thin: ten sources, and an index connector reads at most two linked
  documents per run. Precision improvements do not compensate for that.
- `robots.txt` is not checked and there is no per-host rate limiting. At least one
  configured source disallows automated fetching of the configured path. This must be
  resolved before the collector is pointed at real sources on any recurring basis.
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
- Highlighting marks exact trigger terms; normalized or truncated excerpts may still be
  shown separately instead of highlighted as a complete passage.
- Review attribution uses the prototype value `Local reviewer`; there is no authentication
  or multi-user audit log.

## What to test first

1. Run `npm run scrape:source -- live-dutchess-county-public-works`.
2. Open `/admin/ingest`, inspect a live signal, edit its commercial relevance, and
   assign a suggested project only if the evidence supports it.
3. Promote one signal and dismiss another with a reason.
4. On `/signals`, enable **Live-source only**, then filter to **Promoted** and
   **Dismissed**.
5. Open the source document and confirm matched terms are highlighted.
6. Open `/weekly-brief` and export Markdown; promoted items should lead and dismissed
   items should be absent.

## Recommended next steps

1. Replace JSON persistence with Postgres and migrations.
2. Add authenticated organizations, review assignments, and audit history.
3. Add OCR, JavaScript-rendered source adapters, retry policy, and optional scheduled runs.
4. Add entity resolution for owners, vendors, funding programs, counties, and project aliases.
5. Add a source-cited LLM interpretation layer behind human review and deterministic fallback.
6. Add notification preferences, saved filters, and weekly email delivery.
7. Validate scoring and wording with civil engineering, construction, and municipal finance users.
