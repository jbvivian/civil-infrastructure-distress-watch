import type {
  CivilFirmOpportunityType,
  Confidence,
  DistressCategory,
  ProjectStatus,
  Signal,
} from "@/lib/types";

const relevanceByCategory: Record<
  DistressCategory,
  {
    relevance: string;
    opportunityType: CivilFirmOpportunityType;
    buyerPersona: string;
  }
> = {
  "Cost Pressure": {
    relevance:
      "Cost authorization movement may indicate estimate refinement, change management, independent cost review, or construction-phase support needs.",
    opportunityType: "Construction management / inspection need",
    buyerPersona: "Public works director, owner project manager, or municipal finance lead",
  },
  "Schedule Pressure": {
    relevance:
      "A schedule change is useful delivery intelligence and may indicate a need for critical-path review, construction administration, inspection coverage, or recovery planning.",
    opportunityType: "Competitive intelligence only",
    buyerPersona: "Owner project manager or construction manager",
  },
  "Scope Instability": {
    relevance:
      "Additional services or rescoping may indicate an expanded design, permitting, bidding, or construction-phase support need.",
    opportunityType: "Potential redesign / additional engineering services",
    buyerPersona: "Public works director, procurement lead, or consulting program manager",
  },
  "Procurement Trouble": {
    relevance:
      "A rebid or weak bid outcome may indicate scope ambiguity, estimate mismatch, packaging issues, or a future procurement opportunity.",
    opportunityType: "Procurement or rebid opportunity",
    buyerPersona: "Procurement officer, public works director, or estimating lead",
  },
  "Regulatory / Permitting Risk": {
    relevance:
      "An unresolved approval may create demand for permit coordination, environmental documentation, agency response, or schedule integration.",
    opportunityType: "Permitting / regulatory support need",
    buyerPersona: "Owner project manager, environmental lead, or permitting manager",
  },
  "Governance / Political Heat": {
    relevance:
      "Elevated public, contractual, or governance attention may create a need for claims support, technical documentation, or stakeholder communication.",
    opportunityType: "Claims / dispute support",
    buyerPersona: "Municipal counsel, owner representative, or public information lead",
  },
  "Delivery Complexity": {
    relevance:
      "Field, utility, geotechnical, hydraulic, or system constraints may require investigation, redesign, constructability review, or specialist engineering.",
    opportunityType: "Potential redesign / additional engineering services",
    buyerPersona: "Public works engineer, design manager, or contractor project executive",
  },
  "Public Impact": {
    relevance:
      "Service disruption, flooding, access, or safety concerns may support emergency assessment, resilience design, mitigation, or public communication work.",
    opportunityType: "Emergency repair / resilience work",
    buyerPersona: "Public works director, emergency manager, or municipal engineer",
  },
  "Funding Risk": {
    relevance:
      "A grant or reimbursement constraint may create a need for funding strategy, eligibility review, scope alignment, or milestone support.",
    opportunityType: "Grant / funding support need",
    buyerPersona: "Municipal finance lead, grants manager, or capital program manager",
  },
};

export function buildSignalQuality(
  signal: Pick<Signal, "category" | "severity" | "confidence" | "evidenceExcerpt"> & {
    matchedTerm?: string;
  },
) {
  const matchedTerm = signal.matchedTerm ?? "configured rule language";
  const severityReason =
    signal.severity === "High"
      ? `High severity because the source explicitly references "${matchedTerm}", a configured term associated with material delivery, procurement, dispute, or public-impact risk.`
      : signal.severity === "Medium"
        ? `Medium severity because "${matchedTerm}" may affect cost, scope, approvals, delivery, or governance but requires supporting project context.`
        : `Low severity because the source language is an early review cue without an explicit material consequence.`;
  const confidenceReason =
    signal.confidence === "High"
      ? `High extraction confidence because the exact configured phrase "${matchedTerm}" appears in the source text.`
      : signal.confidence === "Medium"
        ? "Medium confidence because the source supports the theme but project-specific context is limited."
        : "Low confidence because the source language is indirect or incomplete.";
  const commercial = relevanceByCategory[signal.category];

  return {
    severityReason,
    confidenceReason,
    scoringFactors: [
      `Matched deterministic term: ${matchedTerm}`,
      `Category: ${signal.category}`,
      `Severity: ${signal.severity}`,
      `Confidence: ${signal.confidence}`,
    ],
    civilFirmRelevance: commercial.relevance,
    civilFirmOpportunityType: commercial.opportunityType,
    buyerPersona: commercial.buyerPersona,
  };
}

export interface ProjectStatusExplanation {
  status: ProjectStatus;
  reason: string;
  factors: string[];
}

export function explainProjectStatus(signals: Signal[]): ProjectStatusExplanation {
  const active = signals.filter((signal) => !signal.dismissed);
  const explicit = active.find((signal) =>
    /\b(overrun|substantial completion delayed|final completion delayed|notice of claim|litigation|rebid|reject all bids|audit finding|major rescope)\b/i.test(
      `${signal.title} ${signal.evidenceExcerpt}`,
    ),
  );
  if (explicit) {
    return {
      status: "Confirmed Issue",
      reason:
        "Confirmed Issue because a cited source explicitly records a defined delay, claim, rebid, audit finding, overrun, or major rescope.",
      factors: [`Explicit source language in: ${explicit.title}`],
    };
  }

  const high = active.filter((signal) => signal.severity === "High");
  if (high.length > 0) {
    return {
      status: "Escalated",
      reason: `Escalated because ${high.length} active high-severity signal${high.length === 1 ? "" : "s"} require professional review.`,
      factors: high.slice(0, 3).map((signal) => signal.title),
    };
  }

  const repeated = ["Cost Pressure", "Schedule Pressure", "Scope Instability"].find(
    (category) => active.filter((signal) => signal.category === category).length >= 2,
  );
  if (repeated) {
    return {
      status: "Escalated",
      reason: `Escalated because repeated ${repeated.toLowerCase()} signals appear across the project record.`,
      factors: active
        .filter((signal) => signal.category === repeated)
        .slice(0, 3)
        .map((signal) => signal.title),
    };
  }

  const medium = active.filter((signal) => signal.severity === "Medium");
  if (medium.length > 0 || active.length > 1) {
    return {
      status: "Review",
      reason:
        medium.length > 0
          ? `Review because ${medium.length} active medium-severity signal${medium.length === 1 ? "" : "s"} may affect project delivery.`
          : "Review because multiple active source-backed signals are attached to the project.",
      factors: active.slice(0, 3).map((signal) => signal.title),
    };
  }

  return {
    status: "Watch",
    reason:
      active.length === 1
        ? "Watch because one active low-severity review cue is present."
        : "Watch because no active material distress signals are currently recorded.",
    factors: active.map((signal) => signal.title),
  };
}

export function severityScore(severity: Signal["severity"]): number {
  return { High: 3, Medium: 2, Low: 1 }[severity];
}

export function confidenceFromSource(isDetailedDocument: boolean): Confidence {
  return isDetailedDocument ? "High" : "Medium";
}
