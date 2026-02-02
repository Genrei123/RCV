import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Maximize2, Minimize2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatService } from "@/services/chatService";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isStreaming?: boolean;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! I'm your RCV assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  // Check if modal should be expanded based on content
  useEffect(() => {
    const totalChars = messages.reduce((sum, msg) => sum + msg.text.length, 0);
    setIsExpanded(totalChars > 500 || messages.length > 5);
  }, [messages]);

  const streamText = (fullText: string, messageId: string) => {
    let currentIndex = 0;
    const charsPerInterval = 3; // Characters to show per interval
    
    // Add initial empty message
    const botResponse: Message = {
      id: messageId,
      text: "",
      sender: "bot",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, botResponse]);
    setIsTyping(false);

    streamingIntervalRef.current = setInterval(() => {
      currentIndex += charsPerInterval;
      
      if (currentIndex >= fullText.length) {
        // Streaming complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, text: fullText, isStreaming: false }
              : msg
          )
        );
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
        }
      } else {
        // Update with partial text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, text: fullText.substring(0, currentIndex) }
              : msg
          )
        );
      }
    }, 30); // Update every 30ms for smooth streaming
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsTyping(true);

    try {
      // Call backend API using ChatService
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text
      }));

      const data = await ChatService.sendMessage(currentInput, conversationHistory);
      
      // Stream the response
      if (data.success && data.response) {
        streamText(data.response, (Date.now() + 1).toString());
      } else {
        // Handle error from service
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response || "I'm having trouble processing your request. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorResponse]);
        setIsTyping(false);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting. Please try again or contact support.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
            <div ref={messagesEndRef} />

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 app-bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 app-bg-accent rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 transition-all duration-300 ${
            isExpanded 
              ? "inset-2 sm:inset-4 md:inset-8" 
              : "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-8rem)] sm:h-[32rem]"
          }`}
        >
          {/* Header */}
          <div className="app-bg-primary text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">RCV Assistant</h3>
                <p className="text-xs text-white/80">Always here to help</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Toggle size"
              >
                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs sm:max-w-sm rounded-2xl px-3 sm:px-4 py-2 ${
                    message.sender === "user"
                      ? "app-bg-primary text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="text-sm prose prose-sm max-w-none">
                    {message.sender === "bot" ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto my-2">{children}</pre>
                          ),
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    )}
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 bg-gray-600 ml-1 animate-pulse"></span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user"
                        ? "text-white/70"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 sm:p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="app-bg-primary text-white w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center hidden sm:block">
              Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
}
