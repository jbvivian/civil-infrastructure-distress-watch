import type { SourceType } from "@/lib/types";

export interface MonitoredSourceConfig {
  id: string;
  name: string;
  body: string;
  municipality: string;
  type: SourceType;
  url: string;
  active: boolean;
  connector: "html";
}

export const monitoredSources: MonitoredSourceConfig[] = [
  {
    id: "live-orange-county-legislature",
    name: "Orange County Legislature",
    body: "Orange County Legislature",
    municipality: "Orange County",
    type: "County legislature agenda",
    url: "https://www.orangecountygov.com/903/Legislature",
    active: true,
    connector: "html",
  },
  {
    id: "live-dutchess-county-legislature",
    name: "Dutchess County Legislature",
    body: "Dutchess County Legislature",
    municipality: "Dutchess County",
    type: "County legislature agenda",
    url: "https://www.dutchessny.gov/Departments/County-Legislature/County-Legislature.htm",
    active: true,
    connector: "html",
  },
  {
    id: "live-ulster-transportation-council",
    name: "Ulster County Transportation Council agendas",
    body: "Ulster County Transportation Council",
    municipality: "Ulster County",
    type: "County legislature agenda",
    url: "https://uctc.ulstercountyny.gov/agendas/",
    active: true,
    connector: "html",
  },
  {
    id: "live-town-newburgh-meetings",
    name: "Town of Newburgh meeting schedules",
    body: "Town of Newburgh",
    municipality: "Newburgh",
    type: "Town board agenda",
    url: "https://www.townofnewburgh.org/cn/meetings/?tpid=4729",
    active: true,
    connector: "html",
  },
  {
    id: "live-poughkeepsie-planning-board",
    name: "Town of Poughkeepsie Planning Board",
    body: "Town of Poughkeepsie",
    municipality: "Poughkeepsie",
    type: "Planning board agenda",
    url: "https://www.townofpoughkeepsie-ny.gov/AgendaCenter/Planning-Board-6/",
    active: true,
    connector: "html",
  },
  {
    id: "live-nysdot-business",
    name: "NYSDOT contracting opportunities",
    body: "New York State Department of Transportation",
    municipality: "New York State",
    type: "Bid result",
    url: "https://www.dot.ny.gov/doing-business",
    active: true,
    connector: "html",
  },
  {
    id: "live-nys-comptroller-audits",
    name: "NYS Comptroller local government audits",
    body: "Office of the New York State Comptroller",
    municipality: "New York State",
    type: "Comptroller audit",
    url: "https://www.osc.ny.gov/local-government/audits/village",
    active: true,
    connector: "html",
  },
];

export function getMonitoredSource(sourceId: string): MonitoredSourceConfig | undefined {
  return monitoredSources.find((source) => source.id === sourceId);
}
