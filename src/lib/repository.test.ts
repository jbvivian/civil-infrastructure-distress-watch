import { describe, expect, it } from "vitest";
import { seedDataset } from "@/data/seed";
import {
  isDuplicateDocument,
  matchProject,
  normalizeDataset,
} from "@/lib/repository";
import type { Dataset, Project, Signal, SourceDocument } from "@/lib/types";

const project: Project = {
  id: "project-1",
  slug: "northside-sewer-extension",
  name: "Northside Sewer Extension",
  owner: "Town of Poughkeepsie",
  municipality: "Poughkeepsie",
  county: "Dutchess",
  projectType: "Sewer extension",
  phase: "Permitting",
  summary: "",
  originalBudget: 1,
  currentBudget: 1,
  originalCompletion: "2027-01-01",
  currentCompletion: "2027-01-01",
  fundingSources: [],
  vendors: [],
  status: "Watch",
  confidence: "Medium",
  lastUpdated: "2026-06-01",
  fictional: true,
};

describe("matchProject", () => {
  it("auto-assigns only an exact tracked project name", () => {
    const match = matchProject(
      [project],
      "Planning board agenda",
      "The Northside Sewer Extension time extension was discussed.",
    );

    expect(match.project?.id).toBe(project.id);
    expect(match.confidence).toBe("High");
  });

  it("keeps an uncertain municipality and project-type match unassigned", () => {
    const match = matchProject(
      [project],
      "Poughkeepsie infrastructure update",
      "The board discussed sewer work on the northside and a grant deadline.",
    );

    expect(match.project).toBeUndefined();
    expect(match.detectedProjectName).toBe(project.name);
    expect(match.confidence).toBe("Medium");
  });
});

describe("isDuplicateDocument", () => {
  it("detects an existing URL-and-content hash", () => {
    const documents = [
      {
        id: "document-1",
        sourceId: "source-1",
        projectId: null,
        title: "Agenda",
        url: "https://example.gov/agenda.pdf",
        publishedAt: "2026-06-01",
        ingestedAt: "2026-06-01",
        text: "change order",
        contentHash: "abc123",
        fictional: false,
      },
    ] satisfies SourceDocument[];

    expect(isDuplicateDocument(documents, "abc123")).toBe(true);
    expect(isDuplicateDocument(documents, "different")).toBe(false);
  });
});

describe("normalizeDataset", () => {
  it("adds review, scoring, entity, and project-status defaults to older JSON", () => {
    const legacy = structuredClone(seedDataset) as Dataset;
    const legacySignal = legacy.signals[0] as Signal;
    delete legacySignal.promotedToBrief;
    delete legacySignal.dismissed;
    delete legacySignal.signalReviewStatus;
    delete legacySignal.civilFirmRelevance;
    delete legacySignal.severityReason;
    delete legacySignal.extractedEntities;
    delete legacy.documents[0].extractedEntities;
    delete legacy.projects[0].statusReason;

    const migrated = normalizeDataset(legacy);
    const migratedSignal = migrated.signals[0];

    expect(migratedSignal.promotedToBrief).toBe(false);
    expect(migratedSignal.dismissed).toBe(false);
    expect(migratedSignal.signalReviewStatus).toBe("Assigned");
    expect(migratedSignal.civilFirmRelevance).toBeTruthy();
    expect(migratedSignal.severityReason).toBeTruthy();
    expect(migratedSignal.extractedEntities).toBeDefined();
    expect(migrated.documents[0].extractedEntities).toBeDefined();
    expect(migrated.projects[0].statusReason).toBeTruthy();
  });
});
