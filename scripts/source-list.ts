import { monitoredSources } from "../src/config/monitored-sources";

for (const source of monitoredSources) {
  console.log(
    [
      source.id,
      source.connectorType,
      source.scrapeEnabled ? "enabled" : "disabled",
      source.name,
      source.url,
    ].join("\t"),
  );
}
