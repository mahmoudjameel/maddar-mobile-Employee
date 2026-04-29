import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadCookie, saveCookie } from "./api";

export type Me = {
  email: string;
  role: string;
  sub: string;
  canAccessAll?: boolean;
  allowedSections?: string[];
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const cookie = await loadCookie();
    if (!cookie) {
      setMe(null);
      setLoading(false);
      return;
    }
    const res = await api.get<Me>("/api/auth/me");
    if (res.ok) setMe(res.data);
    else setMe(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ success: boolean; role: string }>("/api/auth/login", {
        email,
        password,
      });
      if (!res.ok) return { ok: false, error: res.error };
      await refresh();
      return { ok: true };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    await saveCookie(null);
    setMe(null);
  }, []);

  return (
    <Ctx.Provider value={{ me, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
