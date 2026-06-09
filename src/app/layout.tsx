import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Civil Infrastructure Distress Watch",
    template: "%s | Civil Infrastructure Distress Watch",
  },
  description:
    "A source-backed local monitoring prototype for Hudson Valley infrastructure review items.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AppHeader />
        <div className="border-b border-[#d8c89b] bg-[#fff8df] text-[#664e16]">
          <div className="shell py-2 text-center text-xs font-medium">
            Fictional prototype data. Source links and project records are illustrative and
            should not be used for real-world decisions.
          </div>
        </div>
        <main className="shell py-8 md:py-10">{children}</main>
        <footer className="mt-12 border-t bg-white">
          <div className="shell flex flex-col gap-2 py-6 text-xs text-[#66717e] sm:flex-row sm:items-center sm:justify-between">
            <p>Civil Infrastructure Distress Watch · Hudson Valley prototype</p>
            <p>Evidence is separated from interpretation. Confidence is always shown.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
