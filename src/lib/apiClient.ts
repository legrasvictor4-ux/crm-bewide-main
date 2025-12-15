import { ApiError } from '@/types/api';

interface RequestOptions extends RequestInit {
  authToken?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authToken, headers, ...rest } = options;
  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (authToken) {
    mergedHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload?.message ? payload.message : response.statusText;
    const code = isJson && payload?.code ? payload.code : undefined;
    throw new ApiError(message, response.status, code, payload?.details ?? payload);
  }

  return payload as T;
}
