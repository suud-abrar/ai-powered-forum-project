import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useGoogleAuth } from "../../../hooks/useGoogleAuth";
import "./GoogleSignInButton.css";

export const GoogleSignInButton = ({ mode = "signin" }) => {
  const navigate = useNavigate();
  const { handleGoogleLogin, isLoading, error } = useGoogleAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      const success = await handleGoogleLogin(credentialResponse.credential);
      if (success) {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google login failed:", err);
    }
  };

  const handleError = () => {
    console.error("Google login failed");
  };

  return (
    <div className="google-signin-container">
      {error && <p className="google-error">{error}</p>}

      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text={mode === "signup" ? "signup_with" : "signin_with"}
        theme="outline"
        size="large"
        width="100%"
      />

      <div className="divider">
        <span>OR</span>
      </div>
    </div>
  );
};
