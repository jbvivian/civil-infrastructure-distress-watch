import { describe, expect, it } from "vitest";
import {
  dismissSignal,
  filterSignals,
  promoteSignal,
  selectWeeklyBriefSignals,
} from "@/lib/review-workflow";
import type { Signal } from "@/lib/types";

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    projectId: null,
    sourceDocumentIds: ["document-1"],
    title: "Review item",
    category: "Schedule Pressure",
    signalType: "Time extension",
    dateObserved: "2026-06-01",
    evidenceExcerpt: "The board considered a time extension.",
    interpretation: "",
    possibleConsequence: "",
    recommendedAction: "",
    alternativeExplanation: "",
    severity: "Medium",
    confidence: "High",
    dataOrigin: "Scraped",
    signalReviewStatus: "Needs Review",
    ...overrides,
  };
}

describe("signal review workflow", () => {
  it("promotes and unpromotes without losing assignment state", () => {
    const promoted = promoteSignal(signal({ projectId: "project-1" }), true, "Lead item");
    expect(promoted.promotedToBrief).toBe(true);
    expect(promoted.signalReviewStatus).toBe("Promoted");
    expect(promoted.promotionNote).toBe("Lead item");

    const unpromoted = promoteSignal(promoted, false);
    expect(unpromoted.promotedToBrief).toBe(false);
    expect(unpromoted.signalReviewStatus).toBe("Assigned");
  });

  it("requires and records a dismissal reason", () => {
    expect(() => dismissSignal(signal(), " ")).toThrow(
      "A dismissal reason is required.",
    );
    const dismissed = dismissSignal(signal(), "Weak evidence");
    expect(dismissed.dismissed).toBe(true);
    expect(dismissed.dismissedReason).toBe("Weak evidence");
    expect(dismissed.signalReviewStatus).toBe("Dismissed");
  });

  it("filters live and review-state records while hiding dismissed by default", () => {
    const records = [
      signal(),
      signal({
        id: "seed",
        dataOrigin: "Seed",
        signalReviewStatus: "Assigned",
      }),
      signal({ id: "dismissed", dismissed: true, signalReviewStatus: "Dismissed" }),
    ];

    expect(filterSignals(records, { liveOnly: true })).toHaveLength(1);
    expect(
      filterSignals(records, {
        reviewStatus: "Dismissed",
        includeDismissed: true,
      }).map((item) => item.id),
    ).toEqual(["dismissed"]);
  });

  it("puts promoted signals first and excludes dismissed signals", () => {
    const selected = selectWeeklyBriefSignals([
      signal({ id: "high", severity: "High" }),
      signal({ id: "promoted", severity: "Low", promotedToBrief: true }),
      signal({ id: "dismissed", severity: "High", dismissed: true }),
    ]);

    expect(selected.map((item) => item.id)).toEqual(["promoted", "high"]);
  });
});
