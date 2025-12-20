import { useEffect, useRef, useState } from "react";
import { X, Mic, Square, Send, Sparkles, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onClose: () => void;
}

interface AnalysisResult {
  restaurantName?: string | null;
  location?: string | null;
  interestLevel?: string | null;
  nextAction?: { type?: string; notes?: string | null };
  sentiment?: { openness?: number | null; urgency?: number | null };
  summary?: string | null;
}

type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type LogLevel = "info" | "success" | "warning" | "error";

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  detail?: string;
}

const generateId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const VoiceRecorder = ({ onClose }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [transcription, setTranscription] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const transcriptRef = useRef<string>("");
  const { toast } = useToast();

  const addLog = (message: string, level: LogLevel = "info", detail?: string) => {
    setLogs((prev) => [...prev, { id: generateId(), level, message, detail }]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSpeechRecognition = (): SpeechRecognitionType | null => {
    const win = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionType;
      SpeechRecognition?: new () => SpeechRecognitionType;
    };
    const Recognition = win.webkitSpeechRecognition || win.SpeechRecognition;
    if (!Recognition) return null;
    return new Recognition();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startSpeechRecognition = () => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      addLog("Dictée en direct non disponible sur ce navigateur", "warning");
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => addLog("Transcription en direct démarrée", "info");
    recognition.onend = () => addLog("Transcription en direct arrêtée", "info");
    recognition.onerror = (event) => {
      addLog("Erreur de transcription vocale", "warning", event?.error);
      if (event?.error === "not-allowed") {
        setErrorMessage("Micro refusé : autorise l'accès puis recommence.");
        toast({
          title: "Micro non autorisé",
          description: "Active le micro dans le navigateur ou passe en HTTPS.",
          variant: "destructive",
        });
      }
    };
    recognition.onresult = (event) => {
      const fullTranscript = Array.from(event.results)
        .map((r: { 0: { transcript: string } }) => r[0].transcript)
        .join(" ");
      transcriptRef.current = fullTranscript.trim();
      setTranscription(fullTranscript.trim());
    };
    recognition.start();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopSpeechRecognition();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (autoAnalyze && audioBlob && !isAnalyzing && !isSaving) {
      void handleSubmit(audioBlob);
      setAutoAnalyze(false);
    }
  }, [autoAnalyze, audioBlob, isAnalyzing, isSaving]);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setLogs([]);
      setAnalysisResult(null);
      setTranscription("");

      if (audioBlob) setAudioBlob(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        const message = "Micro indisponible : active les permissions ou change de navigateur.";
        setErrorMessage(message);
        addLog(message, "error");
        toast({
          title: "Micro non disponible",
          description: message,
          variant: "destructive",
        });
        return;
      }

      addLog("Demande d'accès micro...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        addLog(`Enregistrement terminé (${formatTime(Math.max(1, recordingTime))})`, "success");
        stream.getTracks().forEach((track) => track.stop());
        setAutoAnalyze(true);
      };

      mediaRecorder.start();
      startSpeechRecognition();
      addLog("Enregistrement démarré", "success");
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      const message = "Autorise le micro (HTTPS) puis réessaie.";
      setErrorMessage(message);
      addLog(message, "error");
      toast({
        title: "Micro non accessible",
        description: message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stopSpeechRecognition();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const blobToBase64 = (blob: Blob | null) =>
    new Promise<string>((resolve, reject) => {
      if (!blob) return reject(new Error("Aucun audio à encoder"));
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Impossible de lire le fichier audio"));
        }
      };
      reader.onerror = () => reject(new Error("Lecture audio échouée"));
      reader.readAsDataURL(blob);
    });

  const fallbackAnalysis = (transcript: string): AnalysisResult => {
    const arrondissementMatch = transcript.match(/\b(\d{1,2}e?)\s*arr/gi);
    const location = arrondissementMatch ? arrondissementMatch[0] : null;
    return {
      restaurantName: transcript.split(" ")[0] || "Prospection vocale",
      location,
      interestLevel: "unknown",
      nextAction: { type: "follow_up", notes: "Analyse IA non disponible - données extraites automatiquement." },
      sentiment: { openness: null, urgency: null },
      summary: transcript.slice(0, 240) || "Transcription vide",
    };
  };

  const saveProspection = async (result: AnalysisResult, transcript: string, audioBase64?: string) => {
    setIsSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        throw new Error("Session invalide, reconnecte-toi.");
      }
      if (!authData.session) {
        throw new Error("Connexion requise pour écrire en base (RLS).");
      }

      const payload = {
        last_name: result.restaurantName || "Prospection vocale",
        company: result.restaurantName || null,
        city: result.location || null,
        status: "new" as const,
        notes: transcript || "Enregistrement vocal sans transcription",
        imported_at: new Date().toISOString(),
        metadata: {
          source: "voice_recorder",
          analysis: result,
          audio_base64: audioBase64 ? `${audioBase64.slice(0, 32)}...` : null,
          audio_mime: audioBlob?.type || "audio/webm",
          transcription: transcript,
        },
      };

      const { error } = await supabase.from("clients").insert(payload);
      if (error) {
        if (typeof error.message === "string" && error.message.toLowerCase().includes("row level security")) {
          throw new Error("Écriture bloquée par RLS : connecte un user avec la bonne policy.");
        }
        throw error;
      }

      addLog("Client enregistré dans Supabase", "success");
      toast({
        title: "Prospection enregistrée",
        description: "Le client a été créé avec la transcription en notes.",
      });
    } catch (error) {
      console.error("Save error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Enregistrement impossible. Vérifie la connexion Supabase (URL/keys) ou réessaie.";
      setErrorMessage(message);
      addLog(message, "error");
      toast({
        title: "Enregistrement impossible",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (blobParam?: Blob | null) => {
    const blob = blobParam || audioBlob;
    if (!blob) {
      toast({
        title: "Aucun audio",
        description: "Enregistre d'abord une prospection.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    addLog("Préparation de l'audio pour l'IA...", "info");

    try {
      const audioBase64 = await blobToBase64(blob);
      const cleanedTranscript = (transcription || transcriptRef.current || "").trim();
      if (!cleanedTranscript) {
        addLog("Aucune transcription détectée : l'IA recevra l'audio brut.", "warning");
      }

      addLog("Appel de la fonction Supabase analyze-voice-data", "info");
      let extracted: AnalysisResult | null = null;
      try {
        const { data, error } = await supabase.functions.invoke("analyze-voice-data", {
          body: { transcription: cleanedTranscript || "Transcription vide", audioBase64 },
        });
        if (error) throw error;
        extracted = (data as { extractedData?: AnalysisResult })?.extractedData || null;
      } catch (apiError) {
        addLog("Analyse IA indisponible, fallback activé", "warning", apiError instanceof Error ? apiError.message : undefined);
      }

      const parsedResult: AnalysisResult = extracted || fallbackAnalysis(cleanedTranscript);
      setAnalysisResult(parsedResult);
      addLog("Analyse terminée", "success");

      await saveProspection(parsedResult, cleanedTranscript || "Transcription vide", audioBase64);
      toast({
        title: extracted ? "Analyse IA réussie" : "Analyse fallback",
        description: extracted
          ? "Résultat structuré et client enregistré."
          : "L'IA n'est pas joignable, sauvegarde avec extraction minimale.",
      });
    } catch (error) {
      console.error("Analysis error:", error);
      const message = error instanceof Error ? error.message : "Impossible d'analyser l'enregistrement";
      setErrorMessage(message);
      addLog(message, "error");
      toast({
        title: "Erreur d'analyse",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setTranscription("");
    setAnalysisResult(null);
    setLogs([]);
    setErrorMessage(null);
    setAutoAnalyze(false);
  };

  const renderLogIcon = (level: LogLevel) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl max-w-xl w-full p-8 border border-border animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isRecording ? "Enregistrement..." : audioBlob ? "Enregistrement terminé" : "Nouvelle prospection vocale"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={audioBlob !== null}
                className={`relative w-32 h-32 rounded-full transition-all duration-300 ${
                  isRecording
                    ? "bg-destructive hover:bg-destructive/90 scale-110 shadow-lg shadow-destructive/50"
                    : audioBlob
                    ? "bg-muted cursor-not-allowed"
                    : "bg-accent hover:bg-accent/90 hover:scale-105 shadow-md shadow-accent/30"
                }`}
              >
                <div className={`absolute inset-0 rounded-full ${isRecording ? "bg-destructive/20 animate-ping" : ""}`} />
                <div className="relative flex items-center justify-center h-full">
                  {isRecording ? (
                    <Square className="h-12 w-12 text-destructive-foreground fill-current" />
                  ) : (
                    <Mic className={`h-12 w-12 ${audioBlob ? "text-muted-foreground" : "text-accent-foreground"}`} />
                  )}
                </div>
              </button>
            </div>

            <div className="text-center">
              {isRecording ? (
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-foreground tabular-nums">{formatTime(recordingTime)}</p>
                  <p className="text-sm text-muted-foreground">Appuie sur stop pour lancer l'analyse automatique</p>
                </div>
              ) : audioBlob ? (
                <p className="text-sm text-muted-foreground">Enregistrement de {formatTime(recordingTime)} prêt</p>
              ) : (
                <p className="text-sm text-muted-foreground">Appuie sur le micro pour commencer</p>
              )}
            </div>

            {audioBlob && !analysisResult && (
              <button
                onClick={() => handleSubmit(audioBlob)}
                disabled={isAnalyzing || isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                {(isAnalyzing || isSaving) && <Loader2 className="h-5 w-5 animate-spin" />}
                {isAnalyzing ? "Analyse IA en cours..." : isSaving ? "Enregistrement..." : "Analyser et enregistrer"}
              </button>
            )}

            {audioBlob && !analysisResult && (
              <button onClick={resetRecording} className="text-sm text-muted-foreground underline hover:text-foreground">
                Recommencer l'enregistrement
              </button>
            )}
          </div>

          {logs.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Journal en direct</p>
              <ul className="space-y-1 text-sm">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-2">
                    {renderLogIcon(log.level)}
                    <div>
                      <p className="text-foreground">{log.message}</p>
                      {log.detail && <p className="text-muted-foreground text-xs">{log.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {transcription && (
            <div className="rounded-lg border border-border bg-secondary/60 p-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Transcription détectée</p>
              <p className="text-sm text-foreground">{transcription}</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold text-lg text-foreground">Analyse IA complète</h3>
              </div>

              <div className="grid gap-3">
                {analysisResult.restaurantName && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Restaurant</p>
                    <p className="font-semibold text-foreground">{analysisResult.restaurantName}</p>
                  </div>
                )}

                {analysisResult.location && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Localisation</p>
                    <p className="font-semibold text-foreground">{analysisResult.location}</p>
                  </div>
                )}

                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground">Niveau d'intérêt</p>
                  <p className="font-semibold text-foreground capitalize">
                    {analysisResult.interestLevel?.replace(/_/g, " ") || "Non déterminé"}
                  </p>
                </div>

                {analysisResult.nextAction && (
                  <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Prochaine action</p>
                    <p className="font-semibold text-accent capitalize">
                      {analysisResult.nextAction.type?.replace(/_/g, " ") || "Suivi"}
                    </p>
                    <p className="text-sm text-foreground mt-1">{analysisResult.nextAction.notes}</p>
                  </div>
                )}

                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Scores sentiment</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ouverture: </span>
                      <span className="font-bold text-foreground">{analysisResult.sentiment?.openness ?? "N/A"}/10</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Urgence: </span>
                      <span className="font-bold text-foreground">{analysisResult.sentiment?.urgency ?? "N/A"}/10</span>
                    </div>
                  </div>
                </div>

                {analysisResult.summary && (
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-xs text-muted-foreground">Résumé</p>
                    <p className="text-sm text-foreground">{analysisResult.summary}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetRecording}
                  className="w-full px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted/60 transition-colors"
                >
                  Nouvelle prospection
                </button>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Terminer
                </button>
              </div>
            </div>
          )}

          {!isRecording && !audioBlob && !analysisResult && (
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">
                Mentionne : nom du restaurant, arrondissement, statut de la prospection, prochaines actions...
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;
