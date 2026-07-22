"use client";

import { useState } from "react";
import { ConversationSwitcher } from "./conversation-switcher";
import { ChatInterface } from "./chat-interface";

export function ChatPage() {
  const [conversationId, setConversationId] = useState("general");

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col h-[calc(100dvh-10rem)] md:h-[calc(100dvh-4rem)]">
      <h1 className="shrink-0 text-2xl font-bold text-slate-900">AI Chat</h1>
      <div className="shrink-0 mt-3">
        <ConversationSwitcher activeId={conversationId} onSelect={setConversationId} />
      </div>
      <ChatInterface key={conversationId} conversationId={conversationId} />
    </div>
  );
}
