import { describe, expect, it } from "vitest";
import { buildBriefEdition, markSignalsBriefed } from "@/lib/review-workflow";
import type { Signal } from "@/lib/types";

const now = new Date("2026-07-28T00:00:00Z");

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "signal-1",
    projectId: "project-1",
    sourceDocumentIds: ["document-1"],
    title: "Review item",
    category: "Schedule Pressure",
    signalType: "Schedule change",
    dateObserved: "2026-07-27",
    eventDate: "2026-07-27",
    eventDateSource: "Source text",
    evidenceExcerpt: "The board granted a time extension.",
    interpretation: "",
    possibleConsequence: "",
    recommendedAction: "",
    alternativeExplanation: "",
    severity: "Medium",
    confidence: "High",
    lastSeenAt: "2026-07-27T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildBriefEdition", () => {
  it("excludes events outside the reporting window", () => {
    const edition = buildBriefEdition(
      [
        signal({ id: "recent", eventDate: "2026-07-25" }),
        signal({ id: "old", eventDate: "2026-02-01" }),
      ],
      { now },
    );

    expect(edition.newThisPeriod.map((item) => item.id)).toEqual(["recent"]);
  });

  it("produces a different edition once items have been briefed", () => {
    const signals = [
      signal({ id: "a", eventDate: "2026-07-25" }),
      signal({ id: "b", eventDate: "2026-07-26" }),
    ];

    const first = buildBriefEdition(signals, { now });
    expect(first.newThisPeriod).toHaveLength(2);

    const stamped = markSignalsBriefed(signals, first);
    const second = buildBriefEdition(stamped, { now });

    expect(second.newThisPeriod).toHaveLength(0);
    expect(second.counts.total).toBe(0);
  });

  it("repeats a briefed item only when a source reconfirms it and it is high severity", () => {
    const briefed = signal({
      id: "a",
      severity: "High",
      firstBriefedAt: "2026-07-20T00:00:00.000Z",
      briefEditions: ["2026-07-21"],
      lastSeenAt: "2026-07-27T00:00:00.000Z",
    });
    const stale = signal({
      id: "b",
      severity: "High",
      firstBriefedAt: "2026-07-20T00:00:00.000Z",
      briefEditions: ["2026-07-21"],
      lastSeenAt: "2026-05-01T00:00:00.000Z",
    });

    const edition = buildBriefEdition([briefed, stale], { now });
    expect(edition.stillOpen.map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps promoted items regardless of the window", () => {
    const edition = buildBriefEdition(
      [signal({ id: "promoted", eventDate: "2024-01-01", promotedToBrief: true })],
      { now },
    );
    expect(edition.promoted.map((item) => item.id)).toEqual(["promoted"]);
  });

  it("segregates items whose date is only a fetch artefact", () => {
    const edition = buildBriefEdition(
      [
        signal({
          id: "undated",
          eventDate: "2026-07-27",
          eventDateSource: "Fetch date (unresolved)",
        }),
      ],
      { now },
    );

    expect(edition.newThisPeriod).toHaveLength(0);
    expect(edition.undatedItems.map((item) => item.id)).toEqual(["undated"]);
  });

  it("excludes dismissed signals", () => {
    const edition = buildBriefEdition(
      [signal({ id: "dismissed", dismissed: true, eventDate: "2026-07-25" })],
      { now },
    );
    expect(edition.counts.total).toBe(0);
  });
});

describe("markSignalsBriefed", () => {
  it("records the edition and leaves untouched signals alone", () => {
    const signals = [
      signal({ id: "included", eventDate: "2026-07-25" }),
      signal({ id: "excluded", eventDate: "2026-01-01" }),
    ];
    const edition = buildBriefEdition(signals, { now });
    const stamped = markSignalsBriefed(signals, edition);

    expect(stamped.find((item) => item.id === "included")?.briefEditions).toEqual([
      edition.editionId,
    ]);
    expect(stamped.find((item) => item.id === "excluded")?.briefEditions).toBeUndefined();
  });

  it("does not record the same edition twice", () => {
    const signals = [signal({ id: "a", eventDate: "2026-07-25" })];
    const edition = buildBriefEdition(signals, { now });
    const once = markSignalsBriefed(signals, edition);
    const twice = markSignalsBriefed(once, edition);
    expect(twice[0].briefEditions).toEqual([edition.editionId]);
  });
});
