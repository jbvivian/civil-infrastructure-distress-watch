import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Database,
  FileSearch,
  Radar,
} from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge, StatusBadge } from "@/components/badges";
import { PageHeading } from "@/components/page-heading";
import { formatDate } from "@/lib/format";
import { getDataset } from "@/lib/repository";
import type { DistressCategory, ProjectStatus } from "@/lib/types";

const statusOrder: ProjectStatus[] = ["Watch", "Review", "Escalated", "Documented Event"];
const statusIcons = {
  Watch: Radar,
  Review: ClipboardCheck,
  Escalated: AlertTriangle,
  "Documented Event": FileSearch,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const recentSignals = [...dataset.signals]
    .filter((signal) => signal.projectId && !signal.dismissed)
    .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved))
    .slice(0, 6);
  const reviewProjects = dataset.projects
    .filter((project) => project.status === "Escalated" || project.status === "Documented Event")
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 6);

  const categoryCounts = dataset.signals
    .filter((signal) => !signal.dismissed)
    .reduce<Record<string, number>>((counts, signal) => {
    counts[signal.category] = (counts[signal.category] ?? 0) + 1;
    return counts;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [DistressCategory, number][];

  return (
    <>
      <PageHeading
        eyebrow="Weekly monitoring view"
        title="Projects that deserve attention this week"
        description="A source-backed implication layer for public infrastructure records. It separates evidence from interpretation and points to the review decision each signal may trigger."
        action={
          <Link
            href="/weekly-brief"
            className="inline-flex items-center gap-2 rounded-md bg-[#17324d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10263a]"
          >
            Open weekly brief <ArrowRight className="size-4" />
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="panel bg-[#17324d] p-5 text-white">
          <Database className="size-5 text-slate-300" aria-hidden="true" />
          <p className="mt-5 font-mono text-3xl font-semibold">{dataset.projects.length}</p>
          <p className="mt-1 text-sm text-slate-300">Total tracked projects</p>
        </div>
        {statusOrder.map((status) => {
          const Icon = statusIcons[status];
          const count = dataset.projects.filter((project) => project.status === status).length;
          return (
            <div key={status} className="panel p-5">
              <Icon className="size-5 text-[#597186]" aria-hidden="true" />
              <p className="mt-5 font-mono text-3xl font-semibold text-[#20394e]">{count}</p>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="eyebrow">Evidence feed</p>
              <h2 className="mt-1 text-lg font-semibold text-[#20394e]">Most recent signals</h2>
            </div>
            <Link href="/signals" className="text-sm font-semibold text-[#355b78] hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentSignals.map((signal) => {
              const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
              const document = documentMap.get(signal.sourceDocumentIds[0]);
              if (!project) return null;
              return (
                <article key={signal.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={signal.severity} />
                    <CategoryBadge category={signal.category} />
                    <span className="font-mono text-[11px] text-[#74808c]">
                      {formatDate(signal.dateObserved)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-[#2a4053]">{signal.title}</h3>
                  <p className="mt-1 text-sm text-[#66717e]">
                    <Link href={`/projects/${project.slug}`} className="font-medium text-[#355b78] hover:underline">
                      {project.name}
                    </Link>
                    {document ? ` · ${document.title}` : ""}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4f5d68]">
                    {signal.interpretation}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <p className="eyebrow">This week</p>
            <h2 className="mt-1 text-lg font-semibold text-[#20394e]">Top distress categories</h2>
            <div className="mt-5 space-y-4">
              {topCategories.map(([category, count]) => (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#344452]">{category}</span>
                    <span className="font-mono text-xs text-[#66717e]">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#58758d]"
                      style={{ width: `${Math.max(14, (count / topCategories[0][1]) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel border-[#c9d6df] bg-[#f0f5f8] p-5">
            <p className="eyebrow">How to read this product</p>
            <p className="mt-3 text-sm leading-6 text-[#405363]">
              A signal is a review cue, not a verdict. Evidence is quoted from a source,
              interpretation explains why it may matter, and an alternative explanation
              keeps the conclusion bounded.
            </p>
          </div>
        </div>
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="eyebrow">Prioritized review queue</p>
            <h2 className="mt-1 text-lg font-semibold text-[#20394e]">Projects requiring review</h2>
          </div>
          <Link href="/projects" className="text-sm font-semibold text-[#355b78] hover:underline">
            Browse projects
          </Link>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {reviewProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link href={`/projects/${project.slug}`} className="font-semibold text-[#29475f] hover:underline">
                      {project.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#74808c]">{project.county} County · {project.phase}</p>
                  </td>
                  <td className="text-[#53606d]">{project.owner}</td>
                  <td><StatusBadge status={project.status} /></td>
                  <td><ConfidenceBadge confidence={project.confidence} /></td>
                  <td className="font-mono text-xs text-[#66717e]">{formatDate(project.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
