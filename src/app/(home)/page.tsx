"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useState } from "react";
import { Globe } from "lucide-react";
import { useUserContext } from "~/utils/context";

export default function Home() {
  const { setActiveConversationId } = useUserContext();
  const { data: session, status } = useSession();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [isSearchToggled, setIsSearchToggled] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    router.replace("/auth");
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isNavigating) return;

    try {
      setIsNavigating(true);
      const newId = uuidv4();
      const existingConversations = JSON.parse(localStorage.getItem("conversations") || "[]");
      const newConversation = {
        id: newId,
        title: "New Chat",
        messages: [],
        lastMessage: "",
        timestamp: Date.now(),
      };
      await localStorage.setItem(
        "conversations",
        JSON.stringify([newConversation, ...existingConversations]),
      );
      const url = `/chat/${newId}?q=${encodeURIComponent(inputValue)}&s=${isToggled ? "true" : "false"}`;
      setInputValue("");
      setIsToggled(false);
      setActiveConversationId(newId);
      router.replace(url);
    } catch (error) {
      console.error("Error creating new conversation:", error);
      setIsNavigating(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-teal-100">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto p-6 rounded-xl shadow-lg bg-white bg-opacity-90 backdrop-blur-sm">
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 items-center p-1 rounded-full bg-gray-100 focus-within:ring-2 focus-within:ring-blue-400 focus-within:bg-white transition-all duration-200"
        >
          <div className="flex-1 px-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="w-full py-3 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400 text-gray-700"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsToggled(!isToggled)}
              className={`p-2 rounded-full transition-colors ${isToggled ? "text-blue-500 bg-blue-50" : "text-gray-400 hover:bg-gray-200"}`}
              aria-label="Toggle feature"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="cursor-pointer px-5 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
