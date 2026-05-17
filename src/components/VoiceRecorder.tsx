import { useState, useRef, useCallback, useEffect } from "react";
import { X, Mic, Square, Sparkles, Loader2, RotateCcw, AlertTriangle, Check, Save, Ban, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { createClient, fetchClients } from "@/services/clients";
import type { Client } from "@/schema/clientSchema";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";
import logger from "@/lib/logger";
import { useIsMounted } from "@/hooks/useSafeEffect";
import { useCleanup } from "@/hooks/useCleanup";
import { useAsyncLock } from "@/hooks/useAsyncLock";

// Module 4 imports
import { useVoiceMachine } from "@/lib/voice/voiceWorkflowMachine";
import { createSafeRecognition, detectSpeechSupport } from "@/lib/voice/safeSpeechRecognition";
import { appendTranscript, getTranscript, setTranscript, resetTranscriptStore, getTranscriptVersions, restoreTranscriptVersion } from "@/lib/voice/voiceTranscriptStore";
import { extractAndSanitize, detectDuplicates, type DuplicateMatch } from "@/lib/voice/voiceExtractor";
import { saveDraft, updateDraft, getLastDraft, deleteDraft } from "@/lib/voice/voiceDraftStore";
import { startTrace } from "@/lib/voice/voiceTrace";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceRecorderProps {
  onClose: () => void;
  onSaved?: () => void;
}

interface AnalysisResult {
  restaurantName?: string;
  contactPerson?: { name?: string | null; role?: string | null; present?: boolean };
  location?: { full: string | null; street: string | null; district: string | null; landmark: string | null } | null;
  interestLevel?: string;
  summary?: string;
  nextAction?: { type?: string; date?: string | null; time?: string | null; notes?: string };
  suggestedFollowUp?: { approach?: string; timing?: string; arguments?: string[] };
  extractionConfidence?: number;
  businessType?: string | null;
}

type SR = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

const WAVE_BARS = 7;
const EXTRACTION_TIMEOUT_MS = 15_000;

// ─── Composant ────────────────────────────────────────────────────────────────

const VoiceRecorder = ({ onClose, onSaved }: VoiceRecorderProps) => {
  const mounted = useIsMounted();
  const { safeTimeout, safeInterval, safeRaf, safeListener } = useCleanup();
  const { guard: saveGuard, isPending: isSavePending } = useAsyncLock();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State machine vocale
  const vm = useVoiceMachine();

  // États UI legacy (affichage)
  const [transcript, setTranscriptState] = useState("");
  const [interimText, setInterimText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(WAVE_BARS).fill(0.2));
  const [recordingTime, setRecordingTime] = useState(0);
  const [srSupported, setSrSupported] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [confirmPayload, setConfirmPayload] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const srRef = useRef<SR | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef(new AbortController());
  const draftIdRef = useRef<string | null>(null);
  const traceRef = useRef<ReturnType<typeof startTrace> | null>(null);

  // ─── Initialisation: restaurer draft ──────────────────────────────────────
  useEffect(() => {
    if (!mounted.current) return;
    const support = detectSpeechSupport();
    setSrSupported(support.supported);

    // Restaurer le dernier draft non sauvegardé
    const last = getLastDraft();
    if (last && !last.saved && last.transcript) {
      setTranscriptState(last.transcript);
      setTranscript(last.transcript, "restore");
      if (last.candidate) {
        const cand = last.candidate as unknown as Client;
        setConfirmPayload(cand);
        setAnalysisResult({ restaurantName: cand.name ?? undefined, summary: undefined });
        // Aller directement en REVIEW
        vm.sanitizeOk(cand);
      }
      draftIdRef.current = last.id;
    }
  }, []);

  // ─── Micro: helpers ───────────────────────────────────────────────────────

  const setupSpeechRecognition = useCallback(() => {
    const win = window as any;
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) setSrSupported(false);
    return SR;
  }, []);

  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (audioCtxRef.current) await audioCtxRef.current.close().catch(() => {});
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!mounted.current) return;
        analyser.getByteFrequencyData(data);
        const chunk = Math.floor(data.length / WAVE_BARS);
        setLevels(
          Array.from({ length: WAVE_BARS }, (_, i) => {
            const slice = Array.from(data.slice(i * chunk, (i + 1) * chunk));
            const avg = slice.reduce((s, v) => s + v, 0) / (slice.length || 1);
            return Math.max(0.15, avg / 255);
          })
        );
        safeRaf(tick);
      };
      safeRaf(tick);
    } catch { /* micro non accessible */ }
  }, [mounted, safeRaf]);

  const stopVisualizer = useCallback(() => {
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (mounted.current) setLevels(Array(WAVE_BARS).fill(0.2));
  }, [mounted]);

  // ─── Phase LISTENING ──────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!vm.canListen) return;
    vm.startListen();
    traceRef.current = startTrace();
    traceRef.current.emit("LISTENING_STARTED");

    const SR = setupSpeechRecognition();
    if (!SR) {
      toast({ title: "Non supporté", description: "Dictée vocale non disponible sur ce navigateur.", variant: "destructive" });
      vm.error("SpeechRecognition non supporté");
      return;
    }

    const rec: SR = new SR();
    srRef.current = rec;
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      if (!mounted.current) return;
      setRecordingTime(0);
      safeInterval(() => {
        if (!mounted.current) return;
        setRecordingTime(p => p + 1);
      }, 1000);
      // Timeout 5 min
      safeTimeout(() => {
        if (!mounted.current) return;
        srRef.current?.stop();
        toast({ title: "Durée maximale atteinte", description: "Enregistrement arrêté après 5 minutes." });
        traceRef.current?.emit("TIMEOUT_OCCURRED", { type: "max_duration" });
        vm.timeout();
      }, 300_000);
    };

    rec.onresult = (event) => {
      if (!mounted.current) return;
      let interim = "";
      let final = "";
      Array.from(event.results).forEach(r => {
        if (r.isFinal) final += r[0].transcript + " ";
        else interim += r[0].transcript;
      });
      if (final) {
        setTranscriptState(prev => {
          const next = (prev + final).trim();
          appendTranscript(final, true);
          return next;
        });
        traceRef.current?.emit("TRANSCRIPT_RECEIVED", { length: final.length });
      }
      setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (!mounted.current) return;
      if (e.error === "not-allowed") {
        toast({ title: "Micro refusé", description: "Autorisez le micro dans les paramètres du navigateur.", variant: "destructive" });
        traceRef.current?.emit("ERROR_OCCURRED", { error: "micro_refused" });
        vm.error("Micro refusé");
      } else if (e.error === "no-speech") {
        // Ignorer silencieusement
      } else {
        toast({ title: "Erreur micro", description: `Erreur : ${e.error}`, variant: "destructive" });
        traceRef.current?.emit("ERROR_OCCURRED", { error: e.error });
        vm.error(`Erreur micro: ${e.error}`);
      }
    };

    rec.onend = () => {
      if (!mounted.current) return;
      vm.stopListen();
      setInterimText("");
      stopVisualizer();
      traceRef.current?.emit("LISTENING_STOPPED");
    };

    rec.start();
    await startVisualizer();
  }, [setupSpeechRecognition, toast, safeInterval, safeTimeout, startVisualizer, stopVisualizer, mounted, vm]);

  const stopListening = useCallback(() => {
    srRef.current?.stop();
    traceRef.current?.emit("LISTENING_STOPPED", { reason: "user" });
  }, []);

  // ─── Phase EXTRACTING → SANITIZING → VALIDATING ──────────────────────────
  const handleAnalyze = useCallback(async () => {
    const fullTranscript = getTranscript();
    if (!fullTranscript.trim()) {
      toast({ title: "Transcription vide", description: "Aucun texte capturé. Réessayez.", variant: "destructive" });
      traceRef.current?.emit("ERROR_OCCURRED", { error: "empty_transcript" });
      vm.error("Transcription vide");
      return;
    }

    abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    vm.transcriptReady(fullTranscript);
    setIsAnalyzing(true);
    setErrorMsg(null);
    traceRef.current?.emit("EXTRACTION_STARTED", { transcriptLength: fullTranscript.length });

    try {
      const result = await extractAndSanitize(fullTranscript, {
        timeoutMs: EXTRACTION_TIMEOUT_MS,
        signal,
        onTrace: (event, data) => traceRef.current?.emit(event as any, data),
      });

      if (!mounted.current || signal.aborted) return;

      if (!result.success) {
        traceRef.current?.emit("EXTRACTION_FAILED", { stage: result.stage, error: result.error });
        vm.sanitizeFail(result.error);
        setErrorMsg(result.error);
        setIsAnalyzing(false);
        return;
      }

      // Extraction réussie
      traceRef.current?.emit("EXTRACTION_DONE");
      vm.sanitizeOk(result.candidate as unknown as Client);

      const candidate = result.candidate as unknown as Client;
      setConfirmPayload(candidate);
      setAnalysisResult({
        restaurantName: candidate.name ?? undefined,
        interestLevel: candidate.statut_opportunite ?? "neutre",
      });

      // Sauvegarder le draft local
      const draft = saveDraft({
        transcript: fullTranscript,
        candidate: result.candidate as Record<string, unknown>,
        step: "REVIEW",
        saved: false,
      });
      draftIdRef.current = draft.id;
      traceRef.current?.emit("DRAFT_SAVED", { draftId: draft.id });

      // Détection de doublons (si des clients existants sont disponibles)
      try {
        const existing = await fetchClients({ minScore: 0, search: candidate.name ?? "" });
        if (existing && existing.length > 0) {
          const dups = detectDuplicates(result.candidate as Record<string, unknown>, existing);
          if (dups.length > 0) {
            setDuplicates(dups);
            traceRef.current?.emit("DUPLICATE_FOUND", { count: dups.length });
          }
        }
      } catch { /* ignore - duplicate detection non bloquante */ }

      vm.sanitizeOk(candidate);
      setIsAnalyzing(false);
      traceRef.current?.emit("REVIEW_SHOWN");
    } catch (err: any) {
      if (signal.aborted) return;
      const msg = err?.message ?? "Erreur inconnue";
      traceRef.current?.emit("ERROR_OCCURRED", { error: msg });
      setErrorMsg(msg);
      vm.sanitizeFail(msg);
      setIsAnalyzing(false);
    }
  }, [toast, mounted, vm]);

  // ─── Phase SAVING ─────────────────────────────────────────────────────────
  const handleConfirmSave = useCallback(async () => {
    if (!confirmPayload) return;
    if (!mounted.current) return;

    await saveGuard(async () => {
      setIsSaving(true);
      vm.confirmSave();
      traceRef.current?.emit("SAVE_STARTED");

      try {
        // Merge notes sécurisé (Phase 16)
        const payload = mergeNotes(confirmPayload, analysisResult?.summary);

        await createClient(payload);
        queryClient.invalidateQueries({ queryKey: ["clients"] });

        // Marquer le draft comme sauvegardé
        if (draftIdRef.current) {
          updateDraft(draftIdRef.current, { step: "SUCCESS", saved: true });
        }

        traceRef.current?.emit("SAVE_SUCCESS");
        vm.saveDone();

        if (mounted.current) {
          onSaved?.();
          toast({
            title: "Prospection enregistrée ✓",
            description: `${analysisResult?.restaurantName || "Prospect"} ajouté au CRM.`,
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erreur inconnue";
        logger.voice.error("handleConfirmSave", `FAILED: ${msg}`);
        traceRef.current?.emit("SAVE_FAILED", { error: msg });
        vm.saveFail(msg);
        if (mounted.current) {
          toast({ title: "Erreur", description: msg.slice(0, 120), variant: "destructive" });
        }
      } finally {
        if (mounted.current) setIsSaving(false);
      }
    });
  }, [confirmPayload, queryClient, onSaved, toast, analysisResult, saveGuard, mounted, vm]);

  // ─── Reset / Cancel ───────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (!mounted.current) return;
    resetTranscriptStore();
    setTranscriptState("");
    setInterimText("");
    setAnalysisResult(null);
    setConfirmPayload(null);
    setRecordingTime(0);
    setDuplicates([]);
    setErrorMsg(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    vm.reset();
    draftIdRef.current = null;
    traceRef.current = null;
  }, [mounted, vm]);

  const handleCancel = useCallback(() => {
    if (isAnalyzing || isSaving) return;
    traceRef.current?.emit("CANCELLED", { reason: "user" });

    // Phase 12: Safe cancellation — cleanup complet
    abortRef.current.abort();
    srRef.current?.stop();
    stopVisualizer();
    resetTranscriptStore();
    vm.cancel();
    onClose();
  }, [isAnalyzing, isSaving, stopVisualizer, onClose, vm]);

  const handleRetry = useCallback(() => {
    reset();
    vm.retry();
  }, [reset, vm]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const hasTranscript = transcript.trim().length > 0;

  const locationDisplay = analysisResult?.location?.full
    ?? null;

  // ─── Phase de review ─────────────────────────────────────────────────────
  const isReviewMode = confirmPayload !== null && !isAnalyzing && !isSaving;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-5 border border-border animate-in zoom-in duration-200">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">
            {vm.isListening ? "Écoute en cours…" : isReviewMode ? "Révision avant enregistrement" : hasTranscript ? "Prêt à analyser" : "Nouvelle prospection"}
          </h2>
          <button
            onClick={handleCancel}
            disabled={!vm.canCancel}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bannière non support */}
        {!srSupported && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-xl text-xs text-destructive">
            La dictée vocale n'est pas disponible sur ce navigateur. Utilisez Chrome ou Safari.
          </div>
        )}

        {/* Bannière erreur */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-xl text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMsg.slice(0, 200)}</span>
          </div>
        )}

        {/* ═══ ÉTAT REVIEW ═══ */}
        {isReviewMode && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Données extraites — vérifiez avant sauvegarde</h3>
            </div>

            <div className="grid gap-2">
              {confirmPayload.name && (
                <ReviewField label="Nom / Enseigne" value={confirmPayload.name} />
              )}
              {confirmPayload.phone && (
                <ReviewField label="Téléphone" value={confirmPayload.phone} />
              )}
              {confirmPayload.email && (
                <ReviewField label="Email" value={confirmPayload.email} />
              )}
              {confirmPayload.status && (
                <ReviewField label="Statut" value={confirmPayload.status} />
              )}
              {confirmPayload.statut_opportunite && (
                <ReviewField label="Opportunité" value={confirmPayload.statut_opportunite} />
              )}
              {confirmPayload.address && (
                <ReviewField label="Adresse" value={confirmPayload.address} />
              )}
            </div>

            {/* Alerte doublons */}
            {duplicates.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {duplicates.length} prospect{duplicates.length > 1 ? "s" : ""} existant{duplicates.length > 1 ? "s" : ""} détecté{duplicates.length > 1 ? "s" : ""}
                </div>
                {duplicates.map(d => (
                  <div key={d.id} className="ml-5">
                    {(d as any).name || (d as any).last_name} — {d.matchField}: {(d as any)[d.matchField]}
                  </div>
                ))}
              </div>
            )}

            {/* Transcription originale */}
            <div className="p-2.5 bg-secondary/50 rounded-lg">
              <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Transcription originale
              </p>
              <p className="text-xs text-foreground line-clamp-3">{transcript.slice(0, 300)}</p>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50"
              >
                {isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  : <><Save className="h-4 w-4" /> Confirmer l'enregistrement</>}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors font-medium text-sm disabled:opacity-50"
              >
                <Ban className="h-4 w-4" /> Annuler
              </button>
            </div>
          </div>
        )}

        {/* ═══ ÉTATS LISTENING / PROCESSING / ANALYZING ═══ */}
        {!isReviewMode && (
          <div className="flex flex-col items-center gap-4">
            {/* Bouton micro */}
            <button
              onClick={isSaving ? undefined : isAnalyzing ? undefined : vm.isListening ? stopListening : startListening}
              disabled={!srSupported || isAnalyzing || isSaving}
              className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
                vm.isListening
                  ? "bg-destructive hover:bg-destructive/90 scale-105 shadow-lg shadow-destructive/40"
                  : isAnalyzing
                  ? "bg-muted cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 hover:scale-105 shadow-md shadow-primary/30"
              }`}
            >
              {vm.isListening && <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />}
              <div className="relative flex items-center justify-center h-full">
                {vm.isListening
                  ? <Square className="h-8 w-8 text-destructive-foreground fill-current" />
                  : isAnalyzing
                  ? <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  : <Mic className={`h-8 w-8 ${!srSupported ? "text-muted-foreground" : "text-primary-foreground"}`} />}
              </div>
            </button>

            {/* Indicateur enregistrement */}
            {vm.isListening && (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-semibold text-destructive tracking-widest uppercase">EN DIRECT</span>
                  <span className="text-xl font-bold tabular-nums text-foreground ml-1">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex items-end justify-center gap-0.5 h-8 w-full max-w-[140px]">
                  {levels.map((l, i) => (
                    <div key={i} className="w-2.5 rounded-full bg-primary transition-all duration-75"
                      style={{ height: `${Math.max(6, l * 32)}px` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Transcription en temps réel */}
            {(hasTranscript || interimText) && (
              <div className="w-full max-h-32 overflow-y-auto rounded-xl bg-secondary p-3 text-sm">
                <span className="text-foreground">{transcript}</span>
                {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
              </div>
            )}

            {/* État idle */}
            {!vm.isListening && !hasTranscript && !isAnalyzing && (
              <p className="text-sm text-muted-foreground text-center">
                Appuyez sur le micro et parlez.<br />
                <span className="text-xs">Nom, lieu, intérêt, prochaine action…</span>
              </p>
            )}

            {/* État processing / analyzing */}
            {isAnalyzing && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Analyse IA en cours…</p>
              </div>
            )}

            {/* Actions après transcription (avant review) */}
            {!vm.isListening && hasTranscript && !isAnalyzing && !isReviewMode && (
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isSaving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" /> Analyser avec l'IA
                </button>
                <button onClick={reset} className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> Recommencer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Astuce */}
        {!vm.isListening && !hasTranscript && !isReviewMode && !isAnalyzing && (
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">
              💡 Parlez librement : <em>"Le restaurant Chez Paul, Lyon 3ème. Le patron est intéressé, RDV vendredi."</em>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sous-composant ReviewField ──────────────────────────────────────────────

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 bg-secondary rounded-lg">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm text-foreground">{value}</p>
    </div>
  );
}

function mergeNotes(client: Client, _summary?: string): Client {
  return client;
}

export default VoiceRecorder;
