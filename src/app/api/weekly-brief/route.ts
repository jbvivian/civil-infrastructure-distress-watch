import { getDataset } from "@/lib/repository";

export async function GET() {
  const dataset = await getDataset();
  const projectMap = new Map(dataset.projects.map((project) => [project.id, project]));
  const severityScore = { High: 3, Medium: 2, Low: 1 };
  const signals = [...dataset.signals]
    .filter((signal) => signal.projectId)
    .sort(
      (a, b) =>
        severityScore[b.severity] - severityScore[a.severity] ||
        b.dateObserved.localeCompare(a.dateObserved),
    )
    .slice(0, 8);

  const markdown = [
    "# Civil Infrastructure Distress Watch",
    "## Weekly Brief — June 8, 2026",
    "",
    "> Fictional prototype data. Do not use for real-world decisions.",
    "",
    ...signals.flatMap((signal, index) => {
      const project = signal.projectId ? projectMap.get(signal.projectId) : undefined;
      return [
        `### ${index + 1}. ${signal.title}`,
        `**Project:** ${project?.name ?? "Unknown"}  `,
        `**Category:** ${signal.category} · **Severity:** ${signal.severity} · **Confidence:** ${signal.confidence}`,
        "",
        `**Evidence:** ${signal.evidenceExcerpt}`,
        "",
        `**Possible implication:** ${signal.interpretation} ${signal.possibleConsequence}`,
        "",
        `**Recommended review action:** ${signal.recommendedAction}`,
        "",
        `**Alternative explanation:** ${signal.alternativeExplanation}`,
        "",
      ];
    }),
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="civil-infrastructure-weekly-brief.md"',
    },
  });
}
