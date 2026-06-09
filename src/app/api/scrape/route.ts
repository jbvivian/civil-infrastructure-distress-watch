import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  runAllSourceScrapes,
  runSourceScrape,
} from "@/lib/scrape-service";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sourceId?: string; all?: boolean };
    const results = body.all
      ? await runAllSourceScrapes()
      : body.sourceId
        ? [await runSourceScrape(body.sourceId)]
        : [];

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Choose a configured source or request all active sources." },
        { status: 400 },
      );
    }

    revalidatePath("/");
    revalidatePath("/admin/ingest");
    revalidatePath("/signals");
    revalidatePath("/sources");
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape request failed." },
      { status: 400 },
    );
  }
}
