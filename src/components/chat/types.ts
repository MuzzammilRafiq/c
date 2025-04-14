export type GeminiModel = "gemini-2.0-flash" | "gemini-2.0-flash-lite";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: string;
  timestamp: number;
}

export interface ChatProps {
  conversationId?: string;
}
