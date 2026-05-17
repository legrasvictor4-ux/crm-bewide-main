import logger from "@/lib/logger";

// ─── Événements de trace standardisés ─────────────────────────────────────────

export type TraceEvent =
  | "LISTENING_STARTED"
  | "LISTENING_STOPPED"
  | "TRANSCRIPT_RECEIVED"
  | "EXTRACTION_STARTED"
  | "EXTRACTION_DONE"
  | "EXTRACTION_FAILED"
  | "AI_CALL_STARTED"
  | "AI_CALL_DONE"
  | "AI_CALL_FALLBACK"
  | "SANITIZE_OK"
  | "SANITIZE_FAILED"
  | "VALIDATION_OK"
  | "VALIDATION_FAILED"
  | "REVIEW_SHOWN"
  | "DUPLICATE_FOUND"
  | "SAVE_STARTED"
  | "SAVE_SUCCESS"
  | "SAVE_FAILED"
  | "CANCELLED"
  | "ERROR_OCCURRED"
  | "DRAFT_SAVED"
  | "DRAFT_RESTORED"
  | "TIMEOUT_OCCURRED";

// ─── Traceur ──────────────────────────────────────────────────────────────────

let traceIdCounter = 0;

export function createTrace(workflowId?: string) {
  const id = workflowId ?? `voice_${++traceIdCounter}_${Date.now()}`;
  const events: Array<{ event: TraceEvent; timestamp: number; data?: any }> = [];

  const emit = (event: TraceEvent, data?: any) => {
    const entry = { event, timestamp: Date.now(), data };
    events.push(entry);
    logger.voice.info("voiceTrace", event, { workflowId: id, ...data });
  };

  const getEvents = () => [...events];

  const getSummary = () => ({
    workflowId: id,
    duration: events.length >= 2
      ? events[events.length - 1].timestamp - events[0].timestamp
      : 0,
    eventCount: events.length,
    events: events.map(e => ({ event: e.event, ts: e.timestamp })),
  });

  return { id, emit, getEvents, getSummary };
}

export type VoiceTrace = ReturnType<typeof createTrace>;

// ─── Trace singleton pour usage simple ────────────────────────────────────────

let activeTrace: ReturnType<typeof createTrace> | null = null;

export function startTrace(workflowId?: string) {
  activeTrace = createTrace(workflowId);
  return activeTrace;
}

export function getTrace() {
  return activeTrace;
}

export function endTrace() {
  const summary = activeTrace?.getSummary();
  activeTrace = null;
  return summary;
}
