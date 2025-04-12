'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleStartConversation = async () => {
    if (isNavigating) return; // Prevent multiple clicks
    
    try {
      setIsNavigating(true);
      const newId = uuidv4();
      
      // Create a new conversation in localStorage first
      const existingConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const newConversation = {
        id: newId,
        title: 'New Chat',
        messages: [],
        lastMessage: '',
        timestamp: Date.now(),
      };
      localStorage.setItem('conversations', JSON.stringify([newConversation, ...existingConversations]));
      
      // Then navigate to the new conversation
      router.push(`/chat/${newId}`);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      setIsNavigating(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to AI Chat</h1>
        <p className="text-lg text-gray-600 mb-8">
          Start a new conversation with our AI assistant. Ask questions, get help with coding,
          or explore any topic you're interested in.
        </p>
        <button
          onClick={handleStartConversation}
          disabled={isNavigating}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isNavigating ? 'Starting...' : 'Start Conversation'}
        </button>
      </div>
    </main>
  );
}
