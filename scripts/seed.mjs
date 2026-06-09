import { rm } from "node:fs/promises";
import path from "node:path";

const localDataPath = path.join(process.cwd(), "data", "local-data.json");

try {
  await rm(localDataPath);
  console.log("Local data reset. The app will use the bundled fictional seed dataset.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("Seed dataset is ready. No local data file needed resetting.");
}
