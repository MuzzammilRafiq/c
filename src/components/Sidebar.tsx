import React from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "~/utils/context";
import {
  createNewChat,
  selectConversation,
  deleteConversation,
} from "~/app/(home)/chat/[id]/_components/chat-crud";

export default function Sidebar() {
  const router = useRouter();
  const {
    conversations,
    setMessages,
    setConversations,
    setActiveConversationId,
    activeConversationId,
  } = useUserContext();

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
  const isActiveConversationEmpty = activeConversation
    ? !activeConversation.messages || activeConversation.messages.length === 0
    : false;

  const truncateTitle = (title: string) => {
    return title.length > 20 ? title.substring(0, 20) + "..." : title;
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id, conversations, setActiveConversationId, setMessages, router);
  };

  const handleDeleteConversation = (id: string) => {
    deleteConversation(
      id,
      setConversations,
      setActiveConversationId,
      setMessages,
      activeConversationId,
    );
  };
  const handleNewChat = () => {
    setActiveConversationId("");
    setMessages([]);
    router.push("/");
    // createNewChat(setConversations, setActiveConversationId, setMessages, router);
  };

  return (
    <div className="w-64 h-screen bg-gray-800 p-4 flex flex-col">
      <button
        onClick={handleNewChat}
        disabled={isActiveConversationEmpty}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        Start New Conversation
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.map((conversation) => {
          const firstUserMessage =
            conversation.messages.find((msg) => msg.role === "user")?.content || "New Chat";
          return (
            <div
              key={conversation.id}
              className={`relative p-4 rounded-lg transition-all hover:scale-102 ${
                activeConversationId === conversation.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-700 text-gray-100 hover:bg-gray-600"
              } group`}
            >
              <div
                className="cursor-pointer space-y-1"
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="font-medium truncate">{truncateTitle(firstUserMessage)}</div>
                <div className="text-sm opacity-75 truncate">{conversation.lastMessage}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conversation.id);
                }}
                className="absolute top-2 right-2 p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-gray-600/50 rounded-full transition-all"
                aria-label="Delete conversation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
