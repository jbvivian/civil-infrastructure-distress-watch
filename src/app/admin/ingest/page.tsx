import { IngestWorkflow } from "@/components/ingest-workflow";
import { PageHeading } from "@/components/page-heading";
import { getDataset } from "@/lib/repository";

export const metadata = { title: "Ingest" };

export default async function IngestPage() {
  const dataset = await getDataset();
  return (
    <>
      <PageHeading
        eyebrow="Local administration"
        title="Ingest a public document"
        description="Paste source text, run the deterministic rules, review each candidate, and save selected signals to the local dataset. No API key or external service is used."
      />
      <IngestWorkflow projects={dataset.projects} />
    </>
  );
}
