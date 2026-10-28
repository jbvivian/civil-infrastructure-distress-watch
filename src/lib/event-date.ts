import type { EventDateSource } from "@/lib/types";

/**
 * Resolves the date an event appears to have happened.
 *
 * The previous behaviour dated every signal with the time the scraper ran, which
 * meant a change order approved in March and first seen in July was recorded as a
 * July event. Anything that windows or sorts by recency was therefore measuring
 * crawl activity rather than the world.
 *
 * Resolution order is most specific first: a date inside the evidence sentence,
 * then the document's own published or metadata date, then the fetch date, which
 * is explicitly labelled unresolved so it can be filtered out.
 */

export interface ResolvedEventDate {
  date: string;
  source: EventDateSource;
  /** True when the date is a fallback and should not be treated as the event date. */
  unresolved: boolean;
}

const monthNames: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const earliestPlausibleYear = 2000;

function toIso(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  if (year < earliestPlausibleYear) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Finds candidate dates in a fragment of text and returns them in ISO form,
 * most recent first among those not in the future.
 */
export function findDatesInText(text: string, now = new Date()): string[] {
  const found = new Set<string>();
  const horizon = new Date(now.getTime());
  // Public records routinely carry near-future meeting dates; allow a little room.
  horizon.setUTCFullYear(horizon.getUTCFullYear() + 1);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const monthFirst =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2})\b/gi;
  for (const match of text.matchAll(monthFirst)) {
    const month = monthNames[match[1].toLowerCase().replace(/\.$/, "")];
    const iso = toIso(Number(match[3]), month, Number(match[2]));
    if (iso && iso <= horizonIso) found.add(iso);
  }

  const dayFirst =
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+((?:19|20)\d{2})\b/gi;
  for (const match of text.matchAll(dayFirst)) {
    const month = monthNames[match[2].toLowerCase().replace(/\.$/, "")];
    const iso = toIso(Number(match[3]), month, Number(match[1]));
    if (iso && iso <= horizonIso) found.add(iso);
  }

  const iso8601 = /\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  for (const match of text.matchAll(iso8601)) {
    const iso = toIso(Number(match[1]), Number(match[2]), Number(match[3]));
    if (iso && iso <= horizonIso) found.add(iso);
  }

  const slashed = /\b(\d{1,2})\/(\d{1,2})\/((?:19|20)?\d{2})\b/g;
  for (const match of text.matchAll(slashed)) {
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const iso = toIso(year, Number(match[1]), Number(match[2]));
    if (iso && iso <= horizonIso) found.add(iso);
  }

  return [...found].sort((a, b) => b.localeCompare(a));
}

export interface ResolveEventDateInput {
  /** The evidence sentence the signal was extracted from. */
  evidenceText?: string;
  /** Title of the source document, which often carries a meeting date. */
  documentTitle?: string;
  /** Published date from page metadata or PDF creation date. */
  documentPublishedAt?: string;
  /** When the document was fetched. Used only as a labelled fallback. */
  fetchedAt: string;
  now?: Date;
}

export function resolveEventDate({
  evidenceText = "",
  documentTitle = "",
  documentPublishedAt,
  fetchedAt,
  now = new Date(),
}: ResolveEventDateInput): ResolvedEventDate {
  const fromEvidence = findDatesInText(evidenceText, now);
  if (fromEvidence.length > 0) {
    return { date: fromEvidence[0], source: "Source text", unresolved: false };
  }

  const fromTitle = findDatesInText(documentTitle, now);
  if (fromTitle.length > 0) {
    return { date: fromTitle[0], source: "Document metadata", unresolved: false };
  }

  if (documentPublishedAt) {
    const normalized = documentPublishedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized) && normalized.slice(0, 4) >= String(earliestPlausibleYear)) {
      return {
        date: normalized,
        source: "Document published date",
        unresolved: false,
      };
    }
  }

  return {
    date: fetchedAt.slice(0, 10),
    source: "Fetch date (unresolved)",
    unresolved: true,
  };
}
