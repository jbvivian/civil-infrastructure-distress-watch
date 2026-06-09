"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, SearchCheck } from "lucide-react";
import { CategoryBadge, SeverityBadge } from "@/components/badges";
import type { ExtractedSignal, Project, SourceType } from "@/lib/types";

const sourceTypes: SourceType[] = [
  "Town board agenda",
  "Town board minutes",
  "Planning board agenda",
  "Planning board minutes",
  "County legislature agenda",
  "School board agenda",
  "Procurement notice",
  "Bid result",
  "Comptroller audit",
  "Local media",
  "Meeting transcript",
];

const sampleText =
  "The board reviewed a change order for additional engineering services after unsuitable soil was identified near the pump station. The contractor requested a time extension. Staff noted that DEC approval remains pending and the grant deadline is September 30.";

export function IngestWorkflow({ projects }: { projects: Project[] }) {
  const [text, setText] = useState(sampleText);
  const [signals, setSignals] = useState<ExtractedSignal[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function extract() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Extraction failed.");
      const result = (await response.json()) as { signals: ExtractedSignal[] };
      setSignals(result.signals);
      setSelected(new Set(result.signals.map((_, index) => index)));
      setMessage(
        result.signals.length === 0
          ? "No rule matches were found. Try source text containing a configured distress phrase."
          : `${result.signals.length} candidate signals found. Review selections before saving.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.get("projectId"),
          sourceName: form.get("sourceName"),
          sourceType: form.get("sourceType"),
          sourceUrl: form.get("sourceUrl"),
          documentTitle: form.get("documentTitle"),
          publishedAt: form.get("publishedAt"),
          text,
          signals: signals.filter((_, index) => selected.has(index)),
        }),
      });
      const result = (await response.json()) as { count?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Save failed.");
      setMessage(`${result.count} reviewed signals saved to the local dataset.`);
      setSignals([]);
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="panel p-5">
        <p className="eyebrow">1 · Source document</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#53606d] sm:col-span-2">
            Project
            <select name="projectId" className="field mt-1" required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.owner}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#53606d]">
            Source name
            <input name="sourceName" className="field mt-1" defaultValue="Manual public record upload" required />
          </label>
          <label className="text-xs font-semibold text-[#53606d]">
            Source type
            <select name="sourceType" className="field mt-1" defaultValue="Town board agenda">
              {sourceTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#53606d]">
            Document title
            <input name="documentTitle" className="field mt-1" defaultValue="Manual review document" required />
          </label>
          <label className="text-xs font-semibold text-[#53606d]">
            Published date
            <input name="publishedAt" type="date" className="field mt-1" defaultValue="2026-06-08" required />
          </label>
          <label className="text-xs font-semibold text-[#53606d] sm:col-span-2">
            Public URL
            <input name="sourceUrl" type="url" className="field mt-1" defaultValue="https://example.gov/fictional/manual-document" required />
          </label>
          <label className="text-xs font-semibold text-[#53606d] sm:col-span-2">
            Source text
            <textarea
              className="field mt-1 min-h-64 resize-y font-mono text-xs leading-5"
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
            />
          </label>
        </div>
        <button
          type="button"
          onClick={extract}
          disabled={busy || text.trim().length < 10}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#17324d] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <SearchCheck className="size-4" />}
          Run rule-based extraction
        </button>
      </section>

      <section className="panel p-5">
        <p className="eyebrow">2 · Review extracted signals</p>
        {signals.length === 0 ? (
          <div className="mt-4 grid min-h-72 place-items-center rounded-lg border border-dashed bg-[#fafbfb] p-8 text-center">
            <div>
              <SearchCheck className="mx-auto size-7 text-slate-400" />
              <p className="mt-3 font-semibold text-[#344452]">No candidates to review yet</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#66717e]">
                Paste a public record and run extraction. Matching phrases will appear here with evidence and cautious implication copy.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {signals.map((signal, index) => (
              <label key={`${signal.category}-${signal.matchedTerm}-${index}`} className="block cursor-pointer rounded-lg border bg-[#fafbfb] p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[#17324d]"
                    checked={selected.has(index)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      setSelected(next);
                    }}
                  />
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <SeverityBadge severity={signal.severity} />
                      <CategoryBadge category={signal.category} />
                    </div>
                    <p className="mt-2 font-semibold text-[#2b4052]">{signal.title}</p>
                    <p className="mt-1 text-xs text-[#66717e]">Matched phrase: “{signal.matchedTerm}”</p>
                    <blockquote className="evidence-quote mt-3">{signal.evidenceExcerpt}</blockquote>
                    <p className="mt-3 text-sm leading-6 text-[#40505d]">{signal.interpretation}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-[#c9d6df] bg-[#f0f5f8] p-3 text-sm text-[#35536b]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || selected.size === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#336350] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" />}
          Save {selected.size || ""} reviewed signal{selected.size === 1 ? "" : "s"}
        </button>
      </section>
    </form>
  );
}
