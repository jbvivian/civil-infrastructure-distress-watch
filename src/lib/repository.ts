import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { monitoredSources } from "@/config/monitored-sources";
import { seedDataset } from "@/data/seed";
import { deriveProjectStatus, extractSignals } from "@/lib/extractor";
import { cleanReadableText, type ScrapedDocument } from "@/lib/scraper";
import type {
  Dataset,
  ExtractedSignal,
  Project,
  ScrapeStatus,
  SourceDocument,
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
  const configuredSourceIds = new Set(monitoredSources.map((source) => source.id));
  dataset.scrapeRuns ??= [];
  dataset.signals = dataset.signals.map((signal) => ({
    ...signal,
    projectId: signal.projectId ?? null,
    reviewStatus: signal.reviewStatus ?? (signal.projectId ? "Assigned" : "Unassigned"),
    assignmentStatus:
      signal.assignmentStatus ?? (signal.projectId ? "Assigned" : "Unassigned"),
    dataOrigin: signal.dataOrigin ?? (signal.id.startsWith("signal-local-") ? "Manual" : "Seed"),
    sourceDocumentId: signal.sourceDocumentId ?? signal.sourceDocumentIds[0],
    extractedBy:
      signal.extractedBy ??
      (signal.id.startsWith("signal-local-") ? "Manual" : "Seed"),
  }));
  dataset.documents = dataset.documents.map((document) => {
    const extractedText = cleanReadableText(document.extractedText ?? document.text);
    return {
      ...document,
      projectId: document.projectId ?? null,
      text: extractedText,
      extractedText,
      extractionStatus: document.extractionStatus ?? document.scrapeStatus ?? "Success",
      dataOrigin:
        document.dataOrigin ??
        (document.fictional
          ? "Seed"
          : document.fetchedAt
            ? "Scraped"
            : "Manual"),
      documentType: document.documentType ?? "HTML page",
      contentType: document.contentType ?? "text/plain",
    };
  });
  dataset.scrapeRuns = dataset.scrapeRuns.map((run) => ({
    ...run,
    url: run.url ?? run.urlFetched,
    documentsImported: run.documentsImported ?? run.documentsFound,
    duplicateDocumentsSkipped: run.duplicateDocumentsSkipped ?? 0,
    logLines: run.logLines ?? [],
  }));

  for (const configured of monitoredSources) {
    const existing = dataset.sources.find((source) => source.id === configured.id);
    if (existing) {
      Object.assign(existing, {
        ...configured,
        lastChecked: existing.lastChecked,
        lastCheckedAt: existing.lastCheckedAt,
        lastSuccessfulScrapeAt: existing.lastSuccessfulScrapeAt,
        scrapeStatus: existing.scrapeStatus ?? "Not checked",
        lastErrorMessage: existing.lastErrorMessage,
        documentsFound: existing.documentsFound ?? 0,
        signalsExtracted: existing.signalsExtracted ?? 0,
        fictional: false,
      });
      continue;
    }
    dataset.sources.push({
      ...configured,
      lastChecked: "",
      lastCheckedAt: undefined,
      lastSuccessfulScrapeAt: undefined,
      scrapeStatus: "Not checked",
      documentsFound: 0,
      signalsExtracted: 0,
      fictional: false,
    });
  }

  dataset.sources = dataset.sources.map((source) => ({
    ...source,
    sourceType: source.sourceType ?? source.type,
    jurisdiction: source.jurisdiction ?? source.body,
    active:
      source.id.startsWith("live-") && !configuredSourceIds.has(source.id)
        ? false
        : source.active ?? !source.fictional,
    scrapeEnabled:
      source.id.startsWith("live-") && !configuredSourceIds.has(source.id)
        ? false
        : source.scrapeEnabled ?? Boolean(source.connector),
    connectorType:
      source.connectorType ??
      (source.fictional ? "Mock" : source.connector ? "HTML" : "Manual"),
    scrapeStatus: source.scrapeStatus ?? "Not checked",
    documentsFound: source.documentsFound ?? 0,
    signalsExtracted: source.signalsExtracted ?? 0,
  }));
  for (const source of dataset.sources) {
    const documentIds = new Set(
      dataset.documents
        .filter((document) => document.sourceId === source.id)
        .map((document) => document.id),
    );
    source.documentsFound = documentIds.size;
    source.signalsExtracted = dataset.signals.filter((signal) =>
      signal.sourceDocumentIds.some((documentId) => documentIds.has(documentId)),
    ).length;
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
    active: true,
    scrapeEnabled: false,
    scrapeStatus: "Not checked",
    connectorType: "Manual",
    sourceType: input.sourceType,
    jurisdiction: project.owner,
    county: project.county,
    documentsFound: 1,
    signalsExtracted: input.signals.length,
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
    documentType: "HTML page",
    contentType: "text/plain",
    extractedText: input.text,
    extractionStatus: "Success",
    dataOrigin: "Manual",
  });

  const newSignals = input.signals.map((signal, index) => ({
    ...signal,
    id: `signal-local-${timestamp}-${index}`,
    projectId: project.id,
    sourceDocumentIds: [documentId],
    dateObserved: observedAt,
    reviewStatus: "Assigned" as const,
    assignmentStatus: "Assigned" as const,
    dataOrigin: "Manual" as const,
    sourceDocumentId: documentId,
    extractedBy: "Manual" as const,
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
  url: string;
  httpStatus?: number;
  documents: ScrapedDocument[];
  errorMessage?: string;
  logLines: string[];
}

export interface ScrapePersistenceResult {
  sourceId: string;
  status: ScrapeStatus;
  documentsFound: number;
  documentsImported: number;
  duplicateDocumentsSkipped: number;
  signalsExtracted: number;
  errorMessage?: string;
}

const projectWordStopList = new Set([
  "project",
  "program",
  "replacement",
  "improvements",
  "rehabilitation",
  "construction",
  "renewal",
  "repair",
  "phase",
]);

function projectWords(project: Project): string[] {
  return project.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !projectWordStopList.has(word));
}

export interface ProjectMatch {
  project?: Project;
  detectedProjectName?: string;
  confidence: "High" | "Medium" | "Low";
}

export function isDuplicateDocument(
  documents: SourceDocument[],
  contentHash: string,
): boolean {
  return documents.some((document) => document.contentHash === contentHash);
}

export function matchProject(
  projects: Project[],
  title: string,
  text: string,
): ProjectMatch {
  const haystack = `${title}\n${text}`.toLowerCase();
  const exact = projects.find((project) =>
    haystack.includes(project.name.toLowerCase()),
  );
  if (exact) return { project: exact, detectedProjectName: exact.name, confidence: "High" };

  const candidates = projects
    .map((project) => {
      const words = projectWords(project);
      const matchedWords = words.filter((word) => haystack.includes(word)).length;
      const municipalityMatch = haystack.includes(project.municipality.toLowerCase());
      const typeWords = project.projectType
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 5);
      const typeMatch = typeWords.some((word) => haystack.includes(word));
      return {
        project,
        score: matchedWords + (municipalityMatch ? 2 : 0) + (typeMatch ? 1 : 0),
        matchedWords,
        municipalityMatch,
      };
    })
    .filter(
      (candidate) =>
        candidate.score >= 4 &&
        candidate.municipalityMatch &&
        candidate.matchedWords >= 1,
    )
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best || best.score === candidates[1]?.score) return { confidence: "Low" };
  return {
    detectedProjectName: best.project.name,
    confidence: "Medium",
  };
}

export async function completeScrapeRun(
  input: CompleteScrapeInput,
): Promise<ScrapePersistenceResult> {
  const dataset = await getDataset();
  const source = dataset.sources.find((item) => item.id === input.sourceId);
  if (!source) throw new Error(`Configured source ${input.sourceId} was not found.`);

  source.lastChecked = input.finishedAt.slice(0, 10);
  source.lastCheckedAt = input.finishedAt;
  source.scrapeStatus = input.status;
  source.lastErrorMessage = input.errorMessage;
  if (input.status === "Success") source.lastSuccessfulScrapeAt = input.finishedAt;

  let documentsImported = 0;
  let duplicateDocumentsSkipped = 0;
  let signalsExtracted = 0;

  for (const scraped of input.documents) {
    const duplicate = isDuplicateDocument(dataset.documents, scraped.contentHash);
    if (duplicate) {
      duplicateDocumentsSkipped += 1;
      input.logLines.push(`Duplicate skipped: ${scraped.title}.`);
      continue;
    }

    if (scraped.text || scraped.status !== "Failed") {
      const match = matchProject(dataset.projects, scraped.title, scraped.text);
      const documentId = `document-live-${randomUUID()}`;
      const observedAt = scraped.fetchedAt.slice(0, 10);
      dataset.documents.push({
        id: documentId,
        sourceId: input.sourceId,
        projectId: match.project?.id ?? null,
        title: scraped.title,
        url: scraped.url,
        publishedAt: scraped.publishedAt ?? observedAt,
        ingestedAt: observedAt,
        fetchedAt: scraped.fetchedAt,
        statusCode: scraped.httpStatus,
        contentHash: scraped.contentHash,
        rawText: scraped.rawText,
        text: scraped.text,
        scrapeStatus: scraped.status,
        errorMessage: scraped.errorMessage,
        documentType: scraped.documentType,
        contentType: scraped.contentType,
        extractedText: scraped.text,
        extractionStatus: scraped.status,
        dataOrigin: "Scraped",
        fictional: false,
      });

      const extracted = extractSignals(scraped.text);
      const newSignals = extracted.map((signal) => ({
        ...signal,
        id: `signal-live-${randomUUID()}`,
        projectId: match.project?.id ?? null,
        sourceDocumentIds: [documentId],
        dateObserved: observedAt,
        reviewStatus: match.project ? ("Assigned" as const) : ("Unassigned" as const),
        assignmentStatus: match.project
          ? ("Assigned" as const)
          : match.detectedProjectName
            ? ("Needs Review" as const)
            : ("Unassigned" as const),
        detectedProjectName: match.detectedProjectName,
        dataOrigin: "Scraped" as const,
        sourceDocumentId: documentId,
        extractedBy: "RuleBased" as const,
      }));
      dataset.signals.push(...newSignals);
      signalsExtracted += newSignals.length;
      documentsImported += 1;
      input.logLines.push(
        `Imported ${scraped.title}; extracted ${newSignals.length} signal${newSignals.length === 1 ? "" : "s"}.`,
      );

      if (match.project && newSignals.length > 0) {
        const projectSignals = dataset.signals.filter(
          (signal) => signal.projectId === match.project?.id,
        );
        match.project.status = deriveProjectStatus(projectSignals);
        match.project.lastUpdated = observedAt;
      }
    }
  }
  const sourceDocumentIds = new Set(
    dataset.documents
      .filter((document) => document.sourceId === source.id)
      .map((document) => document.id),
  );
  source.documentsFound = sourceDocumentIds.size;
  source.signalsExtracted = dataset.signals.filter((signal) =>
    signal.sourceDocumentIds.some((documentId) => sourceDocumentIds.has(documentId)),
  ).length;

  dataset.scrapeRuns.unshift({
    id: `scrape-run-${randomUUID()}`,
    sourceId: input.sourceId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: input.status,
    documentsFound: input.documents.length,
    documentsImported,
    duplicateDocumentsSkipped,
    signalsExtracted,
    errorMessage: input.errorMessage,
    urlFetched: input.url,
    url: input.url,
    httpStatus: input.httpStatus,
    logLines: input.logLines,
  });
  dataset.scrapeRuns = dataset.scrapeRuns.slice(0, 250);

  await writeDataset(dataset);
  return {
    sourceId: input.sourceId,
    status: input.status,
    documentsFound: input.documents.length,
    documentsImported,
    duplicateDocumentsSkipped,
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
  signal.assignmentStatus = "Assigned";
  signal.detectedProjectName = project.name;
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
