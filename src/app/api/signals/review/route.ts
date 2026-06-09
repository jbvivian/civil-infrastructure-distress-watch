import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  dismissSignalWithReason,
  setSignalPromotion,
  updateSignalReviewMetadata,
} from "@/lib/repository";
import type {
  CivilFirmOpportunityType,
  Confidence,
  DistressCategory,
  Severity,
} from "@/lib/types";

interface ReviewBody {
  signalId?: string;
  action?: "promote" | "dismiss" | "update";
  promoted?: boolean;
  note?: string;
  reason?: string;
  category?: DistressCategory;
  severity?: Severity;
  confidence?: Confidence;
  interpretation?: string;
  possibleConsequence?: string;
  recommendedAction?: string;
  alternativeExplanation?: string;
  civilFirmRelevance?: string;
  civilFirmOpportunityType?: CivilFirmOpportunityType;
  buyerPersona?: string;
}

function revalidateReviewPages() {
  revalidatePath("/");
  revalidatePath("/admin/ingest");
  revalidatePath("/projects");
  revalidatePath("/signals");
  revalidatePath("/sources");
  revalidatePath("/weekly-brief");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewBody;
    if (!body.signalId || !body.action) {
      return NextResponse.json(
        { error: "Signal ID and review action are required." },
        { status: 400 },
      );
    }

    if (body.action === "promote") {
      await setSignalPromotion(body.signalId, Boolean(body.promoted), body.note);
    } else if (body.action === "dismiss") {
      if (!body.reason?.trim()) {
        return NextResponse.json(
          { error: "A dismissal reason is required." },
          { status: 400 },
        );
      }
      await dismissSignalWithReason(body.signalId, body.reason);
    } else {
      await updateSignalReviewMetadata(body.signalId, {
        category: body.category,
        severity: body.severity,
        confidence: body.confidence,
        interpretation: body.interpretation,
        possibleConsequence: body.possibleConsequence,
        recommendedAction: body.recommendedAction,
        alternativeExplanation: body.alternativeExplanation,
        civilFirmRelevance: body.civilFirmRelevance,
        civilFirmOpportunityType: body.civilFirmOpportunityType,
        buyerPersona: body.buyerPersona,
      });
    }

    revalidateReviewPages();
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review action failed." },
      { status: 400 },
    );
  }
}
