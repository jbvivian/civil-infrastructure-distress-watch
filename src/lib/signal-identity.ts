import { createHash } from "node:crypto";
import type { Signal } from "@/lib/types";

/**
 * Stable identity for a signal.
 *
 * Document-level content hashing does not solve duplication. A page that changes
 * by one byte is a new document, so the extractor runs over the whole text again
 * and every signal it already produced is written a second time. Conversely a
 * genuinely unchanged PDF is skipped entirely, so a source can never be
 * re-confirmed.
 *
 * Identifying the signal itself separates those concerns: the same underlying
 * statement, seen again, updates `lastSeenAt` and `timesSeen` rather than
 * appending a row. That is also what makes "new since last week" computable.
 */

/**
 * Normalizes an evidence sentence so that incidental formatting differences
 * between two fetches of the same document do not produce different identities.
 */
export function normalizeEvidence(evidence: string): string {
  return evidence
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\.{2,}/g, " ")
    .replace(/[^a-z0-9$%.,'"()\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface FingerprintInput {
  sourceId: string;
  matchedTerm: string;
  evidenceExcerpt: string;
  category: string;
}

export function signalFingerprint({
  sourceId,
  matchedTerm,
  evidenceExcerpt,
  category,
}: FingerprintInput): string {
  const normalized = normalizeEvidence(evidenceExcerpt);
  return createHash("sha256")
    .update(`${sourceId}\n${category}\n${matchedTerm.toLowerCase()}\n${normalized}`)
    .digest("hex")
    .slice(0, 32);
}

export interface UpsertResult {
  signals: Signal[];
  created: Signal[];
  updated: Signal[];
}

/**
 * Merges freshly extracted signals into an existing set.
 *
 * A signal whose fingerprint is already present is treated as the same signal
 * seen again: its `lastSeenAt` and `timesSeen` move, and the newly seen document
 * is added to its source list, but review state (assignment, promotion,
 * dismissal) is preserved. A reviewer's decision must survive a re-crawl.
 */
export function upsertSignals(
  existing: Signal[],
  incoming: Signal[],
  seenAt: string,
): UpsertResult {
  const byFingerprint = new Map<string, Signal>();
  for (const signal of existing) {
    if (signal.fingerprint) byFingerprint.set(signal.fingerprint, signal);
  }

  const created: Signal[] = [];
  const updated: Signal[] = [];

  for (const signal of incoming) {
    const fingerprint = signal.fingerprint;
    const match = fingerprint ? byFingerprint.get(fingerprint) : undefined;

    if (!match) {
      const record: Signal = {
        ...signal,
        firstSeenAt: signal.firstSeenAt ?? seenAt,
        lastSeenAt: seenAt,
        timesSeen: 1,
      };
      created.push(record);
      if (fingerprint) byFingerprint.set(fingerprint, record);
      continue;
    }

    match.lastSeenAt = seenAt;
    match.timesSeen = (match.timesSeen ?? 1) + 1;
    for (const documentId of signal.sourceDocumentIds) {
      if (!match.sourceDocumentIds.includes(documentId)) {
        match.sourceDocumentIds.push(documentId);
      }
    }
    // Keep the earliest resolved event date; a later crawl of an older document
    // should not make an old event look recent.
    if (
      signal.eventDate &&
      signal.eventDateSource !== "Fetch date (unresolved)" &&
      (!match.eventDate || match.eventDateSource === "Fetch date (unresolved)")
    ) {
      match.eventDate = signal.eventDate;
      match.eventDateSource = signal.eventDateSource;
    }
    updated.push(match);
  }

  return { signals: [...existing, ...created], created, updated };
}
