import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/repository";
import type { ExtractedSignal, SourceType } from "@/lib/types";

interface IngestBody {
  projectId?: string;
  sourceName?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
  documentTitle?: string;
  publishedAt?: string;
  text?: string;
  signals?: ExtractedSignal[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IngestBody;
    if (
      !body.projectId ||
      !body.sourceName ||
      !body.sourceType ||
      !body.sourceUrl ||
      !body.documentTitle ||
      !body.publishedAt ||
      !body.text ||
      !body.signals?.length
    ) {
      return NextResponse.json({ error: "Complete the document fields and select at least one signal." }, { status: 400 });
    }
    const count = await ingestDocument({
      projectId: body.projectId,
      sourceName: body.sourceName,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl,
      documentTitle: body.documentTitle,
      publishedAt: body.publishedAt,
      text: body.text,
      signals: body.signals,
    });
    revalidatePath("/");
    revalidatePath("/admin/ingest");
    revalidatePath("/projects");
    revalidatePath("/signals");
    revalidatePath("/sources");
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the document." },
      { status: 400 },
    );
  }
}
