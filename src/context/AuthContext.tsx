import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login as loginService, logout as logoutService } from "@/services/auth";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  login: (payload: { email?: string; password?: string; provider?: "google" | "apple" }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem("auth_email"));

  useEffect(() => {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
  }, [token]);

  useEffect(() => {
    if (email) localStorage.setItem("auth_email", email);
    else localStorage.removeItem("auth_email");
  }, [email]);

  const login = async (payload: { email?: string; password?: string; provider?: "google" | "apple" }) => {
    const data = await loginService(payload.email ?? "", payload.password ?? "");
    setToken(data.token);
    const resolvedEmail = data.email ?? data.user?.email ?? payload.email ?? null;
    setEmail(resolvedEmail);
  };

  const logout = async () => {
    await logoutService().catch(() => undefined);
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
