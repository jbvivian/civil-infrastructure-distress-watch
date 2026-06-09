import { Download } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  WeeklyBriefList,
  type WeeklyBriefItem,
} from "@/components/weekly-brief-list";
import { selectWeeklyBriefSignals } from "@/lib/review-workflow";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Weekly Brief" };
export const dynamic = "force-dynamic";

export default async function WeeklyBriefPage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const sourceMap = new Map(dataset.sources.map((source) => [source.id, source]));
  const signals = selectWeeklyBriefSignals(dataset.signals, 16)
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
  const reportingDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  return (
    <>
      <PageHeading
        eyebrow="Deterministic priority summary"
        title="Weekly infrastructure review brief"
        description="Promoted review items lead the brief, followed by deterministic severity and recency ranking. Dismissed signals are excluded."
        action={
          <a
            href="/api/weekly-brief"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-4 py-2.5 text-sm font-semibold text-[#29475f] hover:bg-slate-50"
          >
            <Download className="size-4" /> Export Markdown
          </a>
        }
      />
      <div className="panel mb-6 grid gap-4 bg-[#17324d] p-5 text-white md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Reporting date</p>
          <p className="mt-1 font-mono text-lg">{reportingDate}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Priority signals</p>
          <p className="mt-1 font-mono text-lg">{signals.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-300">Promoted items</p>
          <p className="mt-1 font-mono text-lg">
            {signals.filter((signal) => signal.promotedToBrief).length}
          </p>
        </div>
      </div>
      <WeeklyBriefList signals={signals} />
    </>
  );
}
