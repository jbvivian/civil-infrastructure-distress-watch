import type { Confidence } from "@/lib/types";

/**
 * Context evaluation for rule matches.
 *
 * A term appearing somewhere in a document is not evidence. The same phrase can
 * appear in a glossary, a table of contents, a policy describing a routine
 * procedure, or a sentence describing something that actually happened. Only the
 * last of those is a review cue.
 *
 * Every suppression and every confidence adjustment here returns a plain-language
 * reason, so a reviewer can always see why the system did what it did.
 */

export type SuppressionKind =
  | "Negated"
  | "List or index line"
  | "Definitional or policy language"
  | "Outside domain"
  | "Insufficient context";

export interface ContextEvaluation {
  /** The sentence-level window the term was found in. */
  sentence: string;
  /** True when this occurrence should not become a signal at all. */
  suppressed: boolean;
  suppressionKind?: SuppressionKind;
  suppressionReason?: string;
  confidence: Confidence;
  /** Plain-language factors that produced the confidence value. */
  confidenceFactors: string[];
  /** Internal score, retained for ranking competing occurrences. */
  score: number;
}

const negationPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bno\s+(?:\w+\s+){0,2}$/i, label: "the term is directly negated ('no ...')" },
  { pattern: /\bnot\s+(?:\w+\s+){0,3}$/i, label: "the term is directly negated ('not ...')" },
  { pattern: /\bwithout\s+(?:any\s+)?(?:\w+\s+){0,2}$/i, label: "the term follows 'without'" },
  { pattern: /\bnever\s+(?:\w+\s+){0,2}$/i, label: "the term follows 'never'" },
  { pattern: /\bavoid(?:s|ed|ing)?\s+(?:\w+\s+){0,2}$/i, label: "the term follows 'avoid'" },
  { pattern: /\bprevent(?:s|ed|ing)?\s+(?:\w+\s+){0,2}$/i, label: "the term follows 'prevent'" },
  { pattern: /\breduce\s+(?:the\s+number\s+of\s+|the\s+risk\s+of\s+)?(?:\w+\s+){0,2}$/i, label: "the term follows 'reduce'" },
  { pattern: /\bminimi[sz]e\s+(?:\w+\s+){0,2}$/i, label: "the term follows 'minimise'" },
  { pattern: /\beliminat(?:e|es|ed|ing)\s+(?:\w+\s+){0,2}$/i, label: "the term follows 'eliminate'" },
];

const negationAfterPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\s*(?:were|was|are|is)\s+not\b/i, label: "the sentence states the term did not occur" },
  { pattern: /^\s*(?:is|are|were|was)\s+no\s+longer\b/i, label: "the sentence states the term no longer applies" },
];

const prospectivePatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bplans?\s+to\b/i, label: "describes planned rather than completed action" },
  { pattern: /\bproposed\b/i, label: "describes a proposal rather than an event" },
  { pattern: /\bthis\s+project\s+(?:includes|is\s+to|will)\b/i, label: "describes planned project scope" },
  { pattern: /\bthe\s+project\s+(?:includes|will\s+include)\b/i, label: "describes planned project scope" },
  { pattern: /\bin\s+order\s+to\b/i, label: "describes an intended outcome" },
  { pattern: /\bis\s+intended\s+to\b/i, label: "describes an intended outcome" },
  { pattern: /\bwill\s+be\s+(?:constructed|installed|replaced|designed|evaluated)\b/i, label: "describes future work" },
  { pattern: /\banticipated\b/i, label: "describes an anticipated rather than recorded state" },
  { pattern: /\bfuture\s+(?:phase|project|year)/i, label: "refers to a future phase" },
];

const definitionalPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgenerally\s+(?:includes?|means?|refers?)\b/i, label: "reads as a definition" },
  { pattern: /\b(?:is|are)\s+defined\s+as\b/i, label: "reads as a definition" },
  { pattern: /\brefers?\s+to\b/i, label: "reads as a definition" },
  { pattern: /\bfor\s+the\s+purposes?\s+of\s+this\b/i, label: "reads as policy scope language" },
  { pattern: /\bshall\s+(?:be|mean|include|submit|comply)\b/i, label: "reads as regulatory or policy obligation" },
  { pattern: /\bin\s+accordance\s+with\b/i, label: "reads as compliance boilerplate" },
  { pattern: /\bas\s+required\s+by\b/i, label: "reads as compliance boilerplate" },
  { pattern: /\bthe\s+following\s+definitions?\b/i, label: "reads as a glossary entry" },
];

const policyDocumentTitle =
  /\b(?:program\s+plan|management\s+plan|policy|manual|glossary|handbook|standard\s+specifications?|code\s+of\s+ordinances?)\b/i;

const concreteEventPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bresolution\s*(?:no\.?|#|number)?\s*[\dA-Z][\w./-]*/i, label: "cites a resolution number" },
  { pattern: /\bcontract\s*(?:no\.?|#|number)\s*[\dA-Z][\w./-]*/i, label: "cites a contract number" },
  { pattern: /\$\s?\d/, label: "cites a dollar amount" },
  { pattern: /\b(?:approv(?:ed|ing)|authoriz(?:ed|ing)|award(?:ed|ing)|adopt(?:ed|ing)|reject(?:ed|ing)|execut(?:ed|ing))\b/i, label: "records a board or owner action" },
  { pattern: /\b(?:requested|submitted|filed|issued|declared|reported)\b/i, label: "records a filing or request" },
  { pattern: /\b(?:19|20)\d{2}\b/, label: "cites a year" },
];

/** A finite verb is a weak but useful signal that a fragment is a sentence, not a list row. */
const finiteVerbPattern =
  /\b(?:is|are|was|were|has|have|had|will|shall|may|can|does|do|did|approved|authorized|awarded|requested|submitted|reported|identified|found|failed|delayed|extended|rejected|includes|included|requires|required|remains|continues|occurred|experienced|approving|authorizing|awarding|rejecting|executing|causing|amending|granting|denying|adopting)\b/i;

/**
 * Evidence that is hard to produce accidentally. A dollar amount, a resolution or
 * contract identifier, or a full date means the sentence is recording a specific
 * act, even when the formatting looks like a list. Agenda items are written in
 * title case and would otherwise be suppressed as headings.
 */
const strongEventPatterns: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\$\s?\d[\d,]*(?:\.\d{2})?/, label: "cites a dollar amount" },
  {
    pattern: /\b(?:resolution|contract|change\s+order|amendment|bid|rfp|ifb)\s*(?:no\.?|#|number)\s*[\dA-Z][\w./-]*/i,
    label: "cites a resolution, contract, or amendment identifier",
  },
  {
    pattern:
      /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+(?:19|20)\d{2}\b/i,
    label: "cites a specific calendar date",
  },
];

export function hasStrongEventEvidence(
  sentence: string,
): { present: boolean; label?: string } {
  const match = strongEventPatterns.find(({ pattern }) => pattern.test(sentence));
  return match ? { present: true, label: match.label } : { present: false };
}

/**
 * Terms like "flooding", "litigation" or "wetlands" appear constantly in records
 * that have nothing to do with a capital project. Rules that use them require at
 * least one infrastructure noun in the same sentence.
 */
const infrastructureContextPattern =
  /\b(?:water\s*main|watermain|sewer|stormwater|wastewater|culvert|bridge|road|roadway|highway|sidewalk|pavement|pump\s*station|treatment\s*plant|drainage|dam|levee|reservoir|hydrant|utility|utilities|pipeline|construction|contractor|engineer(?:ing)?|capital\s*project|public\s*works|dpw|infrastructure|facility|paving|excavation|right[-\s]of[-\s]way)\b/i;

export function hasInfrastructureContext(sentence: string): boolean {
  return infrastructureContextPattern.test(sentence);
}

export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const segments: string[] = [];
  for (const line of normalized.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Split on sentence enders followed by whitespace and a capital or digit.
    const parts = trimmed.split(/(?<=[.!?;])\s+(?=[A-Z0-9"(])/);
    for (const part of parts) {
      const value = part.trim();
      if (!value) continue;
      // Extremely long runs are usually unsegmented PDF text; window them.
      if (value.length <= 400) {
        segments.push(value);
        continue;
      }
      for (let index = 0; index < value.length; index += 320) {
        segments.push(value.slice(Math.max(0, index - 40), index + 360).trim());
      }
    }
  }
  return segments;
}

/**
 * Heuristics for table-of-contents rows, index listings, and filename dumps.
 * These produced the largest share of false positives on the real corpus.
 */
export function looksLikeListLine(sentence: string): { isList: boolean; reason?: string } {
  const value = sentence.trim();
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { isList: false };

  const fileExtensions = (value.match(/\.(?:pdf|docx?|xlsx?)\b/gi) ?? []).length;
  if (fileExtensions >= 2) {
    return { isList: true, reason: "the match is inside a list of document filenames" };
  }

  // Standalone numbers scattered through the text: page numbers or line items.
  const standaloneNumbers = (value.match(/(?:^|\s)\d{1,4}(?=\s|$)/g) ?? []).length;
  const separators = (value.match(/\s[-–—]\s/g) ?? []).length;
  const hasFiniteVerb = finiteVerbPattern.test(value);

  // Budget and capital-plan table rows: figures, percentages and years with no verb.
  const numericTokens = (value.match(/(?:^|\s)[\d,]+(?:\.\d+)?%?(?=\s|$)/g) ?? []).length;
  const hasPercentage = /\d\s?%/.test(value);
  if (!hasFiniteVerb && (numericTokens >= 3 || (numericTokens >= 2 && hasPercentage))) {
    return {
      isList: true,
      reason: "the match is inside a budget or capital-plan table row rather than a sentence",
    };
  }

  // Leading index codes such as "D3", "9)", "5.3" that introduce an agenda line.
  if (!hasFiniteVerb && /^(?:[A-Z]\d{1,2}|\d{1,2}[).]|\d+\.\d+)\s/.test(value) && words.length <= 20) {
    return {
      isList: true,
      reason: "the match is inside an indexed agenda or contents line with no sentence structure",
    };
  }

  // Short rows ending in a bare page or line number.
  if (!hasFiniteVerb && separators >= 1 && /\s\d{1,4}$/.test(value) && words.length <= 12) {
    return {
      isList: true,
      reason: "the match is inside a short index row ending in a line number",
    };
  }

  if (!hasFiniteVerb && standaloneNumbers >= 3 && words.length >= 8) {
    return {
      isList: true,
      reason: "the match is inside a numbered index or table of contents row",
    };
  }

  if (!hasFiniteVerb && separators >= 3) {
    return {
      isList: true,
      reason: "the match is inside a separator-delimited list rather than a sentence",
    };
  }

  // Long ALL-CAPS runs are almost always headings or filename listings.
  const capsWords = words.filter(
    (word) => word.length >= 3 && word === word.toUpperCase() && /[A-Z]/.test(word),
  ).length;
  if (capsWords / words.length > 0.6 && words.length >= 8 && !hasFiniteVerb) {
    return { isList: true, reason: "the match is inside an all-capitals heading or index block" };
  }

  if (!hasFiniteVerb && words.length >= 12) {
    const titleCaseWords = words.filter((word) => /^[A-Z][a-z]/.test(word)).length;
    if (titleCaseWords / words.length > 0.55) {
      return {
        isList: true,
        reason: "the match is inside a run of title-case items with no verb, typical of a contents listing",
      };
    }
  }

  return { isList: false };
}

function scoreToConfidence(score: number): Confidence {
  if (score >= 3) return "High";
  if (score >= 1) return "Medium";
  return "Low";
}

export interface EvaluateContextInput {
  sentence: string;
  term: string;
  documentTitle?: string;
  /**
   * Set for rules whose terms are common outside infrastructure ("litigation",
   * "flooding", "wetlands"). Requires an infrastructure subject in the sentence.
   */
  requiresInfrastructureContext?: boolean;
}

export function evaluateContext({
  sentence,
  term,
  documentTitle = "",
  requiresInfrastructureContext = false,
}: EvaluateContextInput): ContextEvaluation {
  const value = sentence.replace(/\s+/g, " ").trim();
  const lower = value.toLowerCase();
  const termIndex = lower.indexOf(term.toLowerCase());
  const before = termIndex >= 0 ? value.slice(0, termIndex) : "";
  const after = termIndex >= 0 ? value.slice(termIndex + term.length) : "";

  const confidenceFactors: string[] = [];
  let score = 1;

  // --- Hard suppressions -------------------------------------------------

  for (const { pattern, label } of negationPatterns) {
    if (pattern.test(before)) {
      return {
        sentence: value,
        suppressed: true,
        suppressionKind: "Negated",
        suppressionReason: `Suppressed because ${label}.`,
        confidence: "Low",
        confidenceFactors: [],
        score: -10,
      };
    }
  }

  for (const { pattern, label } of negationAfterPatterns) {
    if (pattern.test(after)) {
      return {
        sentence: value,
        suppressed: true,
        suppressionKind: "Negated",
        suppressionReason: `Suppressed because ${label}.`,
        confidence: "Low",
        confidenceFactors: [],
        score: -10,
      };
    }
  }

  const strong = hasStrongEventEvidence(value);
  const hasVerb = finiteVerbPattern.test(value);

  // Agenda items are written in title case and read as headings to a formatting
  // heuristic. Specific evidence can override the shape of the line, but only
  // alongside a verb: "Approving ... A Contract Amendment For $25,000.00" records
  // an act, while "Pump Station Water Storage Tank $3,000,000" is a budget row.
  const strongEnoughToOverrideShape = strong.present && hasVerb;

  const list = looksLikeListLine(value);
  if (list.isList && !strongEnoughToOverrideShape) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "List or index line",
      suppressionReason: `Suppressed because ${list.reason}.`,
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  const definitional = definitionalPatterns.find(({ pattern }) => pattern.test(value));
  if (definitional && !strong.present) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "Definitional or policy language",
      suppressionReason: `Suppressed because the surrounding text ${definitional.label}.`,
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  // In a plan, policy or manual the configured terms describe what the document
  // is about rather than something that happened. Only a specific amount,
  // identifier or date distinguishes a record from a description.
  if (policyDocumentTitle.test(documentTitle) && !strong.present) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "Definitional or policy language",
      suppressionReason:
        "Suppressed because the source is a plan, policy, or manual and the sentence records no amount, identifier, or date that would make it a specific event.",
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  if (requiresInfrastructureContext && !hasInfrastructureContext(value)) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "Outside domain",
      suppressionReason:
        "Suppressed because the term is ambiguous outside infrastructure and the sentence contains no infrastructure subject.",
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  // A term with almost no surrounding text cannot be reviewed at all.
  const wordCount = value.split(/\s+/).length;
  if (wordCount < 4) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "Insufficient context",
      suppressionReason:
        "Suppressed because the match has too little surrounding text to review.",
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  // A short fragment with no verb and no amount, identifier or date is a heading
  // or a project name, not a record of anything happening. Terse but real
  // statements ("Final completion delayed to October") carry a verb and survive.
  if (!hasVerb && !strong.present && wordCount < 12) {
    return {
      sentence: value,
      suppressed: true,
      suppressionKind: "Insufficient context",
      suppressionReason:
        "Suppressed because the match is a short fragment with no verb and no amount, identifier, or date, which reads as a heading or project name rather than an event.",
      confidence: "Low",
      confidenceFactors: [],
      score: -10,
    };
  }

  // --- Confidence scoring ------------------------------------------------

  if (policyDocumentTitle.test(documentTitle)) {
    score -= 1;
    confidenceFactors.push(
      "Lower confidence because the source document is a plan, policy, or manual rather than a meeting or procurement record.",
    );
  }

  if (list.isList && strong.present) {
    confidenceFactors.push(
      `Retained despite list-like formatting because the line ${strong.label}.`,
    );
  }

  const prospective = prospectivePatterns.find(({ pattern }) => pattern.test(value));
  if (prospective) {
    score -= 2;
    confidenceFactors.push(`Lower confidence because the sentence ${prospective.label}.`);
  }

  for (const { pattern, label } of concreteEventPatterns) {
    if (pattern.test(value)) {
      score += 1;
      confidenceFactors.push(`Higher confidence because the sentence ${label}.`);
    }
  }

  if (finiteVerbPattern.test(value)) {
    score += 1;
    confidenceFactors.push(
      "Higher confidence because the match sits in a complete sentence rather than a heading or list row.",
    );
  }

  const confidence = scoreToConfidence(score);
  if (confidenceFactors.length === 0) {
    confidenceFactors.push(
      "Baseline confidence because the term appears in readable prose with no strengthening or weakening context.",
    );
  }

  return {
    sentence: value,
    suppressed: false,
    confidence,
    confidenceFactors,
    score,
  };
}
