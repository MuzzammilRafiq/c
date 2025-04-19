"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Chat from "./_components/Chat";
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const resolvedParams = use(params);

  useEffect(() => {
    const checkConversation = () => {
      try {
        const conversations = JSON.parse(localStorage.getItem("conversations") || "[]");
        const conversationExists = conversations.some((conv: any) => conv.id === resolvedParams.id);

        if (!conversationExists) {
          // If conversation doesn't exist, redirect to home
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking conversation:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkConversation();
  }, [resolvedParams.id, router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Chat conversationId={resolvedParams.id} />
    </main>
  );
}
