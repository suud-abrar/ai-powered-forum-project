import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { authenticateWithGoogle } from "../services/auth/google-auth-service";

export const useGoogleAuth = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = useCallback(
    async (idToken) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authenticateWithGoogle(idToken);

        if (result.success) {
          // Call your existing login function to update context
          login({ token: result.token, user: result.user });
          return true;
        }

        return false;
      } catch (err) {
        const errorMessage =
          err.message || "Failed to sign in with Google. Please try again.";
        setError(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [login],
  );

  return {
    handleGoogleLogin,
    isLoading,
    error,
  };
};
