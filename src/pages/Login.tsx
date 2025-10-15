import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

const Login = () => {
  const [isSignupMode, setIsSignupMode] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <AuthLayout
      title={isSignupMode ? "Create Account" : "Welcome Back"}
      subtitle={
        isSignupMode
          ? "Start managing your photography business"
          : "Sign in to your photographer dashboard"
      }
    >
      {isSignupMode ? (
        <SignupForm onToggleMode={() => setIsSignupMode(false)} />
      ) : (
        <LoginForm onToggleMode={() => setIsSignupMode(true)} />
      )}
    </AuthLayout>
  );
};

export default Login;