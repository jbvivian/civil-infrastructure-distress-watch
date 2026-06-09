import { getDataset } from "@/lib/repository";
import { selectWeeklyBriefSignals } from "@/lib/review-workflow";

export async function GET() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const signals = selectWeeklyBriefSignals(dataset.signals, 16);
  const promoted = signals.filter((signal) => signal.promotedToBrief);
  const ranked = signals.filter((signal) => !signal.promotedToBrief);
  const reportingDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  function signalMarkdown(signal: (typeof signals)[number], index: number) {
    const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
    return [
      `### ${index + 1}. ${signal.title}`,
      `**Project:** ${project?.name ?? "Unassigned review item"}  `,
      `**Category:** ${signal.category} · **Severity:** ${signal.severity} · **Confidence:** ${signal.confidence}`,
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

  const markdown = [
    "# Civil Infrastructure Distress Watch",
    `## Weekly Brief — ${reportingDate}`,
    "",
    "> Review cues, not findings of project failure. Verify all evidence against the linked public source.",
    "",
    "## Promoted Review Items",
    "",
    ...(promoted.length > 0
      ? promoted.flatMap(signalMarkdown)
      : ["No signals have been manually promoted.", ""]),
    "## Deterministic Priority Items",
    "",
    ...ranked.flatMap(signalMarkdown),
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="civil-infrastructure-weekly-brief.md"',
    },
  });
}
