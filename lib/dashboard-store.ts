import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Skeleton storage: a JSON file on disk. Works for local dev only —
// swap for a database before deploying (serverless filesystems are ephemeral).
const FILE = path.join(process.cwd(), ".dashboard-cards.json");

export type VizType = "table" | "line" | "bar" | "stat";

export type DashboardCard = {
  id: string;
  title: string;
  prompt: string;
  vizType: VizType;
  data: unknown;
  error: string | null;
  updatedAt: string | null;
  createdAt: string;
};

type Store = { cards: DashboardCard[] };

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { cards: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(store, null, 2));
}

export async function listCards(): Promise<DashboardCard[]> {
  return (await readStore()).cards;
}

export async function getCard(id: string): Promise<DashboardCard | null> {
  const store = await readStore();
  return store.cards.find((c) => c.id === id) ?? null;
}

export async function createCard(
  title: string,
  prompt: string,
  vizType: VizType
): Promise<DashboardCard> {
  const store = await readStore();
  const card: DashboardCard = {
    id: crypto.randomUUID(),
    title,
    prompt,
    vizType,
    data: null,
    error: null,
    updatedAt: null,
    createdAt: new Date().toISOString(),
  };
  store.cards.push(card);
  await writeStore(store);
  return card;
}

export async function updateCard(
  id: string,
  fields: { title?: string; prompt?: string; vizType?: VizType }
): Promise<DashboardCard | null> {
  const store = await readStore();
  const card = store.cards.find((c) => c.id === id);
  if (!card) return null;
  if (fields.title !== undefined) card.title = fields.title;
  if (fields.prompt !== undefined) card.prompt = fields.prompt;
  if (fields.vizType !== undefined) card.vizType = fields.vizType;
  await writeStore(store);
  return card;
}

export async function setCardResult(
  id: string,
  result: { data: unknown } | { error: string }
): Promise<DashboardCard | null> {
  const store = await readStore();
  const card = store.cards.find((c) => c.id === id);
  if (!card) return null;
  if ("error" in result) {
    // Keep the last good data on screen; just surface the failure.
    card.error = result.error;
  } else {
    card.data = result.data;
    card.error = null;
    card.updatedAt = new Date().toISOString();
  }
  await writeStore(store);
  return card;
}

export async function reorderCards(orderedIds: string[]): Promise<DashboardCard[]> {
  const store = await readStore();
  const byId = new Map(store.cards.map((c) => [c.id, c]));
  const reordered: DashboardCard[] = [];
  for (const id of orderedIds) {
    const card = byId.get(id);
    if (card) {
      reordered.push(card);
      byId.delete(id);
    }
  }
  // Anything not mentioned (shouldn't normally happen) keeps its relative order at the end.
  reordered.push(...byId.values());
  store.cards = reordered;
  await writeStore(store);
  return reordered;
}

export async function deleteCard(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.cards.length;
  store.cards = store.cards.filter((c) => c.id !== id);
  if (store.cards.length === before) return false;
  await writeStore(store);
  return true;
}
