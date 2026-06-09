import { describe, expect, it } from "vitest";
import { buildSignalQuality, explainProjectStatus } from "@/lib/signal-quality";
import type { Signal } from "@/lib/types";

const baseSignal: Signal = {
  id: "signal-1",
  projectId: "project-1",
  sourceDocumentIds: ["document-1"],
  title: "Bid rejection",
  category: "Procurement Trouble",
  signalType: "Rebid",
  dateObserved: "2026-06-01",
  evidenceExcerpt: "The board voted to reject all bids and rebid the work.",
  interpretation: "",
  possibleConsequence: "",
  recommendedAction: "",
  alternativeExplanation: "",
  severity: "High",
  confidence: "High",
};

describe("signal quality", () => {
  it("generates deterministic scoring reasons and civil-firm relevance", () => {
    const quality = buildSignalQuality({
      ...baseSignal,
      matchedTerm: "reject all bids",
    });

    expect(quality.severityReason).toContain("reject all bids");
    expect(quality.confidenceReason).toContain("exact configured phrase");
    expect(quality.scoringFactors).toContain(
      "Matched deterministic term: reject all bids",
    );
    expect(quality.civilFirmRelevance).toContain("future procurement opportunity");
    expect(quality.civilFirmOpportunityType).toBe(
      "Procurement or rebid opportunity",
    );
  });

  it("explains project status and ignores dismissed signals", () => {
    const explanation = explainProjectStatus([
      { ...baseSignal, dismissed: true },
    ]);
    expect(explanation.status).toBe("Watch");
    expect(explanation.reason).toContain("no active material distress signals");
  });
});
