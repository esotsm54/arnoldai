import { DiaryDay } from "@/components/diary/diary-day";

export default function DiaryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-900">Diary</h1>
      <DiaryDay />
    </div>
  );
}
