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

## Next connector improvements

1. Add OCR for scanned agendas and minutes.
2. Add source-specific adapters for JavaScript-rendered procurement listings.
3. Detect document publication dates from page-specific markup and filenames.
4. Add configurable retries and scheduled execution.
5. Add a reviewed-signal editing form and optional create-project workflow.
