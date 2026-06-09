import type {
  Confidence,
  DistressCategory,
  ProjectStatus,
  Severity,
} from "@/lib/types";

const statusStyles: Record<ProjectStatus, string> = {
  Watch: "border-slate-300 bg-slate-100 text-slate-700",
  Review: "border-blue-200 bg-blue-50 text-blue-800",
  Escalated: "border-amber-200 bg-amber-50 text-amber-800",
  "Confirmed Issue": "border-red-200 bg-red-50 text-red-800",
};

const severityStyles: Record<Severity, string> = {
  Low: "border-slate-300 bg-slate-50 text-slate-650",
  Medium: "border-amber-200 bg-amber-50 text-amber-800",
  High: "border-red-200 bg-red-50 text-red-800",
};

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Pill className={statusStyles[status]}>{status}</Pill>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Pill className={severityStyles[severity]}>{severity}</Pill>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Pill className="border-slate-300 bg-white text-slate-650">
      {confidence} confidence
    </Pill>
  );
}

export function CategoryBadge({ category }: { category: DistressCategory }) {
  return (
    <Pill className="border-[#c8d5df] bg-[#eff4f7] text-[#35536b]">{category}</Pill>
  );
}
