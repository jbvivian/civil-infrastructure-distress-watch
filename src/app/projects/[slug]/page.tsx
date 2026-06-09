import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ExternalLink, Landmark, WalletCards } from "lucide-react";
import { CategoryBadge, ConfidenceBadge, SeverityBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDate, monthsBetween, percentDelta } from "@/lib/format";
import { getDataset } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dataset = await getDataset();
  const project = dataset.projects.find((item) => item.slug === slug);
  return { title: project?.name ?? "Project not found" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dataset = await getDataset();
  const project = dataset.projects.find((item) => item.slug === slug);
  if (!project) notFound();

  const signals = dataset.signals
    .filter((signal) => signal.projectId === project.id)
    .sort((a, b) => b.dateObserved.localeCompare(a.dateObserved));
  const documents = dataset.documents.filter((document) => document.projectId === project.id);
  const documentMap = new Map(documents.map((document) => [document.id, document]));
  const events = dataset.events
    .filter((event) => event.projectId === project.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const budgetDelta = project.currentBudget - project.originalBudget;
  const timelineDelta = monthsBetween(project.originalCompletion, project.currentCompletion);

  return (
    <>
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#45647f] hover:underline">
        <ArrowLeft className="size-4" /> Back to projects
      </Link>

      <header className="mt-5 border-b pb-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-4xl">
            <p className="eyebrow">{project.county} County · {project.projectType}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-[#17293a] md:text-4xl">
              {project.name}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#5e6974]">{project.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <ConfidenceBadge confidence={project.confidence} />
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <Landmark className="size-5 text-[#597186]" />
          <p className="eyebrow mt-4">Owner / municipality</p>
          <p className="mt-1 font-semibold text-[#2b4052]">{project.owner}</p>
          <p className="mt-1 text-sm text-[#66717e]">{project.municipality}, NY</p>
        </div>
        <div className="panel p-5">
          <WalletCards className="size-5 text-[#597186]" />
          <p className="eyebrow mt-4">Authorized budget</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#2b4052]">{formatCurrency(project.currentBudget)}</p>
          <p className={`mt-1 text-sm ${budgetDelta > 0 ? "text-[#8e4f18]" : "text-[#66717e]"}`}>
            {budgetDelta > 0 ? `+${formatCurrency(budgetDelta)} (${percentDelta(project.originalBudget, project.currentBudget)}%)` : "No recorded delta"}
          </p>
        </div>
        <div className="panel p-5">
          <CalendarClock className="size-5 text-[#597186]" />
          <p className="eyebrow mt-4">Current completion</p>
          <p className="mt-1 font-mono text-lg font-semibold text-[#2b4052]">{formatDate(project.currentCompletion)}</p>
          <p className={`mt-1 text-sm ${timelineDelta > 0 ? "text-[#8e4f18]" : "text-[#66717e]"}`}>
            {timelineDelta > 0 ? `+${timelineDelta} months from baseline` : "No recorded delta"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Delivery context</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[#66717e]">Phase</dt><dd className="font-semibold text-[#344452]">{project.phase}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#66717e]">Original budget</dt><dd className="font-mono text-[#344452]">{formatCurrency(project.originalBudget)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#66717e]">Baseline finish</dt><dd className="font-mono text-xs text-[#344452]">{formatDate(project.originalCompletion)}</dd></div>
          </dl>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.75fr]">
        <div className="space-y-5">
          <div>
            <p className="eyebrow">Evidence-backed analysis</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#20394e]">Distress signals</h2>
          </div>
          {signals.map((signal) => {
            const document = documentMap.get(signal.sourceDocumentIds[0]);
            return (
              <article key={signal.id} className="panel overflow-hidden">
                <div className="flex flex-col justify-between gap-3 border-b bg-[#f8f9fa] p-5 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <SeverityBadge severity={signal.severity} />
                      <CategoryBadge category={signal.category} />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#20394e]">{signal.title}</h3>
                  </div>
                  <span className="font-mono text-xs text-[#74808c]">{formatDate(signal.dateObserved)}</span>
                </div>
                <div className="grid gap-6 p-5 lg:grid-cols-2">
                  <div>
                    <p className="eyebrow">Source evidence</p>
                    <blockquote className="evidence-quote mt-2">{signal.evidenceExcerpt}</blockquote>
                    {document && (
                      <a href={document.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#45647f] hover:underline">
                        {document.title} <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                  <dl className="space-y-4 text-sm">
                    <div><dt className="eyebrow">Interpretation</dt><dd className="mt-1.5 leading-6 text-[#40505d]">{signal.interpretation}</dd></div>
                    <div><dt className="eyebrow">Possible consequence</dt><dd className="mt-1.5 leading-6 text-[#40505d]">{signal.possibleConsequence}</dd></div>
                    <div className="rounded-md border border-[#c9d6df] bg-[#f0f5f8] p-3"><dt className="eyebrow">Recommended review action</dt><dd className="mt-1.5 font-medium leading-6 text-[#28465d]">{signal.recommendedAction}</dd></div>
                    <div><dt className="eyebrow">Alternative explanation</dt><dd className="mt-1.5 leading-6 text-[#66717e]">{signal.alternativeExplanation}</dd></div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-5">
          <div className="panel p-5">
            <p className="eyebrow">Funding sources</p>
            <ul className="mt-3 space-y-2 text-sm text-[#40505d]">
              {project.fundingSources.map((funding) => <li key={funding}>• {funding}</li>)}
            </ul>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Known vendors</p>
            <ul className="mt-3 space-y-2 text-sm text-[#40505d]">
              {project.vendors.map((vendor) => <li key={vendor}>• {vendor}</li>)}
            </ul>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Project timeline</p>
            <ol className="mt-4 space-y-5">
              {events.map((event) => (
                <li key={event.id} className="relative border-l-2 border-[#cbd6de] pl-4">
                  <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-[#58758d]" />
                  <time className="font-mono text-[11px] text-[#74808c]">{formatDate(event.date)}</time>
                  <p className="mt-1 text-sm font-semibold text-[#344452]">{event.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#66717e]">{event.description}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Source documents</p>
            <ul className="mt-3 space-y-3">
              {documents.map((document) => (
                <li key={document.id}>
                  <a href={document.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#355b78] hover:underline">
                    {document.title}
                  </a>
                  <p className="mt-1 font-mono text-[11px] text-[#74808c]">Published {formatDate(document.publishedAt)}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
