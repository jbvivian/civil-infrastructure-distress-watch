"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import type { Confidence, DistressCategory, Severity } from "@/lib/types";

export interface SignalListItem {
  id: string;
  title: string;
  category: DistressCategory;
  signalType: string;
  projectName: string;
  projectSlug: string | null;
  sourceTitle: string;
  sourceUrl: string;
  dateObserved: string;
  evidenceExcerpt: string;
  interpretation: string;
  possibleConsequence: string;
  recommendedAction: string;
  alternativeExplanation: string;
  severity: Severity;
  confidence: Confidence;
}

export function SignalList({ signals }: { signals: SignalListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return signals.filter(
      (signal) =>
        `${signal.title} ${signal.projectName} ${signal.evidenceExcerpt}`
          .toLowerCase()
          .includes(normalized) &&
        (!category || signal.category === category) &&
        (!severity || signal.severity === severity),
    );
  }, [signals, query, category, severity]);

  return (
    <>
      <section className="panel mb-6 grid gap-3 p-4 md:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search evidence, projects, or signal titles"
            aria-label="Search signals"
          />
        </div>
        <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {[...new Set(signals.map((signal) => signal.category))].sort().map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="field" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">All severities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </section>

      <p className="mb-3 text-sm text-[#66717e]">{filtered.length} signals shown</p>
      {filtered.length === 0 ? (
        <EmptyState title="No signals match" description="Try a broader search or clear a filter." />
      ) : (
        <div className="space-y-4">
          {filtered.map((signal) => (
            <article key={signal.id} className="panel overflow-hidden">
              <div className="border-b bg-[#f8f9fa] p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <SeverityBadge severity={signal.severity} />
                      <CategoryBadge category={signal.category} />
                      <ConfidenceBadge confidence={signal.confidence} />
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
                  <a
                    href={signal.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#355b78] hover:underline"
                  >
                    {signal.sourceTitle}
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
              <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_1fr]">
                <div>
                  <p className="eyebrow">Evidence</p>
                  <blockquote className="evidence-quote mt-2">{signal.evidenceExcerpt}</blockquote>
                  <p className="eyebrow mt-6">Alternative explanation</p>
                  <p className="mt-2 text-sm leading-6 text-[#5e6974]">{signal.alternativeExplanation}</p>
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
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
