"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "../Sidebar";
import { ChatProps, Conversation, Message, GeminiModel } from "./types";
import { themeOptions } from "./theme";
import ChatStyle from "./chat-style";
import {
  createNewChat,
  selectConversation,
  updateConversation,
  deleteConversation,
} from "./chat-crud";
import { Menu } from "lucide-react";

import ChatInput from "./chat-input";

export default function Chat({ conversationId }: ChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedThemeName, setSelectedThemeName] = useState("vscDarkPlus");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<GeminiModel>("gemini-2.0-flash");
  console.log(pathname);
  const [isToggled, setIsToggled] = useState(false);
  const handleToggle = () => {
    setIsToggled((prev) => !prev);
  };

  useEffect(() => {
    if (isInitialized) return;

    try {
      const savedConversations = localStorage.getItem("conversations");
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);

        if (conversationId) {
          const conversation = parsed.find(
            (c: Conversation) => c.id === conversationId
          );
          if (conversation) {
            setMessages(conversation.messages || []);
            setActiveConversationId(conversationId);
          } else {
            console.warn(
              `Conversation ${conversationId} not found in storage.`
            );
            router.push("/");
          }
        } else if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          router.push(`/chat/${parsed[0].id}`);
        } else {
          if (pathname !== "/") {
            router.push("/");
          }
        }
      } else {
        if (pathname !== "/") {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      localStorage.removeItem("conversations");
      router.push("/");
    } finally {
      setIsInitialized(true);
    }
  }, [conversationId, router, isInitialized, pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isInitialized) return;

    const targetPath = activeConversationId
      ? `/chat/${activeConversationId}`
      : "/";

    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }, [activeConversationId, isInitialized, pathname, router]);

  const handleSelectConversation = (id: string) => {
    selectConversation(
      id,
      conversations,
      setActiveConversationId,
      setMessages,
      router
    );
  };

  const handleUpdateConversation = (updatedMessages: Message[]) => {
    updateConversation(activeConversationId, updatedMessages, setConversations);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(
      id,
      setConversations,
      setActiveConversationId,
      setMessages,
      activeConversationId
    );
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || !activeConversationId) return;

    const userMessage: Message = { role: "user", content: messageContent };
    const updatedMessages: Message[] = [...messages, userMessage];

    setMessages(updatedMessages);
    handleUpdateConversation(updatedMessages);
    setIsLoading(true);

    try {
      const messagesWithPlaceholder: Message[] = [
        ...updatedMessages,
        { role: "assistant" as const, content: "" },
      ];
      setMessages(messagesWithPlaceholder);
      handleUpdateConversation(messagesWithPlaceholder);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          systemPrompt: `Please format your responses using Markdown syntax...`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessageContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessageContent += parsed.text;
                  const finalMessages: Message[] = [
                    ...updatedMessages,
                    {
                      role: "assistant" as const,
                      content: assistantMessageContent,
                    },
                  ];
                  setMessages(finalMessages);
                  handleUpdateConversation(finalMessages);
                }
              } catch (e) {
                console.error("Error parsing JSON chunk:", e, "Data:", data);
              }
            }
          }
        }
      }
      const finalMessagesComplete: Message[] = [
        ...updatedMessages,
        { role: "assistant" as const, content: assistantMessageContent },
      ];
      setMessages(finalMessagesComplete);
      handleUpdateConversation(finalMessagesComplete);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessages: Message[] = [
        ...updatedMessages,
        {
          role: "assistant" as const,
          content: "Sorry, there was an error processing your request.",
        },
      ];
      setMessages(errorMessages);
      handleUpdateConversation(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {" "}
      {isSidebarVisible && (
        <Sidebar
          conversations={conversations.map((conv) => ({
            ...conv,
            messages: [],
          }))}
          activeConversationId={activeConversationId}
          onNewChat={() =>
            createNewChat(
              setConversations,
              setActiveConversationId,
              setMessages,
              router
            )
          }
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      )}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 overflow-hidden">
        {" "}
        <div className="mb-4 flex gap-4 justify-between items-center flex-shrink-0">
          {" "}
          <button
            onClick={() => setSidebarVisible(!isSidebarVisible)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            <Menu size={20} />
          </button>
          <div className="flex gap-4">
            <select
              value={selectedThemeName}
              onChange={(e) => setSelectedThemeName(e.target.value)}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {themeOptions.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="gemini-2.0-flash-lite">Flash Lite</option>
              <option value="gemini-2.0-flash">Flash</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {" "}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg shadow-sm ${
                  message.role === "user"
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-100 text-gray-800"
                } max-w-[85%] break-words`}
              >
                {message.role === "assistant" ? (
                  <ChatStyle
                    content={message.content || ""}
                    selectedThemeName={selectedThemeName}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg shadow-sm max-w-[85%]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg shadow-sm max-w-[85%]">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    Generating response...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="mt-auto flex-shrink-0 pb-2">
          {" "}
          <ChatInput
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            isToggled={isToggled}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </div>
  );
}
