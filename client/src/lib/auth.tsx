import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, registerUnauthorizedHandler } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { fullName: string; email: string; phone?: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return registerUnauthorizedHandler((path) => {
      // If a protected route fails with 401, mark the session as unauthenticated
      if (path.startsWith("/api/admin") || path.startsWith("/api/account")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("mlk_auth_token");
        }
        setUser(null);
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ user: User; token?: string }>("/api/auth/login", { method: "POST", body: { email, password } });
    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("mlk_auth_token", data.token);
    }
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (input: { fullName: string; email: string; phone?: string; password: string }) => {
      const data = await api<{ user: User; token?: string }>("/api/auth/register", { method: "POST", body: input });
      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("mlk_auth_token", data.token);
      }
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mlk_auth_token");
      }
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, setUser }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
