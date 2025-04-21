"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "~/components/Sidebar";
import {
  ChatProps,
  Conversation,
  Message,
  GeminiModel,
  MessageWithSources,
} from "./types";
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
import { systemPrompt } from "./prompt";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function Chat({ conversationId }: ChatProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedThemeName, setSelectedThemeName] = useState("vscDarkPlus");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId || null);
  const [messages, setMessages] = useState<MessageWithSources[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] =
    useState<GeminiModel>("gemini-2.0-flash");
  const [isToggled, setIsToggled] = useState(false);
  // --- State for Sources Dropdown ---
  const [openSources, setOpenSources] = useState<Record<number, boolean>>({});
  // ----------------------------------

  console.log(pathname);

  const handleToggle = () => {
    setIsToggled((prev) => !prev);
  };

  // --- Toggle function for Sources ---
  const toggleSources = (index: number) => {
    setOpenSources((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the state for the specific index
    }));
  };
  // -----------------------------------

  console.log("isToggled", isToggled);
  console.log(JSON.stringify(messages));

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
            // Reset source dropdown state on conversation load
            setOpenSources({});
          } else {
            console.warn(
              `Conversation ${conversationId} not found in storage.`
            );
            router.push("/");
          }
        } else if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          // Reset source dropdown state when loading first conversation
          setOpenSources({});
          if (pathname !== `/chat/${parsed[0].id}`) {
            router.replace(`/chat/${parsed[0].id}`); // Use replace
          }
        } else {
          // Reset source dropdown state when no conversations
          setOpenSources({});
          if (pathname !== "/") {
            router.push("/");
          }
        }
      } else {
        // Reset source dropdown state when no saved conversations
        setOpenSources({});
        if (pathname !== "/") {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      localStorage.removeItem("conversations");
      // Reset source dropdown state on error
      setOpenSources({});
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
    // Only scroll if not loading a new message or if the last message isn't an empty placeholder
    if (
      !isLoading ||
      (messages.length > 0 && messages[messages.length - 1].content !== "")
    ) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]); // Add isLoading dependency

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
    // Reset source dropdown state when selecting a conversation
    setOpenSources({});
  };

  const handleUpdateConversation = (updatedMessages: MessageWithSources[]) => {
    // Type updated
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
    // Reset source dropdown state if the active conversation is deleted
    if (id === activeConversationId) {
      setOpenSources({});
    }
  };

  const handleNewChat = () => {
    createNewChat(
      setConversations,
      setActiveConversationId,
      setMessages,
      router
    );
    // Reset source dropdown state on new chat
    setOpenSources({});
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return; // Allow sending even if no activeConversationId (will create one)

    let currentConversationId = activeConversationId;
    let currentMessages = messages;

    // If no active conversation, create one first
    if (!currentConversationId) {
      const newConv = createNewChat(
        setConversations,
        setActiveConversationId,
        setMessages,
        router,
        true
      ); // Pass true to return the new conv
      if (!newConv) {
        console.error("Failed to create new chat for sending message");
        setIsLoading(false);
        return;
      }
      currentConversationId = newConv.id;
      currentMessages = []; // Start with empty messages for the new chat
      // The state updates (setActiveConversationId, setMessages) will happen via createNewChat
    }

    const userMessage: Message = { role: "user", content: messageContent };
    // Ensure messages state is updated immediately for UI responsiveness
    const updatedMessagesForUI: MessageWithSources[] = [
      ...currentMessages,
      userMessage,
    ];
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
      const messagesToSend = [...currentMessages, userMessage]; // Use the correct message history

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
            `Chat API error! status: ${response.status}, message: ${errorData.message || "Response body missing"}`
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
                // Ignore simple JSON parsing errors if data isn't complete JSON yet,
                // but log others. Don't stop the stream unless it's a critical format issue.
                if (!(e instanceof SyntaxError && data.length < 2)) {
                  // Avoid logging incomplete JSON noise
                  console.error("Error parsing JSON chunk:", e, "Data:", data);
                }
              }
            }
          }
          // Break the outer loop as well if an error was parsed and handled
          if (accumulatedContent.includes("[Error:")) {
            break;
          }
        }
        // Final update after stream ends (if no error occurred during streaming)
        if (!accumulatedContent.includes("[Error:")) {
          const finalMessagesComplete: MessageWithSources[] = [
            ...messagesToSend, // History + User Message
            {
              role: "assistant" as const,
              content: accumulatedContent,
              sources: undefined,
            }, // Add final assistant message
          ];
          setMessages(finalMessagesComplete); // Update UI with final complete message
          handleUpdateConversation(finalMessagesComplete); // Save the conversation
        } else {
          // If an error occurred during streaming, ensure the conversation is saved
          // with the error message included.
          const finalMessagesWithError: MessageWithSources[] = [
            ...messagesToSend,
            {
              role: "assistant",
              content: accumulatedContent,
              sources: undefined,
            },
          ];
          // setMessages is already updated within the stream loop for errors
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
        // Use messagesToSend which includes the user message
        ...messagesToSend,
        {
          role: "assistant" as const,
          content: errorMessageContent,
          sources: undefined, // Add sources property
        },
      ];
      setMessages(errorMessages); // Update UI with error
      handleUpdateConversation(errorMessages); // Save conversation with error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if a message has sources
  const hasSources = (message: MessageWithSources): boolean => {
    return !!message.sources && message.sources.length > 0;
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {isSidebarVisible && (
        <Sidebar
          conversations={conversations.map((conv) => ({
            ...conv,
            messages: [], // Don't pass messages to sidebar preview for performance
          }))}
          activeConversationId={activeConversationId}
          // Use the updated new chat handler
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      )}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4 overflow-hidden">
        {/* Header */}
        <div className="mb-4 flex gap-4 justify-between items-center flex-shrink-0">
          <button
            onClick={() => setSidebarVisible(!isSidebarVisible)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            aria-label={isSidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            <Menu size={20} />
          </button>
          {/* Model and Theme Selectors */}
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
              {/* Update model options if necessary */}
              <option value="gemini-2.0-flash-lite">Flash Lite</option>
              <option value="gemini-2.0-flash">Flash</option>
              {/* Add other models like gemini-1.5-pro if available/configured */}
              {/* <option value="gemini-1.5-pro-latest">Pro 1.5</option> */}
            </select>
          </div>
        </div>

        {/* Message List */}
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
                } max-w-[85%] break-words`} // Ensure break-words is applied
              >
                {message.role === "assistant" ? (
                  <div>
                    {" "}
                    {/* Wrap assistant content */}
                    <ChatStyle
                      content={message.content || ""}
                      selectedThemeName={selectedThemeName}
                    />
                    {/* --- Sources Dropdown --- */}
                    {hasSources(message) && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => toggleSources(index)}
                          className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none font-medium"
                        >
                          {openSources[index] ? "Hide Sources" : "View Sources"}
                          {openSources[index] ? (
                            <ChevronUp size={14} className="ml-1" />
                          ) : (
                            <ChevronDown size={14} className="ml-1" />
                          )}
                        </button>
                        {openSources[index] && (
                          <ul className="mt-2 space-y-2 text-xs">
                            {message.sources?.map((source, sourceIndex) => (
                              <li
                                key={sourceIndex}
                                className="flex items-start group"
                              >
                                <span className="mr-2 text-gray-500 dark:text-gray-400">
                                  {sourceIndex + 1}.
                                </span>
                                <div className="flex-1">
                                  <a
                                    href={source.metadata?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium break-all" // Use break-all for long URLs
                                    title={source.metadata?.url} // Show full URL on hover
                                  >
                                    {source.metadata?.title ||
                                      source.metadata?.url ||
                                      "Source"}
                                  </a>
                                  {/* Optionally display pageContent - can be long */}
                                  {/* <p className="mt-1 text-gray-600 dark:text-gray-400 break-words">{source.pageContent}</p> */}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {/* ----------------------- */}
                  </div>
                ) : (
                  // Ensure user messages also wrap correctly
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
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

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="mt-auto flex-shrink-0 pb-2">
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

// Helper function (can be outside the component or in a utils file)
const hasSources = (message: MessageWithSources): boolean => {
  return !!message.sources && message.sources.length > 0;
};
