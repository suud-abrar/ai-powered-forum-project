import { createContext, useContext, useState, useCallback } from "react";

const ForumChatContext = createContext();

export const ForumChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const value = {
    messages,
    setMessages,
    isOpen,
    setIsOpen,
    isLoading,
    setIsLoading,
    error,
    setError,
    addMessage,
    clearMessages,
  };

  return (
    <ForumChatContext.Provider value={value}>
      {children}
    </ForumChatContext.Provider>
  );
};

export const useForumChat = () => {
  const context = useContext(ForumChatContext);
  if (!context) {
    throw new Error("useForumChat must be used within ForumChatProvider");
  }
  return context;
};
