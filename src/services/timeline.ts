import { ApiError } from "@/types/api";

const API_BASE = "";

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch (err) {
    body = null;
  }

  if (!res.ok) {
    const message = body?.error || body?.message || "Erreur API timeline";
    throw new ApiError(message, res.status, body?.code, body);
  }

  return body as T;
}

export interface TimelineEvent {
  id: string;
  account_id: string;
  event_type: string;
  raw_input_text: string;
  structured_data: Record<string, any>;
  created_at: string;
  created_by?: string | null;
}

export interface TimelineAccountState {
  id: string;
  name: string;
  lead_score: number;
  current_status: string;
  closing_probability: number;
  last_interaction_at?: string | null;
  next_action_at?: string | null;
}

export async function ingestVoiceEvent(payload: {
  accountName?: string;
  accountId?: string;
  raw_input_text: string;
  created_by?: string;
}) {
  return http<{ success: boolean; status: string; event: TimelineEvent; account: TimelineAccountState }>(
    "/api/timeline/voice",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function addEventToAccount(accountId: string, payload: { raw_input_text: string; created_by?: string }) {
  return http<{ success: boolean; event: TimelineEvent; account: TimelineAccountState }>(
    `/api/timeline/accounts/${accountId}/events`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchAccountState(accountId: string) {
  return http<{ success: boolean; account: TimelineAccountState; eventsCount: number }>(
    `/api/timeline/accounts/${accountId}/state`
  );
}

export async function fetchAccountEvents(accountId: string, limit = 50) {
  return http<{ success: boolean; events: TimelineEvent[] }>(`/api/timeline/accounts/${accountId}/events?limit=${limit}`);
}
