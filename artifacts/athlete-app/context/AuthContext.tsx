import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.getAccess();
        if (token) {
          const profile = await getMe();
          setUser(profile);
        }
      } catch (err) {
        if (isAuthError(err)) {
          await tokenStore.clear();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (accessToken: string, refreshToken: string, userData: UserProfile) => {
      await tokenStore.setTokens(accessToken, refreshToken);
      setUser(userData);
    },
    []
  );

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((u: UserProfile) => setUser(u), []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, login, logout, updateUser }),
    [user, isLoading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
