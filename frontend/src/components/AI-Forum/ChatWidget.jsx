import { useRef, useEffect } from "react";
import { useForumChat } from "../../contexts/ForumChatContext.jsx";
import { useAIChat } from "../../hooks/useAIChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import "./ChatWidget.css";

export const ChatWidget = () => {
  const { isOpen, setIsOpen, messages, clearMessages } = useForumChat();
  const { isLoading, error, sendQuery } = useAIChat();
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCitationClick = (citation) => {
    // Navigate to the cited post
    // This would be implemented based on your app's routing
    console.log("Citation clicked:", citation);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
        title={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            <path d="M6 11a1 1 0 11-2 0 1 1 0 012 0zM12 11a1 1 0 11-2 0 1 1 0 012 0zM16 11a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-t-lg shadow-md">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Forum Assistant</h3>
                <p className="text-xs text-orange-100">
                  Ask about forum topics
                </p>
              </div>
              <button
                onClick={clearMessages}
                className="p-1 hover:bg-orange-500 rounded-lg transition-colors"
                title="Clear chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4.555 7.757l.707.707.707-.707A2.5 2.5 0 1110 5a2.5 2.5 0 01-4.938 2.757zM10 15a5 5 0 100-10 5 5 0 000 10z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-center">
                <div className="text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm">
                    Hi! Ask me anything about the forum topics.
                  </p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onCitationClick={handleCitationClick}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput onSend={sendQuery} isLoading={isLoading} />
        </div>
      )}
    </>
  );
};
