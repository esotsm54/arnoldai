import { readBlob, writeBlob } from "@/lib/kv";
import type { PushSubscription } from "web-push";

const KEY = "arnold:push-subscriptions";

async function readAll(): Promise<PushSubscription[]> {
  return readBlob<PushSubscription[]>(KEY, []);
}

async function writeAll(subs: PushSubscription[]): Promise<void> {
  await writeBlob(KEY, subs);
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
