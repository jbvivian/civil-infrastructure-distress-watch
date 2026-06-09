import type {
  CivilFirmOpportunityType,
  DataOrigin,
  Signal,
  SignalReviewStatus,
} from "@/lib/types";
import { severityScore } from "@/lib/signal-quality";

export const dismissalReasons = [
  "Not infrastructure-related",
  "Routine administrative item",
  "Duplicate",
  "Weak evidence",
  "False positive",
  "Already covered by another signal",
  "Not relevant to civil engineering firms",
  "Other",
] as const;

export interface SignalFilter {
  dataOrigin?: DataOrigin | "All";
  liveOnly?: boolean;
  reviewStatus?: SignalReviewStatus | "All";
  sourceType?: string;
  jurisdiction?: string;
  opportunityType?: CivilFirmOpportunityType | "All";
  includeDismissed?: boolean;
}

export interface FilterableSignal {
  dismissed?: boolean;
  dataOrigin?: DataOrigin;
  signalReviewStatus?: SignalReviewStatus;
  civilFirmOpportunityType?: CivilFirmOpportunityType;
  sourceType?: string;
  jurisdiction?: string;
}

export function filterSignals<T extends FilterableSignal>(
  signals: T[],
  filter: SignalFilter,
): T[] {
  return signals.filter((signal) => {
    if (!filter.includeDismissed && signal.dismissed) return false;
    if (filter.liveOnly && signal.dataOrigin !== "Scraped") return false;
    if (
      filter.dataOrigin &&
      filter.dataOrigin !== "All" &&
      signal.dataOrigin !== filter.dataOrigin
    ) {
      return false;
    }
    if (
      filter.reviewStatus &&
      filter.reviewStatus !== "All" &&
      signal.signalReviewStatus !== filter.reviewStatus
    ) {
      return false;
    }
    if (filter.sourceType && signal.sourceType !== filter.sourceType) return false;
    if (filter.jurisdiction && signal.jurisdiction !== filter.jurisdiction) return false;
    if (
      filter.opportunityType &&
      filter.opportunityType !== "All" &&
      signal.civilFirmOpportunityType !== filter.opportunityType
    ) {
      return false;
    }
    return true;
  });
}

export function promoteSignal(
  signal: Signal,
  promoted: boolean,
  note?: string,
  timestamp = new Date().toISOString(),
): Signal {
  return {
    ...signal,
    promotedToBrief: promoted,
    promotedAt: promoted ? timestamp : undefined,
    promotedBy: promoted ? "Local reviewer" : undefined,
    promotionNote: promoted ? note?.trim() || undefined : undefined,
    dismissed: promoted ? false : signal.dismissed,
    dismissedAt: promoted ? undefined : signal.dismissedAt,
    dismissedReason: promoted ? undefined : signal.dismissedReason,
    dismissedBy: promoted ? undefined : signal.dismissedBy,
    reviewStatus: promoted
      ? "Promoted"
      : signal.projectId
        ? "Assigned"
        : "Needs Review",
    signalReviewStatus: promoted
      ? "Promoted"
      : signal.projectId
        ? "Assigned"
        : "Needs Review",
  };
}

export function dismissSignal(
  signal: Signal,
  reason: string,
  timestamp = new Date().toISOString(),
): Signal {
  if (!reason.trim()) throw new Error("A dismissal reason is required.");
  return {
    ...signal,
    dismissed: true,
    dismissedAt: timestamp,
    dismissedReason: reason.trim(),
    dismissedBy: "Local reviewer",
    promotedToBrief: false,
    promotedAt: undefined,
    promotedBy: undefined,
    promotionNote: undefined,
    reviewStatus: "Dismissed",
    signalReviewStatus: "Dismissed",
  };
}

export function selectWeeklyBriefSignals(signals: Signal[], limit = 8): Signal[] {
  return [...signals]
    .filter((signal) => !signal.dismissed)
    .sort(
      (a, b) =>
        Number(Boolean(b.promotedToBrief)) - Number(Boolean(a.promotedToBrief)) ||
        severityScore(b.severity) - severityScore(a.severity) ||
        b.dateObserved.localeCompare(a.dateObserved),
    )
    .slice(0, limit);
}
