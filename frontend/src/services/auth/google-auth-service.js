import { jwtDecode } from "jwt-decode";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3777/api";

/**
 * Decode and verify Google ID token (client-side validation)
 */
export const decodeGoogleToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

/**
 * Send Google ID token to backend for authentication
 */
export const authenticateWithGoogle = async (idToken) => {
  try {
    const response = await fetch(`${baseUrl}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Google authentication failed");
    }

    const data = await response.json();

    if (data.success && data.data.token) {
      // Save token to localStorage
      localStorage.setItem("token", data.data.token);

      // Save user info if needed
      if (data.data.user) {
        localStorage.setItem("user", JSON.stringify(data.data.user));
      }

      return {
        success: true,
        token: data.data.token,
        user: data.data.user,
      };
    }

    throw new Error("Invalid response from server");
  } catch (error) {
    console.error("Google auth error:", error);
    throw error;
  }
};

/**
 * Get stored Google credentials from localStorage
 */
export const getStoredGoogleUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Failed to get stored user:", error);
    return null;
  }
};
