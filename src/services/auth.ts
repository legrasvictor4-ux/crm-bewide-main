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

interface SupabaseAuthError {
  message?: string;
  status?: number;
  code?: string;
  details?: unknown;
}

function toApiError(err: SupabaseAuthError | null, defaultMsg: string, defaultStatus: number): ApiError {
  const message = err?.message || defaultMsg;
  const statusCode = err?.status ?? defaultStatus;
  return new ApiError(message, statusCode, err?.code, err?.details);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw toApiError(error, "Login failed", 401);
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
    throw toApiError(error, "OTP send failed", 400);
  }
}

export async function verifyOtp(email: string, token: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.session) {
    throw toApiError(error, "OTP verification failed", 401);
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
    throw toApiError(error, "Google login failed", 400);
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
    throw toApiError(error, "Logout failed", 400);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
  });
  if (error) {
    throw toApiError(error, "Password reset failed", 400);
  }
}
