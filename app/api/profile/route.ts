import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api-client";

// Proxies the Arnold API's /user-info endpoint. GET returns null (not an
// error) when no profile exists yet, so the client can switch to create mode.

export async function GET() {
  try {
    const profile = await apiFetch<Record<string, unknown> | null>("/user-info");
    if (!profile || "error" in profile) return NextResponse.json(null);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return NextResponse.json(null);
    }
    console.error("Profile fetch failed:", err);
    return NextResponse.json({ error: "Profile fetch failed" }, { status: 502 });
  }
}

// The docs say PUT, but the live API only accepts PATCH /user-info for updates
async function save(request: Request, method: "POST" | "PATCH") {
  const body = await request.json().catch(() => null);
  const { dateOfBirth, sex, heightMeters, activityLevel } = body ?? {};
  if (!dateOfBirth || !sex || !heightMeters || !activityLevel) {
    return NextResponse.json(
      { error: "dateOfBirth, sex, heightMeters and activityLevel are required" },
      { status: 400 }
    );
  }
  try {
    const profile = await apiFetch<Record<string, unknown>>("/user-info", {
      method,
      body: JSON.stringify({ dateOfBirth, sex, heightMeters, activityLevel }),
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Profile save failed:", err);
    const status = err instanceof ApiError ? err.status : 502;
    return NextResponse.json({ error: "Profile save failed" }, { status });
  }
}

export async function POST(request: Request) {
  return save(request, "POST");
}

export async function PUT(request: Request) {
  return save(request, "PATCH");
}
