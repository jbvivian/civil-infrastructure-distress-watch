import { Download } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  WeeklyBriefList,
  type WeeklyBriefItem,
} from "@/components/weekly-brief-list";
import { buildBriefEdition } from "@/lib/review-workflow";
import { getDataset } from "@/lib/repository";
import type { Signal } from "@/lib/types";

export const metadata = { title: "Weekly Brief" };
export const dynamic = "force-dynamic";

export default async function WeeklyBriefPage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const sourceMap = new Map(dataset.sources.map((source) => [source.id, source]));

  const edition = buildBriefEdition(dataset.signals, { windowDays: 7, limit: 16 });

  const toItems = (input: Signal[]) =>
    input
      .map((signal): WeeklyBriefItem | null => {
      const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
      const document = documentMap.get(signal.sourceDocumentIds[0]);
      if (!document) return null;
      const source = sourceMap.get(document.sourceId);
      return {
        ...signal,
        projectName: project?.name ?? "Unassigned review item",
        projectSlug: project?.slug ?? null,
        sourceTitle: document.title,
        sourceDocumentId: document.id,
        sourceType: source?.type ?? "Local media",
        jurisdiction: source?.jurisdiction ?? source?.body ?? "Unknown",
        county: source?.county,
        dataOrigin: signal.dataOrigin ?? "Seed",
        signalReviewStatus:
          signal.signalReviewStatus ??
          (signal.projectId ? "Assigned" : "Needs Review"),
        civilFirmOpportunityType:
          signal.civilFirmOpportunityType ?? "Competitive intelligence only",
      };
    })
      .filter((signal): signal is WeeklyBriefItem => signal !== null);

  const promoted = toItems(edition.promoted);
  const newThisPeriod = toItems(edition.newThisPeriod);
  const stillOpen = toItems(edition.stillOpen);
  const undated = toItems(edition.undatedItems);

  const formatDay = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

  const sections: Array<{ title: string; note: string; items: WeeklyBriefItem[] }> = [
    {
      title: "Promoted review items",
      note: "Manually prioritised by a reviewer.",
      items: promoted,
    },
    {
      title: "New this period",
      note: "First appearance in a brief, with an event date inside the reporting window.",
      items: newThisPeriod,
    },
    {
      title: "Still open",
      note: "Previously briefed, high severity, and confirmed again by a source during this window.",
      items: stillOpen,
    },
    {
      title: "Undated items",
      note: "The event date could not be resolved from the source, so these are dated by retrieval and may be older than they appear.",
      items: undated,
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow={`Reporting period ${formatDay(edition.windowStart)} to ${formatDay(edition.windowEnd)}`}
        title="Infrastructure review brief"
        description="Each edition covers events dated inside the reporting window. Items already sent in an earlier edition do not reappear unless a source has reconfirmed them."
        action={
          <a
            href="/api/weekly-brief"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2.5 text-sm font-semibold text-[#29475f] hover:bg-slate-50"
          >
            <Download className="size-4" /> Export Markdown
          </a>
        }
      />
      <div className="panel mb-6 grid gap-4 bg-[#17324d] p-5 text-white sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">New this period</p>
          <p className="mt-1 font-mono text-lg">{edition.counts.newThisPeriod}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Still open</p>
          <p className="mt-1 font-mono text-lg">{edition.counts.stillOpen}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Promoted</p>
          <p className="mt-1 font-mono text-lg">{edition.counts.promoted}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Undated</p>
          <p className="mt-1 font-mono text-lg">{edition.counts.undated}</p>
        </div>
      </div>

      {edition.counts.total === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm font-semibold text-[#20394e]">
            Nothing new in this reporting period.
          </p>
          <p className="mt-2 text-sm text-[#66717e]">
            An empty edition means no source recorded a dated event in the window. That is a
            result, not a failure. Run a scrape to check sources for new documents.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-[#20394e]">{section.title}</h2>
                <p className="mb-3 mt-1 text-sm text-[#66717e]">{section.note}</p>
                <WeeklyBriefList signals={section.items} />
              </section>
            ))}
        </div>
      )}
    </>
  );
}
