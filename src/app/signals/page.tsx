import { PageHeading } from "@/components/page-heading";
import { SignalList, type SignalListItem } from "@/components/signal-list";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Signals" };

export default async function SignalsPage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));

  const items = dataset.signals
    .map((signal): SignalListItem | null => {
      const project = projectMap.get(signal.projectId);
      const document = documentMap.get(signal.sourceDocumentIds[0]);
      if (!project || !document) return null;
      return {
        ...signal,
        projectName: project.name,
        projectSlug: project.slug,
        sourceTitle: document.title,
        sourceUrl: document.url,
      };
    })
    .filter((signal): signal is SignalListItem => signal !== null)
    .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved));

  return (
    <>
      <PageHeading
        eyebrow="Extracted review items"
        title="Source-backed distress signals"
        description="Each item keeps the public-record evidence separate from its interpretation, possible consequence, review action, and plausible alternative explanation."
      />
      <SignalList signals={items} />
    </>
  );
}
