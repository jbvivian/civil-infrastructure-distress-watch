/**
 * Replays the extractor across every real scraped document in the local dataset
 * and reports volume, duplication, and per-term breakdown.
 *
 * This exists so extractor changes can be measured against the real corpus
 * instead of asserted. Run it before and after any rule change.
 *
 * Usage: npx tsx scripts/measure-extraction.ts [--json out.json] [--verbose]
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { extractSignals } from "../src/lib/extractor";
import type { Dataset, SourceDocument } from "../src/lib/types";

const localDataPath = path.join(process.cwd(), "data", "local-data.json");

function evidenceKey(term: string, excerpt: string): string {
  return `${term}||${excerpt.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  const jsonFlag = process.argv.indexOf("--json");
  const raw = await fs.readFile(localDataPath, "utf8");
  const dataset = JSON.parse(raw) as Dataset;

  const scraped: SourceDocument[] = dataset.documents.filter(
    (document) => document.dataOrigin === "Scraped" || Boolean(document.fetchedAt),
  );

  const rows: Array<{
    documentId: string;
    documentTitle: string;
    term: string;
    category: string;
    severity: string;
    confidence: string;
    excerpt: string;
    suppressed?: string;
  }> = [];

  for (const document of scraped) {
    const text = document.extractedText ?? document.text ?? "";
    if (!text) continue;
    for (const signal of extractSignals(text, { documentTitle: document.title })) {
      rows.push({
        documentId: document.id,
        documentTitle: document.title,
        term: signal.matchedTerm,
        category: signal.category,
        severity: signal.severity,
        confidence: signal.confidence,
        excerpt: signal.evidenceExcerpt,
      });
    }
  }

  const byTerm = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byConfidence = new Map<string, number>();
  const byEvidence = new Map<string, number>();
  for (const row of rows) {
    byTerm.set(row.term, (byTerm.get(row.term) ?? 0) + 1);
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
    byConfidence.set(row.confidence, (byConfidence.get(row.confidence) ?? 0) + 1);
    const key = evidenceKey(row.term, row.excerpt);
    byEvidence.set(key, (byEvidence.get(key) ?? 0) + 1);
  }

  const distinctEvidence = byEvidence.size;
  const repeated = [...byEvidence.values()].filter((count) => count > 1).length;
  const redundant = rows.length - distinctEvidence;

  const sortDesc = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]);

  console.log("=".repeat(64));
  console.log("EXTRACTION MEASUREMENT");
  console.log("=".repeat(64));
  console.log(`Documents replayed          : ${scraped.length}`);
  console.log(`Signals produced            : ${rows.length}`);
  console.log(`Distinct evidence           : ${distinctEvidence}`);
  console.log(
    `Redundant signals           : ${redundant} (${rows.length ? Math.round((redundant / rows.length) * 100) : 0}% of output)`,
  );
  console.log(`Evidence seen more than once: ${repeated}`);
  console.log(
    `Signals per document        : ${scraped.length ? (rows.length / scraped.length).toFixed(2) : "0"}`,
  );

  console.log("\n-- by confidence --");
  for (const [key, count] of sortDesc(byConfidence)) console.log(`  ${key.padEnd(10)} ${count}`);

  console.log("\n-- by category --");
  for (const [key, count] of sortDesc(byCategory)) console.log(`  ${key.padEnd(32)} ${count}`);

  console.log("\n-- by matched term --");
  for (const [key, count] of sortDesc(byTerm)) console.log(`  ${key.padEnd(32)} ${count}`);

  if (verbose) {
    console.log("\n-- distinct evidence --");
    const seen = new Set<string>();
    for (const row of rows) {
      const key = evidenceKey(row.term, row.excerpt);
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(
        `\n  [${row.category} / ${row.severity} / ${row.confidence}] term="${row.term}" x${byEvidence.get(key)}`,
      );
      console.log(`    doc: ${row.documentTitle.slice(0, 78)}`);
      console.log(`    ev : ${row.excerpt.replace(/\s+/g, " ").slice(0, 200)}`);
    }
  }

  if (jsonFlag >= 0 && process.argv[jsonFlag + 1]) {
    await fs.writeFile(
      process.argv[jsonFlag + 1],
      `${JSON.stringify(
        { documents: scraped.length, signals: rows.length, distinctEvidence, redundant, rows },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`\nWrote ${process.argv[jsonFlag + 1]}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
