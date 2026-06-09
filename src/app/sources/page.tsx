import { ExternalLink } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { formatDate, formatDateTime } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Sources" };
export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const dataset = await getDataset();
  const sources = dataset.sources.map((source) => {
    const documents = dataset.documents.filter(
      (document) => document.sourceId === source.id,
    );
    const documentIds = new Set(documents.map((document) => document.id));
    const signals = dataset.signals.filter((signal) =>
      signal.sourceDocumentIds.some((id) => documentIds.has(id)),
    );
    const runs = dataset.scrapeRuns.filter((run) => run.sourceId === source.id);
    return {
      ...source,
      documentCount: documents.length,
      signalCount: signals.length,
      latestRun: runs[0],
      lastSuccessful: runs.find((run) => run.status === "Success"),
    };
  });
  const liveDocuments = dataset.documents
    .filter((document) => !document.fictional && document.fetchedAt)
    .sort((a, b) => (b.fetchedAt ?? "").localeCompare(a.fetchedAt ?? ""));

  return (
    <>
      <PageHeading
        eyebrow="Monitoring ledger"
        title="Public sources"
        description="A transparent inventory of fictional prototype channels and configured live public pages. Connector health and imported HTML documents are shown without hiding failed attempts."
      />
      <div className="panel overflow-hidden">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Municipality / body</th>
                <th>Last checked</th>
                <th>Connector status</th>
                <th>Documents</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#29475f] hover:underline"
                    >
                      {source.name} <ExternalLink className="size-3.5" />
                    </a>
                    <p
                      className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${source.fictional ? "text-[#98743d]" : "text-[#336350]"}`}
                    >
                      {source.fictional ? "Fictional source" : "Live / locally added source"}
                    </p>
                  </td>
                  <td>
                    <span className="rounded-full border bg-[#f7f8f9] px-2.5 py-1 text-xs text-[#53606d]">
                      {source.type}
                    </span>
                  </td>
                  <td className="text-[#53606d]">{source.body}</td>
                  <td className="font-mono text-xs text-[#66717e]">
                    {source.lastChecked ? formatDate(source.lastChecked) : "Never"}
                  </td>
                  <td className="text-xs">
                    {source.connector ? (
                      <>
                        <span
                          className={
                            source.latestRun?.status === "Failed"
                              ? "font-semibold text-[#8e3630]"
                              : source.latestRun?.status === "Partial"
                                ? "font-semibold text-[#a45f13]"
                                : "font-semibold text-[#336350]"
                          }
                        >
                          {source.latestRun?.status ?? "Not run"}
                        </span>
                        <p className="mt-1 text-[#66717e]">
                          Last success:{" "}
                          {source.lastSuccessful
                            ? formatDateTime(source.lastSuccessful.finishedAt)
                            : "Never"}
                        </p>
                        {source.latestRun?.errorMessage && (
                          <p className="mt-1 max-w-xs text-[#8e3630]">
                            {source.latestRun.errorMessage}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-[#74808c]">Manual / seed</span>
                    )}
                  </td>
                  <td className="font-mono text-[#344452]">
                    {source.documentCount}
                  </td>
                  <td className="font-mono text-[#344452]">{source.signalCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b p-5">
          <p className="eyebrow">Imported records</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20394e]">
            Live scraped documents
          </h2>
        </div>
        {liveDocuments.length === 0 ? (
          <p className="p-5 text-sm text-[#66717e]">
            No live documents have been imported yet.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Source</th>
                  <th>Fetched</th>
                  <th>Status</th>
                  <th>Text</th>
                  <th>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {liveDocuments.map((document) => {
                  const source = dataset.sources.find(
                    (item) => item.id === document.sourceId,
                  );
                  const project = dataset.projects.find(
                    (item) => item.id === document.projectId,
                  );
                  return (
                    <tr key={document.id}>
                      <td>
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#29475f] hover:underline"
                        >
                          {document.title} <ExternalLink className="size-3.5" />
                        </a>
                        <p className="mt-1 max-w-xl line-clamp-2 text-xs leading-5 text-[#66717e]">
                          {document.text}
                        </p>
                      </td>
                      <td className="text-[#53606d]">
                        {source?.name ?? document.sourceId}
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-[#66717e]">
                        {formatDateTime(document.fetchedAt ?? document.ingestedAt)}
                      </td>
                      <td>
                        <span
                          className={
                            document.scrapeStatus === "Partial"
                              ? "font-semibold text-[#a45f13]"
                              : "font-semibold text-[#336350]"
                          }
                        >
                          {document.scrapeStatus ?? "Success"}
                        </span>
                        <p className="mt-1 font-mono text-xs text-[#74808c]">
                          HTTP {document.statusCode ?? "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-[#53606d]">
                        {document.text.length.toLocaleString()} chars
                      </td>
                      <td className="text-xs text-[#66717e]">
                        {project?.name ?? "Unassigned"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
