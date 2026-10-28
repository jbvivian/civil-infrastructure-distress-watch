import type { ConnectorType, SourceType } from "@/lib/types";

export interface MonitoredSourceConfig {
  id: string;
  name: string;
  body: string;
  jurisdiction: string;
  municipality: string;
  county?: string;
  type: SourceType;
  url: string;
  active: boolean;
  scrapeEnabled: boolean;
  connector: "html" | "pdf" | "index";
  connectorType: ConnectorType;
  maxLinkedDocuments?: number;
}

export const monitoredSources: MonitoredSourceConfig[] = [
  {
    id: "live-orange-county-public-works",
    name: "Orange County Department of Public Works",
    body: "Orange County Department of Public Works",
    jurisdiction: "Orange County",
    municipality: "Orange County",
    county: "Orange",
    type: "Procurement notice",
    url: "https://www.orangecountygov.com/529/Public-Works",
    active: true,
    scrapeEnabled: true,
    connector: "index",
    connectorType: "IndexPage",
    maxLinkedDocuments: 2,
  },
  {
    id: "live-orange-county-legislature",
    name: "Orange County Legislature",
    body: "Orange County Legislature",
    jurisdiction: "Orange County",
    municipality: "Orange County",
    county: "Orange",
    type: "County legislature agenda",
    url: "https://www.orangecountygov.com/903/Legislature",
    active: true,
    scrapeEnabled: true,
    connector: "html",
    connectorType: "HTML",
  },
  {
    id: "live-dutchess-county-public-works",
    name: "Dutchess County Department of Public Works",
    body: "Dutchess County Department of Public Works",
    jurisdiction: "Dutchess County",
    municipality: "Dutchess County",
    county: "Dutchess",
    type: "Procurement notice",
    url: "https://www.dutchessny.gov/Departments/Public-Works/public-works.htm",
    active: true,
    scrapeEnabled: true,
    connector: "index",
    connectorType: "IndexPage",
    maxLinkedDocuments: 2,
  },
  {
    id: "live-dutchess-capital-plan",
    name: "Dutchess County Capital Plan 2026-2030",
    body: "Dutchess County",
    jurisdiction: "Dutchess County",
    municipality: "Dutchess County",
    county: "Dutchess",
    type: "Procurement notice",
    url: "https://www.dutchessny.gov/Departments/Budget/Docs/Capital-Program-2026-2030.pdf",
    active: true,
    scrapeEnabled: true,
    connector: "pdf",
    connectorType: "PDF",
  },
  {
    id: "live-ulster-public-works-committee",
    name: "Ulster County Public Works and Capital Projects Committee",
    body: "Ulster County Legislature",
    jurisdiction: "Ulster County",
    municipality: "Ulster County",
    county: "Ulster",
    type: "County legislature agenda",
    url: "https://legislature.ulstercountyny.gov/committee/public-works-and-capital-projects/",
    active: true,
    scrapeEnabled: true,
    connector: "index",
    connectorType: "IndexPage",
    maxLinkedDocuments: 2,
  },
  {
    id: "live-ulster-active-bids",
    name: "Ulster County active commodity bids",
    body: "Ulster County General Services",
    jurisdiction: "Ulster County",
    municipality: "Ulster County",
    county: "Ulster",
    type: "Procurement notice",
    url: "https://www.ulstercountyny.gov/Departments/General-Services/Active-Commodity-Bids",
    active: true,
    scrapeEnabled: true,
    connector: "index",
    connectorType: "IndexPage",
    maxLinkedDocuments: 2,
  },
  {
    id: "live-ulster-capital-plan",
    name: "Ulster County Capital Improvement Program 2026-2031",
    body: "Ulster County",
    jurisdiction: "Ulster County",
    municipality: "Ulster County",
    county: "Ulster",
    type: "Procurement notice",
    url: "https://www.ulstercountyny.gov/files/assets/countysite/v/1/transparency-center/documents/budget/2026/adopted-budget/adopted-capital-improvement-program-2026-2031.pdf",
    active: true,
    scrapeEnabled: true,
    connector: "pdf",
    connectorType: "PDF",
  },
  {
    id: "live-nysdot-construction-results",
    name: "NYSDOT construction opportunities and results",
    body: "New York State Department of Transportation",
    jurisdiction: "New York State",
    municipality: "New York State",
    type: "Bid result",
    url: "https://www.dot.ny.gov/doing-business/opportunities/const-results",
    active: true,
    scrapeEnabled: true,
    connector: "html",
    connectorType: "HTML",
  },
  {
    id: "live-nys-comptroller-audits",
    name: "NYS Comptroller local government audits",
    body: "Office of the New York State Comptroller",
    jurisdiction: "New York State",
    municipality: "New York State",
    type: "Comptroller audit",
    url: "https://www.osc.ny.gov/local-government/audits",
    active: true,
    scrapeEnabled: true,
    connector: "html",
    connectorType: "HTML",
  },
  {
    id: "live-poughkeepsie-planning-board",
    name: "Town of Poughkeepsie Planning Board",
    body: "Town of Poughkeepsie",
    jurisdiction: "Town of Poughkeepsie",
    municipality: "Poughkeepsie",
    county: "Dutchess",
    type: "Planning board agenda",
    url: "https://www.townofpoughkeepsie-ny.gov/AgendaCenter/Planning-Board-6/",
    active: true,
    scrapeEnabled: true,
    connector: "index",
    connectorType: "IndexPage",
    maxLinkedDocuments: 2,
  },
  {
    id: "live-sullivan-county-bids",
    name: "Sullivan County current bids",
    body: "Sullivan County Purchasing and Central Services",
    jurisdiction: "Sullivan County",
    municipality: "Sullivan County",
    county: "Sullivan",
    type: "Procurement notice",
    url: "https://www.sullivanny.gov/Departments/Purchasing/Bids",
    active: true,
    scrapeEnabled: true,
    connector: "html",
    connectorType: "HTML",
  },
  {
    id: "live-sullivan-county-proposals",
    name: "Sullivan County requests for proposals",
    body: "Sullivan County Purchasing and Central Services",
    jurisdiction: "Sullivan County",
    municipality: "Sullivan County",
    county: "Sullivan",
    type: "Procurement notice",
    url: "https://www.sullivanny.gov/Departments/Purchasing/RequestforProposals",
    active: true,
    scrapeEnabled: true,
    connector: "html",
    connectorType: "HTML",
  },
];

export function getMonitoredSource(
  sourceIdOrName: string,
): MonitoredSourceConfig | undefined {
  const normalized = sourceIdOrName.toLowerCase();
  return monitoredSources.find(
    (source) =>
      source.id.toLowerCase() === normalized ||
      source.name.toLowerCase() === normalized,
  );
}
