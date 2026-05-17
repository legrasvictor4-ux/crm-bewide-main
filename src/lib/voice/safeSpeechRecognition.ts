import logger from "@/lib/logger";
import { useCleanup } from "@/hooks/useCleanup";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpeechRecognitionConfig {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoStopMs?: number;         // 0 = pas d'auto-stop
  onResult?: (text: string, isFinal: boolean) => void;
  onInterim?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

export interface SafeSpeechRecognition {
  start: () => Promise<{ success: true } | { success: false; error: string }>;
  stop: () => void;
  isSupported: boolean;
  isListening: boolean;
  supportReason: string;
}

// ─── Détection de support ─────────────────────────────────────────────────────

export interface SpeechSupport {
  supported: boolean;
  api: "webkitSpeechRecognition" | "SpeechRecognition" | null;
  reason: string;
}

export function detectSpeechSupport(): SpeechSupport {
  const win = globalThis as any;
  if (win.SpeechRecognition) {
    return { supported: true, api: "SpeechRecognition", reason: "" };
  }
  if (win.webkitSpeechRecognition) {
    return { supported: true, api: "webkitSpeechRecognition", reason: "" };
  }
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { supported: false, api: null, reason: "getUserMedia indisponible" };
  }
  return { supported: false, api: null, reason: "API SpeechRecognition absente (Chrome/Safari requis)" };
}

// ─── Contrôleur de microphone sécurisé ───────────────────────────────────────

export function createSafeRecognition(
  config: SpeechRecognitionConfig,
): SafeSpeechRecognition {
  const support = detectSpeechSupport();
  let recognition: any = null;
  let listening = false;
  let autoStopTimer: (ReturnType<typeof setTimeout>) | null = null;
  let audioStream: MediaStream | null = null;

  const cleanupAutoStop = () => {
    if (autoStopTimer !== null) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }
  };

  const cleanupMic = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
      audioStream = null;
    }
  };

  const stop = () => {
    cleanupAutoStop();
    if (recognition) {
      try { recognition.stop(); } catch { /* déjà arrêté */ }
    }
    if (listening) {
      cleanupMic();
    }
    listening = false;
  };

  const start = async (): Promise<{ success: true } | { success: false; error: string }> => {
    if (!support.supported || !support.api) {
      return { success: false, error: support.reason };
    }

    if (listening) {
      return { success: false, error: "Déjà en écoute" };
    }

    // Phase 1: Vérifier permission micro
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream = stream;
      // On arrête le flux ici car SpeechRecognition gère son propre micro
      // Mais on garde une référence pour cleanup
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Micro refusé"
        : err?.name === "NotFoundError"
          ? "Micro introuvable"
          : "Micro non accessible";
      logger.voice.warn("safeSpeechRecognition", msg, { error: err?.message });
      return { success: false, error: msg };
    }

    // Phase 2: Créer l'instance
    try {
      const SR = (globalThis as any)[support.api];
      recognition = new SR();
    } catch {
      cleanupMic();
      return { success: false, error: "Échec création SpeechRecognition" };
    }

    const cfg = {
      lang: config.lang || "fr-FR",
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives ?? 1,
    };

    recognition.lang = cfg.lang;
    recognition.continuous = cfg.continuous;
    recognition.interimResults = cfg.interimResults;
    recognition.maxAlternatives = cfg.maxAlternatives;

    // Phase 3: Attacher les handlers
    recognition.onstart = () => {
      listening = true;
      config.onStart?.();

      // Auto-stop timer
      if (config.autoStopMs && config.autoStopMs > 0) {
        autoStopTimer = setTimeout(() => {
          stop();
          config.onError?.("timeout");
        }, config.autoStopMs);
      }
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (finalText && config.onResult) {
        config.onResult(finalText, true);
      }
      if (interimText && config.onInterim) {
        config.onInterim(interimText);
      }
    };

    recognition.onerror = (event: any) => {
      const errCode = event?.error ?? "unknown";
      listening = false;
      cleanupAutoStop();
      cleanupMic();

      // Ne pas propager "no-speech" comme erreur (c'est normal)
      if (errCode !== "no-speech") {
        config.onError?.(errCode);
      }
      config.onEnd?.();
    };

    recognition.onend = () => {
      listening = false;
      cleanupAutoStop();
      cleanupMic();
      config.onEnd?.();
    };

    // Phase 4: AbortSignal → stop propre
    if (config.signal) {
      config.signal.addEventListener("abort", () => {
        stop();
      }, { once: true });
    }

    // Phase 5: Démarrer
    try {
      recognition.start();
    } catch (err: any) {
      listening = false;
      cleanupMic();
      return { success: false, error: `Impossible de démarrer: ${err.message}` };
    }

    return { success: true };
  };

  return {
    start,
    stop,
    isSupported: support.supported,
    isListening: () => listening,
    supportReason: support.reason,
  };
}

// ─── Hook React pour safeSpeechRecognition ───────────────────────────────────

export function useSafeRecognition(config: SpeechRecognitionConfig) {
  const { safeTimeout } = useCleanup();
  const support = detectSpeechSupport();

  const start = async () => {
    const sr = createSafeRecognition({
      ...config,
      onResult: (text, isFinal) => {
        config.onResult?.(text, isFinal);
      },
      onInterim: (text) => {
        config.onInterim?.(text);
      },
      onStart: () => config.onStart?.(),
      onEnd: () => config.onEnd?.(),
      onError: (err) => config.onError?.(err),
    });
    return sr.start();
  };

  return { start, isSupported: support.supported, supportReason: support.reason };
}
