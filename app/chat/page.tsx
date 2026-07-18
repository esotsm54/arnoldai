import { ChatBox } from "@/components/chat-box";

export default function ChatPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">AI Chat</h1>
      <div className="mt-6">
        <ChatBox />
      </div>
    </div>
  );
}
