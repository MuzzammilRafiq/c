"use client";
import { useEffect } from "react";
import Sidebar from "~/components/Sidebar";
import { useUserContext } from "~/utils/context";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isSidebarVisible, conversations, setConversations } = useUserContext();

  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      setConversations(parsed);
    } else {
      localStorage.removeItem("conversations");
      localStorage.setItem("conversations", JSON.stringify([]));
    }
  }, []);

  return (
    <div className="flex h-screen">
      {isSidebarVisible && <Sidebar />}
      {children}
    </div>
  );
}
