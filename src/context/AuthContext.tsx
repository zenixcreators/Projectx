import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '../services/auth';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  creatorType: string;
  onboardingCompleted: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: any) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const data = await authService.getMe();
      setUser(data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (userData: any) => {
    const data = await authService.login(userData);
    setUser(data);
  };

  const signup = async (userData: any) => {
    const data = await authService.signup(userData);
    setUser(data);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
