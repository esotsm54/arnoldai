import { NextResponse } from "next/server";
import webpush, { WebPushError } from "web-push";
import { getSubscriptions, removeSubscription } from "@/lib/subscription-store";

export async function POST(request: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured. See .env.example." },
      { status: 500 }
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey
  );

  const { title = "Arnold AI", body = "Test notification", url = "/" } =
    await request.json().catch(() => ({}));

  const subs = await getSubscriptions();
  if (subs.length === 0) {
    return NextResponse.json(
      { error: "No subscriptions stored. Enable notifications first." },
      { status: 404 }
    );
  }

  let sent = 0;
  let pruned = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body, url }));
      sent++;
    } catch (err) {
      // 404/410 mean the subscription expired or was revoked
      if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
        await removeSubscription(sub.endpoint);
        pruned++;
      } else {
        console.error("Push send failed:", err);
      }
    }
  }
  return NextResponse.json({ sent, pruned });
}
