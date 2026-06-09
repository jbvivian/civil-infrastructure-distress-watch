import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <p className="eyebrow">Record not found</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#20394e]">This project is not in the watchlist.</h1>
      <p className="mt-3 text-sm text-[#66717e]">The URL may be outdated or the local dataset may have been reset.</p>
      <Link href="/projects" className="mt-5 inline-block rounded-md bg-[#17324d] px-4 py-2 text-sm font-semibold text-white">Return to projects</Link>
    </div>
  );
}
