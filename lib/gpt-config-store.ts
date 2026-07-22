import { readBlob, writeBlob } from "@/lib/kv";

const KEY = "arnold:gpt-config";

export type GptConfig = {
  instructions: string;
};

const DEFAULT_CONFIG: GptConfig = { instructions: "" };

export async function getGptConfig(): Promise<GptConfig> {
  return { ...DEFAULT_CONFIG, ...(await readBlob(KEY, DEFAULT_CONFIG)) };
}

export async function saveGptConfig(config: GptConfig): Promise<void> {
  await writeBlob(KEY, config);
}
