import { PageHeading } from "@/components/page-heading";
import { SignalList, type SignalListItem } from "@/components/signal-list";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Signals" };
export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const documentMap = new Map(dataset.documents.map((document) => [document.id, document]));
  const sourceMap = new Map(dataset.sources.map((source) => [source.id, source]));

  const items = dataset.signals
    .map((signal): SignalListItem | null => {
      const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
      const document = documentMap.get(signal.sourceDocumentIds[0]);
      if (!document) return null;
      const source = sourceMap.get(document.sourceId);
      return {
        ...signal,
        projectName: project?.name ?? "Unassigned live signal",
        projectSlug: project?.slug ?? null,
        sourceTitle: document.title,
        sourceUrl: document.url,
        sourceDocumentId: document.id,
        sourceType: source?.type ?? "Local media",
        jurisdiction: source?.jurisdiction ?? source?.body ?? "Unknown",
        county: source?.county,
        signalReviewStatus: signal.signalReviewStatus ?? "Needs Review",
        dataOrigin: signal.dataOrigin ?? "Seed",
        promotedToBrief: signal.promotedToBrief ?? false,
        dismissed: signal.dismissed ?? false,
        severityReason: signal.severityReason ?? "",
        confidenceReason: signal.confidenceReason ?? "",
        scoringFactors: signal.scoringFactors ?? [],
        civilFirmRelevance: signal.civilFirmRelevance ?? "",
        civilFirmOpportunityType:
          signal.civilFirmOpportunityType ?? "Competitive intelligence only",
        extractedEntities: signal.extractedEntities ?? {
          possibleProjectNames: [],
          possibleOwners: [],
          possibleVendors: [],
          possibleFundingSources: [],
          possibleAmounts: [],
          possibleDates: [],
          possibleResolutionOrContractNumbers: [],
          possibleProjectTypes: [],
        },
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
