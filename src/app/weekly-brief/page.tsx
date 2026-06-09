import Link from "next/link";
import { Download } from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge } from "@/components/badges";
import { PageHeading } from "@/components/page-heading";
import { formatDate } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Weekly Brief" };
export const dynamic = "force-dynamic";

export default async function WeeklyBriefPage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const severityScore = { High: 3, Medium: 2, Low: 1 };
  const signals = [...dataset.signals]
    .filter((signal) => signal.projectId)
    .sort(
      (a, b) =>
        severityScore[b.severity] - severityScore[a.severity] ||
        b.dateObserved.localeCompare(a.dateObserved),
    )
    .slice(0, 8);

  return (
    <>
      <PageHeading
        eyebrow="Deterministic priority summary"
        title="Weekly infrastructure review brief"
        description="The eight highest-priority recent signals, ranked by severity and recency. This brief uses deterministic logic and does not require an AI service."
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
        <div><p className="text-xs uppercase tracking-wider text-slate-300">Reporting date</p><p className="mt-1 font-mono text-lg">June 8, 2026</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-300">Priority signals</p><p className="mt-1 font-mono text-lg">{signals.length}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-slate-300">Projects represented</p><p className="mt-1 font-mono text-lg">{new Set(signals.map((signal) => signal.projectId)).size}</p></div>
      </div>
      <div className="space-y-4">
        {signals.map((signal, index) => {
          const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
          if (!project) return null;
          return (
            <article key={signal.id} className="panel p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#e8eef2] font-mono text-sm font-semibold text-[#35536b]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    <SeverityBadge severity={signal.severity} />
                    <CategoryBadge category={signal.category} />
                    <ConfidenceBadge confidence={signal.confidence} />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[#20394e]">{signal.title}</h2>
                  <p className="mt-1 text-sm text-[#66717e]">
                    <Link href={`/projects/${project.slug}`} className="font-semibold text-[#355b78] hover:underline">{project.name}</Link>
                    {" · "}{formatDate(signal.dateObserved)}
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div><p className="eyebrow">Why it may matter</p><p className="mt-1.5 text-sm leading-6 text-[#40505d]">{signal.interpretation} {signal.possibleConsequence}</p></div>
                    <div className="rounded-md border border-[#c9d6df] bg-[#f0f5f8] p-3"><p className="eyebrow">Review trigger</p><p className="mt-1.5 text-sm font-medium leading-6 text-[#28465d]">{signal.recommendedAction}</p></div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
