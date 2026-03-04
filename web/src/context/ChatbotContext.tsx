import { createContext, useContext, useState, ReactNode } from "react";

interface ChatbotContextType {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <ChatbotContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
}
