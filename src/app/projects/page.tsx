import { PageHeading } from "@/components/page-heading";
import { ProjectList, type ProjectListItem } from "@/components/project-list";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const dataset = await getDataset();
  const items: ProjectListItem[] = dataset.projects.map((project) => {
    const signals = dataset.signals
      .filter((signal) => signal.projectId === project.id)
      .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved));
    return {
      ...project,
      latestSignal: signals[0]?.title ?? "No signals recorded",
      categories: [...new Set(signals.map((signal) => signal.category))],
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
