"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

type Status =
  | "loading"
  | "unsupported"
  | "not-subscribed"
  | "subscribed"
  | "denied";

export function PushManager() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "not-subscribed");
    })();
  }, []);

  async function subscribe() {
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);
      setStatus("subscribed");
      setMessage("Notifications enabled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Subscription failed");
    }
  }

  async function unsubscribe() {
    setMessage("");
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setStatus("not-subscribed");
  }

  async function sendTest() {
    setMessage("");
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Arnold AI",
        body: "Test notification — it works! 💪",
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok ? `Sent to ${data.sent} device(s).` : data.error || "Send failed"
    );
  }

  if (status === "loading") return <p className="text-sm opacity-60">Checking notification support…</p>;
  if (status === "unsupported")
    return (
      <p className="text-sm opacity-60">
        Push not supported in this browser. On iOS, add the app to your home
        screen first (iOS 16.4+).
      </p>
    );
  if (status === "denied")
    return (
      <p className="text-sm opacity-60">
        Notifications are blocked. Allow them in your browser settings.
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {status === "not-subscribed" ? (
          <button
            onClick={subscribe}
            className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700"
          >
            Enable notifications
          </button>
        ) : (
          <>
            <button
              onClick={sendTest}
              className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700"
            >
              Send test notification
            </button>
            <button
              onClick={unsubscribe}
              className="rounded-full ring-1 ring-black/10 text-slate-700 px-5 py-2 text-sm hover:bg-slate-100"
            >
              Disable
            </button>
          </>
        )}
      </div>
      {message && <p className="text-sm opacity-80">{message}</p>}
    </div>
  );
}
