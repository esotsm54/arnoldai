import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100dvh-4rem)]">
      <h1 className="shrink-0 text-2xl font-bold text-slate-900">AI Chat</h1>
      <ChatInterface />
    </div>
  );
}
