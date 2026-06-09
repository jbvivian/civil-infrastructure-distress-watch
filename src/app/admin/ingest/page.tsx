import { IngestWorkflow } from "@/components/ingest-workflow";
import { PageHeading } from "@/components/page-heading";
import { ScrapeControls } from "@/components/scrape-controls";
import { UnassignedSignalReview } from "@/components/unassigned-signal-review";
import { formatDateTime } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Ingest" };
export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const dataset = await getDataset();
  const liveSources = dataset.sources
    .filter((source) => source.connector === "html")
    .map((source) => {
      const runs = dataset.scrapeRuns.filter((run) => run.sourceId === source.id);
      const latest = runs[0];
      const lastSuccessful = runs.find((run) => run.status === "Success");
      return {
        id: source.id,
        name: source.name,
        url: source.url,
        active: source.active ?? false,
        lastSuccessfulAt: lastSuccessful
          ? formatDateTime(lastSuccessful.finishedAt)
          : undefined,
        latestStatus: latest?.status,
        latestError: latest?.errorMessage,
      };
    });
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const unassignedSignals = dataset.signals
    .filter((signal) => !signal.projectId)
    .map((signal) => ({
      id: signal.id,
      title: signal.title,
      category: signal.category,
      severity: signal.severity,
      evidenceExcerpt: signal.evidenceExcerpt,
      sourceTitle:
        documentMap.get(signal.sourceDocumentIds[0])?.title ?? "Live source document",
    }));

  return (
    <>
      <PageHeading
        eyebrow="Local administration"
        title="Ingest and monitor public sources"
        description="Run configured HTML connectors, review their extraction matches, or paste a document manually. Every scrape attempt is recorded and source failures remain isolated."
      />
      <ScrapeControls sources={liveSources} />
      <UnassignedSignalReview signals={unassignedSignals} projects={dataset.projects} />

      <section className="panel mb-6 overflow-hidden">
        <div className="border-b p-5">
          <p className="eyebrow">Connector history</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20394e]">Scrape logs</h2>
        </div>
        {dataset.scrapeRuns.length === 0 ? (
          <p className="p-5 text-sm text-[#66717e]">No scrape runs recorded yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Finished</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Signals</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {dataset.scrapeRuns.slice(0, 50).map((run) => {
                  const source = dataset.sources.find((item) => item.id === run.sourceId);
                  return (
                    <tr key={run.id}>
                      <td className="whitespace-nowrap font-mono text-xs text-[#66717e]">
                        {formatDateTime(run.finishedAt)}
                      </td>
                      <td>
                        <a
                          href={run.urlFetched}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#29475f] hover:underline"
                        >
                          {source?.name ?? run.sourceId}
                        </a>
                      </td>
                      <td>
                        <span
                          className={
                            run.status === "Failed"
                              ? "font-semibold text-[#8e3630]"
                              : run.status === "Partial"
                                ? "font-semibold text-[#a45f13]"
                                : "font-semibold text-[#336350]"
                          }
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="font-mono">{run.documentsFound}</td>
                      <td className="font-mono">{run.signalsExtracted}</td>
                      <td className="max-w-md text-xs leading-5 text-[#8e3630]">
                        {run.errorMessage ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mb-4">
        <p className="eyebrow">Manual workflow</p>
        <h2 className="mt-1 text-xl font-semibold text-[#20394e]">
          Paste and review a public document
        </h2>
      </div>
      <IngestWorkflow projects={dataset.projects} />
    </>
  );
}
