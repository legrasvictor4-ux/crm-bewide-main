import { createContext, useContext, useState, ReactNode } from "react";
import { login as loginService, logout as logoutService, startOtp, verifyOtp, loginWithGoogle } from "@/services/auth";
import { supabase, whenSupabaseReady } from "@/integrations/supabase/client";
import { useSafeEffect } from "@/hooks/useSafeEffect";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  ready: boolean;
  login: (payload: { email?: string; password?: string; provider?: "google" | "apple"; otpToken?: string }) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  });
  const [email, setEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_email");
  });
  const [ready, setReady] = useState(false);

  useSafeEffect((mounted) => {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
  }, [token]);

  useSafeEffect((mounted) => {
    if (email) localStorage.setItem("auth_email", email);
    else localStorage.removeItem("auth_email");
  }, [email]);

  useSafeEffect((mounted) => {
    const supabaseConfigured = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    );

    if (!supabaseConfigured) {
      if (mounted.current) {
        setToken(null);
        setEmail(null);
        setReady(true);
      }
      return;
    }

    const syncSession = async () => {
      try {
        await whenSupabaseReady;
        const { data } = await supabase.auth.getSession();
        if (!mounted.current) return;
        const session = data.session;
        setToken(session?.access_token ?? null);
        setEmail(session?.user?.email ?? null);
      } catch (e) {
        console.error('[AuthContext] getSession failed:', e);
        if (!mounted.current) return;
        try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
        setToken(null);
        setEmail(null);
      } finally {
        if (mounted.current) setReady(true);
      }
    };
    void syncSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      setToken(session?.access_token ?? null);
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => {
      try {
        data?.subscription?.unsubscribe?.();
      } catch {
        // no-op
      }
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
    <AuthContext.Provider value={{ token, email, ready, login, logout, sendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
