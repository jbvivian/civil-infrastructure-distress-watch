import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="panel grid min-h-52 place-items-center p-8 text-center">
      <div>
        <SearchX className="mx-auto size-7 text-slate-400" aria-hidden="true" />
        <h2 className="mt-3 font-semibold text-[#24384a]">{title}</h2>
        <p className="mt-1 text-sm text-[#66717e]">{description}</p>
      </div>
    </div>
  );
}
