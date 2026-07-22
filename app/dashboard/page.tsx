import {
  StatTiles,
  ActivityLineChart,
  SessionsBarChart,
} from "@/components/dashboard-charts";
import { AiCardsSection } from "@/components/dashboard/ai-cards-section";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <StatTiles />
      <ActivityLineChart />
      <SessionsBarChart />
      <div className="mt-2">
        <AiCardsSection />
      </div>
    </div>
  );
}
