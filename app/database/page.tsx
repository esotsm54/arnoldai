import { FoodsPanel } from "@/components/database/foods-panel";

export default function DatabasePage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-900">Database</h1>
      <FoodsPanel />
    </div>
  );
}
