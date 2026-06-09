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
- Monitored source inventory covering all requested source types
- Manual ingest workflow with deterministic rule-based extraction and review-before-save
- Deterministic weekly brief with Markdown export
- 18 fictional projects across Orange, Dutchess, Ulster, Sullivan, Putnam, Rockland, and
  Westchester counties
- 36 source-backed fictional signals and 36 linked source documents
- Unit tests for extraction and project status scoring

## Stack

- Next.js 16 App Router
- React 19 and strict TypeScript
- Tailwind CSS 4
- File-backed local JSON persistence
- Vitest

No database server, authentication provider, scraper, paid service, or API key is
required.

## Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app starts from the bundled seed data. Saving an ingested document creates
`data/local-data.json`, which is intentionally ignored by Git.

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
- `src/lib/types.ts` — domain entities and shared enums
- `src/lib/repository.ts` — seed fallback and local JSON persistence
- `src/lib/extractor.ts` — deterministic phrase rules, implication copy, and status scoring
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
- Source-to-signal review is manual after extraction.
- No authentication, scheduled collection, OCR, live scraping, or notification delivery.
- Weekly prioritization uses severity and recency only.

## Recommended next steps

1. Replace JSON persistence with Postgres and migrations.
2. Add authenticated organizations, review assignments, and audit history.
3. Build source connectors with document hashing, deduplication, and retry handling.
4. Add entity resolution for owners, vendors, funding programs, and project aliases.
5. Add a source-cited LLM interpretation layer behind human review and deterministic fallback.
6. Add notification preferences, saved filters, and weekly email delivery.
7. Validate scoring and wording with civil engineering, construction, and municipal finance users.
