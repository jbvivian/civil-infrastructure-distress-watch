import { describe, expect, it } from "vitest";
import {
  createContentHash,
  cleanReadableText,
  extractReadableHtml,
} from "@/lib/scraper";

describe("extractReadableHtml", () => {
  it("extracts a title and readable page text while removing scripts", () => {
    const result = extractReadableHtml(
      `
        <html>
          <head><title>Public Works Agenda</title></head>
          <body>
            <nav>Site navigation</nav>
            <main>
              <h1>June meeting</h1>
              <p>The board reviewed a change order for the pump station.</p>
              <script>throw new Error("not content")</script>
            </main>
          </body>
        </html>
      `,
      "https://example.gov/agenda",
    );

    expect(result.title).toBe("Public Works Agenda");
    expect(result.text).toContain("June meeting");
    expect(result.text).toContain("change order");
    expect(result.text).not.toContain("not content");
  });

  it("collects direct PDF links without recursively crawling HTML pages", () => {
    const result = extractReadableHtml(
      `
        <main>
          <h1>Committee records</h1>
          <a href="/docs/agenda.pdf">June agenda PDF</a>
          <a href="/meetings/archive">Meeting archive</a>
        </main>
      `,
      "https://example.gov/committee",
    );

    expect(result.pdfLinks).toEqual([
      {
        url: "https://example.gov/docs/agenda.pdf",
        title: "June agenda PDF",
      },
    ]);
  });
});

describe("createContentHash", () => {
  it("normalizes whitespace so equivalent imports deduplicate", () => {
    expect(createContentHash("change order\n approved", "https://example.gov/a")).toBe(
      createContentHash("change   order approved", "https://example.gov/a"),
    );
  });

  it("keeps identical text at different configured document URLs distinct", () => {
    expect(createContentHash("same text", "https://example.gov/a")).not.toBe(
      createContentHash("same text", "https://example.gov/b"),
    );
  });
});

describe("cleanReadableText", () => {
  it("removes PDF control characters while preserving readable line breaks", () => {
    expect(cleanReadableText("Capital\u0000 plan\nBridge\u0007 work")).toBe(
      "Capital plan\nBridge work",
    );
  });
});
