export const projectStatuses = [
  "Watch",
  "Review",
  "Escalated",
  "Confirmed Issue",
] as const;

export const distressCategories = [
  "Cost Pressure",
  "Schedule Pressure",
  "Scope Instability",
  "Procurement Trouble",
  "Regulatory / Permitting Risk",
  "Governance / Political Heat",
  "Delivery Complexity",
  "Public Impact",
  "Funding Risk",
] as const;

export const severityLevels = ["Low", "Medium", "High"] as const;
export const confidenceLevels = ["Low", "Medium", "High"] as const;
export const scrapeStatuses = ["Success", "Failed", "Partial"] as const;
export const sourceScrapeStatuses = ["Not checked", ...scrapeStatuses] as const;
export const connectorTypes = ["HTML", "PDF", "IndexPage", "Manual", "Mock"] as const;
export const dataOrigins = ["Seed", "Manual", "Scraped"] as const;
export const signalReviewStatuses = [
  "Needs Review",
  "Assigned",
  "Promoted",
  "Dismissed",
] as const;
export const civilFirmOpportunityTypes = [
  "Potential redesign / additional engineering services",
  "Construction management / inspection need",
  "Procurement or rebid opportunity",
  "Grant / funding support need",
  "Permitting / regulatory support need",
  "Claims / dispute support",
  "Public communication / stakeholder management",
  "Capital planning / asset management",
  "Emergency repair / resilience work",
  "Competitive intelligence only",
  "Not commercially relevant",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type DistressCategory = (typeof distressCategories)[number];
export type Severity = (typeof severityLevels)[number];
export type Confidence = (typeof confidenceLevels)[number];
export type ScrapeStatus = (typeof scrapeStatuses)[number];
export type SourceScrapeStatus = (typeof sourceScrapeStatuses)[number];
export type ConnectorType = (typeof connectorTypes)[number];
export type DataOrigin = (typeof dataOrigins)[number];
export type SignalReviewStatus = (typeof signalReviewStatuses)[number];
export type CivilFirmOpportunityType = (typeof civilFirmOpportunityTypes)[number];

export interface ExtractedEntities {
  possibleProjectNames: string[];
  possibleOwners: string[];
  possibleVendors: string[];
  possibleFundingSources: string[];
  possibleAmounts: string[];
  possibleDates: string[];
  possibleResolutionOrContractNumbers: string[];
  possibleProjectTypes: string[];
}

export type SourceType =
  | "Town board agenda"
  | "Town board minutes"
  | "Planning board agenda"
  | "Planning board minutes"
  | "County legislature agenda"
  | "School board agenda"
  | "Procurement notice"
  | "Bid result"
  | "Comptroller audit"
  | "Local media"
  | "Meeting transcript";

export interface Project {
  id: string;
  slug: string;
  name: string;
  owner: string;
  municipality: string;
  county: string;
  projectType: string;
  phase: string;
  summary: string;
  originalBudget: number;
  currentBudget: number;
  originalCompletion: string;
  currentCompletion: string;
  fundingSources: string[];
  vendors: string[];
  status: ProjectStatus;
  confidence: Confidence;
  lastUpdated: string;
  fictional: true;
  statusReason?: string;
  statusFactors?: string[];
}

export interface Signal {
  id: string;
  projectId: string | null;
  sourceDocumentIds: string[];
  title: string;
  category: DistressCategory;
  signalType: string;
  dateObserved: string;
  evidenceExcerpt: string;
  interpretation: string;
  possibleConsequence: string;
  recommendedAction: string;
  alternativeExplanation: string;
  severity: Severity;
  confidence: Confidence;
  reviewStatus?: SignalReviewStatus | "Unassigned";
  dataOrigin?: DataOrigin;
  sourceDocumentId?: string;
  assignmentStatus?: "Assigned" | "Unassigned" | "Needs Review";
  detectedProjectName?: string;
  extractedBy?: "RuleBased" | "Manual" | "Seed";
  promotedToBrief?: boolean;
  promotedAt?: string;
  promotedBy?: string;
  promotionNote?: string;
  dismissed?: boolean;
  dismissedAt?: string;
  dismissedReason?: string;
  dismissedBy?: string;
  signalReviewStatus?: SignalReviewStatus;
  suggestedProjectId?: string;
  suggestedProjectConfidence?: Confidence;
  suggestedProjectReason?: string;
  extractedEntities?: ExtractedEntities;
  matchedTerms?: string[];
  severityReason?: string;
  confidenceReason?: string;
  scoringFactors?: string[];
  civilFirmRelevance?: string;
  civilFirmOpportunityType?: CivilFirmOpportunityType;
  buyerPersona?: string;
}

export interface Source {
  id: string;
  name: string;
  body: string;
  municipality: string;
  type: SourceType;
  url: string;
  lastChecked: string;
  fictional: boolean;
  active?: boolean;
  connector?: "html" | "pdf" | "index";
  sourceType?: SourceType;
  jurisdiction?: string;
  county?: string;
  scrapeEnabled?: boolean;
  lastCheckedAt?: string;
  lastSuccessfulScrapeAt?: string;
  scrapeStatus?: SourceScrapeStatus;
  lastErrorMessage?: string;
  documentsFound?: number;
  signalsExtracted?: number;
  connectorType?: ConnectorType;
}

export interface SourceDocument {
  id: string;
  sourceId: string;
  projectId: string | null;
  title: string;
  url: string;
  publishedAt: string;
  ingestedAt: string;
  text: string;
  fictional: boolean;
  fetchedAt?: string;
  statusCode?: number;
  contentHash?: string;
  rawText?: string;
  scrapeStatus?: ScrapeStatus;
  errorMessage?: string;
  documentType?: "HTML page" | "PDF";
  contentType?: string;
  extractedText?: string;
  extractionStatus?: ScrapeStatus;
  dataOrigin?: DataOrigin;
  extractedEntities?: ExtractedEntities;
}

export interface ScrapeRun {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt: string;
  status: ScrapeStatus;
  documentsFound: number;
  signalsExtracted: number;
  errorMessage?: string;
  urlFetched: string;
  url?: string;
  httpStatus?: number;
  documentsImported?: number;
  duplicateDocumentsSkipped?: number;
  logLines?: string[];
}

export interface ProjectEvent {
  id: string;
  projectId: string;
  date: string;
  title: string;
  description: string;
  type: "Milestone" | "Funding" | "Procurement" | "Signal";
}

export interface Dataset {
  projects: Project[];
  signals: Signal[];
  sources: Source[];
  documents: SourceDocument[];
  events: ProjectEvent[];
  scrapeRuns: ScrapeRun[];
}

export interface ExtractedSignal
  extends Omit<Signal, "id" | "projectId" | "sourceDocumentIds" | "dateObserved"> {
  matchedTerm: string;
}
