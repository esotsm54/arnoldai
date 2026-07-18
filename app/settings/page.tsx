import { PushManager } from "@/components/push-manager";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <section className="mt-6 rounded-3xl bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <div className="mt-3">
          <PushManager />
        </div>
        <p className="mt-4 text-xs text-slate-400">
          On iOS (16.4+), add this app to your home screen to enable
          notifications.
        </p>
      </section>
    </div>
  );
}
