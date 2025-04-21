"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChatProps, Conversation, Message, GeminiModel, MessageWithSources } from "./types";
import { themeOptions } from "./theme";
import ChatStyle from "./chat-style";
import { createNewChat, updateConversation } from "./chat-crud";
import { Menu } from "lucide-react";
import ChatInput from "./chat-input";
import { systemPrompt } from "./prompt";
import { useUserContext } from "~/utils/context";

export default function Chat({ conversationId }: ChatProps) {
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
  } = useUserContext();
  const [selectedThemeName, setSelectedThemeName] = useState("vscDarkPlus");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>("gemini-2.0-flash");
  const [isToggled, setIsToggled] = useState(false);

  const handleToggle = () => {
    setIsToggled((prev) => !prev);
  };

  useEffect(() => {
    const searchQuery = searchParams.get("q");
    const searchToggle = decodeURIComponent(searchParams.get("s") || "");
    console.log(conversationId);
    if (searchQuery) {
      setIsToggled(searchToggle === "true");
      handleSendMessage(searchQuery);
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

        if (conversationId) {
          const conversation = parsed.find((c: Conversation) => c.id === conversationId);
          if (conversation) {
            setMessages(conversation.messages || []);
            setActiveConversationId(conversationId);
          } else {
            console.warn(`Conversation ${conversationId} not found in storage.`);
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
  }, [conversationId, router, isInitialized, pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations, isInitialized]);

  useEffect(() => {
    if (!isLoading || (messages.length > 0 && messages[messages.length - 1].content !== "")) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isInitialized) return;

    const targetPath = activeConversationId ? `/chat/${activeConversationId}` : "/";

    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }, [activeConversationId, isInitialized, pathname, router]);

  const handleUpdateConversation = (updatedMessages: MessageWithSources[]) => {
    updateConversation(activeConversationId, updatedMessages, setConversations);
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    let currentConversationId = activeConversationId;
    let currentMessages = messages;

    if (!currentConversationId) {
      const newConv = createNewChat(
        setConversations,
        setActiveConversationId,
        setMessages,
        router,
        true,
      ); // Pass true to return the new conv
      if (!newConv) {
        console.error("Failed to create new chat for sending message");
        setIsLoading(false);
        return;
      }
      currentConversationId = newConv.id;
      currentMessages = [];
    }

    const userMessage: Message = { role: "user", content: messageContent };
    // Ensure messages state is updated immediately for UI responsiveness
    const updatedMessagesForUI: MessageWithSources[] = [...currentMessages, userMessage];
    setMessages(updatedMessagesForUI);

    // If it was a new chat, update the conversation immediately with the user message
    if (!activeConversationId) {
      handleUpdateConversation(updatedMessagesForUI);
    }

    setIsLoading(true);

    // Add placeholder after user message is set
    const placeholderMessage: MessageWithSources = {
      role: "assistant",
      content: "",
      sources: undefined,
    };
    setMessages([...updatedMessagesForUI, placeholderMessage]);

    try {
      const messagesToSend = [...currentMessages, userMessage];
      if (isToggled) {
        console.log("calling search api");
        const response = await fetch("/api/searchagent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: messageContent,
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
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
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
        <ChatInput
          onSubmit={handleSendMessage}
          isLoading={isLoading}
          isToggled={isToggled}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
