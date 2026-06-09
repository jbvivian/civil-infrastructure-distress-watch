"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkCheck,
  BookmarkMinus,
  ExternalLink,
  LoaderCircle,
  Search,
  XCircle,
} from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { dismissalReasons, filterSignals } from "@/lib/review-workflow";
import type {
  CivilFirmOpportunityType,
  Confidence,
  DataOrigin,
  DistressCategory,
  ExtractedEntities,
  Severity,
  SignalReviewStatus,
} from "@/lib/types";

export interface SignalListItem {
  id: string;
  title: string;
  category: DistressCategory;
  signalType: string;
  projectName: string;
  projectSlug: string | null;
  sourceTitle: string;
  sourceUrl: string;
  sourceDocumentId: string;
  sourceType: string;
  jurisdiction: string;
  county?: string;
  dateObserved: string;
  evidenceExcerpt: string;
  interpretation: string;
  possibleConsequence: string;
  recommendedAction: string;
  alternativeExplanation: string;
  severity: Severity;
  confidence: Confidence;
  assignmentStatus?: "Assigned" | "Unassigned" | "Needs Review";
  signalReviewStatus: SignalReviewStatus;
  dataOrigin: DataOrigin;
  promotedToBrief: boolean;
  promotionNote?: string;
  dismissed: boolean;
  dismissedReason?: string;
  severityReason: string;
  confidenceReason: string;
  scoringFactors: string[];
  civilFirmRelevance: string;
  civilFirmOpportunityType: CivilFirmOpportunityType;
  buyerPersona?: string;
  extractedEntities: ExtractedEntities;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function SignalList({ signals }: { signals: SignalListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [origin, setOrigin] = useState<DataOrigin | "All">("All");
  const [reviewStatus, setReviewStatus] = useState<SignalReviewStatus | "All">("All");
  const [sourceType, setSourceType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [opportunityType, setOpportunityType] =
    useState<CivilFirmOpportunityType | "All">("All");
  const [liveOnly, setLiveOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return filterSignals(signals, {
      dataOrigin: origin,
      liveOnly,
      reviewStatus,
      sourceType,
      jurisdiction,
      opportunityType,
      includeDismissed: reviewStatus === "Dismissed",
    }).filter(
      (signal) =>
        `${signal.title} ${signal.projectName} ${signal.evidenceExcerpt} ${signal.sourceTitle}`
          .toLowerCase()
          .includes(normalized) &&
        (!category || signal.category === category) &&
        (!severity || signal.severity === severity),
    );
  }, [
    signals,
    query,
    category,
    severity,
    origin,
    liveOnly,
    reviewStatus,
    sourceType,
    jurisdiction,
    opportunityType,
  ]);

  async function review(
    signalId: string,
    payload: Record<string, unknown>,
  ) {
    setBusyId(signalId);
    setMessage("");
    try {
      const response = await fetch("/api/signals/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, ...payload }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Review action failed.");
      setMessage("Signal review state saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setBusyId(null);
    }
  }

  function dismiss(signalId: string) {
    const reason = window.prompt(
      `Dismissal reason:\n${dismissalReasons.join("\n")}`,
      dismissalReasons[0],
    );
    if (reason?.trim()) void review(signalId, { action: "dismiss", reason });
  }

  return (
    <>
      <section className="panel mb-6 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search evidence, projects, sources, or signal titles"
            aria-label="Search signals"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {unique(signals.map((signal) => signal.category)).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className="field" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">All severities</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select
            className="field"
            value={origin}
            onChange={(event) => setOrigin(event.target.value as DataOrigin | "All")}
          >
            <option value="All">All data origins</option>
            <option>Scraped</option>
            <option>Manual</option>
            <option>Seed</option>
          </select>
          <select
            className="field"
            value={reviewStatus}
            onChange={(event) =>
              setReviewStatus(event.target.value as SignalReviewStatus | "All")
            }
          >
            <option value="All">All active review statuses</option>
            <option>Needs Review</option>
            <option>Assigned</option>
            <option>Promoted</option>
            <option>Dismissed</option>
          </select>
          <select className="field" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
            <option value="">All source types</option>
            {unique(signals.map((signal) => signal.sourceType)).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select className="field" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}>
            <option value="">All jurisdictions</option>
            {unique(signals.map((signal) => signal.jurisdiction)).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="field"
            value={opportunityType}
            onChange={(event) =>
              setOpportunityType(event.target.value as CivilFirmOpportunityType | "All")
            }
          >
            <option value="All">All commercial relevance types</option>
            {unique(signals.map((signal) => signal.civilFirmOpportunityType)).map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          <label className="flex items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-[#53606d]">
            <input
              type="checkbox"
              checked={liveOnly}
              onChange={(event) => setLiveOnly(event.target.checked)}
              className="size-4 accent-[#17324d]"
            />
            Live-source only
          </label>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#66717e]">
        <p>{filtered.length} signals shown</p>
        {message && <p className="font-medium text-[#35536b]">{message}</p>}
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No signals match" description="Try a broader search or clear a filter." />
      ) : (
        <div className="space-y-4">
          {filtered.map((signal) => (
            <article key={signal.id} className="panel overflow-hidden">
              <div className="border-b bg-[#f8f9fa] p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <SeverityBadge severity={signal.severity} />
                      <CategoryBadge category={signal.category} />
                      <ConfidenceBadge confidence={signal.confidence} />
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold leading-none text-slate-650">
                        {signal.dataOrigin}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${
                          signal.signalReviewStatus === "Dismissed"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : signal.signalReviewStatus === "Promoted"
                              ? "border-green-200 bg-green-50 text-green-800"
                              : signal.signalReviewStatus === "Needs Review"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-blue-200 bg-blue-50 text-blue-800"
                        }`}
                      >
                        {signal.signalReviewStatus}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-[#20394e]">{signal.title}</h2>
                    <p className="mt-1 text-sm text-[#66717e]">
                      {signal.projectSlug ? (
                        <Link href={`/projects/${signal.projectSlug}`} className="font-semibold text-[#355b78] hover:underline">
                          {signal.projectName}
                        </Link>
                      ) : (
                        <span className="font-semibold text-[#a45f13]">{signal.projectName}</span>
                      )}
                      {" · "}
                      <span className="font-mono text-xs">{formatDate(signal.dateObserved)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId !== null || signal.dismissed}
                      onClick={() =>
                        void review(signal.id, {
                          action: "promote",
                          promoted: !signal.promotedToBrief,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-semibold text-[#35536b] disabled:opacity-50"
                    >
                      {busyId === signal.id ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : signal.promotedToBrief ? (
                        <BookmarkMinus className="size-3.5" />
                      ) : (
                        <BookmarkCheck className="size-3.5" />
                      )}
                      {signal.promotedToBrief ? "Unpromote" : "Promote to brief"}
                    </button>
                    {!signal.dismissed && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => dismiss(signal.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-[#8e3630] disabled:opacity-50"
                      >
                        <XCircle className="size-3.5" /> Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <p className="eyebrow">Evidence</p>
                  <blockquote className="evidence-quote mt-2">{signal.evidenceExcerpt}</blockquote>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <Link
                      href={`/sources/documents/${signal.sourceDocumentId}`}
                      className="font-semibold text-[#355b78] hover:underline"
                    >
                      Inspect extracted source text
                    </Link>
                    <a
                      href={signal.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#355b78] hover:underline"
                    >
                      Original public URL <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-[#74808c]">
                    {signal.sourceTitle} · {signal.sourceType} · {signal.jurisdiction}
                  </p>

                  <p className="eyebrow mt-6">Alternative explanation</p>
                  <p className="mt-2 text-sm leading-6 text-[#5e6974]">{signal.alternativeExplanation}</p>

                  {signal.dismissedReason && (
                    <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <strong>Dismissed:</strong> {signal.dismissedReason}
                    </div>
                  )}
                </div>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="eyebrow">Interpretation</dt>
                    <dd className="mt-1.5 leading-6 text-[#344452]">{signal.interpretation}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Possible consequence</dt>
                    <dd className="mt-1.5 leading-6 text-[#344452]">{signal.possibleConsequence}</dd>
                  </div>
                  <div className="rounded-md border border-[#c9d6df] bg-[#f0f5f8] p-3">
                    <dt className="eyebrow">Recommended review action</dt>
                    <dd className="mt-1.5 font-medium leading-6 text-[#28465d]">{signal.recommendedAction}</dd>
                  </div>
                  <div className="rounded-md border border-[#d7dfd6] bg-[#f5f8f4] p-3">
                    <dt className="eyebrow">Why a civil engineering firm may care</dt>
                    <dd className="mt-1.5 leading-6 text-[#344f43]">{signal.civilFirmRelevance}</dd>
                    <dd className="mt-2 text-xs font-semibold text-[#456353]">
                      {signal.civilFirmOpportunityType}
                    </dd>
                  </div>
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer font-semibold text-[#35536b]">
                      Scoring rationale and extracted entities
                    </summary>
                    <p className="mt-3 leading-6 text-[#53606d]">{signal.severityReason}</p>
                    <p className="mt-2 leading-6 text-[#53606d]">{signal.confidenceReason}</p>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#66717e]">
                      {signal.scoringFactors.map((factor) => (
                        <li key={factor}>{factor}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-[#66717e]">
                      Project names: {signal.extractedEntities.possibleProjectNames.join(", ") || "None detected"}
                    </p>
                    <p className="mt-1 text-xs text-[#66717e]">
                      Amounts: {signal.extractedEntities.possibleAmounts.join(", ") || "None detected"}
                    </p>
                  </details>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
