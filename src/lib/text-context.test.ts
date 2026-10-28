import { describe, expect, it } from "vitest";
import { extractSignals, extractSignalsWithDiagnostics } from "@/lib/extractor";
import { evaluateContext, splitIntoSentences } from "@/lib/text-context";

/**
 * These cases are taken from the real scraped corpus. Every one of them produced
 * a signal under whole-document substring matching.
 */
describe("context suppression on real false positives", () => {
  it("suppresses a term inside a table of contents row", () => {
    const result = evaluateContext({
      sentence:
        "240 DPW - Route 299 Shoulder Widening 242 DPW - Samsonville Road Culvert Replacement 245 DPW - Schultz Road Bridge Replacement",
      term: "culvert replacement",
    });
    expect(result.suppressed).toBe(true);
    expect(result.suppressionKind).toBe("List or index line");
    expect(result.suppressionReason).toMatch(/table|index|row/i);
  });

  it("suppresses a term inside a budget table row", () => {
    const result = evaluateContext({
      sentence: "Central Dutchess Pump Station Water Storage Tank 2026 3,000,000 3,000,000 100%",
      term: "pump station",
    });
    expect(result.suppressed).toBe(true);
  });

  it("suppresses a benefit statement describing what work would prevent", () => {
    const result = evaluateContext({
      sentence:
        "This project includes a new water service line evaluation and repair to reduce the number of water main breaks during cold weather.",
      term: "water main break",
    });
    expect(result.suppressed).toBe(true);
    expect(result.suppressionKind).toBe("Negated");
  });

  it("suppresses a glossary definition", () => {
    const result = evaluateContext({
      sentence:
        "A watershed generally includes lakes, rivers, estuaries, wetlands, streams, and the surrounding landscape.",
      term: "wetlands",
    });
    expect(result.suppressed).toBe(true);
    expect(result.suppressionKind).toBe("Definitional or policy language");
  });

  it("suppresses an off-domain use of an ambiguous term", () => {
    const result = evaluateContext({
      sentence:
        "The board authorized the town to join as plaintiffs in a lawsuit challenging the Even Year Election Law of 2023.",
      term: "litigation",
      requiresInfrastructureContext: true,
    });
    expect(result.suppressed).toBe(true);
    expect(result.suppressionKind).toBe("Outside domain");
  });

  it("suppresses a filename listing", () => {
    const result = evaluateContext({
      sentence:
        "D3 231 NORTH ROAD - PARKING - TIME EXTENSION D3 231 NORTH ROAD-PARKING-TIME EXTENSION.PDF D4 900 DUTCHESS TURNPIKE.PDF",
      term: "time extension",
    });
    expect(result.suppressed).toBe(true);
  });

  it("suppresses an explicit negation", () => {
    const result = evaluateContext({
      sentence: "The contractor confirmed that no change order will be required for this work.",
      term: "change order",
    });
    expect(result.suppressed).toBe(true);
    expect(result.suppressionKind).toBe("Negated");
  });
});

describe("context retention on real true positives", () => {
  it("keeps a title-case agenda item that records an amount", () => {
    const result = evaluateContext({
      sentence:
        "Resolution No. 317 - Approving The Execution Of A Contract Amendment For $25,000.00, Causing The Aggregate Contract Amount To Increase",
      term: "contract amendment",
    });
    expect(result.suppressed).toBe(false);
    expect(result.confidence).toBe("High");
    expect(result.confidenceFactors.join(" ")).toMatch(/dollar amount/i);
  });

  it("keeps a plain description of a condition", () => {
    const result = evaluateContext({
      sentence:
        "The bottom level portion of the DSS basement is flooding and being infiltrated with water.",
      term: "flooding",
    });
    expect(result.suppressed).toBe(false);
  });

  it("keeps a terse but real statement carrying a verb", () => {
    const result = evaluateContext({
      sentence: "Final completion delayed to October.",
      term: "final completion delayed",
    });
    expect(result.suppressed).toBe(false);
  });
});

describe("confidence reflects evidence rather than the fact of a match", () => {
  it("does not rate every match High", () => {
    const strong = evaluateContext({
      sentence:
        "On March 4, 2026 the board approved Contract No. 21-4471 and authorized a change order for $84,000.",
      term: "change order",
    });
    const weak = evaluateContext({
      sentence:
        "The department plans to construct a new pump station and anticipated design work will follow in a future phase of the program.",
      term: "pump station",
    });
    expect(strong.confidence).toBe("High");
    expect(weak.confidence).toBe("Low");
    expect(strong.confidence).not.toBe(weak.confidence);
  });
});

describe("occurrence selection", () => {
  it("reports the strongest occurrence rather than the first", () => {
    const text = [
      "Culvert Replacement Program 240",
      "The board approved a change order.",
      "On June 12, 2026 the board approved Resolution No. 88 authorizing a change order for $412,000.",
    ].join("\n");

    const signals = extractSignals(text);
    const costSignal = signals.find((signal) => signal.category === "Cost Pressure");
    expect(costSignal).toBeDefined();
    expect(costSignal?.evidenceExcerpt).toContain("$412,000");
    expect(costSignal?.confidence).toBe("High");
  });

  it("records why each occurrence was discarded", () => {
    const { suppressed } = extractSignalsWithDiagnostics(
      "A watershed generally includes lakes, rivers, estuaries, wetlands and streams.",
      { documentTitle: "Stormwater Management Program Plan" },
    );
    expect(suppressed.length).toBeGreaterThan(0);
    expect(suppressed[0].reason).toMatch(/Suppressed because/);
  });
});

describe("splitIntoSentences", () => {
  it("splits on sentence enders and line breaks", () => {
    const parts = splitIntoSentences("First item here. Second item here.\nThird item here.");
    expect(parts).toHaveLength(3);
  });

  it("windows unsegmented PDF text instead of returning one blob", () => {
    const parts = splitIntoSentences("word ".repeat(400));
    expect(parts.length).toBeGreaterThan(1);
  });
});
