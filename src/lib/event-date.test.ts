import { describe, expect, it } from "vitest";
import { findDatesInText, resolveEventDate } from "@/lib/event-date";

const now = new Date("2026-07-28T00:00:00Z");

describe("findDatesInText", () => {
  it("reads the common public-record date formats", () => {
    expect(findDatesInText("approved on March 4, 2026", now)).toContain("2026-03-04");
    expect(findDatesInText("dated 12 June 2025", now)).toContain("2025-06-12");
    expect(findDatesInText("meeting of 5/21/2026", now)).toContain("2026-05-21");
    expect(findDatesInText("recorded 2026-01-09", now)).toContain("2026-01-09");
  });

  it("rejects impossible and implausible dates", () => {
    expect(findDatesInText("February 31, 2026", now)).toHaveLength(0);
    expect(findDatesInText("January 1, 1904", now)).toHaveLength(0);
  });

  it("rejects dates far beyond the present", () => {
    expect(findDatesInText("scheduled for June 1, 2044", now)).toHaveLength(0);
  });

  it("returns the most recent candidate first", () => {
    const dates = findDatesInText("covering March 1, 2025 through April 2, 2026", now);
    expect(dates[0]).toBe("2026-04-02");
  });
});

describe("resolveEventDate", () => {
  it("prefers a date inside the evidence over the fetch date", () => {
    const resolved = resolveEventDate({
      evidenceText: "On March 4, 2026 the board approved a change order.",
      fetchedAt: "2026-07-28T12:00:00.000Z",
      now,
    });
    expect(resolved.date).toBe("2026-03-04");
    expect(resolved.source).toBe("Source text");
    expect(resolved.unresolved).toBe(false);
  });

  it("falls back to a date in the document title", () => {
    const resolved = resolveEventDate({
      documentTitle: "Microsoft Word - 2026-05-21 May Agenda DRAFT",
      fetchedAt: "2026-07-28T12:00:00.000Z",
      now,
    });
    expect(resolved.date).toBe("2026-05-21");
    expect(resolved.source).toBe("Document metadata");
  });

  it("falls back to the document published date", () => {
    const resolved = resolveEventDate({
      documentPublishedAt: "2026-06-02",
      fetchedAt: "2026-07-28T12:00:00.000Z",
      now,
    });
    expect(resolved.date).toBe("2026-06-02");
    expect(resolved.source).toBe("Document published date");
  });

  it("labels the fetch-date fallback as unresolved rather than passing it off as an event date", () => {
    const resolved = resolveEventDate({
      evidenceText: "The board discussed a change order.",
      fetchedAt: "2026-07-28T12:00:00.000Z",
      now,
    });
    expect(resolved.date).toBe("2026-07-28");
    expect(resolved.source).toBe("Fetch date (unresolved)");
    expect(resolved.unresolved).toBe(true);
  });
});
