import crypto from "crypto";
import { readBlob, writeBlob } from "@/lib/kv";

const KEY = "arnold:chats";

export type StoredPart =
  | { type: "thinking"; text: string }
  | { type: "action"; label: string }
  | { type: "text"; text: string };

export type StoredAttachment = { name: string; kind: "image" | "document"; dataUrl?: string };

export type StoredMessage =
  | { role: "user"; text: string; attachments?: StoredAttachment[] }
  | { role: "assistant"; parts: StoredPart[] };

export type Conversation = {
  id: string;
  title: string;
  temporary: boolean;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
};

type Store = { conversations: Conversation[] };

function nowISO(): string {
  return new Date().toISOString();
}

async function readStore(): Promise<Store> {
  return readBlob<Store>(KEY, { conversations: [] });
}

async function writeStore(store: Store): Promise<void> {
  await writeBlob(KEY, store);
}

async function ensureGeneral(store: Store): Promise<Conversation> {
  let general = store.conversations.find((c) => c.id === "general");
  if (!general) {
    general = {
      id: "general",
      title: "General",
      temporary: false,
      messages: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    store.conversations.push(general);
    await writeStore(store);
  }
  return general;
}

export async function listConversations(): Promise<
  Array<Pick<Conversation, "id" | "title" | "temporary" | "updatedAt">>
> {
  const store = await readStore();
  await ensureGeneral(store);
  return store.conversations
    .map(({ id, title, temporary, updatedAt }) => ({ id, title, temporary, updatedAt }))
    .sort((a, b) => {
      if (a.id === "general") return -1;
      if (b.id === "general") return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const store = await readStore();
  if (id === "general") return ensureGeneral(store);
  return store.conversations.find((c) => c.id === id) ?? null;
}

export async function createConversation(
  temporary: boolean,
  title?: string
): Promise<Conversation> {
  const store = await readStore();
  const conv: Conversation = {
    id: crypto.randomUUID(),
    title: title?.trim() || (temporary ? "Temporary chat" : "General"),
    temporary,
    messages: [],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  store.conversations.push(conv);
  await writeStore(store);
  return conv;
}

export async function saveMessages(
  id: string,
  messages: StoredMessage[]
): Promise<Conversation | null> {
  const store = await readStore();
  let conv = store.conversations.find((c) => c.id === id);
  if (!conv && id === "general") conv = await ensureGeneral(store);
  if (!conv) return null;
  conv.messages = messages;
  conv.updatedAt = nowISO();
  await writeStore(store);
  return conv;
}

export async function deleteConversation(id: string): Promise<boolean> {
  if (id === "general") return false;
  const store = await readStore();
  const before = store.conversations.length;
  store.conversations = store.conversations.filter((c) => c.id !== id);
  if (store.conversations.length === before) return false;
  await writeStore(store);
  return true;
}
