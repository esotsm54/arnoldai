import Image from "next/image";
import { PushManager } from "@/components/push-manager";
import { ChatBox } from "@/components/chat-box";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-slate-900 text-slate-100 px-6 py-12">
      <div className="w-full max-w-xl flex flex-col gap-10">
        <header className="flex items-center gap-4">
          <Image
            src="/icons/icon-192.png"
            alt="Arnold AI logo"
            width={56}
            height={56}
            className="rounded-xl"
          />
          <div>
            <h1 className="text-2xl font-bold">Arnold AI</h1>
            <p className="text-sm opacity-60">
              PWA skeleton — push notifications + AI
            </p>
          </div>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <PushManager />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Chat</h2>
          <ChatBox />
        </section>

        <footer className="text-xs opacity-40">
          On iOS (16.4+), add this app to your home screen to enable
          notifications.
        </footer>
      </div>
    </main>
  );
}
