export default function Loading() {
  return (
    <div className="space-y-5" aria-label="Loading page">
      <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-10 max-w-xl animate-pulse rounded bg-slate-200" />
      <div className="h-5 max-w-2xl animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl border bg-white" />
        ))}
      </div>
    </div>
  );
}
