import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, Square, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@/services/clients";

interface VoiceRecorderProps {
  onClose: () => void;
}

interface AnalysisResult {
  restaurantName?: string;
  location?:       string;
  interestLevel?:  string;
  nextAction?:     { type?: string; notes?: string };
}

// ── Types SpeechRecognition (non-standard, absent des types TS de base) ───────
type SR = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onstart:  (() => void) | null;
  onend:    (() => void) | null;
  onerror:  ((e: { error?: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop:  () => void;
};

const WAVE_BARS = 7;

// ── Analyse de la transcription avec Claude via le backend ────────────────────
async function analyzeTranscript(transcription: string): Promise<AnalysisResult> {
  // Essai via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("analyze-voice-data", {
      body: { transcription },
    });
    if (!error && data?.extractedData) return data.extractedData;
  } catch { /* fallback ci-dessous */ }

  // Fallback : parsing local simple basé sur le texte
  const t = transcription.toLowerCase();
  const CITIES = ["paris","lyon","marseille","bordeaux","toulouse","nantes","lille","strasbourg","nice","rennes"];
  const city   = CITIES.find(c => t.includes(c));

  const arrMatch = transcription.match(/(\d{1,2})(?:e(?:r)?|è?me)/i);

  let interestLevel = "unknown";
  if (/intéress|motiv|rappel|recontact/i.test(transcription)) interestLevel = "interested";
  if (/signé|deal|accord|validé/i.test(transcription))        interestLevel = "signed";
  if (/pas intéress|refus|négatif|froid/i.test(transcription)) interestLevel = "not_interested";
  if (/rdv|rendez.vous|visite/i.test(transcription))           interestLevel = "meeting_scheduled";

  // Nom : premier segment avant virgule/point
  const name = transcription.split(/[,.\n]/)[0].trim().slice(0, 60) || "Prospection vocale";

  return {
    restaurantName: name,
    location:       city
      ? (city.charAt(0).toUpperCase() + city.slice(1)) + (arrMatch ? ` ${arrMatch[1]}e` : "")
      : undefined,
    interestLevel,
    nextAction: {
      type:  interestLevel === "meeting_scheduled" ? "meeting" : "follow_up",
      notes: transcription.slice(0, 300),
    },
  };
}

// ── Composant ─────────────────────────────────────────────────────────────────
const VoiceRecorder = ({ onClose }: VoiceRecorderProps) => {
  const [isListening,   setIsListening]   = useState(false);
  const [transcript,    setTranscript]    = useState("");
  const [interimText,   setInterimText]   = useState("");
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [analysisResult,setAnalysisResult]= useState<AnalysisResult | null>(null);
  const [levels,        setLevels]        = useState<number[]>(Array(WAVE_BARS).fill(0.2));
  const [recordingTime, setRecordingTime] = useState(0);
  const [srSupported,   setSrSupported]   = useState(true);

  const srRef       = useRef<SR | null>(null);
  const timerRef    = useRef<number | null>(null);
  const animRef     = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const { toast }   = useToast();

  // ── Nettoyage au démontage ────────────────────────────────────────────────
  useEffect(() => {
    const win = window as any;
    const SR  = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) setSrSupported(false);

    return () => {
      srRef.current?.stop();
      if (timerRef.current)  clearInterval(timerRef.current);
      if (animRef.current)   cancelAnimationFrame(animRef.current);
      // Fermer l'AudioContext pour éviter les fuites mémoire
      audioCtxRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Visualisation niveau audio ────────────────────────────────────────────
  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Fermer l'ancien contexte avant d'en créer un nouveau
      if (audioCtxRef.current) {
        await audioCtxRef.current.close().catch(() => {});
      }
      const ctx      = new AudioContext();
      audioCtxRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const chunk = Math.floor(data.length / WAVE_BARS);
        setLevels(Array.from({ length: WAVE_BARS }, (_, i) => {
          const slice = Array.from(data.slice(i * chunk, (i + 1) * chunk));
          return Math.max(0.15, slice.reduce((s, v) => s + v, 0) / slice.length / 255);
        }));
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } catch { /* micro non accessible, visualisation désactivée */ }
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setLevels(Array(WAVE_BARS).fill(0.2));
  }, []);

  // ── Démarrer l'écoute (SpeechRecognition réel) ────────────────────────────
  const startListening = useCallback(async () => {
    const win = window as any;
    const SR  = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Non supporté", description: "Dictée vocale non disponible sur ce navigateur.", variant: "destructive" });
      return;
    }

    const rec: SR = new SR();
    srRef.current = rec;
    rec.lang             = "fr-FR";
    rec.interimResults   = true;
    rec.continuous       = true;
    rec.maxAlternatives  = 1;

    rec.onstart  = () => {
      setIsListening(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    };

    rec.onresult = (event) => {
      let interim = "";
      let final   = "";
      Array.from(event.results).forEach(r => {
        if (r.isFinal) final   += r[0].transcript + " ";
        else            interim += r[0].transcript;
      });
      if (final) setTranscript(prev => (prev + final).trim());
      setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        toast({ title: "Micro refusé", description: "Autorisez le micro dans les paramètres du navigateur.", variant: "destructive" });
      } else if (e.error !== "no-speech") {
        toast({ title: "Erreur micro", description: `Erreur : ${e.error}`, variant: "destructive" });
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimText("");
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      stopVisualizer();
    };

    rec.start();
    await startVisualizer();
  }, [toast, startVisualizer, stopVisualizer]);

  // ── Arrêter l'écoute ─────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    srRef.current?.stop();
  }, []);

  // ── Analyser et sauvegarder ───────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const fullTranscript = transcript.trim();
    if (!fullTranscript) {
      toast({ title: "Transcription vide", description: "Aucun texte capturé. Réessayez.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeTranscript(fullTranscript);
      setAnalysisResult(result);

      // Vérifier la session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Non authentifié", description: "Reconnecte-toi.", variant: "destructive" });
        return;
      }

      setIsSaving(true);
      await createClient({
        last_name: result.restaurantName || "Prospection vocale",
        status:    "new",
        city:      result.location ?? null,
        notes: [
          `📝 Transcription vocale :`,
          fullTranscript,
          result.interestLevel ? `\nIntérêt : ${result.interestLevel}` : null,
          result.nextAction?.notes ? `Action : ${result.nextAction.notes}` : null,
        ].filter(Boolean).join("\n"),
        metadata: { source: "voice_recorder", analysis: result } as Record<string, unknown>,
      });
      toast({ title: "Prospection enregistrée ✓", description: `${result.restaurantName} ajouté au CRM.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg.slice(0, 120), variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setIsSaving(false);
    }
  }, [transcript, toast]);

  const reset = () => {
    setTranscript("");
    setInterimText("");
    setAnalysisResult(null);
    setRecordingTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const hasTranscript = transcript.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-5 border border-border animate-in zoom-in duration-200">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">
            {isListening ? "Écoute en cours…" : hasTranscript ? "Prêt à analyser" : "Nouvelle prospection"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!srSupported && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-xl text-xs text-destructive">
            La dictée vocale n'est pas disponible sur ce navigateur. Utilisez Chrome ou Safari.
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {/* Bouton micro */}
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!srSupported || isAnalyzing || isSaving || !!analysisResult}
            className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
              isListening
                ? "bg-destructive hover:bg-destructive/90 scale-105 shadow-lg shadow-destructive/40"
                : analysisResult
                ? "bg-muted cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 hover:scale-105 shadow-md shadow-primary/30"
            }`}
          >
            {isListening && <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />}
            <div className="relative flex items-center justify-center h-full">
              {isListening
                ? <Square className="h-8 w-8 text-destructive-foreground fill-current" />
                : <Mic className={`h-8 w-8 ${analysisResult ? "text-muted-foreground" : "text-primary-foreground"}`} />}
            </div>
          </button>

          {/* Indicateur enregistrement */}
          {isListening && (
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

          {!isListening && !hasTranscript && !analysisResult && (
            <p className="text-sm text-muted-foreground text-center">
              Appuyez sur le micro et parlez.<br />
              <span className="text-xs">Nom, lieu, intérêt, prochaine action…</span>
            </p>
          )}

          {/* Actions après transcription */}
          {!isListening && hasTranscript && !analysisResult && (
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing || isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm"
              >
                {isAnalyzing || isSaving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {isSaving ? "Enregistrement…" : "Analyse IA…"}</>
                  : <><Sparkles className="h-4 w-4" /> Analyser et enregistrer</>}
              </button>
              <button onClick={reset} className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </button>
            </div>
          )}
        </div>

        {/* Résultat */}
        {analysisResult && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">Analyse IA complète</h3>
            </div>
            <div className="grid gap-2">
              {analysisResult.restaurantName && (
                <div className="p-2.5 bg-secondary rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Prospect</p>
                  <p className="font-semibold text-sm text-foreground">{analysisResult.restaurantName}</p>
                </div>
              )}
              {analysisResult.location && (
                <div className="p-2.5 bg-secondary rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Localisation</p>
                  <p className="font-semibold text-sm text-foreground">{analysisResult.location}</p>
                </div>
              )}
              <div className="p-2.5 bg-secondary rounded-lg">
                <p className="text-[11px] text-muted-foreground">Niveau d'intérêt</p>
                <p className="font-semibold text-sm text-foreground capitalize">
                  {analysisResult.interestLevel?.replace(/_/g, " ") ?? "—"}
                </p>
              </div>
              {analysisResult.nextAction?.type && (
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Prochaine action</p>
                  <p className="font-semibold text-sm text-primary capitalize">
                    {analysisResult.nextAction.type.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm">
              Terminer
            </button>
          </div>
        )}

        {/* Astuce */}
        {!isListening && !hasTranscript && !analysisResult && (
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

export default VoiceRecorder;
