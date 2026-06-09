import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge } from "@/components/badges";
import { HighlightedSourceText } from "@/components/highlighted-source-text";
import { formatDate, formatDateTime } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset();
  return {
    title:
      dataset.documents.find((document) => document.id === id)?.title ??
      "Source document",
  };
}

export default async function SourceDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset();
  const document = dataset.documents.find((item) => item.id === id);
  if (!document) notFound();

  const source = dataset.sources.find((item) => item.id === document.sourceId);
  const signals = dataset.signals
    .filter((signal) => signal.sourceDocumentIds.includes(document.id))
    .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved));
  const latestRun = dataset.scrapeRuns.find((run) => run.sourceId === document.sourceId);
  const terms = signals.flatMap((signal) => signal.matchedTerms ?? [signal.signalType]);
  const entities = document.extractedEntities;
  const entityGroups = entities
    ? [
        ["Project names", entities.possibleProjectNames],
        ["Owners / public bodies", entities.possibleOwners],
        ["Vendors", entities.possibleVendors],
        ["Funding programs", entities.possibleFundingSources],
        ["Amounts", entities.possibleAmounts],
        ["Dates", entities.possibleDates],
        ["Resolution / contract IDs", entities.possibleResolutionOrContractNumbers],
        ["Project types", entities.possibleProjectTypes],
      ]
    : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/sources"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#45647f] hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to sources
        </Link>
        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-[#355b78]"
        >
          Original public URL <ExternalLink className="size-4" />
        </a>
      </div>

      <header className="mt-5 border-b pb-6">
        <p className="eyebrow">{source?.name ?? document.sourceId}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-[#17293a]">
          {document.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5e6974]">
          Extracted source text is shown as collected. Highlighted terms are deterministic
          phrases that triggered one or more review signals.
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <p className="eyebrow">Source</p>
          <p className="mt-2 text-sm font-semibold text-[#344452]">
            {source?.type ?? "Unknown type"}
          </p>
          <p className="mt-1 text-xs text-[#66717e]">
            {source?.jurisdiction ?? source?.body ?? "Unknown jurisdiction"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Collection</p>
          <p className="mt-2 text-sm font-semibold text-[#344452]">
            {document.dataOrigin ?? (document.fictional ? "Seed" : "Manual")}
          </p>
          <p className="mt-1 font-mono text-xs text-[#66717e]">
            Fetched{" "}
            {document.fetchedAt
              ? formatDateTime(document.fetchedAt)
              : formatDate(document.ingestedAt)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Response / extraction</p>
          <p className="mt-2 text-sm font-semibold text-[#344452]">
            {document.extractionStatus ?? document.scrapeStatus ?? "Success"}
          </p>
          <p className="mt-1 font-mono text-xs text-[#66717e]">
            HTTP {document.statusCode ?? "—"} · {document.contentType ?? "unknown"}
          </p>
        </div>
        <div className="panel p-4">
          <p className="eyebrow">Document record</p>
          <p className="mt-2 text-sm font-semibold text-[#344452]">
            Published {formatDate(document.publishedAt)}
          </p>
          <p className="mt-1 break-all font-mono text-[10px] text-[#74808c]">
            Hash: {document.contentHash ?? "Not available"}
          </p>
        </div>
      </section>

      {latestRun && (
        <section className="panel mt-5 p-4 text-sm text-[#53606d]">
          <p className="eyebrow">Latest scrape run for this source</p>
          <p className="mt-2">
            <strong className="text-[#344452]">{latestRun.status}</strong>
            {` · ${formatDateTime(latestRun.finishedAt)} · ${latestRun.documentsImported ?? latestRun.documentsFound} imported · ${latestRun.duplicateDocumentsSkipped ?? 0} duplicates · ${latestRun.signalsExtracted} signals`}
          </p>
          {latestRun.errorMessage && (
            <p className="mt-1 text-[#8e3630]">{latestRun.errorMessage}</p>
          )}
        </section>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <div>
          <div className="mb-3">
            <p className="eyebrow">Extracted text</p>
            <h2 className="mt-1 text-xl font-semibold text-[#20394e]">
              Highlighted source record
            </h2>
          </div>
          <div
            id="source-text"
            className="panel max-h-[900px] overflow-auto p-5 font-mono text-xs leading-6 text-[#334653]"
          >
            <HighlightedSourceText
              text={document.extractedText ?? document.text}
              terms={terms}
            />
          </div>
        </div>

        <aside className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Extracted entities</p>
            <dl className="mt-3 space-y-3 text-sm">
              {entityGroups.map(([label, values]) => (
                <div key={label as string}>
                  <dt className="font-semibold text-[#344452]">{label}</dt>
                  <dd className="mt-1 text-[#66717e]">
                    {(values as string[]).join(", ") || "None detected"}
                  </dd>
                </div>
              ))}
              {entityGroups.length === 0 && (
                <p className="text-[#66717e]">No entity summary is available.</p>
              )}
            </dl>
          </section>
        </aside>
      </section>

      <section className="mt-7">
        <p className="eyebrow">Signals from this document</p>
        <h2 className="mt-1 text-2xl font-semibold text-[#20394e]">
          {signals.length} extracted review item{signals.length === 1 ? "" : "s"}
        </h2>
        <div className="mt-4 space-y-4">
          {signals.map((signal) => {
            const project = signal.projectId
              ? dataset.projects.find((item) => item.id === signal.projectId)
              : undefined;
            return (
              <article id={signal.id} key={signal.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <SeverityBadge severity={signal.severity} />
                      <CategoryBadge category={signal.category} />
                      <ConfidenceBadge confidence={signal.confidence} />
                      <span className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold text-[#53606d]">
                        {signal.signalReviewStatus ??
                          (signal.projectId ? "Assigned" : "Needs Review")}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-[#20394e]">{signal.title}</h3>
                    <p className="mt-1 text-xs text-[#66717e]">
                      {project ? (
                        <Link
                          href={`/projects/${project.slug}`}
                          className="font-semibold text-[#355b78] hover:underline"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        "Unassigned"
                      )}
                    </p>
                  </div>
                  <a
                    href="#source-text"
                    className="text-xs font-semibold text-[#355b78] hover:underline"
                  >
                    View highlighted text
                  </a>
                </div>
                <blockquote className="evidence-quote mt-4">
                  {signal.evidenceExcerpt}
                </blockquote>
                <p className="mt-3 text-xs text-[#66717e]">
                  Matched terms: {signal.matchedTerms?.join(", ") || signal.signalType}
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="eyebrow">Scoring rationale</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#53606d]">
                      {signal.severityReason}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#53606d]">
                      {signal.confidenceReason}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#d7dfd6] bg-[#f5f8f4] p-3">
                    <p className="eyebrow">Civil-firm relevance</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#344f43]">
                      {signal.civilFirmRelevance}
                    </p>
                  </div>
                </div>
                {signal.dismissedReason && (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    Dismissed: {signal.dismissedReason}
                  </p>
                )}
              </article>
            );
          })}
          {signals.length === 0 && (
            <div className="panel p-5 text-sm text-[#66717e]">
              No deterministic signal terms were extracted from this document.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
