import type { ExtractedEntities } from "@/lib/types";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 20);
}

function matches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

const projectTypePatterns = [
  "water main",
  "water system",
  "sewer",
  "stormwater",
  "wastewater",
  "bridge",
  "culvert",
  "road",
  "sidewalk",
  "pump station",
  "building",
  "hvac",
  "drainage",
  "flood mitigation",
];

export function emptyExtractedEntities(): ExtractedEntities {
  return {
    possibleProjectNames: [],
    possibleOwners: [],
    possibleVendors: [],
    possibleFundingSources: [],
    possibleAmounts: [],
    possibleDates: [],
    possibleResolutionOrContractNumbers: [],
    possibleProjectTypes: [],
  };
}

export function extractEntities(text: string): ExtractedEntities {
  const normalized = text.replace(/\s+/g, " ").trim();
  const possibleProjectNames = matches(
    normalized,
    /\b[A-Z][A-Za-z0-9'&./-]*(?:\s+[A-Z0-9][A-Za-z0-9'&./-]*){1,8}\s+(?:Project|Program|Replacement|Rehabilitation|Improvements?|Upgrade|Extension|Reconstruction|Renewal|Repair)\b/g,
  );
  const possibleOwners = matches(
    normalized,
    /\b(?:Town|City|Village|County|Authority|District|Department)\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3}\b/g,
  );
  const possibleVendors = matches(
    normalized,
    /\b[A-Z][A-Za-z0-9&'-]+(?:\s+[A-Z][A-Za-z0-9&'-]+){0,4}\s+(?:Engineering|Engineers|Construction|Constructors|Contracting|Consultants|Architects|Associates)(?:\s+(?:LLC|Inc\.?|Corp\.?))?\b|\b[A-Z][A-Za-z0-9&'-]+(?:\s+[A-Z][A-Za-z0-9&'-]+){0,4}\s+(?:LLC|Inc\.?|Corp\.?)\b/g,
  );
  const possibleFundingSources = matches(
    normalized,
    /\b(?:WIIA|WQIP|CWSRF|DWSRF|FEMA|BRIC|HMGP|CHIPS|Bridge NY|TAP|federal[- ]aid|state aid|grant funding|capital fund|local bonds?)\b/gi,
  );
  const possibleAmounts = matches(
    normalized,
    /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:million|billion|thousand))?/gi,
  );
  const possibleDates = matches(
    normalized,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
  );
  const possibleResolutionOrContractNumbers = matches(
    normalized,
    /\b(?:Resolution|Contract|Bid|RFP|IFB|PIN|D\d{6}|Change Order)\s*(?:No\.?|#|Number)?\s*[A-Z0-9][A-Z0-9./-]{2,}\b/gi,
  );
  const lower = normalized.toLowerCase();
  const possibleProjectTypes = projectTypePatterns.filter((type) => lower.includes(type));

  return {
    possibleProjectNames: unique(possibleProjectNames),
    possibleOwners: unique(possibleOwners),
    possibleVendors: unique(possibleVendors),
    possibleFundingSources: unique(possibleFundingSources),
    possibleAmounts: unique(possibleAmounts),
    possibleDates: unique(possibleDates),
    possibleResolutionOrContractNumbers: unique(possibleResolutionOrContractNumbers),
    possibleProjectTypes: unique(possibleProjectTypes),
  };
}
