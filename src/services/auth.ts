import { apiRequest } from "@/lib/apiClient";
import { ApiError } from "@/types/api";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "Login failed", err.statusCode ?? 401, err.code, err.details);
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (error) {
    const err = error as ApiError;
    throw new ApiError(err.message || "Logout failed", err.statusCode ?? 400, err.code, err.details);
  }
}
