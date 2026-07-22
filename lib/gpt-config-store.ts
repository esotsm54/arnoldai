import { promises as fs } from "fs";
import path from "path";

// Skeleton storage: a JSON file on disk. Works for local dev only —
// swap for a database before deploying (serverless filesystems are ephemeral).
const FILE = path.join(process.cwd(), ".gpt-config.json");

export type GptConfig = {
  instructions: string;
};

const DEFAULT_CONFIG: GptConfig = { instructions: "" };

export async function getGptConfig(): Promise<GptConfig> {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveGptConfig(config: GptConfig): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(config, null, 2));
}
