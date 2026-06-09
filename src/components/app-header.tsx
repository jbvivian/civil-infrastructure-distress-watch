import Link from "next/link";
import { Activity, FileInput } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/signals", label: "Signals" },
  { href: "/sources", label: "Sources" },
  { href: "/weekly-brief", label: "Weekly Brief" },
];

export function AppHeader() {
  return (
    <header className="border-b border-[#28445e] bg-[#17324d] text-white">
      <div className="shell">
        <div className="flex min-h-18 flex-wrap items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-white/20 bg-white/10">
              <Activity className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">
                Civil Infrastructure Distress Watch
              </span>
              <span className="block text-[11px] text-slate-300">
                Hudson Valley monitoring prototype
              </span>
            </span>
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm md:order-2 md:w-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/admin/ingest"
            className="order-2 inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-[#17324d] transition hover:bg-slate-100 md:order-3"
          >
            <FileInput className="size-4" aria-hidden="true" />
            Ingest
          </Link>
        </div>
      </div>
    </header>
  );
}
