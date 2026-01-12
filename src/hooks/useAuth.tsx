import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient, User } from "@/integrations/api/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for existing authentication
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getProfile();
          setUser(response.user);
          try {
            localStorage.setItem("user_data", JSON.stringify(response.user));
          } catch {}
        } catch (error) {
          console.error("Auth check failed:", error);
          apiClient.logout();
          // Redirect to login if not already on login page
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate, location.pathname]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) => {
    try {
      const response = await apiClient.register(userData);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    navigate('/login', { replace: true });
  };

  const updateProfile = async (profileData: any) => {
    try {
      await apiClient.updateProfile(profileData);
      // Refresh user data
      const response = await apiClient.getProfile();
      setUser(response.user);
      try {
        localStorage.setItem("user_data", JSON.stringify(response.user));
      } catch {}
    } catch (error) {
      throw error;
    }
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: apiClient.isAuthenticated(),
  };
};
