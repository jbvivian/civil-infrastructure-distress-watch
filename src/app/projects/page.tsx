import { PageHeading } from "@/components/page-heading";
import { ProjectList, type ProjectListItem } from "@/components/project-list";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const dataset = await getDataset();
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const sourceMap = new Map(dataset.sources.map((source) => [source.id, source]));
  const items: ProjectListItem[] = dataset.projects.map((project) => {
    const signals = dataset.signals
      .filter((signal) => signal.projectId === project.id && !signal.dismissed)
      .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved));
    const sourceRecords = signals
      .map((signal) => documentMap.get(signal.sourceDocumentIds[0]))
      .filter((document) => document !== undefined)
      .map((document) => sourceMap.get(document.sourceId))
      .filter((source) => source !== undefined);
    return {
      ...project,
      latestSignal: signals[0]?.title ?? "No signals recorded",
      categories: [...new Set(signals.map((signal) => signal.category))],
      dataOrigins: [
        ...new Set(signals.map((signal) => signal.dataOrigin ?? "Seed")),
      ],
      reviewStatuses: [
        ...new Set(
          signals.map(
            (signal) =>
              signal.signalReviewStatus ??
              (signal.projectId ? "Assigned" : "Needs Review"),
          ),
        ),
      ],
      sourceTypes: [...new Set(sourceRecords.map((source) => source.type))],
      jurisdictions: [
        ...new Set(
          sourceRecords.map((source) => source.jurisdiction ?? source.body),
        ),
      ],
      hasLiveSignals: signals.some((signal) => signal.dataOrigin === "Scraped"),
    };
  });

  return (
    <>
      <PageHeading
        eyebrow="Project watchlist"
        title="Tracked infrastructure projects"
        description="Search and filter the regional portfolio by owner, phase, funding, status, and the source-backed distress categories attached to each project."
      />
      <ProjectList projects={items} />
    </>
  );
}
