import { Conversation, Message } from "./types";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export const createNewChat = (
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  router: ReturnType<typeof useRouter>
) => {
  const newId = uuidv4();
  const newConversation: Conversation = {
    id: newId,
    title: "New Chat",
    messages: [],
    lastMessage: "",
    timestamp: Date.now(),
  };
  setConversations((prev) => [newConversation, ...prev]);
  setActiveConversationId(newId);
  setMessages([]);
  router.push(`/chat/${newId}`);
};

export const selectConversation = (
  id: string,
  conversations: Conversation[],
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  router: ReturnType<typeof useRouter>
) => {
  const conversation = conversations.find((c) => c.id === id);
  if (conversation) {
    setActiveConversationId(id);
    setMessages(conversation.messages || []);
    router.push(`/chat/${id}`);
  }
};

export const updateConversation = (
  activeConversationId: string | null,
  updatedMessages: Message[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
) => {
  setConversations((prev) =>
    prev.map((conv) =>
      conv.id === activeConversationId
        ? {
            ...conv,
            messages: updatedMessages,
            lastMessage:
              updatedMessages[updatedMessages.length - 1]?.content || "",
            timestamp: Date.now(),
          }
        : conv
    )
  );
};

export const deleteConversation = (
  id: string,
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  activeConversationId: string | null
) => {
  setConversations((prev) => {
    const newConversations = prev.filter((conv) => conv.id !== id);
    // If we're deleting the active conversation, select the first remaining one
    if (id === activeConversationId) {
      if (newConversations.length > 0) {
        const nextId = newConversations[0].id;
        setActiveConversationId(nextId);
        setMessages(newConversations[0].messages || []);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
    return newConversations;
  });
};