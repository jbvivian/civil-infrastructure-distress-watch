import { describe, expect, it } from "vitest";
import { extractEntities } from "@/lib/entities";

describe("extractEntities", () => {
  it("extracts useful civil-infrastructure review candidates", () => {
    const entities = extractEntities(
      "On June 4, 2026, the Town of Poughkeepsie reviewed Contract No. DPW-2026-14 for the Northside Sewer Extension Project. Hudson Valley Engineering LLC submitted a $2,450,000 proposal supported by WIIA grant funding for pump station work.",
    );

    expect(entities.possibleProjectNames).toContain(
      "Northside Sewer Extension Project",
    );
    expect(entities.possibleOwners).toContain("Town of Poughkeepsie");
    expect(entities.possibleVendors).toContain("Hudson Valley Engineering LLC");
    expect(entities.possibleFundingSources).toContain("WIIA");
    expect(entities.possibleAmounts).toContain("$2,450,000");
    expect(entities.possibleDates).toContain("June 4, 2026");
    expect(entities.possibleResolutionOrContractNumbers).toContain(
      "Contract No. DPW-2026-14",
    );
    expect(entities.possibleProjectTypes).toEqual(
      expect.arrayContaining(["sewer", "pump station"]),
    );
  });
});
