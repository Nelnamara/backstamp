import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, setToken } from "./api";

type User = {
  id: number;
  username: string;
  email: string | null;
  role: string;
};

type AuthState = {
  me: User | null;
  loading: boolean;
  requestLogin: (email: string) => Promise<void>;
  requestSignup: (email: string, username: string, inviteCode: string) => Promise<void>;
  verify: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestLogin(email: string) {
    await api("/auth/login/request", { method: "POST", body: JSON.stringify({ email }) });
  }

  async function requestSignup(email: string, username: string, inviteCode: string) {
    await api("/auth/signup/request", {
      method: "POST",
      body: JSON.stringify({ email, username, invite_code: inviteCode }),
    });
  }

  async function verify(linkToken: string) {
    setLoading(true);
    try {
      const res = await api<User & { token: string }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ token: linkToken.trim() }),
      });
      setToken(res.token);
      const { token, ...user } = res;
      setMe(user);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    setMe(null);
  }

  return (
    <AuthContext.Provider value={{ me, loading, requestLogin, requestSignup, verify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
