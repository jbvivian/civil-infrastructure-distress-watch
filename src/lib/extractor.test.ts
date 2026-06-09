import { describe, expect, it } from "vitest";
import { deriveProjectStatus, extractSignals } from "@/lib/extractor";
import type { Signal } from "@/lib/types";

describe("extractSignals", () => {
  it("maps source language to evidence-backed categories", () => {
    const result = extractSignals(
      "The board approved a change order after unsuitable soil was found. Final completion delayed to October.",
    );

    expect(result.map((signal) => signal.category)).toEqual(
      expect.arrayContaining(["Cost Pressure", "Delivery Complexity", "Schedule Pressure"]),
    );
    expect(result.every((signal) => signal.evidenceExcerpt.length > 0)).toBe(true);
  });

  it("does not create signals without matched source language", () => {
    expect(extractSignals("The board received the monthly progress report.")).toEqual([]);
  });
});

describe("deriveProjectStatus", () => {
  const baseSignal: Signal = {
    id: "signal",
    projectId: "project",
    sourceDocumentIds: ["document"],
    title: "Review item",
    category: "Cost Pressure",
    signalType: "Budget action",
    dateObserved: "2026-06-01",
    evidenceExcerpt: "A budget transfer was discussed.",
    interpretation: "",
    possibleConsequence: "",
    recommendedAction: "",
    alternativeExplanation: "",
    severity: "Medium",
    confidence: "High",
  };

  it("escalates explicit confirmed issue language", () => {
    expect(
      deriveProjectStatus([
        { ...baseSignal, evidenceExcerpt: "The owner voted to reject all bids and rebid." },
      ]),
    ).toBe("Confirmed Issue");
  });

  it("places a medium signal in review", () => {
    expect(deriveProjectStatus([baseSignal])).toBe("Review");
  });
});
