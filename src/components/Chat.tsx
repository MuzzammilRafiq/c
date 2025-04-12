'use client';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from './Sidebar';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { MarkdownComponents } from '~/helpers/markdown-components';

type GeminiModel = 'gemini-2.0-flash';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: string;
  timestamp: number;
}

interface ChatProps {
  conversationId?: string;
}

export default function Chat({ conversationId }: ChatProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.0-flash');

  // Load conversations from localStorage on initial render
  useEffect(() => {
    if (isInitialized) return;

    try {
      const savedConversations = localStorage.getItem('conversations');
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);

        if (conversationId) {
          const conversation = parsed.find((c: Conversation) => c.id === conversationId);
          if (conversation) {
            setMessages(conversation.messages);
            setActiveConversationId(conversationId);
          }
        } else if (parsed.length > 0) {
          setActiveConversationId(parsed[0].id);
          setMessages(parsed[0].messages);
          router.push(`/chat/${parsed[0].id}`);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [conversationId, router, isInitialized]);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations, isInitialized]);


  const createNewChat = () => {
    const newId = uuidv4();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      lastMessage: '',
      timestamp: Date.now(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newId);
    setMessages([]);
    router.push(`/chat/${newId}`);
  };

  const selectConversation = (id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      setActiveConversationId(id);
      setMessages(conversation.messages || []);
      router.push(`/chat/${id}`);
    }
  };

  const updateConversation = (updatedMessages: Message[]) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
            ...conv,
            messages: updatedMessages,
            lastMessage: updatedMessages[updatedMessages.length - 1]?.content || '',
            timestamp: Date.now(),
          }
          : conv
      )
    );
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const newConversations = prev.filter((conv) => conv.id !== id);
      // If we're deleting the active conversation, select the first remaining one
      if (id === activeConversationId) {
        if (newConversations.length > 0) {
          const nextId = newConversations[0].id;
          setActiveConversationId(nextId);
          setMessages(newConversations[0].messages || []);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
      return newConversations;
    });
  };

  // Add effect to handle navigation after state updates
  useEffect(() => {
    if (activeConversationId) {
      router.push(`/chat/${activeConversationId}`);
    } else {
      router.push('/');
    }
  }, [activeConversationId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages: Message[] = [...messages, userMessage];
    setMessages(updatedMessages);
    updateConversation(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Create a placeholder for the assistant's message
      const messagesWithPlaceholder: Message[] = [...updatedMessages, { role: 'assistant' as const, content: '' }];
      setMessages(messagesWithPlaceholder);
      updateConversation(messagesWithPlaceholder);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessage += parsed.text;
                  const finalMessages: Message[] = [
                    ...updatedMessages,
                    { role: 'assistant' as const, content: assistantMessage },
                  ];
                  setMessages(finalMessages);
                  updateConversation(finalMessages);
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessages: Message[] = [
        ...updatedMessages,
        { role: 'assistant' as const, content: 'Sorry, there was an error processing your request.' },
      ];
      setMessages(errorMessages);
      updateConversation(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom components for markdown rendering


  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations.map(conv => ({
          ...conv,
          messages: conv.id === activeConversationId ? messages : conv.messages || []
        }))}
        activeConversationId={activeConversationId}
        onNewChat={createNewChat}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
      />
      <div className="flex-1 flex flex-col max-w-5xl mx-auto p-4">
        <div className="mb-4 flex justify-end">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemma-3-27b-it">gemma-3-27b-it</option>
            <option value="gemini-1.0-pro-latest">Gemini 1.0 Pro Latest</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${message.role === 'user'
                ? 'bg-blue-100 ml-auto'
                : 'bg-gray-100'
                } max-w-[90%]`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="font-medium">{message.content}</div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="bg-gray-100 p-4 rounded-lg max-w-[90%]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}