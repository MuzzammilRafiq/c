"use client";
import { useState } from "react";
interface SystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  defaultSystemPrompt: string;
}

export default function SystemPromptModal({
  isOpen,
  onClose,
  systemPrompt,
  setSystemPrompt,
  defaultSystemPrompt,
}: SystemPromptModalProps) {
  const [text, setText] = useState(systemPrompt);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">System Prompt</h2>
          <button
            onClick={() => {
              onClose();
              setText(systemPrompt);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter custom system prompt..."
          className="w-full h-64 p-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
        />
        <div className="flex justify-between mt-4">
          <button
            onClick={() => {
              setText(defaultSystemPrompt);
              setSystemPrompt(defaultSystemPrompt);
              onClose();
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => {
              setSystemPrompt(text);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
