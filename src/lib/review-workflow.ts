import type {
  CivilFirmOpportunityType,
  Confidence,
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

/** The date a signal should be judged by: when the event happened, if known. */
export function effectiveDate(signal: Signal): string {
  return signal.eventDate ?? signal.dateObserved;
}

const confidenceScore: Record<Confidence, number> = { Low: 0, Medium: 1, High: 2 };

/**
 * Ranks signals. This is ordering only; it applies no time window and no
 * already-briefed filter, so it stays usable for the watchlist and for any view
 * that wants "most important first".
 */
export function selectWeeklyBriefSignals(signals: Signal[], limit = 8): Signal[] {
  return [...signals]
    .filter((signal) => !signal.dismissed)
    .sort(
      (a, b) =>
        Number(Boolean(b.promotedToBrief)) - Number(Boolean(a.promotedToBrief)) ||
        severityScore(b.severity) - severityScore(a.severity) ||
        confidenceScore[b.confidence] - confidenceScore[a.confidence] ||
        effectiveDate(b).localeCompare(effectiveDate(a)),
    )
    .slice(0, limit);
}

export interface BriefEditionOptions {
  now?: Date;
  /** Length of the reporting period in days. */
  windowDays?: number;
  limit?: number;
  /**
   * Include signals whose date could not be resolved from the source. They are
   * always segregated so a reviewer knows the date is a crawl artefact.
   */
  includeUnresolvedDates?: boolean;
}

export interface BriefEdition {
  editionId: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  /** Manually promoted items, always included regardless of window. */
  promoted: Signal[];
  /** In-window signals that have never appeared in a brief. */
  newThisPeriod: Signal[];
  /** Previously briefed, still active, and seen again during this window. */
  stillOpen: Signal[];
  /** In-window signals whose date is a fetch artefact rather than a real date. */
  undatedItems: Signal[];
  counts: {
    promoted: number;
    newThisPeriod: number;
    stillOpen: number;
    undated: number;
    total: number;
  };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds one edition of the brief.
 *
 * The point of a periodical is that consecutive editions differ. That requires
 * three things the ranking function alone cannot provide: a window over the date
 * the event actually happened, a record of what has already been sent, and a way
 * to distinguish something new from something that is merely still true.
 */
export function buildBriefEdition(
  signals: Signal[],
  options: BriefEditionOptions = {},
): BriefEdition {
  const {
    now = new Date(),
    windowDays = 7,
    limit = 16,
    includeUnresolvedDates = true,
  } = options;

  const windowEnd = isoDay(now);
  const start = new Date(now.getTime());
  start.setUTCDate(start.getUTCDate() - windowDays);
  const windowStart = isoDay(start);
  const editionId = windowEnd;

  const active = signals.filter((signal) => !signal.dismissed);

  const promoted = selectWeeklyBriefSignals(
    active.filter((signal) => signal.promotedToBrief),
    limit,
  );
  const promotedIds = new Set(promoted.map((signal) => signal.id));

  const remaining = active.filter((signal) => !promotedIds.has(signal.id));
  const dateResolved = (signal: Signal) =>
    signal.eventDateSource !== "Fetch date (unresolved)" && Boolean(signal.eventDate);

  const inWindow = remaining.filter((signal) => {
    const date = effectiveDate(signal);
    return date >= windowStart && date <= windowEnd;
  });

  const datedInWindow = inWindow.filter(dateResolved);
  const undatedInWindow = includeUnresolvedDates
    ? inWindow.filter((signal) => !dateResolved(signal))
    : [];

  const briefedBefore = (signal: Signal) => Boolean(signal.firstBriefedAt);

  const newThisPeriod = selectWeeklyBriefSignals(
    datedInWindow.filter((signal) => !briefedBefore(signal)),
    limit,
  );
  const newIds = new Set(newThisPeriod.map((signal) => signal.id));

  // Something already sent is only worth repeating if the source has confirmed it
  // again during this window.
  const stillOpen = selectWeeklyBriefSignals(
    remaining.filter(
      (signal) =>
        !newIds.has(signal.id) &&
        briefedBefore(signal) &&
        signal.severity === "High" &&
        (signal.lastSeenAt ?? "").slice(0, 10) >= windowStart,
    ),
    limit,
  );

  const undatedItems = selectWeeklyBriefSignals(
    undatedInWindow.filter((signal) => !briefedBefore(signal)),
    limit,
  );

  return {
    editionId,
    generatedAt: now.toISOString(),
    windowStart,
    windowEnd,
    promoted,
    newThisPeriod,
    stillOpen,
    undatedItems,
    counts: {
      promoted: promoted.length,
      newThisPeriod: newThisPeriod.length,
      stillOpen: stillOpen.length,
      undated: undatedItems.length,
      total:
        promoted.length + newThisPeriod.length + stillOpen.length + undatedItems.length,
    },
  };
}

/** Stamps every signal in an edition so the next edition can exclude it. */
export function markSignalsBriefed(
  signals: Signal[],
  edition: BriefEdition,
): Signal[] {
  const included = new Set(
    [
      ...edition.promoted,
      ...edition.newThisPeriod,
      ...edition.stillOpen,
      ...edition.undatedItems,
    ].map((signal) => signal.id),
  );

  return signals.map((signal) => {
    if (!included.has(signal.id)) return signal;
    const editions = signal.briefEditions ?? [];
    if (editions.includes(edition.editionId)) return signal;
    return {
      ...signal,
      firstBriefedAt: signal.firstBriefedAt ?? edition.generatedAt,
      briefEditions: [...editions, edition.editionId],
    };
  });
}
