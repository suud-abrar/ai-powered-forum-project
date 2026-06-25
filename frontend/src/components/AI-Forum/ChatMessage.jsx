import { CitationLink } from "./CitationLink";

export const ChatMessage = ({ message, onCitationClick }) => {
  const isUser = message.type === "user";
  const isError = message.type === "error";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fadeIn`}
    >
      <div
        className={`max-w-xs md:max-w-sm lg:max-w-md rounded-lg px-4 py-2 ${
          isUser
            ? "bg-blue-600 text-white"
            : isError
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-gray-100 text-gray-900"
        }`}
      >
        {/* Message text with markdown-like formatting */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Citations (AI messages only) */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs font-semibold mb-1 text-gray-600">Sources:</p>
            <div className="flex flex-wrap gap-1">
              {message.citations.map((citation) => (
                <CitationLink
                  key={citation.id}
                  citation={citation}
                  onCitationClick={onCitationClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs mt-1 opacity-70">
          {message.timestamp?.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};
