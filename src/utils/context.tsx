"use client";

import React, { useState } from "react";
import { Conversation } from "~/app/(home)/chat/[id]/_components/types";
import { MessageWithSources } from "~/app/(home)/chat/[id]/_components/types";

interface ContextType {
  isSidebarVisible: boolean;
  setIsSidebarVisible: React.Dispatch<React.SetStateAction<boolean>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  messages: MessageWithSources[];
  setMessages: React.Dispatch<React.SetStateAction<MessageWithSources[]>>;
  activeConversationId: string | null;
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
}

const UserContext = React.createContext<ContextType | undefined>(undefined);

export function useUserContext() {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSources[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);

  const value = React.useMemo(
    () => ({
      isSidebarVisible,
      setIsSidebarVisible,
      conversations,
      setConversations,
      conversationId,
      setConversationId,
      messages,
      setMessages,
      activeConversationId,
      setActiveConversationId,
    }),
    [
      isSidebarVisible,
      setIsSidebarVisible,
      conversations,
      setConversations,
      conversationId,
      setConversationId,
      messages,
      setMessages,
      activeConversationId,
      setActiveConversationId,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
