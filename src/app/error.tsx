"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <p className="eyebrow">Unable to load records</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#20394e]">The local dataset could not be read.</h1>
      <p className="mt-3 text-sm leading-6 text-[#66717e]">Try the request again. If the issue persists, run the seed reset command documented in the README.</p>
      <button onClick={reset} className="mt-5 rounded-md bg-[#17324d] px-4 py-2 text-sm font-semibold text-white">Try again</button>
    </div>
  );
}
