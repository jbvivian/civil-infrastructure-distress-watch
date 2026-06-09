"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Play,
  RefreshCw,
} from "lucide-react";

interface ScrapeSourceSummary {
  id: string;
  name: string;
  url: string;
  active: boolean;
  sourceType: string;
  jurisdiction: string;
  connectorType: string;
  lastCheckedAt?: string;
  lastSuccessfulAt?: string;
  latestStatus?: "Not checked" | "Success" | "Failed" | "Partial";
  latestError?: string;
  documentsFound: number;
  signalsExtracted: number;
}

interface ScrapeResult {
  sourceId: string;
  status: "Success" | "Failed" | "Partial";
  documentsFound: number;
  documentsImported: number;
  duplicateDocumentsSkipped: number;
  signalsExtracted: number;
  errorMessage?: string;
}

export function ScrapeControls({
  sources,
}: {
  sources: ScrapeSourceSummary[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function runScrape(sourceId?: string) {
    setBusyId(sourceId ?? "all");
    setMessage("");
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceId ? { sourceId } : { all: true }),
      });
      const result = (await response.json()) as {
        results?: ScrapeResult[];
        error?: string;
      };
      if (!response.ok || !result.results) {
        throw new Error(result.error ?? "Scrape request failed.");
      }

      const succeeded = result.results.filter((item) => item.status === "Success").length;
      const partial = result.results.filter((item) => item.status === "Partial").length;
      const failed = result.results.filter((item) => item.status === "Failed").length;
      const documents = result.results.reduce(
        (total, item) => total + item.documentsImported,
        0,
      );
      const duplicates = result.results.reduce(
        (total, item) => total + item.duplicateDocumentsSkipped,
        0,
      );
      const signals = result.results.reduce(
        (total, item) => total + item.signalsExtracted,
        0,
      );
      setMessage(
        `${succeeded} successful, ${partial} partial, ${failed} failed. ${documents} document${documents === 1 ? "" : "s"} imported, ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped, and ${signals} signal${signals === 1 ? "" : "s"} extracted.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scrape request failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel mb-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Live connectors</p>
          <h2 className="mt-1 text-lg font-semibold text-[#20394e]">
            Configured public sources
          </h2>
          <p className="mt-1 text-sm text-[#66717e]">
            Each action fetches only the listed URL and records success, partial text, or failure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => runScrape()}
          disabled={busyId !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#17324d] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyId === "all" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Run all active sources
        </button>
      </div>

      <div className="divide-y">
        {sources.map((source) => (
          <div
            key={source.id}
            className="grid gap-3 p-4 lg:grid-cols-[1fr_290px_auto] lg:items-center"
          >
            <div>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#29475f] hover:underline"
              >
                {source.name} <ExternalLink className="size-3.5" />
              </a>
              <p className="mt-1 break-all font-mono text-[11px] text-[#74808c]">
                {source.url}
              </p>
              <p className="mt-1 text-xs text-[#66717e]">
                {source.connectorType} · {source.sourceType} · {source.jurisdiction}
              </p>
            </div>
            <div className="text-xs text-[#66717e]">
              <p>
                Last checked:{" "}
                <span className="font-mono text-[#344452]">
                  {source.lastCheckedAt ?? "Never"}
                </span>
              </p>
              <p>
                Last success:{" "}
                <span className="font-mono text-[#344452]">
                  {source.lastSuccessfulAt ?? "Never"}
                </span>
              </p>
              {source.latestStatus && (
                <p className="mt-1">
                  Latest:{" "}
                  <span
                    className={
                      source.latestStatus === "Failed"
                        ? "font-semibold text-[#8e3630]"
                        : source.latestStatus === "Partial"
                          ? "font-semibold text-[#a45f13]"
                          : source.latestStatus === "Success"
                            ? "font-semibold text-[#336350]"
                            : "font-semibold text-[#66717e]"
                    }
                  >
                    {source.latestStatus}
                  </span>
                </p>
              )}
              <p className="mt-1 font-mono text-[11px]">
                {source.documentsFound} found · {source.signalsExtracted} signals
              </p>
              {source.latestError && (
                <p className="mt-1 line-clamp-2 text-[#8e3630]" title={source.latestError}>
                  {source.latestError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => runScrape(source.id)}
              disabled={!source.active || busyId !== null}
              className="inline-flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-[#29475f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId === source.id ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run scrape
            </button>
          </div>
        ))}
      </div>

      {message && (
        <div className="flex items-start gap-2 border-t bg-[#f0f5f8] p-4 text-sm text-[#35536b]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {message}
        </div>
      )}
    </section>
  );
}
