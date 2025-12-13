import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Échec de la connexion");
    }
    const data = await res.json();
    setToken(data.token);
    setEmail(data.email || payload.email || null);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
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
