import {
  runAllSourceScrapes,
  runSourceScrape,
} from "../src/lib/scrape-service";

function printResult(result: Awaited<ReturnType<typeof runSourceScrape>>) {
  const detail = `${result.documentsImported}/${result.documentsFound} imported, ${result.duplicateDocumentsSkipped} duplicates, ${result.signalsExtracted} signals`;
  console.log(`${result.sourceId}: ${result.status} (${detail})`);
  if (result.errorMessage) console.log(`  ${result.errorMessage}`);
}

async function main() {
  const sourceFlag = process.argv.indexOf("--source");
  const sourceId = sourceFlag >= 0 ? process.argv[sourceFlag + 1] : undefined;

  if (sourceFlag >= 0 && !sourceId) {
    throw new Error(
      "Provide a source ID, for example: npm run scrape:source -- live-orange-county-legislature",
    );
  }

  if (sourceId) {
    printResult(await runSourceScrape(sourceId));
    return;
  }

  const results = await runAllSourceScrapes();
  results.forEach(printResult);
  const failed = results.filter((result) => result.status === "Failed").length;
  const partial = results.filter((result) => result.status === "Partial").length;
  console.log(
    `Completed ${results.length} sources: ${failed} failed, ${partial} partial.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
