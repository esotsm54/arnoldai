import { Redis } from "@upstash/redis";

// Shared Upstash Redis client for every store in the app. Persists across
// deploys and serverless invocations (unlike the filesystem), and is the
// same data whether you're on your phone or your PC.
let client: Redis | null = null;

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. Add them to .env.local."
    );
  }
  if (!client) client = new Redis({ url, token });
  return client;
}

export async function readBlob<T>(key: string, fallback: T): Promise<T> {
  const raw = await getRedis().get<T>(key);
  if (raw === null || raw === undefined) return fallback;
  // The SDK usually auto-deserializes JSON values, but guard for a plain
  // string in case a value was written some other way.
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw;
}

export async function writeBlob<T>(key: string, value: T): Promise<void> {
  await getRedis().set(key, value);
}
