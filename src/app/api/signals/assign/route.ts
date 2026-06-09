import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { assignSignalToProject } from "@/lib/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      signalId?: string;
      projectId?: string;
    };
    if (!body.signalId || !body.projectId) {
      return NextResponse.json(
        { error: "Choose both a signal and a project." },
        { status: 400 },
      );
    }

    await assignSignalToProject(body.signalId, body.projectId);
    revalidatePath("/");
    revalidatePath("/admin/ingest");
    revalidatePath("/projects");
    revalidatePath("/signals");
    revalidatePath("/weekly-brief");
    return NextResponse.json({ assigned: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not assign signal." },
      { status: 400 },
    );
  }
}
