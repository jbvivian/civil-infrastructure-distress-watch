import {
  getMonitoredSource,
  monitoredSources,
} from "@/config/monitored-sources";
import {
  completeScrapeRun,
  type ScrapePersistenceResult,
} from "@/lib/repository";
import { fetchHtmlSource } from "@/lib/scraper";

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "The source could not be fetched.";
  const cause = error.cause as { code?: string; message?: string } | undefined;
  if (!cause) return error.message;
  const causeDetail = [cause.code, cause.message].filter(Boolean).join(": ");
  return causeDetail ? `${error.message} (${causeDetail})` : error.message;
}

export async function runSourceScrape(
  sourceId: string,
): Promise<ScrapePersistenceResult> {
  const source = getMonitoredSource(sourceId);
  if (!source) throw new Error(`Unknown configured source: ${sourceId}`);
  if (!source.active) throw new Error(`Source ${sourceId} is inactive.`);

  const startedAt = new Date().toISOString();
  try {
    const page = await fetchHtmlSource(source.url);
    return completeScrapeRun({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: page.status,
      urlFetched: page.url,
      statusCode: page.statusCode,
      title: page.title,
      fetchedAt: page.fetchedAt,
      rawText: page.rawText,
      text: page.text,
      contentHash: page.contentHash,
      errorMessage: page.errorMessage,
    });
  } catch (error) {
    const errorMessage = describeError(error);
    return completeScrapeRun({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "Failed",
      urlFetched: source.url,
      errorMessage,
    });
  }
}

export async function runAllSourceScrapes(): Promise<ScrapePersistenceResult[]> {
  const results: ScrapePersistenceResult[] = [];
  for (const source of monitoredSources.filter((item) => item.active)) {
    results.push(await runSourceScrape(source.id));
  }
  return results;
}
