import { describe, expect, it } from "vitest";
import { normalizeEvidence, signalFingerprint, upsertSignals } from "@/lib/signal-identity";
import type { Signal } from "@/lib/types";

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    projectId: null,
    sourceDocumentIds: ["document-1"],
    title: "Potential cost authorization change",
    category: "Cost Pressure",
    signalType: "Budget or contract action",
    dateObserved: "2026-06-09",
    evidenceExcerpt: "The board approved a contract amendment for $25,000.00.",
    interpretation: "",
    possibleConsequence: "",
    recommendedAction: "",
    alternativeExplanation: "",
    severity: "Medium",
    confidence: "High",
    ...overrides,
  };
}

const fingerprintOf = (evidence: string) =>
  signalFingerprint({
    sourceId: "live-source",
    matchedTerm: "contract amendment",
    evidenceExcerpt: evidence,
    category: "Cost Pressure",
  });

describe("signalFingerprint", () => {
  it("is stable across incidental formatting differences", () => {
    expect(fingerprintOf("The board approved a contract amendment for $25,000.00.")).toBe(
      fingerprintOf("The  board   approved a contract amendment for $25,000.00."),
    );
    expect(fingerprintOf("The board approved a “contract amendment” for $25,000.00.")).toBe(
      fingerprintOf('The board approved a "contract amendment" for $25,000.00.'),
    );
  });

  it("differs when the underlying statement differs", () => {
    expect(fingerprintOf("A contract amendment for $25,000.00 was approved.")).not.toBe(
      fingerprintOf("A contract amendment for $84,000.00 was approved."),
    );
  });
});

describe("upsertSignals", () => {
  it("does not append a signal it has already seen", () => {
    const existing = [signal({ id: "a", fingerprint: "fp-1", timesSeen: 1 })];
    const incoming = [signal({ id: "b", fingerprint: "fp-1", sourceDocumentIds: ["document-2"] })];

    const result = upsertSignals(existing, incoming, "2026-07-28T00:00:00.000Z");

    expect(result.signals).toHaveLength(1);
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(1);
    expect(result.signals[0].timesSeen).toBe(2);
    expect(result.signals[0].lastSeenAt).toBe("2026-07-28T00:00:00.000Z");
    expect(result.signals[0].sourceDocumentIds).toEqual(["document-1", "document-2"]);
  });

  it("preserves a reviewer's decision across a re-crawl", () => {
    const existing = [
      signal({
        id: "a",
        fingerprint: "fp-1",
        dismissed: true,
        dismissedReason: "Routine administrative item",
        projectId: "project-7",
      }),
    ];
    const incoming = [signal({ id: "b", fingerprint: "fp-1", dismissed: false, projectId: null })];

    const result = upsertSignals(existing, incoming, "2026-07-28T00:00:00.000Z");

    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].dismissed).toBe(true);
    expect(result.signals[0].dismissedReason).toBe("Routine administrative item");
    expect(result.signals[0].projectId).toBe("project-7");
  });

  it("adds a genuinely new signal", () => {
    const existing = [signal({ id: "a", fingerprint: "fp-1" })];
    const incoming = [signal({ id: "b", fingerprint: "fp-2" })];

    const result = upsertSignals(existing, incoming, "2026-07-28T00:00:00.000Z");

    expect(result.signals).toHaveLength(2);
    expect(result.created).toHaveLength(1);
    expect(result.created[0].firstSeenAt).toBe("2026-07-28T00:00:00.000Z");
    expect(result.created[0].timesSeen).toBe(1);
  });

  it("does not let a later crawl make an old event look recent", () => {
    const existing = [
      signal({
        id: "a",
        fingerprint: "fp-1",
        eventDate: "2026-03-04",
        eventDateSource: "Source text",
      }),
    ];
    const incoming = [
      signal({
        id: "b",
        fingerprint: "fp-1",
        eventDate: "2026-07-28",
        eventDateSource: "Fetch date (unresolved)",
      }),
    ];

    const result = upsertSignals(existing, incoming, "2026-07-28T00:00:00.000Z");
    expect(result.signals[0].eventDate).toBe("2026-03-04");
  });
});

describe("normalizeEvidence", () => {
  it("collapses whitespace and normalizes quotation marks and dashes", () => {
    expect(normalizeEvidence("  A  “test” —  value ")).toBe('a "test" - value');
  });
});
