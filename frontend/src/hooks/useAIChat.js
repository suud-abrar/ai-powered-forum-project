import { useCallback } from "react";
import { useForumChat } from "../contexts/ForumChatContext.jsx";
import { queryForumChatbot } from "../services/ai-forum-service";

export const useAIChat = () => {
  const { messages, isLoading, error, addMessage, setIsLoading, setError } =
    useForumChat();

  const sendQuery = useCallback(
    async (query) => {
      if (!query.trim()) return;

      // Add user message
      addMessage({
        id: `user-${Date.now()}`,
        type: "user",
        content: query,
        timestamp: new Date(),
      });

      setIsLoading(true);
      setError(null);

      try {
        const response = await queryForumChatbot(query);

        // Add AI response with citations
        addMessage({
          id: `ai-${Date.now()}`,
          type: "ai",
          content: response.answer,
          citations: response.citations || [],
          timestamp: new Date(),
        });
      } catch (err) {
        setError(err.message || "Failed to get response from chatbot");
        addMessage({
          id: `error-${Date.now()}`,
          type: "error",
          content: "Sorry, I couldn't process that. Please try again.",
          timestamp: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, setIsLoading, setError],
  );

  return { messages, isLoading, error, sendQuery };
};
