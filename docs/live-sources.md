# Live source connectors

The connector registry is `src/config/monitored-sources.ts`. Only URLs in that registry
can be fetched.

## Connector types

- `HTML` fetches one configured HTML page and extracts its readable text.
- `PDF` fetches one configured direct PDF and extracts text with `pdf-parse`.
- `IndexPage` imports the configured HTML page and follows at most two direct
  PDF/document links visible on that page.
- `Manual` and `Mock` identify existing non-scraped records.

Index-page link following is not recursive. The connector does not follow arbitrary HTML
links, submit forms, authenticate, solve CAPTCHAs, or bypass access controls.

## Request limits

- Descriptive `CivilInfrastructureDistressWatch/0.2` user agent
- 20-second timeout per request
- 250 ms delay between linked documents
- 2 MB retained HTML limit
- 20 MB PDF limit
- Sequential source execution

## Persistence

Each run records:

- Source, start/end time, URL, HTTP status, and overall status
- Documents found and imported
- Duplicate documents skipped
- Signals extracted
- Error message and connector log lines

Each document records its origin, content type, document type, extraction status,
readable text, optional raw HTML, and a hash of normalized extracted text plus final URL.
The hash prevents repeated documents and their signals from being imported again.

## June 9, 2026 verification

Nine configured sources completed successfully. Ulster County Active Commodity Bids was
partial because its server response contained a JavaScript-rendered shell with no
readable listing text. This is retained as a partial document/run rather than treated as
an application error.

Direct PDF extraction succeeded for the Dutchess and Ulster capital plans. Linked PDF
extraction succeeded from Orange Public Works, Dutchess Public Works, the Ulster Public
Works committee, and the Poughkeepsie Planning Board.

The deterministic extractor created cautious review signals from several imported PDFs.
No signal was automatically assigned unless the complete existing project name appeared
in the source. Lower-confidence candidates were marked `Needs Review`.

A repeat run imported no new documents or signals and reported all previously imported
documents as duplicates.

## October 28, 2026 verification

The current local checkout passed lint, all 58 unit tests, and a production build.
The browser verified the dashboard, the live-only Signals filter, source document
inspection, and an Admin-triggered scrape with duplicate detection.

| Source | Result | Notes |
| --- | --- | --- |
| Orange County Public Works | Failed | HTTP 403 Forbidden |
| Orange County Legislature | Failed | HTTP 403 Forbidden |
| Dutchess County Public Works | Success | HTML and two linked PDFs; one new document |
| Dutchess County Capital Plan | Success | Existing PDF skipped as a duplicate |
| Ulster Public Works Committee | Failed | HTTP 403 Forbidden |
| Ulster active commodity bids | Partial | Only 20 readable characters in server HTML |
| Ulster Capital Plan | Success | Existing PDF skipped as a duplicate |
| NYSDOT construction results | Success | One new HTML document |
| NYS Comptroller audits | Success | One new HTML document |
| Poughkeepsie Planning Board | Success | HTML and two linked PDFs; one new review signal |
| Sullivan County current bids | Success | New HTML source; one document, no rule matches |
| Sullivan County proposals | Success | New HTML source; one document, no rule matches |

Across this refresh, nine documents and one signal were imported. A second Sullivan
bid scrape from the Admin page imported nothing and reported one duplicate skipped.
Sources returning 403 were retained with their errors visible; no access protection
was bypassed. A successful scrape means readable text was collected, not that any
project distress was confirmed. Old imported false positives are not automatically
re-extracted by a source refresh; review and dismiss them in the Signals ledger.

## Add a source

Edit `src/config/monitored-sources.ts` and add an entry with a unique, stable ID:

```ts
{
  id: "live-example-county-bids",
  name: "Example County current bids",
  body: "Example County Purchasing",
  jurisdiction: "Example County",
  municipality: "Example County",
  county: "Example",
  type: "Procurement notice",
  url: "https://example.gov/current-bids",
  active: true,
  scrapeEnabled: true,
  connector: "html",
  connectorType: "HTML",
},
```

Use `html` / `HTML` for a readable page, `pdf` / `PDF` for a direct PDF, or
`index` / `IndexPage` plus `maxLinkedDocuments: 2` for a page with direct document
links. Avoid portal landing pages that only link to a login or registration service.
Prefer specific meeting or notice pages over general department homepages.

Then run:

```bash
npm run source:list
npm run scrape:source -- live-example-county-bids
```

The source automatically appears on `/admin/ingest` and `/sources`; no database
migration is needed. Inspect the imported text and any signals, then repeat the scrape
to confirm deduplication. New source registration currently requires editing this file;
the Admin page runs configured sources but does not provide an Add Source form.

## Next connector improvements

1. Add OCR for scanned agendas and minutes.
2. Add source-specific adapters for JavaScript-rendered procurement listings.
3. Detect document publication dates from page-specific markup and filenames.
4. Add configurable retries and scheduled execution.
5. Add a reviewed-signal editing form and optional create-project workflow.
