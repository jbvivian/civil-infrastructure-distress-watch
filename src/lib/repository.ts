import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { monitoredSources } from "@/config/monitored-sources";
import { seedDataset } from "@/data/seed";
import { deriveProjectStatus, extractSignals } from "@/lib/extractor";
import type {
  Dataset,
  ExtractedSignal,
  ScrapeStatus,
  SourceType,
} from "@/lib/types";

const dataDirectory = path.join(process.cwd(), "data");
const localDataPath = path.join(dataDirectory, "local-data.json");

export async function getDataset(): Promise<Dataset> {
  try {
    const raw = await fs.readFile(localDataPath, "utf8");
    return normalizeDataset(JSON.parse(raw) as Dataset);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return normalizeDataset(structuredClone(seedDataset));
  }
}

async function writeDataset(dataset: Dataset): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${localDataPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, localDataPath);
}

function normalizeDataset(dataset: Dataset): Dataset {
  dataset.scrapeRuns ??= [];
  dataset.signals = dataset.signals.map((signal) => ({
    ...signal,
    projectId: signal.projectId ?? null,
    reviewStatus: signal.reviewStatus ?? (signal.projectId ? "Assigned" : "Unassigned"),
  }));
  dataset.documents = dataset.documents.map((document) => ({
    ...document,
    projectId: document.projectId ?? null,
  }));

  for (const configured of monitoredSources) {
    const existing = dataset.sources.find((source) => source.id === configured.id);
    if (existing) {
      Object.assign(existing, {
        ...configured,
        lastChecked: existing.lastChecked,
        fictional: false,
      });
      continue;
    }
    dataset.sources.push({
      ...configured,
      lastChecked: "",
      fictional: false,
    });
  }

  return dataset;
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

interface CompleteScrapeInput {
  sourceId: string;
  startedAt: string;
  finishedAt: string;
  status: ScrapeStatus;
  urlFetched: string;
  statusCode?: number;
  title?: string;
  fetchedAt?: string;
  rawText?: string;
  text?: string;
  contentHash?: string;
  errorMessage?: string;
}

export interface ScrapePersistenceResult {
  sourceId: string;
  status: ScrapeStatus;
  documentCreated: boolean;
  duplicate: boolean;
  signalsExtracted: number;
  errorMessage?: string;
}

function findMatchingProject(dataset: Dataset, title: string, text: string) {
  const haystack = `${title}\n${text}`.toLowerCase();
  return dataset.projects.find((project) => haystack.includes(project.name.toLowerCase()));
}

export async function completeScrapeRun(
  input: CompleteScrapeInput,
): Promise<ScrapePersistenceResult> {
  const dataset = await getDataset();
  const source = dataset.sources.find((item) => item.id === input.sourceId);
  if (!source) throw new Error(`Configured source ${input.sourceId} was not found.`);

  source.lastChecked = input.finishedAt.slice(0, 10);
  let documentCreated = false;
  let duplicate = false;
  let signalsExtracted = 0;

  if (input.text && input.contentHash && input.title && input.fetchedAt && input.statusCode) {
    duplicate = dataset.documents.some(
      (document) =>
        document.sourceId === input.sourceId &&
        document.contentHash === input.contentHash,
    );

    if (!duplicate) {
      const project = findMatchingProject(dataset, input.title, input.text);
      const documentId = `document-live-${randomUUID()}`;
      const observedAt = input.fetchedAt.slice(0, 10);
      dataset.documents.push({
        id: documentId,
        sourceId: input.sourceId,
        projectId: project?.id ?? null,
        title: input.title,
        url: input.urlFetched,
        publishedAt: observedAt,
        ingestedAt: observedAt,
        fetchedAt: input.fetchedAt,
        statusCode: input.statusCode,
        contentHash: input.contentHash,
        rawText: input.rawText,
        text: input.text,
        scrapeStatus: input.status,
        errorMessage: input.errorMessage,
        fictional: false,
      });

      const extracted = extractSignals(input.text);
      const newSignals = extracted.map((signal) => ({
        ...signal,
        id: `signal-live-${randomUUID()}`,
        projectId: project?.id ?? null,
        sourceDocumentIds: [documentId],
        dateObserved: observedAt,
        reviewStatus: project ? ("Assigned" as const) : ("Unassigned" as const),
      }));
      dataset.signals.push(...newSignals);
      signalsExtracted = newSignals.length;
      documentCreated = true;

      if (project && newSignals.length > 0) {
        const projectSignals = dataset.signals.filter(
          (signal) => signal.projectId === project.id,
        );
        project.status = deriveProjectStatus(projectSignals);
        project.lastUpdated = observedAt;
      }
    }
  }

  dataset.scrapeRuns.unshift({
    id: `scrape-run-${randomUUID()}`,
    sourceId: input.sourceId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status,
    documentsFound: documentCreated ? 1 : 0,
    signalsExtracted,
    errorMessage: input.errorMessage,
    urlFetched: input.urlFetched,
  });
  dataset.scrapeRuns = dataset.scrapeRuns.slice(0, 250);

  await writeDataset(dataset);
  return {
    sourceId: input.sourceId,
    status: input.status,
    documentCreated,
    duplicate,
    signalsExtracted,
    errorMessage: input.errorMessage,
  };
}

export async function assignSignalToProject(
  signalId: string,
  projectId: string,
): Promise<void> {
  const dataset = await getDataset();
  const signal = dataset.signals.find((item) => item.id === signalId);
  const project = dataset.projects.find((item) => item.id === projectId);
  if (!signal) throw new Error("Signal was not found.");
  if (!project) throw new Error("Selected project was not found.");

  const observedAt = new Date().toISOString().slice(0, 10);
  signal.projectId = project.id;
  signal.reviewStatus = "Assigned";
  for (const documentId of signal.sourceDocumentIds) {
    const document = dataset.documents.find((item) => item.id === documentId);
    if (document && !document.projectId) document.projectId = project.id;
  }

  const projectSignals = dataset.signals.filter((item) => item.projectId === project.id);
  project.status = deriveProjectStatus(projectSignals);
  project.lastUpdated = observedAt;
  project.confidence =
    signal.confidence === "High" ? "High" : project.confidence;
  dataset.events.push({
    id: `event-local-${randomUUID()}`,
    projectId: project.id,
    date: observedAt,
    title: "Live signal assigned for review",
    description: `${signal.title} was assigned from the live source review queue.`,
    type: "Signal",
  });

  await writeDataset(dataset);
}
