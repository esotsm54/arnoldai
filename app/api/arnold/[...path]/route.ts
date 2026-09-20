import { NextRequest, NextResponse } from "next/server";

// Generic proxy to the Arnold API so the browser never talks to it directly.
// Note: the live API accepts PATCH for updates, not PUT (despite its docs).
const ALLOWED_RESOURCES = new Set([
  "user-info",
  "foods",
  "log",
  "exercise",
  "body",
  "body-entries",
]);

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const base = process.env.API_BASE_URL;
  if (!base) {
    return NextResponse.json(
      { error: "API_BASE_URL is not set. Add it to .env.local." },
      { status: 500 }
    );
  }
  const { path } = await params;
  if (!path?.length || !ALLOWED_RESOURCES.has(path[0])) {
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }

  const url = `${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const init: RequestInit = {
    method: request.method,
    headers: { "Content-Type": "application/json" },
  };
  if (!["GET", "DELETE"].includes(request.method)) {
    init.body = await request.text();
  }

  try {
    const res = await fetch(url, init);
    // A 204/205/304 response must not carry a body — the Response
    // constructor throws if given one (e.g. DELETE endpoints return 204).
    if (res.status === 204 || res.status === 205 || res.status === 304) {
      return new NextResponse(null, { status: res.status });
    }
    const text = await res.text();
    return new NextResponse(text || "null", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Arnold API proxy failed:", err);
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
