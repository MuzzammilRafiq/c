"use client";

import { useState, useRef, useEffect, act } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Conversation, Message, GeminiModel, MessageWithSources } from "./_components/types";
import { themeOptions } from "./_components/theme";
import ChatStyle from "./_components/chat-style";
import { updateConversation } from "./_components/chat-crud";
import { Menu } from "lucide-react";
import { systemPrompt } from "./_components/prompt";
import { useUserContext } from "~/utils/context";
import { Globe } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    isSidebarVisible,
    conversations,
    setConversations,
    setIsSidebarVisible,
    messages,
    setMessages,
    activeConversationId,
    setActiveConversationId,
    isSearchToggled,
    setIsSearchToggled,
  } = useUserContext();
  const [messageContent, setMessageContent] = useState("");
  const [selectedThemeName, setSelectedThemeName] = useState("vscDarkPlus");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>("gemini-2.0-flash");

  useEffect(() => {
    const searchQuery = decodeURIComponent(searchParams.get("q") || "");
    if (searchQuery) {
      setMessageContent(searchQuery.trim());
      const messege = searchQuery.trim();
      handleSendMessage(messege);
      setMessages([
        {
          role: "user",
          content: searchQuery,
        },
      ]);
    }
  }, [searchParams, setMessages]);

  useEffect(() => {
    if (isInitialized) return;

    try {
      const savedConversations = localStorage.getItem("conversations");
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);

        if (activeConversationId) {
          const conversation = parsed.find((c: Conversation) => c.id === activeConversationId);
          if (conversation) {
            setMessages(conversation.messages || []);
            setActiveConversationId(activeConversationId);
          } else {
            console.warn(`Conversation ${activeConversationId} not found in storage.`);
            router.push("/");
          }
        } else if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          if (pathname !== `/chat/${parsed[0].id}`) {
            router.replace(`/chat/${parsed[0].id}`); // Use replace
          }
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
  }, [activeConversationId, router, isInitialized, pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations, isInitialized]);

  useEffect(() => {
    if (!isLoading || (messages.length > 0 && messages[messages.length - 1].content !== "")) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleUpdateConversation = (updatedMessages: MessageWithSources[]) => {
    updateConversation(activeConversationId, updatedMessages, setConversations);
  };

  const handleSendMessage = async (messege?: string) => {
    messege = messege || messageContent.trim();
    if (!messege?.trim()) return;
    let currentMessages = messages;

    const userMessage: Message = { role: "user", content: messege };
    const updatedMessagesForUI: MessageWithSources[] = [...currentMessages, userMessage];
    setMessages(updatedMessagesForUI);
    handleUpdateConversation(updatedMessagesForUI);

    setIsLoading(true);

    const placeholderMessage: MessageWithSources = {
      role: "assistant",
      content: "",
      sources: undefined,
    };
    setMessages([...updatedMessagesForUI, placeholderMessage]);

    try {
      const messagesToSend = [...currentMessages, userMessage];
      if (isSearchToggled) {
        console.log("calling search api");
        const response = await fetch("/api/searchagent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: messege,
            // Send the history *before* the current user message for the search context
            history: currentMessages,
            model: selectedModel,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const assistantResponse: MessageWithSources = {
          role: "assistant",
          content: result.data.answer || "No answer found.",
          sources: result.data.sources || [],
        };
        // Update UI immediately before saving
        const finalMessages = [...messagesToSend, assistantResponse];
        setMessages(finalMessages);
        // Save the complete exchange
        handleUpdateConversation(finalMessages);
      } else {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend, // Send history + user message
            model: selectedModel,
            systemPrompt: systemPrompt,
          }),
        });

        if (!response.ok || !response.body) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Chat API error! status: ${response.status}, message: ${errorData.message || "Response body missing"}`,
          );
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break; // Ensure we break if [DONE] is received

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  // Handle potential errors sent via stream
                  console.error("Streaming Error:", parsed.error);
                  accumulatedContent += `\n\n[Error: ${parsed.error}]`;
                  // Update UI with error message immediately
                  setMessages((prevMessages) => [
                    ...prevMessages.slice(0, -1),
                    {
                      ...prevMessages[prevMessages.length - 1],
                      role: "assistant", // Ensure role is assistant
                      content: accumulatedContent,
                    },
                  ]);
                  // Potentially break or handle the error differently
                  break; // Stop processing further chunks for this response on error
                }
                if (parsed.text) {
                  accumulatedContent += parsed.text;
                  // Update the *last* message (the placeholder)
                  setMessages((prevMessages) => {
                    const updated = [...prevMessages];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      role: "assistant", // Ensure role is assistant
                      content: accumulatedContent,
                    };
                    return updated;
                  });
                }
              } catch (e) {
                if (!(e instanceof SyntaxError && data.length < 2)) {
                  console.error("Error parsing JSON chunk:", e, "Data:", data);
                }
              }
            }
          }
          if (accumulatedContent.includes("[Error:")) {
            break;
          }
        }
        if (!accumulatedContent.includes("[Error:")) {
          const finalMessagesComplete: MessageWithSources[] = [
            ...messagesToSend,
            {
              role: "assistant" as const,
              content: accumulatedContent,
              sources: undefined,
            },
          ];
          setMessages(finalMessagesComplete);
          handleUpdateConversation(finalMessagesComplete);
        } else {
          const finalMessagesWithError: MessageWithSources[] = [
            ...messagesToSend,
            {
              role: "assistant",
              content: accumulatedContent,
              sources: undefined,
            },
          ];
          handleUpdateConversation(finalMessagesWithError);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessageContent =
        error instanceof Error
          ? error.message
          : "Sorry, there was an error processing your request.";
      const errorMessages: MessageWithSources[] = [
        ...messagesToSend,
        {
          role: "assistant" as const,
          content: errorMessageContent,
          sources: undefined,
        },
      ];
      setMessages(errorMessages);
      handleUpdateConversation(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 overflow-hidden">
      <div className="mb-4 flex gap-4 justify-between items-center flex-shrink-0">
        <button
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
        >
          <Menu size={20} />
        </button>
        <div className="flex gap-4">
          <select
            value={selectedThemeName}
            onChange={(e) => setSelectedThemeName(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
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
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="gemini-2.0-flash-lite">Flash Lite</option>
            <option value="gemini-2.0-flash">Flash</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-3 rounded-lg shadow-sm ${
                message.role === "user"
                  ? "bg-blue-500 text-white ml-auto dark:bg-blue-600"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              } max-w-[85%] break-words`}
            >
              {message.role === "assistant" ? (
                <div>
                  <ChatStyle
                    content={message.content || ""}
                    selectedThemeName={selectedThemeName}
                  />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto flex-shrink-0 pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2 items-center"
        >
          {/* Added items-center */}
          <div className="flex-1">
            <input
              type="text"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!messageContent.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => setIsSearchToggled(!isSearchToggled)}
            style={{
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              color: isSearchToggled ? "#87CEEB" : "#808080",
              transition: "color 0.3s",
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Toggle feature"
          >
            <Globe />
          </button>
        </form>
      </div>
    </div>
  );
}
