'use client';

import { createContext, useContext, useEffect, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  defaultStyle: string | null;
  defaultAspectRatio: string | null;
  defaultRecipe: string | null;
  videoCount: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  workspace: WorkspaceSummary | null;
  token: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  refreshWorkspace: (workspace: WorkspaceSummary | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "solaraAuthToken";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  interface MeResponse {
    user?: AuthUser;
    workspace?: WorkspaceSummary | null;
    error?: string;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setAuthLoading(false);
      return;
    }

    setToken(stored);

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${stored}`,
          },
        });
        const data = (await res.json().catch(() => null)) as MeResponse | null;
        if (!res.ok || !data?.user) {
          throw new Error();
        }
        setUser(data.user);
        setWorkspace(data.workspace ?? null);
      } catch {
        setUser(null);
        setWorkspace(null);
        setToken(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const persistToken = (value: string | null) => {
    setToken(value);
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  };

  const login = async (email: string, password: string) => {
    interface AuthResponse {
      token?: string;
      user?: AuthUser;
      workspace?: WorkspaceSummary | null;
      error?: string;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => null)) as AuthResponse | null;
    if (!res.ok || !data?.token) {
      throw new Error((data && (data.error as string)) || "Failed to log in.");
    }
    setUser(data.user ?? null);
    setWorkspace(data.workspace ?? null);
    persistToken(data.token);
  };

  const register = async (email: string, password: string, workspaceName?: string) => {
    interface AuthResponse {
      token?: string;
      user?: AuthUser;
      workspace?: WorkspaceSummary | null;
      error?: string;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, workspaceName }),
    });
    const data = (await res.json().catch(() => null)) as AuthResponse | null;
    if (!res.ok || !data?.token) {
      throw new Error((data && (data.error as string)) || "Failed to register.");
    }
    setUser(data.user ?? null);
    setWorkspace(data.workspace ?? null);
    persistToken(data.token);
  };

  const logout = () => {
    setUser(null);
    setWorkspace(null);
    persistToken(null);
  };

  const refreshWorkspace = (next: WorkspaceSummary | null) => {
    setWorkspace(next);
  };

  const value: AuthContextValue = {
    user,
    workspace,
    token,
    authLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    refreshWorkspace,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
