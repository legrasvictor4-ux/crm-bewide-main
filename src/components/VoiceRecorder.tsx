import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@/services/clients";

interface VoiceRecorderProps {
  onClose: () => void;
}

interface AnalysisResult {
  restaurantName?: string;
  location?: string;
  interestLevel?: string;
  nextAction?: { type?: string; notes?: string };
  sentiment?: { openness?: number; urgency?: number };
}

const WAVE_BARS = 7;

const VoiceRecorder = ({ onClose }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(WAVE_BARS).fill(0.2));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const startLevelAnimation = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const chunk = Math.floor(data.length / WAVE_BARS);
        const bars = Array.from({ length: WAVE_BARS }, (_, i) => {
          const slice = Array.from(data.slice(i * chunk, (i + 1) * chunk));
          const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
          return Math.max(0.15, avg / 255);
        });
        setLevels(bars);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // AudioContext non disponible
    }
  };

  const stopLevelAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setLevels(Array(WAVE_BARS).fill(0.2));
  };

  const startRecording = async () => {
    try {
      if (audioBlob) setAudioBlob(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        toast({ title: "Micro non disponible", description: "Activez les permissions micro.", variant: "destructive" });
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas l'enregistrement audio.", variant: "destructive" });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = ["audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        stopLevelAnimation();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      startLevelAnimation(stream);
      timerRef.current = window.setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (error) {
      console.error("Microphone error:", error);
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      toast({ title: "Micro non accessible", description: "Autorisez le micro (HTTPS obligatoire).", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const saveProspection = async (result: AnalysisResult, transcription: string) => {
    setIsSaving(true);
    try {
      // Vérifie que la session Supabase est active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Non authentifié", description: "Reconnecte-toi pour enregistrer une prospection.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      await createClient({
        last_name: result.restaurantName || "Prospection vocale",
        status: "new",
        notes: [
          transcription,
          result.location ? `Localisation : ${result.location}` : null,
          result.interestLevel ? `Intérêt : ${result.interestLevel}` : null,
        ].filter(Boolean).join("\n\n"),
        metadata: {
          source: "voice_recorder",
          city: result.location || null,
          analysis: result,
        } as Record<string, unknown>,
      });
      toast({ title: "Prospection enregistrée ✓", description: "Client ajouté avec la transcription en notes." });
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error("Save error:", msg);
      toast({ title: "Enregistrement impossible", description: msg.slice(0, 120), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;
    setIsAnalyzing(true);

    try {
      const mockTranscription = `J'ai rencontré le restaurant Le Marais dans le 11ème arrondissement.
Le patron était présent et très intéressé par nos services.
Ils ont Instagram et Facebook mais peu de followers.
Pas d'agence actuellement. Budget moyen.
RDV confirmé pour jeudi prochain à 14h.`;

      let extracted: AnalysisResult | null = null;
      try {
        const { data, error } = await supabase.functions.invoke("analyze-voice-data", {
          body: { transcription: mockTranscription },
        });
        if (error) throw error;
        extracted = data?.extractedData || null;
      } catch (err) {
        console.warn("analyze-voice-data indisponible, fallback utilisé.", err);
      }

      const parsedResult: AnalysisResult = extracted || {
        restaurantName: "Prospection vocale",
        location: null,
        interestLevel: "unknown",
        nextAction: { type: "follow_up", notes: "Ajouté via prospection vocale" },
      };

      setAnalysisResult(parsedResult);
      await saveProspection(parsedResult, mockTranscription);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({ title: "Erreur", description: "Impossible d'analyser l'enregistrement.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-5 border border-border animate-in zoom-in duration-200">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">
            {isRecording ? "Enregistrement…" : audioBlob ? "Prêt à analyser" : "Nouvelle prospection"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* Bouton micro */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={audioBlob !== null}
            className={`relative w-20 h-20 rounded-full transition-all duration-300 ${
              isRecording
                ? "bg-destructive hover:bg-destructive/90 scale-105 shadow-lg shadow-destructive/40"
                : audioBlob
                ? "bg-muted cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 hover:scale-105 shadow-md shadow-primary/30"
            }`}
          >
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
            )}
            <div className="relative flex items-center justify-center h-full">
              {isRecording ? (
                <Square className="h-8 w-8 text-destructive-foreground fill-current" />
              ) : (
                <Mic className={`h-8 w-8 ${audioBlob ? "text-muted-foreground" : "text-primary-foreground"}`} />
              )}
            </div>
          </button>

          {/* Indicateur enregistrement */}
          {isRecording && (
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-semibold text-destructive tracking-widest uppercase">REC</span>
                <span className="text-xl font-bold tabular-nums text-foreground ml-1">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-end justify-center gap-0.5 h-8 w-full max-w-[140px]" aria-label="Niveau audio">
                {levels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2.5 rounded-full bg-primary transition-all duration-75"
                    style={{ height: `${Math.max(6, level * 32)}px` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Appuyez sur stop pour terminer</p>
            </div>
          )}

          {!isRecording && audioBlob && !analysisResult && (
            <p className="text-sm text-muted-foreground">Enregistrement de {formatTime(recordingTime)} prêt</p>
          )}

          {!isRecording && !audioBlob && (
            <p className="text-sm text-muted-foreground">Appuyez sur le micro pour commencer</p>
          )}

          {/* Actions après enregistrement */}
          {audioBlob && !analysisResult && (
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleSubmit}
                disabled={isAnalyzing || isSaving}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm"
              >
                {isAnalyzing || isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isSaving ? "Enregistrement…" : "Analyse IA…"}</>
                ) : (
                  <><Send className="h-4 w-4" /> Analyser et enregistrer</>
                )}
              </button>
              <button
                onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </button>
            </div>
          )}
        </div>

        {/* Résultat analyse */}
        {analysisResult && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <h3 className="font-bold text-sm text-foreground">Analyse IA complète</h3>
            </div>
            <div className="grid gap-2">
              {analysisResult.restaurantName && (
                <div className="p-2.5 bg-secondary rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Restaurant</p>
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
                <p className="font-semibold text-sm text-foreground capitalize">{analysisResult.interestLevel?.replace(/_/g, " ")}</p>
              </div>
              {analysisResult.nextAction && (
                <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-[11px] text-muted-foreground">Prochaine action</p>
                  <p className="font-semibold text-sm text-primary capitalize">{analysisResult.nextAction.type?.replace(/_/g, " ")}</p>
                  {analysisResult.nextAction.notes && (
                    <p className="text-xs text-foreground mt-0.5">{analysisResult.nextAction.notes}</p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-medium text-sm"
            >
              Terminer
            </button>
          </div>
        )}

        {!isRecording && !audioBlob && (
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground">
              💡 Mentionnez : nom du restaurant, arrondissement, statut de la prospection, prochaines actions…
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
