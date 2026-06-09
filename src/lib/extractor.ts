import {
  type DistressCategory,
  type ExtractedSignal,
  type ProjectStatus,
  type Signal,
  type Severity,
} from "@/lib/types";
import { buildSignalQuality, explainProjectStatus } from "@/lib/signal-quality";

interface Rule {
  terms: string[];
  category: DistressCategory;
  severity: Severity;
  title: string;
  signalType: string;
}

const rules: Rule[] = [
  {
    terms: ["change order", "contract amendment", "budget transfer", "capital transfer"],
    category: "Cost Pressure",
    severity: "Medium",
    title: "Potential cost authorization change",
    signalType: "Budget or contract action",
  },
  {
    terms: ["additional engineering services", "major rescope"],
    category: "Scope Instability",
    severity: "Medium",
    title: "Additional scope may be under consideration",
    signalType: "Scope change",
  },
  {
    terms: ["time extension", "substantial completion delayed", "final completion delayed"],
    category: "Schedule Pressure",
    severity: "High",
    title: "Schedule milestone requires review",
    signalType: "Schedule change",
  },
  {
    terms: ["rebid", "reject all bids", "bid came in higher than expected", "engineer's estimate"],
    category: "Procurement Trouble",
    severity: "High",
    title: "Procurement outcome may affect delivery",
    signalType: "Procurement action",
  },
  {
    terms: ["emergency repair", "water main break", "bridge closure"],
    category: "Public Impact",
    severity: "High",
    title: "Service or access disruption identified",
    signalType: "Service impact",
  },
  {
    terms: ["notice of claim", "contractor dispute", "litigation"],
    category: "Governance / Political Heat",
    severity: "High",
    title: "Contractual dispute requires review",
    signalType: "Claim or dispute",
  },
  {
    terms: ["executive session", "public complaint", "resident concern"],
    category: "Governance / Political Heat",
    severity: "Medium",
    title: "Public or governance concern recorded",
    signalType: "Governance concern",
  },
  {
    terms: ["grant deadline"],
    category: "Funding Risk",
    severity: "Medium",
    title: "Funding deadline may affect project decisions",
    signalType: "Funding constraint",
  },
  {
    terms: ["dec approval", "dot approval", "wetlands"],
    category: "Regulatory / Permitting Risk",
    severity: "Medium",
    title: "External approval remains a delivery dependency",
    signalType: "Permit or approval",
  },
  {
    terms: [
      "utility relocation",
      "unsuitable soil",
      "contaminated soil",
      "drainage issue",
      "flooding",
      "sewer capacity",
      "pump station",
      "culvert replacement",
    ],
    category: "Delivery Complexity",
    severity: "Medium",
    title: "Field or system condition may complicate delivery",
    signalType: "Delivery condition",
  },
];

const categoryCopy: Record<
  DistressCategory,
  Pick<
    ExtractedSignal,
    "interpretation" | "possibleConsequence" | "recommendedAction" | "alternativeExplanation"
  >
> = {
  "Cost Pressure": {
    interpretation:
      "The referenced authorization may indicate that current delivery needs exceed an earlier cost assumption.",
    possibleConsequence:
      "The authorized budget, contingency, or funding plan may need to be revisited.",
    recommendedAction:
      "Compare the action with the original contract value, remaining contingency, and prior amendments.",
    alternativeExplanation:
      "The action may be an administrative transfer within an already approved project budget.",
  },
  "Schedule Pressure": {
    interpretation:
      "The language may indicate that a planned milestone is no longer aligned with the current delivery path.",
    possibleConsequence:
      "Seasonal work, grant compliance, service restoration, or downstream contracts may be affected.",
    recommendedAction:
      "Confirm the revised critical path, responsible party, and any time-related cost exposure.",
    alternativeExplanation:
      "The extension may formalize an understood schedule change without affecting final service outcomes.",
  },
  "Scope Instability": {
    interpretation:
      "Additional services or revised work may indicate that the project definition is still evolving.",
    possibleConsequence:
      "Design effort, approvals, procurement packaging, or budget requirements may change.",
    recommendedAction:
      "Review the added scope against the basis of design and identify decisions that remain unresolved.",
    alternativeExplanation:
      "The added service may be a planned optional task now being authorized at the appropriate phase.",
  },
  "Procurement Trouble": {
    interpretation:
      "The procurement language may indicate a mismatch between the solicitation, market response, and available budget.",
    possibleConsequence:
      "Award timing, scope, funding, or the procurement approach may require revision.",
    recommendedAction:
      "Review bid spread, estimate assumptions, bidder questions, and options for repackaging the work.",
    alternativeExplanation:
      "The action may reflect a deliberate market test or procedural correction rather than project distress.",
  },
  "Regulatory / Permitting Risk": {
    interpretation:
      "An external approval appears to remain on the delivery path and may constrain sequencing.",
    possibleConsequence:
      "Design release, bidding, construction access, or funding deadlines may be affected.",
    recommendedAction:
      "Confirm submission status, agency comments, owner responsibilities, and decision dates.",
    alternativeExplanation:
      "The approval may be routine and already accounted for in the baseline schedule.",
  },
  "Governance / Political Heat": {
    interpretation:
      "The record suggests elevated stakeholder, contractual, or governance attention around the project.",
    possibleConsequence:
      "Decision timing, communications, negotiations, or public support may require active management.",
    recommendedAction:
      "Clarify the issue owner, decision needed, public record, and communications plan.",
    alternativeExplanation:
      "The discussion may be precautionary or unrelated to the core project delivery risk.",
  },
  "Delivery Complexity": {
    interpretation:
      "The cited field or system condition may introduce work that was difficult to define before investigation.",
    possibleConsequence:
      "Methods, quantities, sequencing, access, or temporary operations may need adjustment.",
    recommendedAction:
      "Validate investigation data, responsibility allocation, and the effect on contingency and schedule.",
    alternativeExplanation:
      "The condition may be anticipated and covered by existing bid items or allowances.",
  },
  "Public Impact": {
    interpretation:
      "The record indicates a potential effect on residents, traffic, access, flooding, or utility service.",
    possibleConsequence:
      "Temporary measures, accelerated decisions, or additional public communication may be warranted.",
    recommendedAction:
      "Confirm current service conditions, mitigation measures, response ownership, and public notices.",
    alternativeExplanation:
      "The impact may be short-lived, localized, or already addressed through routine operations.",
  },
  "Funding Risk": {
    interpretation:
      "A funding condition or deadline may be influencing project timing and scope decisions.",
    possibleConsequence:
      "Reimbursement eligibility, local share, or the delivery schedule may require adjustment.",
    recommendedAction:
      "Verify grant milestones, eligible costs, extension options, and required owner actions.",
    alternativeExplanation:
      "The deadline may be a standard administrative milestone with adequate schedule float.",
  },
};

function excerptAround(text: string, term: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const index = normalized.toLowerCase().indexOf(term);
  const start = Math.max(0, index - 90);
  const end = Math.min(normalized.length, index + term.length + 130);
  return `${start > 0 ? "..." : ""}${normalized.slice(start, end)}${
    end < normalized.length ? "..." : ""
  }`;
}

export function extractSignals(text: string): ExtractedSignal[] {
  const lowerText = text.toLowerCase();
  const found = new Map<string, ExtractedSignal>();

  for (const rule of rules) {
    for (const term of rule.terms) {
      if (!lowerText.includes(term)) continue;
      const key = `${rule.category}:${term}`;
      found.set(key, {
        title: rule.title,
        category: rule.category,
        signalType: rule.signalType,
        severity: rule.severity,
        confidence: "High",
        evidenceExcerpt: excerptAround(text, term),
        matchedTerm: term,
        matchedTerms: [term],
        ...categoryCopy[rule.category],
        ...buildSignalQuality({
          category: rule.category,
          severity: rule.severity,
          confidence: "High",
          evidenceExcerpt: excerptAround(text, term),
          matchedTerm: term,
        }),
      });
    }
  }

  return [...found.values()];
}

export function deriveProjectStatus(signals: Signal[]): ProjectStatus {
  return explainProjectStatus(signals).status;
}
