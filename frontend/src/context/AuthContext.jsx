// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Auth Context
const AuthContext = createContext();

// Custom hook to use the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check if user is logged in on app start
      const token = localStorage.getItem('token'); // Use consistent key 'token'
      
      console.log('AuthContext: Checking for stored token...');
      console.log('AuthContext: Token found:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (token) {
        console.log('AuthContext: Token exists, verifying with server...');
        
        try {
          // Verify token with backend
          const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('AuthContext: Token valid, user data:', userData);
            setUser({
              ...userData,
              token: token // Include token in user object
            });
          } else {
            console.log('AuthContext: Token invalid, removing from storage');
            localStorage.removeItem('token');
            setUser(null);
          }
        } catch (error) {
          console.error('AuthContext: Error verifying token:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        console.log('AuthContext: No token found');
        setUser(null);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (authData) => {
    console.log('AuthContext: Login called with data:', authData);
    
    // Extract token from the response
    const token = authData.access_token || authData.token;
    
    if (!token) {
      console.error('AuthContext: No token found in login response!');
      console.error('AuthContext: Response data:', authData);
      return;
    }

    console.log('AuthContext: Storing token:', `${token.substring(0, 20)}...`);
    
    // Store token consistently as 'token'
    localStorage.setItem('token', token);
    
    // Set user data including the token
    const userData = {
      ...authData.user,
      token: token,
      // Include any other fields from authData if needed
      id: authData.user?.id || authData.id,
      email: authData.user?.email || authData.email,
      name: authData.user?.name || authData.name,
      role: authData.user?.role || authData.role,
    };
    
    console.log('AuthContext: Setting user data:', userData);
    setUser(userData);
  };

  const logout = () => {
    console.log('AuthContext: Logging out...');
    localStorage.removeItem('token');
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    getToken,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};