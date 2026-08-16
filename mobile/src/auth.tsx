import * as SecureStore from "expo-secure-store";
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
  /** true until we've checked secure storage for a saved session */
  booting: boolean;
  loading: boolean;
  requestLogin: (email: string) => Promise<void>;
  requestSignup: (email: string, username: string, inviteCode: string) => Promise<void>;
  verify: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = "backstamp.session";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);

  // On launch: restore a saved session so you stay logged in across app
  // restarts. If the token is expired/revoked, /auth/me 401s and we drop it.
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          const user = await api<User>("/auth/me");
          setMe(user);
        }
      } catch {
        setToken(null);
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        setBooting(false);
      }
    })();
  }, []);

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
      await SecureStore.setItemAsync(TOKEN_KEY, res.token);
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
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setMe(null);
  }

  return (
    <AuthContext.Provider
      value={{ me, booting, loading, requestLogin, requestSignup, verify, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
