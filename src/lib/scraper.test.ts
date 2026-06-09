import { describe, expect, it } from "vitest";
import {
  createContentHash,
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
});

describe("createContentHash", () => {
  it("normalizes whitespace so equivalent imports deduplicate", () => {
    expect(createContentHash("change order\n approved")).toBe(
      createContentHash("change   order approved"),
    );
  });
});
