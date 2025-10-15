import { useEffect, useState } from "react";
import { apiClient, User } from "@/integrations/api/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getProfile();
          setUser(response.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          apiClient.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

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
  };

  const updateProfile = async (profileData: any) => {
    try {
      await apiClient.updateProfile(profileData);
      // Refresh user data
      const response = await apiClient.getProfile();
      setUser(response.user);
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
    isAuthenticated: apiClient.isAuthenticated() 
  };
};