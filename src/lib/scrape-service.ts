import {
  getMonitoredSource,
  monitoredSources,
} from "@/config/monitored-sources";
import {
  completeScrapeRun,
  type ScrapePersistenceResult,
} from "@/lib/repository";
import { fetchConfiguredSource } from "@/lib/scraper";

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "The source could not be fetched.";
  const cause = error.cause as { code?: string; message?: string } | undefined;
  if (!cause) return error.message;
  const causeDetail = [cause.code, cause.message].filter(Boolean).join(": ");
  return causeDetail ? `${error.message} (${causeDetail})` : error.message;
}

export async function runSourceScrape(
  sourceIdOrName: string,
): Promise<ScrapePersistenceResult> {
  const source = getMonitoredSource(sourceIdOrName);
  if (!source) throw new Error(`Unknown configured source: ${sourceIdOrName}`);
  if (!source.active || !source.scrapeEnabled) {
    throw new Error(`Source ${source.id} is not enabled for scraping.`);
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await fetchConfiguredSource(source);
    return completeScrapeRun({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: result.status,
      url: result.url,
      httpStatus: result.httpStatus,
      documents: result.documents,
      errorMessage: result.errorMessage,
      logLines: result.logLines,
    });
  } catch (error) {
    const errorMessage = describeError(error);
    return completeScrapeRun({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "Failed",
      url: source.url,
      documents: [],
      errorMessage,
      logLines: [`Source fetch failed: ${errorMessage}`],
    });
  }
}

export async function runAllSourceScrapes(): Promise<ScrapePersistenceResult[]> {
  const results: ScrapePersistenceResult[] = [];
  for (const source of monitoredSources.filter(
    (item) => item.active && item.scrapeEnabled,
  )) {
    results.push(await runSourceScrape(source.id));
  }
  return results;
}
