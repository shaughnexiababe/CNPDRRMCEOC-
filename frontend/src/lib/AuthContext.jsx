import React, { createContext, useState, useContext, useEffect } from 'react';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await cnpdrrmceoc.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    setIsLoadingAuth(true);
    try {
      const result = await cnpdrrmceoc.auth.login(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError({ type: 'auth_failed', message: 'Invalid credentials' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (data) => {
    setIsLoadingAuth(true);
    try {
      const newUser = await cnpdrrmceoc.auth.register(data);
      setUser(newUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return newUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    cnpdrrmceoc.auth.logout(shouldRedirect ? window.location.origin : null);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      // Kept for backwards compatibility with App.jsx; there is no external
      // "public settings" service anymore (that was a leftover platform API).
      isLoadingPublicSettings: false,
      authError,
      authChecked,
      login,
      register,
      logout,
      navigateToLogin,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
