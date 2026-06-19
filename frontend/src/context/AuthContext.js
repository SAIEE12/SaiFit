import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient, { loadAuthToken, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await loadAuthToken();
    if (token) {
      try {
        const res = await apiClient.get('/auth/me');
        setUserRole(res.data.user.role);
        
        const tracksRes = await apiClient.get('/lifestyle/my-tracks');
        if (!tracksRes.data || tracksRes.data.length === 0) {
          setNeedsOnboarding(true);
        }
        
        setIsAuthenticated(true);
      } catch (e) {
        await setAuthToken(null);
      }
    }
    setLoading(false);
  };

  const login = async (user, token) => {
    await setAuthToken(token);
    setUserRole(user.role);
    try {
      const tracksRes = await apiClient.get('/lifestyle/my-tracks');
      if (!tracksRes.data || tracksRes.data.length === 0) {
        setNeedsOnboarding(true);
      }
    } catch (e) {
      console.error('Error fetching tracks on login:', e);
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await setAuthToken(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setNeedsOnboarding(false);
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userRole,
      needsOnboarding,
      loading,
      login,
      logout,
      completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
