"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Globe } from "lucide-react";
export default function Chat({ conversationId }: ChatProps) {
  const router = useRouter();
  const [selectedThemeName, setSelectedThemeName] = useState("vscDarkPlus");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<GeminiModel>("gemini-2.0-flash");
  const [isToggled, setIsToggled] = useState(false);
  const handleToggle = () => {
    setIsToggled((isToggled) => !isToggled);
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
            setMessages(conversation.messages);
            setActiveConversationId(conversationId);
          }
        } else if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
          setMessages(parsed[0].messages);
          router.push(`/chat/${parsed[0].id}`);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsInitialized(true);
    }
  }, [conversationId, router, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConversationId) {
      router.push(`/chat/${activeConversationId}`);
    } else {
      router.push("/");
    }
  }, [activeConversationId, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);
    handleUpdateConversation(updatedMessages);
    setInput("");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          systemPrompt: `Please format your responses using Markdown syntax. Use headings, lists, and other Markdown features to make your responses more readable and structured.

            When including code examples, always use proper code blocks with language specification like this:
            
            \`\`\`javascript
            // JavaScript code example
            const greeting = "Hello, world!";
            console.log(greeting);
            \`\`\`
            
            \`\`\`python
            # Python code example
            def greet(name):
                return f"Hello, {name}!"
            print(greet("World"))
            \`\`\`
            
            Always specify the programming language after the opening backticks to enable proper syntax highlighting.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessage += parsed.text;
                  const finalMessages: Message[] = [
                    ...updatedMessages,
                    { role: "assistant" as const, content: assistantMessage },
                  ];
                  setMessages(finalMessages);
                  handleUpdateConversation(finalMessages);
                }
              } catch (e) {
                console.error("Error parsing JSON:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
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
    <div className="flex h-screen">
      {isSidebarVisible && (
        <Sidebar
          conversations={conversations.map((conv) => ({
            ...conv,
            messages:
              conv.id === activeConversationId ? messages : conv.messages || [],
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
      <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4">
        <div className="mb-4 flex gap-4 justify-between">
          <button
            onClick={() => setSidebarVisible(!isSidebarVisible)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            toggle
          </button>
          <div className="flex gap-4">
            <select
              value={selectedThemeName}
              onChange={(e) => setSelectedThemeName(e.target.value)}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-2.0-flash-lite">
                Gemini 2.0 Flash Lite
              </option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.role === "user" ? "bg-blue-100 ml-auto" : "bg-gray-100"
              } max-w-[90%]`}
            >
              {message.role === "assistant" ? (
                <ChatStyle
                  content={message.content}
                  selectedThemeName={selectedThemeName}
                />
              ) : (
                <div className="font-medium">{message.content}</div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="bg-gray-100 p-4 rounded-lg max-w-[90%]">
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
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
          <button
            onClick={handleToggle}
            style={{
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              color: isToggled ? "#87CEEB" : "#808080",
              transition: "color 0.3s",
            }}
          >
            <Globe />
          </button>
        </form>
      </div>
    </div>
  );
}
