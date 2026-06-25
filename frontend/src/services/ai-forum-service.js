const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3777/api";

export const queryForumChatbot = async (query) => {
  try {
    const response = await fetch(`${baseUrl}/forum-chat/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Chatbot API error:", error);
    throw error;
  }
};
