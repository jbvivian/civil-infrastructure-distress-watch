"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { CategoryBadge, ConfidenceBadge, StatusBadge } from "@/components/badges";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import type {
  Confidence,
  DistressCategory,
  ProjectStatus,
} from "@/lib/types";

export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  owner: string;
  county: string;
  projectType: string;
  phase: string;
  status: ProjectStatus;
  confidence: Confidence;
  lastUpdated: string;
  fundingSources: string[];
  latestSignal: string;
  categories: DistressCategory[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [owner, setOwner] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [funding, setFunding] = useState("");
  const [phase, setPhase] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    return projects.filter((project) => {
      const searchable = `${project.name} ${project.owner} ${project.county} ${project.latestSignal}`.toLowerCase();
      return (
        searchable.includes(normalizedQuery) &&
        (!county || project.county === county) &&
        (!owner || project.owner === owner) &&
        (!type || project.projectType === type) &&
        (!status || project.status === status) &&
        (!category || project.categories.includes(category as DistressCategory)) &&
        (!funding || project.fundingSources.includes(funding)) &&
        (!phase || project.phase === phase)
      );
    });
  }, [projects, query, county, owner, type, status, category, funding, phase]);

  const filters = [
    { label: "County", value: county, setter: setCounty, options: unique(projects.map((p) => p.county)) },
    { label: "Owner", value: owner, setter: setOwner, options: unique(projects.map((p) => p.owner)) },
    { label: "Project type", value: type, setter: setType, options: unique(projects.map((p) => p.projectType)) },
    { label: "Status", value: status, setter: setStatus, options: unique(projects.map((p) => p.status)) },
    { label: "Distress category", value: category, setter: setCategory, options: unique(projects.flatMap((p) => p.categories)) },
    { label: "Funding source", value: funding, setter: setFunding, options: unique(projects.flatMap((p) => p.fundingSources)) },
    { label: "Phase", value: phase, setter: setPhase, options: unique(projects.map((p) => p.phase)) },
  ];

  return (
    <>
      <section className="panel mb-6 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, owners, counties, or latest signals"
            aria-label="Search projects"
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((filter) => (
            <label key={filter.label} className="text-xs font-semibold text-[#53606d]">
              {filter.label}
              <select
                className="field mt-1 font-normal"
                value={filter.value}
                onChange={(event) => filter.setter(event.target.value)}
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between text-sm text-[#66717e]">
        <p>{filtered.length} projects shown</p>
        <button
          className="font-semibold text-[#355b78] hover:text-[#17324d]"
          onClick={() => {
            setQuery("");
            setCounty("");
            setOwner("");
            setType("");
            setStatus("");
            setCategory("");
            setFunding("");
            setPhase("");
          }}
        >
          Clear filters
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No projects match these filters"
          description="Clear one or more filters to widen the review set."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((project) => (
            <article key={project.id} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[#597186]">
                    {project.county} County · {project.phase}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1d3448]">
                    <Link href={`/projects/${project.slug}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-[#66717e]">{project.owner}</p>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <div className="mt-4 rounded-md border bg-[#f7f9fa] p-3">
                <p className="eyebrow">Latest signal</p>
                <p className="mt-1 text-sm font-medium text-[#344452]">
                  {project.latestSignal}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.categories.slice(0, 3).map((item) => (
                  <CategoryBadge key={item} category={item} />
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex items-center gap-3">
                  <ConfidenceBadge confidence={project.confidence} />
                  <span className="font-mono text-[11px] text-[#74808c]">
                    Updated {formatDate(project.lastUpdated)}
                  </span>
                </div>
                <Link
                  href={`/projects/${project.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#355b78] hover:text-[#17324d]"
                >
                  Review record <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
