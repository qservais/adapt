import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, UserProfile } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { setLanguage as setI18nLanguage, type SupportedLanguage } from "@/lib/i18n";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isCoach: boolean;
  logout: () => void;
  setAuth: (access: string, refresh: string) => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/privacy'];

function isPublicPath(loc: string): boolean {
  return PUBLIC_PATHS.some((p) => loc === p || loc.startsWith(p + '/') || loc.startsWith(p + '?'));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [tokenExists, setTokenExists] = useState(!!localStorage.getItem('adapt_coach_access'));
  
  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      queryKey: ['/api/users/me'],
      enabled: tokenExists,
      retry: false,
    }
  });

  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (!tokenExists && !isPublicPath(location)) {
      navigate('/login');
      return;
    }
    if (tokenExists && user && !isCoach) {
      logout();
      return;
    }
    if (tokenExists && user && isCoach && location === '/login') {
      navigate('/clients');
    }
  }, [tokenExists, location, user, isCoach]);

  useEffect(() => {
    const userLang = (user as unknown as { language?: string } | null)?.language;
    if (userLang === "fr" || userLang === "en") {
      setI18nLanguage(userLang as SupportedLanguage);
    }
  }, [user]);

  const setAuth = (access: string, refresh: string) => {
    localStorage.setItem('adapt_coach_access', access);
    localStorage.setItem('adapt_coach_refresh', refresh);
    setTokenExists(true);
    refetch().then(() => {
      navigate('/clients');
    });
  };

  const logout = () => {
    localStorage.removeItem('adapt_coach_access');
    localStorage.removeItem('adapt_coach_refresh');
    setTokenExists(false);
    navigate('/login');
  };

  const value = {
    user: user || null,
    isLoading: isUserLoading && tokenExists,
    isCoach,
    logout,
    setAuth,
    refetchUser: () => { refetch(); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
