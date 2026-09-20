"use client";

import { useState } from "react";
import { FoodsPanel } from "./foods-panel";
import { BodyPanel } from "./body-panel";
import { RecipesPanel } from "./recipes-panel";

const tabs = [
  { id: "foods", label: "Foods" },
  { id: "recipes", label: "Recipes" },
  { id: "weight", label: "Weight" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DatabaseTabs() {
  const [tab, setTab] = useState<TabId>("foods");

  return (
    <div className="flex flex-col gap-5">
      <div className="self-start flex rounded-full bg-white/75 backdrop-blur-xl ring-1 ring-black/5 shadow-sm p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "foods" && <FoodsPanel />}
      {tab === "recipes" && <RecipesPanel />}
      {tab === "weight" && <BodyPanel />}
    </div>
  );
}
