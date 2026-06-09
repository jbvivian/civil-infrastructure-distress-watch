import { ExternalLink } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { formatDate } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const dataset = await getDataset();
  const sources = dataset.sources.map((source) => {
    const documents = dataset.documents.filter((document) => document.sourceId === source.id);
    const documentIds = new Set(documents.map((document) => document.id));
    const signals = dataset.signals.filter((signal) =>
      signal.sourceDocumentIds.some((id) => documentIds.has(id)),
    );
    return { ...source, documentCount: documents.length, signalCount: signals.length };
  });

  return (
    <>
      <PageHeading
        eyebrow="Monitoring ledger"
        title="Public sources"
        description="A transparent inventory of the public bodies and document channels represented in the prototype. Mock URLs are preserved to demonstrate citation behavior."
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
                <th>Documents</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#29475f] hover:underline">
                      {source.name} <ExternalLink className="size-3.5" />
                    </a>
                    <p className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${source.fictional ? "text-[#98743d]" : "text-[#336350]"}`}>
                      {source.fictional ? "Fictional source" : "Locally added source"}
                    </p>
                  </td>
                  <td><span className="rounded-full border bg-[#f7f8f9] px-2.5 py-1 text-xs text-[#53606d]">{source.type}</span></td>
                  <td className="text-[#53606d]">{source.body}</td>
                  <td className="font-mono text-xs text-[#66717e]">{formatDate(source.lastChecked)}</td>
                  <td className="font-mono text-[#344452]">{source.documentCount}</td>
                  <td className="font-mono text-[#344452]">{source.signalCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
