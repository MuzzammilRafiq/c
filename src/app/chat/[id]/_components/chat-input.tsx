"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";

interface ChatInputProps {
  onSubmit: (inputValue: string, isSearchToggled: boolean) => void;
  isLoading: boolean;
  isToggled: boolean;
  onToggle: (isToggled: boolean) => void;
}

export default function ChatInput({ onSubmit, isLoading, isToggled, onToggle }: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSubmit(inputValue, isToggled);
    setInputValue("");
    onToggle(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      {" "}
      {/* Added items-center */}
      <div className="flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
      <button
        type="button"
        onClick={(isToggled) => onToggle(!isToggled)}
        style={{
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "24px",
          color: isToggled ? "#87CEEB" : "#808080",
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
  );
}
