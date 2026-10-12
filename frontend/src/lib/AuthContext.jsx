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
    // L2: Persistent auth state listener
    let unsubscribe;
    if (cnpdrrmceoc.auth.onAuthStateChanged) {
      unsubscribe = cnpdrrmceoc.auth.onAuthStateChanged(async (firebaseUser) => {
        setAuthError(null);
        if (firebaseUser) {
          try {
            const profile = await cnpdrrmceoc.auth.me();
            setUser(profile || { id: firebaseUser.uid, email: firebaseUser.email, role: 'citizen' });
            setIsAuthenticated(true);
          } catch (e) {
            console.error('Error fetching user profile:', e);
            setIsAuthenticated(true);
            setUser({ id: firebaseUser.uid, email: firebaseUser.email, role: 'citizen' });
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
        setAuthChecked(true);
      });
    } else {
      checkUserAuth();
    }

    const handleFocus = () => {
      if (isAuthenticated) checkUserAuth();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated]);

  const checkUserAuth = async () => {
    setAuthError(null);
    try {
      setIsLoadingAuth(true);
      const currentUser = await cnpdrrmceoc.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const result = await cnpdrrmceoc.auth.login(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return result;
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError({ type: 'auth_failed', message: error.message || 'Invalid credentials' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const register = async (data) => {
    setAuthError(null);
    setIsLoadingAuth(true);
    try {
      const newUser = await cnpdrrmceoc.auth.register(data);
      setUser(newUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      return newUser;
    } catch (error) {
      console.error('Registration failed:', error);
      setAuthError({ type: 'register_failed', message: error.message || 'Registration failed' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setAuthError(null);
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
