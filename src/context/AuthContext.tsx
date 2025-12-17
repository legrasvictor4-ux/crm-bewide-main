import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login as loginService, logout as logoutService, startOtp, verifyOtp, loginWithGoogle } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  login: (payload: { email?: string; password?: string; provider?: "google" | "apple"; otpToken?: string }) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
  }, [token]);

  useEffect(() => {
    if (email) localStorage.setItem("auth_email", email);
    else localStorage.removeItem("auth_email");
  }, [email]);

  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setToken(session?.access_token ?? null);
      setEmail(session?.user?.email ?? null);
    };
    syncSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (payload: { email?: string; password?: string; provider?: "google" | "apple"; otpToken?: string }) => {
    if (payload.provider === "google") {
      const auth = await loginWithGoogle();
      if (auth.token) {
        setToken(auth.token);
        setEmail(auth.email ?? payload.email ?? null);
      }
      return;
    }

    if (payload.otpToken && payload.email) {
      const data = await verifyOtp(payload.email, payload.otpToken);
      setToken(data.token);
      setEmail(data.email ?? payload.email ?? null);
      return;
    }

    const data = await loginService(payload.email ?? "", payload.password ?? "");
    setToken(data.token);
    const resolvedEmail = data.email ?? data.user?.email ?? payload.email ?? null;
    setEmail(resolvedEmail);
  };

  const sendOtp = async (emailToSend: string) => {
    await startOtp(emailToSend);
  };

  const logout = async () => {
    await logoutService().catch(() => undefined);
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, email, login, logout, sendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
