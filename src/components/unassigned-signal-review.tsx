"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { CategoryBadge, SeverityBadge } from "@/components/badges";
import type {
  DistressCategory,
  Project,
  Severity,
} from "@/lib/types";

interface UnassignedSignal {
  id: string;
  title: string;
  category: DistressCategory;
  severity: Severity;
  evidenceExcerpt: string;
  sourceTitle: string;
}

export function UnassignedSignalReview({
  signals,
  projects,
}: {
  signals: UnassignedSignal[];
  projects: Project[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function assign(signalId: string, projectId: string) {
    if (!projectId) return;
    setAssigning(signalId);
    setMessage("");
    try {
      const response = await fetch("/api/signals/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId, projectId }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Assignment failed.");
      setMessage("Signal assigned and project status recalculated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment failed.");
    } finally {
      setAssigning(null);
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
          Assign a deterministic extraction match only when the source evidence belongs to a tracked project.
        </p>
      </div>
      {signals.length === 0 ? (
        <p className="p-5 text-sm text-[#66717e]">No unassigned live signals.</p>
      ) : (
        <div className="divide-y">
          {signals.map((signal) => (
            <article
              key={signal.id}
              className="grid gap-4 p-5 lg:grid-cols-[1fr_320px] lg:items-start"
            >
              <div>
                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={signal.severity} />
                  <CategoryBadge category={signal.category} />
                </div>
                <h3 className="mt-2 font-semibold text-[#2a4053]">{signal.title}</h3>
                <p className="mt-1 text-xs text-[#74808c]">{signal.sourceTitle}</p>
                <blockquote className="evidence-quote mt-3">
                  {signal.evidenceExcerpt}
                </blockquote>
              </div>
              <label className="text-xs font-semibold text-[#53606d]">
                Assign to project
                <select
                  className="field mt-1"
                  defaultValue=""
                  disabled={assigning !== null}
                  onChange={(event) => {
                    void assign(signal.id, event.target.value);
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
                {assigning === signal.id && (
                  <span className="mt-2 inline-flex items-center gap-2 font-normal text-[#66717e]">
                    <LoaderCircle className="size-3.5 animate-spin" /> Assigning
                  </span>
                )}
              </label>
            </article>
          ))}
        </div>
      )}
      {message && (
        <p className="border-t bg-[#f0f5f8] p-4 text-sm text-[#35536b]">{message}</p>
      )}
    </section>
  );
}
