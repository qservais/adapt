import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { tokenStore } from "@/lib/auth";
import { getMe } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isAuthError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  const status = (err as Record<string, unknown>)["status"];
  return status === 401 || status === 403;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTokens, setHasTokens] = useState(false);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProfile = useCallback(async (): Promise<boolean> => {
    try {
      const profile = await getMe();
      setUser(profile);
      return true;
    } catch (err) {
      if (isAuthError(err)) {
        await tokenStore.clear();
        setHasTokens(false);
        setUser(null);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.getAccess();
        if (token) {
          setHasTokens(true);
          await loadProfile();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadProfile]);

  useEffect(() => {
    if (!hasTokens || user !== null) {
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
      return;
    }
    retryRef.current = setInterval(async () => {
      const ok = await loadProfile();
      if (ok && retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    }, 5000);
    return () => {
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [hasTokens, user, loadProfile]);

  const login = useCallback(
    async (accessToken: string, refreshToken: string, userData: UserProfile) => {
      await tokenStore.setTokens(accessToken, refreshToken);
      setHasTokens(true);
      setUser(userData);
    },
    []
  );

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setHasTokens(false);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: UserProfile) => setUser(u), []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: hasTokens,
      login,
      logout,
      updateUser,
    }),
    [user, isLoading, hasTokens, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
