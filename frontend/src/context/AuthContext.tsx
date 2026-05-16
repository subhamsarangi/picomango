import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: User | null;
  login: (access: string, refresh: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('accessToken'));
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async () => {
    try {
      const res = await api.get('auth/me/');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchUser();
    }
  }, [accessToken]);

  const login = (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    // Listen for custom logout events from api interceptor
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth:logout', handleLogoutEvent);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
