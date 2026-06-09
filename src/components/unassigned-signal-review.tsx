"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, LoaderCircle, XCircle } from "lucide-react";
import { CategoryBadge, SeverityBadge } from "@/components/badges";
import { dismissalReasons } from "@/lib/review-workflow";
import {
  civilFirmOpportunityTypes,
  type CivilFirmOpportunityType,
  type Confidence,
  type DistressCategory,
  type ExtractedEntities,
  type Project,
  type Severity,
} from "@/lib/types";

interface UnassignedSignal {
  id: string;
  title: string;
  category: DistressCategory;
  severity: Severity;
  confidence: Confidence;
  evidenceExcerpt: string;
  sourceTitle: string;
  sourceDocumentId: string;
  assignmentStatus: "Assigned" | "Unassigned" | "Needs Review";
  detectedProjectName?: string;
  suggestedProjectId?: string;
  suggestedProjectConfidence?: Confidence;
  suggestedProjectReason?: string;
  promotedToBrief: boolean;
  civilFirmRelevance: string;
  civilFirmOpportunityType: CivilFirmOpportunityType;
  extractedEntities: ExtractedEntities;
}

function EntitySummary({ entities }: { entities: ExtractedEntities }) {
  const groups = [
    ["Projects", entities.possibleProjectNames],
    ["Owners", entities.possibleOwners],
    ["Vendors", entities.possibleVendors],
    ["Funding", entities.possibleFundingSources],
    ["Amounts", entities.possibleAmounts],
    ["Dates", entities.possibleDates],
    ["Contract / resolution IDs", entities.possibleResolutionOrContractNumbers],
    ["Project types", entities.possibleProjectTypes],
  ] as const;

  return (
    <details className="mt-4 rounded-md border bg-[#f8f9fa] p-3">
      <summary className="cursor-pointer text-xs font-semibold text-[#35536b]">
        Extracted entities
      </summary>
      <dl className="mt-3 grid gap-2 text-xs text-[#66717e] sm:grid-cols-2">
        {groups.map(([label, values]) => (
          <div key={label}>
            <dt className="font-semibold text-[#455664]">{label}</dt>
            <dd className="mt-0.5">{values.join(", ") || "None detected"}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function UnassignedSignalReview({
  signals,
  projects,
}: {
  signals: UnassignedSignal[];
  projects: Project[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [relevance, setRelevance] = useState<Record<string, string>>(
    Object.fromEntries(signals.map((signal) => [signal.id, signal.civilFirmRelevance])),
  );
  const [opportunity, setOpportunity] = useState<
    Record<string, CivilFirmOpportunityType>
  >(
    Object.fromEntries(
      signals.map((signal) => [signal.id, signal.civilFirmOpportunityType]),
    ),
  );
  const [dismissal, setDismissal] = useState<Record<string, string>>({});

  async function post(url: string, signalId: string, body: Record<string, unknown>) {
    setBusyId(signalId);
    setMessage("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, ...body }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Review action failed.");
      setMessage("Review saved. Project status and queues were recalculated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel mb-6 overflow-hidden">
      <div className="border-b p-5">
        <p className="eyebrow">Review queue</p>
        <h2 className="mt-1 text-lg font-semibold text-[#20394e]">
          Unassigned live signals
        </h2>
        <p className="mt-1 text-sm text-[#66717e]">
          Suggested matches remain unassigned until a reviewer confirms the source
          belongs to a tracked project.
        </p>
      </div>
      {signals.length === 0 ? (
        <p className="p-5 text-sm text-[#66717e]">No unassigned live signals.</p>
      ) : (
        <div className="divide-y">
          {signals.map((signal) => {
            const suggestedProject = projects.find(
              (project) => project.id === signal.suggestedProjectId,
            );
            return (
              <article key={signal.id} className="grid gap-5 p-5 xl:grid-cols-[1fr_380px]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <SeverityBadge severity={signal.severity} />
                    <CategoryBadge category={signal.category} />
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      {signal.assignmentStatus}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-[#2a4053]">{signal.title}</h3>
                  <p className="mt-1 text-xs text-[#74808c]">
                    <Link
                      href={`/sources/documents/${signal.sourceDocumentId}`}
                      className="font-semibold text-[#355b78] hover:underline"
                    >
                      {signal.sourceTitle}
                    </Link>
                    {` · ${signal.confidence} extraction confidence`}
                  </p>
                  <blockquote className="evidence-quote mt-3">
                    {signal.evidenceExcerpt}
                  </blockquote>
                  {suggestedProject && (
                    <div className="mt-4 rounded-md border border-[#c9d6df] bg-[#f0f5f8] p-3 text-sm">
                      <p className="font-semibold text-[#28465d]">
                        Suggested project: {suggestedProject.name}
                        {signal.suggestedProjectConfidence
                          ? ` (${signal.suggestedProjectConfidence})`
                          : ""}
                      </p>
                      <p className="mt-1 leading-5 text-[#53606d]">
                        {signal.suggestedProjectReason ??
                          "Source terms overlap with this tracked project."}
                      </p>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          void post("/api/signals/assign", signal.id, {
                            projectId: suggestedProject.id,
                          })
                        }
                        className="mt-3 rounded-md bg-[#17324d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Assign suggested project
                      </button>
                    </div>
                  )}
                  <EntitySummary entities={signal.extractedEntities} />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-[#53606d]">
                    Assign to another project
                    <select
                      className="field mt-1"
                      defaultValue=""
                      disabled={busyId !== null}
                      onChange={(event) => {
                        if (event.target.value) {
                          void post("/api/signals/assign", signal.id, {
                            projectId: event.target.value,
                          });
                        }
                      }}
                    >
                      <option value="" disabled>
                        Choose a tracked project
                      </option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#53606d]">
                    Why this may matter to a civil engineering firm
                    <textarea
                      className="field mt-1 min-h-28 resize-y font-normal"
                      value={relevance[signal.id] ?? ""}
                      onChange={(event) =>
                        setRelevance((current) => ({
                          ...current,
                          [signal.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#53606d]">
                    Opportunity type
                    <select
                      className="field mt-1 font-normal"
                      value={opportunity[signal.id]}
                      onChange={(event) =>
                        setOpportunity((current) => ({
                          ...current,
                          [signal.id]: event.target.value as CivilFirmOpportunityType,
                        }))
                      }
                    >
                      {civilFirmOpportunityTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() =>
                        void post("/api/signals/review", signal.id, {
                          action: "update",
                          civilFirmRelevance: relevance[signal.id],
                          civilFirmOpportunityType: opportunity[signal.id],
                        })
                      }
                      className="rounded-md border bg-white px-3 py-2 text-xs font-semibold text-[#35536b] disabled:opacity-50"
                    >
                      Save review metadata
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() =>
                        void post("/api/signals/review", signal.id, {
                          action: "promote",
                          promoted: !signal.promotedToBrief,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-2 text-xs font-semibold text-[#35536b] disabled:opacity-50"
                    >
                      <BookmarkCheck className="size-3.5" />
                      {signal.promotedToBrief ? "Unpromote" : "Promote to brief"}
                    </button>
                  </div>
                  <div className="rounded-md border border-red-100 bg-red-50/40 p-3">
                    <label className="block text-xs font-semibold text-[#7b413d]">
                      Dismissal reason
                      <select
                        className="field mt-1 font-normal"
                        value={dismissal[signal.id] ?? ""}
                        onChange={(event) =>
                          setDismissal((current) => ({
                            ...current,
                            [signal.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Choose a reason</option>
                        {dismissalReasons.map((reason) => (
                          <option key={reason}>{reason}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busyId !== null || !dismissal[signal.id]}
                      onClick={() =>
                        void post("/api/signals/review", signal.id, {
                          action: "dismiss",
                          reason: dismissal[signal.id],
                        })
                      }
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-[#8e3630] disabled:opacity-50"
                    >
                      <XCircle className="size-3.5" /> Dismiss signal
                    </button>
                  </div>
                  {busyId === signal.id && (
                    <p className="inline-flex items-center gap-2 text-xs text-[#66717e]">
                      <LoaderCircle className="size-3.5 animate-spin" /> Saving review
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {message && (
        <p className="border-t bg-[#f0f5f8] p-4 text-sm text-[#35536b]">{message}</p>
      )}
    </section>
  );
}
