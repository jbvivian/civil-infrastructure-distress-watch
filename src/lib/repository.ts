import { promises as fs } from "node:fs";
import path from "node:path";
import { seedDataset } from "@/data/seed";
import { deriveProjectStatus } from "@/lib/extractor";
import type { Dataset, ExtractedSignal, SourceType } from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const localDataPath = path.join(dataDirectory, "local-data.json");

export async function getDataset(): Promise<Dataset> {
  try {
    const raw = await fs.readFile(localDataPath, "utf8");
    return JSON.parse(raw) as Dataset;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return structuredClone(seedDataset);
  }
}

async function writeDataset(dataset: Dataset): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(localDataPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
}

interface IngestInput {
  projectId: string;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  documentTitle: string;
  publishedAt: string;
  text: string;
  signals: ExtractedSignal[];
}

export async function ingestDocument(input: IngestInput): Promise<number> {
  const dataset = await getDataset();
  const project = dataset.projects.find((item) => item.id === input.projectId);
  if (!project) throw new Error("Selected project was not found.");

  const timestamp = Date.now();
  const sourceId = `source-local-${timestamp}`;
  const documentId = `document-local-${timestamp}`;
  const observedAt = new Date().toISOString().slice(0, 10);

  dataset.sources.push({
    id: sourceId,
    name: input.sourceName,
    body: project.owner,
    municipality: project.municipality,
    type: input.sourceType,
    url: input.sourceUrl,
    lastChecked: observedAt,
    fictional: false,
  });
  dataset.documents.push({
    id: documentId,
    sourceId,
    projectId: project.id,
    title: input.documentTitle,
    url: input.sourceUrl,
    publishedAt: input.publishedAt,
    ingestedAt: observedAt,
    text: input.text,
    fictional: false,
  });

  const newSignals = input.signals.map((signal, index) => ({
    ...signal,
    id: `signal-local-${timestamp}-${index}`,
    projectId: project.id,
    sourceDocumentIds: [documentId],
    dateObserved: observedAt,
  }));
  dataset.signals.push(...newSignals);

  const projectSignals = dataset.signals.filter((signal) => signal.projectId === project.id);
  project.status = deriveProjectStatus(projectSignals);
  project.lastUpdated = observedAt;
  project.confidence = newSignals.some((signal) => signal.confidence === "High")
    ? "High"
    : project.confidence;
  dataset.events.push({
    id: `event-local-${timestamp}`,
    projectId: project.id,
    date: observedAt,
    title: `${newSignals.length} locally extracted signal${newSignals.length === 1 ? "" : "s"} saved`,
    description: `Signals were extracted from ${input.documentTitle}.`,
    type: "Signal",
  });

  await writeDataset(dataset);
  return newSignals.length;
}
