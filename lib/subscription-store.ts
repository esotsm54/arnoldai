import { promises as fs } from "fs";
import path from "path";
import type { PushSubscription } from "web-push";

// Skeleton storage: a JSON file on disk. Works for local dev only —
// swap for a database before deploying (serverless filesystems are ephemeral).
const FILE = path.join(process.cwd(), ".subscriptions.json");

async function readAll(): Promise<PushSubscription[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeAll(subs: PushSubscription[]): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

export async function getSubscriptions(): Promise<PushSubscription[]> {
  return readAll();
}

export async function addSubscription(sub: PushSubscription): Promise<void> {
  const subs = await readAll();
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    await writeAll(subs);
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const subs = await readAll();
  await writeAll(subs.filter((s) => s.endpoint !== endpoint));
}
