import { useReducer, useCallback, useRef } from "react";
import logger from "@/lib/logger";
import type { Client } from "@/schema/clientSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoiceStep =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "EXTRACTING"
  | "SANITIZING"
  | "VALIDATING"
  | "REVIEW"
  | "SAVING"
  | "SUCCESS"
  | "ERROR"
  | "CANCELLED";

export type VoiceEvent =
  | { type: "START_LISTEN" }
  | { type: "STOP_LISTEN" }
  | { type: "TRANSCRIPT_READY"; transcript: string }
  | { type: "START_EXTRACT" }
  | { type: "EXTRACT_DONE" }
  | { type: "SANITIZE_OK"; payload: Client }
  | { type: "SANITIZE_FAIL"; error: string }
  | { type: "VALIDATE_OK" }
  | { type: "VALIDATE_FAIL"; error: string }
  | { type: "CONFIRM_SAVE" }
  | { type: "SAVE_DONE" }
  | { type: "SAVE_FAIL"; error: string }
  | { type: "CANCEL" }
  | { type: "RETRY" }
  | { type: "RESET" }
  | { type: "ERROR"; error: string }
  | { type: "TIMEOUT" }
  | { type: "DUPLICATE_FOUND" };

export interface VoiceState {
  step: VoiceStep;
  transcript: string;
  payload: Client | null;
  error: string | null;
  canRetry: boolean;
  timestamp: number;
}

const INITIAL: VoiceState = {
  step: "IDLE",
  transcript: "",
  payload: null,
  error: null,
  canRetry: true,
  timestamp: Date.now(),
};

// ─── Reducer pur (testable sans React) ─────────────────────────────────────────

export function voiceMachineReducer(state: VoiceState, event: VoiceEvent): VoiceState {
  const now = Date.now();
  switch (event.type) {

    case "START_LISTEN":
      if (state.step !== "IDLE" && state.step !== "ERROR" && state.step !== "CANCELLED") return state;
      return { ...INITIAL, step: "LISTENING", timestamp: now };

    case "STOP_LISTEN":
      if (state.step !== "LISTENING") return state;
      return { ...state, step: "PROCESSING", timestamp: now };

    case "TRANSCRIPT_READY":
      if (state.step !== "PROCESSING") return state;
      return { ...state, step: "EXTRACTING", transcript: event.transcript, timestamp: now };

    case "START_EXTRACT":
      if (state.step !== "EXTRACTING") return state;
      return state;

    case "EXTRACT_DONE":
      if (state.step !== "EXTRACTING") return state;
      return { ...state, step: "SANITIZING", timestamp: now };

    case "SANITIZE_OK":
      if (state.step !== "SANITIZING") return state;
      return { ...state, step: "VALIDATING", payload: event.payload, timestamp: now };

    case "SANITIZE_FAIL":
      if (state.step !== "SANITIZING") return state;
      return { ...state, step: "ERROR", error: event.error, canRetry: true, timestamp: now };

    case "VALIDATE_OK":
      if (state.step !== "VALIDATING") return state;
      return { ...state, step: "REVIEW", timestamp: now };

    case "VALIDATE_FAIL":
      if (state.step !== "VALIDATING") return state;
      return { ...state, step: "ERROR", error: event.error, canRetry: true, timestamp: now };

    case "CONFIRM_SAVE":
      if (state.step !== "REVIEW") return state;
      return { ...state, step: "SAVING", timestamp: now };

    case "SAVE_DONE":
      if (state.step !== "SAVING") return state;
      return { ...state, step: "SUCCESS", timestamp: now };

    case "SAVE_FAIL":
      if (state.step !== "SAVING") return state;
      return { ...state, step: "ERROR", error: event.error, canRetry: true, timestamp: now };

    case "CANCEL":
      return { ...state, step: "CANCELLED", timestamp: now };

    case "RETRY":
      if (state.step !== "ERROR" && state.step !== "CANCELLED") return state;
      return { ...INITIAL, step: "IDLE", timestamp: now };

    case "RESET":
      return { ...INITIAL, timestamp: now };

    case "ERROR":
      return { ...state, step: "ERROR", error: event.error, canRetry: true, timestamp: now };

    case "TIMEOUT":
      return { ...state, step: "ERROR", error: "Délai dépassé", canRetry: true, timestamp: now };

    case "DUPLICATE_FOUND":
      return state;

    default:
      return state;
  }
}

// ─── Hook React ────────────────────────────────────────────────────────────────

export function useVoiceMachine() {
  const [state, dispatch] = useReducer(voiceMachineReducer, INITIAL);
  const stepRef = useRef(state.step);
  stepRef.current = state.step;

  const isIdle = state.step === "IDLE";
  const isListening = state.step === "LISTENING";
  const isLoading = ["PROCESSING", "EXTRACTING", "SANITIZING", "VALIDATING", "SAVING"].includes(state.step);
  const isReview = state.step === "REVIEW";
  const isSuccess = state.step === "SUCCESS";
  const isError = state.step === "ERROR";
  const isCancelled = state.step === "CANCELLED";
  const isFinal = ["SUCCESS", "ERROR", "CANCELLED"].includes(state.step);

  const canListen = isIdle || isError;
  const canAnalyze = state.step === "PROCESSING";
  const canSave = state.step === "REVIEW";
  const canRetry = isError && state.canRetry;
  const canCancel = !isFinal;

  const safeDispatch = useCallback((event: VoiceEvent) => {
    dispatch(event);
  }, []);

  return {
    state,
    dispatch: safeDispatch,
    // Convenience dispatchers
    startListen: () => dispatch({ type: "START_LISTEN" }),
    stopListen: () => dispatch({ type: "STOP_LISTEN" }),
    transcriptReady: (t: string) => dispatch({ type: "TRANSCRIPT_READY", transcript: t }),
    sanitizeOk: (p: Client) => dispatch({ type: "SANITIZE_OK", payload: p }),
    sanitizeFail: (e: string) => dispatch({ type: "SANITIZE_FAIL", error: e }),
    confirmSave: () => dispatch({ type: "CONFIRM_SAVE" }),
    saveDone: () => dispatch({ type: "SAVE_DONE" }),
    saveFail: (e: string) => dispatch({ type: "SAVE_FAIL", error: e }),
    cancel: () => dispatch({ type: "CANCEL" }),
    retry: () => dispatch({ type: "RETRY" }),
    reset: () => dispatch({ type: "RESET" }),
    error: (e: string) => dispatch({ type: "ERROR", error: e }),
    timeout: () => dispatch({ type: "TIMEOUT" }),
    // Derived flags
    isIdle, isListening, isLoading, isReview, isSuccess, isError, isCancelled, isFinal,
    canListen, canAnalyze, canSave, canRetry, canCancel,
    stepRef,
  };
}

// ─── Transitions autorisées (pour debug/validation) ───────────────────────────

export const ALLOWED_TRANSITIONS: Record<VoiceStep, VoiceEvent["type"][]> = {
  IDLE:         ["START_LISTEN", "RESET"],
  LISTENING:    ["STOP_LISTEN", "CANCEL", "ERROR"],
  PROCESSING:   ["TRANSCRIPT_READY", "CANCEL", "ERROR"],
  EXTRACTING:   ["START_EXTRACT", "EXTRACT_DONE", "CANCEL", "ERROR", "TIMEOUT"],
  SANITIZING:   ["SANITIZE_OK", "SANITIZE_FAIL", "CANCEL"],
  VALIDATING:   ["VALIDATE_OK", "VALIDATE_FAIL", "CANCEL"],
  REVIEW:       ["CONFIRM_SAVE", "CANCEL", "DUPLICATE_FOUND"],
  SAVING:       ["SAVE_DONE", "SAVE_FAIL", "CANCEL"],
  SUCCESS:      ["RESET"],
  ERROR:        ["RETRY", "RESET", "START_LISTEN"],
  CANCELLED:    ["RESET", "RETRY"],
};

export function assertTransition(from: VoiceStep, eventType: VoiceEvent["type"]): void {
  if (from === "IDLE" && eventType === "RESET") return;
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed?.includes(eventType)) {
    console.warn(`[VOICE_MACHINE] Transition interdite: ${from} -> ${eventType}`);
  }
}
