import { getDataset } from "@/lib/repository";
import { buildBriefEdition, effectiveDate } from "@/lib/review-workflow";
import type { Signal } from "@/lib/types";

export async function GET(request: Request) {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));

  const url = new URL(request.url);
  const requestedWindow = Number(url.searchParams.get("windowDays") ?? 7);
  const edition = buildBriefEdition(dataset.signals, {
    windowDays: Number.isFinite(requestedWindow) && requestedWindow > 0 ? requestedWindow : 7,
    limit: 16,
  });

  const formatDay = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

  function signalMarkdown(signal: Signal, index: number) {
    const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
    const dateNote =
      signal.eventDateSource === "Fetch date (unresolved)"
        ? `${effectiveDate(signal)} — not resolved from the source; this is when the document was retrieved`
        : `${effectiveDate(signal)} — from ${(signal.eventDateSource ?? "source").toLowerCase()}`;

    return [
      `### ${index + 1}. ${signal.title}`,
      `**Project:** ${project?.name ?? "Unassigned review item"}  `,
      `**Event date:** ${dateNote}  `,
      `**Category:** ${signal.category} · **Severity:** ${signal.severity} · **Confidence:** ${signal.confidence}`,
      ...(signal.timesSeen && signal.timesSeen > 1
        ? [
            `**Seen:** ${signal.timesSeen} times, most recently ${(signal.lastSeenAt ?? "").slice(0, 10)}`,
          ]
        : []),
      "",
      `**Evidence:** ${signal.evidenceExcerpt}`,
      "",
      `**Possible implication:** ${signal.interpretation} ${signal.possibleConsequence}`,
      "",
      `**Scoring rationale:** ${signal.severityReason} ${signal.confidenceReason}`,
      "",
      `**Why a civil engineering firm may care:** ${signal.civilFirmRelevance}`,
      "",
      `**Opportunity type:** ${signal.civilFirmOpportunityType ?? "Competitive intelligence only"}`,
      "",
      `**Recommended review action:** ${signal.recommendedAction}`,
      "",
      `**Alternative explanation:** ${signal.alternativeExplanation}`,
      "",
    ];
  }

  function section(heading: string, note: string, signals: Signal[], empty: string) {
    return [
      `## ${heading}`,
      "",
      `_${note}_`,
      "",
      ...(signals.length > 0 ? signals.flatMap(signalMarkdown) : [empty, ""]),
    ];
  }

  const markdown = [
    "# Civil Infrastructure Distress Watch",
    `## Brief for ${formatDay(edition.windowStart)} to ${formatDay(edition.windowEnd)}`,
    "",
    `**${edition.counts.newThisPeriod} new · ${edition.counts.stillOpen} still open · ${edition.counts.promoted} promoted · ${edition.counts.undated} undated**`,
    "",
    "> Review cues, not findings of project failure. Every item must be verified against the linked public source before it is acted on.",
    "",
    ...section(
      "Promoted Review Items",
      "Manually prioritised by a reviewer.",
      edition.promoted,
      "No signals have been manually promoted.",
    ),
    ...section(
      "New This Period",
      "First appearance in a brief, with an event date inside the reporting window.",
      edition.newThisPeriod,
      "No new dated signals in this window.",
    ),
    ...section(
      "Still Open",
      "Previously briefed, high severity, and confirmed again by a source during this window.",
      edition.stillOpen,
      "No previously briefed items were reconfirmed in this window.",
    ),
    ...section(
      "Undated Items",
      "The event date could not be resolved from the source, so these are dated by retrieval and may be older than they appear.",
      edition.undatedItems,
      "No undated items.",
    ),
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="civil-infrastructure-brief-${edition.editionId}.md"`,
    },
  });
}
