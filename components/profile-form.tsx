"use client";

import { useEffect, useState } from "react";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "lightly_active", label: "Lightly active" },
  { value: "moderately_active", label: "Moderately active" },
  { value: "very_active", label: "Very active" },
  { value: "extra_active", label: "Extra active" },
];

type ProfileFields = {
  dateOfBirth: string;
  sex: string;
  heightMeters: string;
  activityLevel: string;
};

const EMPTY: ProfileFields = {
  dateOfBirth: "",
  sex: "male",
  heightMeters: "",
  activityLevel: "sedentary",
};

const inputClass =
  "w-full rounded-xl bg-white/80 ring-1 ring-black/10 px-4 py-2.5 text-sm outline-none focus:ring-slate-400";

export function ProfileForm() {
  const [fields, setFields] = useState<ProfileFields>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Could not load profile");
        const profile = await res.json();
        if (profile) {
          setExists(true);
          setFields({
            dateOfBirth: profile.dateOfBirth ?? "",
            sex: profile.sex ?? "male",
            heightMeters: String(profile.heightMeters ?? ""),
            activityLevel: profile.activityLevel ?? "sedentary",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set<K extends keyof ProfileFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setMessage("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const height = parseFloat(fields.heightMeters);
    if (!fields.dateOfBirth || !height || height <= 0) {
      setError("Fill in date of birth and a valid height.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: fields.dateOfBirth,
          sex: fields.sex,
          heightMeters: height,
          activityLevel: fields.activityLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setExists(true);
      setMessage(exists ? "Profile updated." : "Profile created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading profile…</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-slate-700">
          Date of birth
          <input
            type="date"
            value={fields.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate-700">
          Sex
          <select
            value={fields.sex}
            onChange={(e) => set("sex", e.target.value)}
            className={inputClass}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate-700">
          Height (meters)
          <input
            type="number"
            step="0.01"
            min="0.5"
            max="2.5"
            placeholder="1.83"
            value={fields.heightMeters}
            onChange={(e) => set("heightMeters", e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate-700">
          Activity level
          <select
            value={fields.activityLevel}
            onChange={(e) => set("activityLevel", e.target.value)}
            className={inputClass}
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm font-medium text-[#006300]">{message}</p>}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : exists ? "Update profile" : "Create profile"}
        </button>
      </div>
    </form>
  );
}
