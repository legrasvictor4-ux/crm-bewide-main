import { ApiError } from "@/types/api";
import { supabase } from "@/integrations/supabase/client";

export interface AuthResponse {
  token: string;
  email?: string;
  user?: {
    id?: string;
    email?: string;
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    const err = error as ApiError | null;
    throw new ApiError(err?.message || "Login failed", err?.statusCode ?? 401, err?.code, err?.details);
  }
  return {
    token: data.session.access_token,
    email: data.session.user?.email ?? email,
    user: data.session.user,
  };
}

export async function startOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });

  if (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "OTP send failed", err.statusCode ?? 400, err.code, err.details);
  }
}

export async function verifyOtp(email: string, token: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) {
    const err = error as ApiError | null;
    throw new ApiError(err?.message || "OTP verification failed", err?.statusCode ?? 401, err?.code, err?.details);
  }
  return {
    token: data.session.access_token,
    email: data.session.user?.email ?? email,
    user: data.session.user,
  };
}

export async function loginWithGoogle(): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });

  if (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "Google login failed", err.statusCode ?? 400, err.code, err.details);
  }

  // Supabase OAuth usually redirects; if session is present, return it, otherwise caller should follow redirect URL.
  if (data?.session) {
    return {
      token: data.session.access_token,
      email: data.session.user?.email,
      user: data.session.user,
    };
  }

  // If we reached here, the SDK will redirect; return a placeholder token to satisfy the type.
  return { token: "" };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "Logout failed", err.statusCode ?? 400, err.code, err.details);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
  });
  if (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "Password reset failed", err.statusCode ?? 400, err.code, err.details);
  }
}
