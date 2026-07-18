// Thin client for your own backend API. Server-side only (API_BASE_URL is not
// exposed to the browser) — call it from API routes or server components.
// Add typed endpoint wrappers below as the real API takes shape.

const BASE_URL = process.env.API_BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!BASE_URL) {
    throw new Error("API_BASE_URL is not set. Add it to .env.local.");
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `API request failed: ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

// Example endpoint wrapper — replace with real endpoints:
// export function getWorkouts() {
//   return apiFetch<Workout[]>("/workouts");
// }
