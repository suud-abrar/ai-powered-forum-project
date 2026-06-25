import axios from "axios";

const API_URL = "http://localhost:3777/api/moderation";

export const getModerationQueue = async (token) => {
  const response = await axios.get(`${API_URL}/queue`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const resolveModerationItem = async (itemId, action, token) => {
  const response = await axios.patch(
    `${API_URL}/${itemId}/resolve`,
    {
      action,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
