import { ForumChatProvider } from "../../contexts/ForumChatContext.jsx";
import { ChatWidget } from "./ChatWidget";

export const ForumChatbotProvider = ({ children }) => {
  return (
    <ForumChatProvider>
      {children}
      <ChatWidget />
    </ForumChatProvider>
  );
};
