"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import { filterSignals } from "@/lib/review-workflow";
import type {
  CivilFirmOpportunityType,
  Confidence,
  DataOrigin,
  DistressCategory,
  Severity,
  Signal,
  SignalReviewStatus,
} from "@/lib/types";

export interface WeeklyBriefItem extends Signal {
  projectName: string;
  projectSlug: string | null;
  sourceTitle: string;
  sourceDocumentId: string;
  sourceType: string;
  jurisdiction: string;
  county?: string;
  dataOrigin: DataOrigin;
  signalReviewStatus: SignalReviewStatus;
  civilFirmOpportunityType: CivilFirmOpportunityType;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function WeeklyBriefList({ signals }: { signals: WeeklyBriefItem[] }) {
  const [origin, setOrigin] = useState<DataOrigin | "All">("All");
  const [reviewStatus, setReviewStatus] = useState<SignalReviewStatus | "All">("All");
  const [sourceType, setSourceType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [county, setCounty] = useState("");
  const [opportunityType, setOpportunityType] =
    useState<CivilFirmOpportunityType | "All">("All");
  const [liveOnly, setLiveOnly] = useState(false);

  const filtered = useMemo(
    () =>
      filterSignals(signals, {
        dataOrigin: origin,
        reviewStatus,
        sourceType,
        jurisdiction,
        opportunityType,
        liveOnly,
      }).filter((signal) => !county || signal.county === county),
    [
      signals,
      origin,
      reviewStatus,
      sourceType,
      jurisdiction,
      county,
      opportunityType,
      liveOnly,
    ],
  );

  return (
    <>
      <section className="panel mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          </select>
          <select
            className="field"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
          >
            <option value="">All source types</option>
            {unique(signals.map((signal) => signal.sourceType)).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className="field"
            value={jurisdiction}
            onChange={(event) => setJurisdiction(event.target.value)}
          >
            <option value="">All jurisdictions</option>
            {unique(signals.map((signal) => signal.jurisdiction)).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className="field"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
          >
            <option value="">All counties</option>
            {unique(signals.map((signal) => signal.county ?? "")).map((value) => (
              <option key={value}>{value}</option>
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
              (value) => (
                <option key={value}>{value}</option>
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

      <p className="mb-3 text-sm text-[#66717e]">
        {filtered.length} priority signals shown. Promoted items remain first.
      </p>
      <div className="space-y-4">
        {filtered.map((signal, index) => (
          <article key={signal.id} className="panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[#e8eef2] font-mono text-sm font-semibold text-[#35536b]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={signal.severity as Severity} />
                  <CategoryBadge category={signal.category as DistressCategory} />
                  <ConfidenceBadge confidence={signal.confidence as Confidence} />
                  {signal.promotedToBrief && (
                    <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-800">
                      Promoted review item
                    </span>
                  )}
                  <span className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold text-[#53606d]">
                    {signal.dataOrigin}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-[#20394e]">
                  {signal.title}
                </h2>
                <p className="mt-1 text-sm text-[#66717e]">
                  {signal.projectSlug ? (
                    <Link
                      href={`/projects/${signal.projectSlug}`}
                      className="font-semibold text-[#355b78] hover:underline"
                    >
                      {signal.projectName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#a45f13]">
                      {signal.projectName}
                    </span>
                  )}
                  {` · ${formatDate(signal.dateObserved)} · `}
                  <Link
                    href={`/sources/documents/${signal.sourceDocumentId}`}
                    className="font-semibold text-[#355b78] hover:underline"
                  >
                    {signal.sourceTitle}
                  </Link>
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="eyebrow">Why it may matter</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#40505d]">
                      {signal.interpretation} {signal.possibleConsequence}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#66717e]">
                      {signal.severityReason} {signal.confidenceReason}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#d7dfd6] bg-[#f5f8f4] p-3">
                    <p className="eyebrow">Why a civil engineering firm may care</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#344f43]">
                      {signal.civilFirmRelevance}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#456353]">
                      {signal.civilFirmOpportunityType}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
