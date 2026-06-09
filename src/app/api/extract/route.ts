import { NextResponse } from "next/server";
import { extractSignals } from "@/lib/extractor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    if (!body.text || body.text.trim().length < 10) {
      return NextResponse.json({ error: "Source text is required." }, { status: 400 });
    }
    return NextResponse.json({ signals: extractSignals(body.text) });
  } catch {
    return NextResponse.json({ error: "Could not extract signals." }, { status: 400 });
  }
}
