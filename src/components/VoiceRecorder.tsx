import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Send, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  onClose: () => void;
}

const VoiceRecorder = ({ onClose }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSubmit = async () => {
    if (audioBlob) {
      setIsAnalyzing(true);
      
      try {
        // Convert audio to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          // First, transcribe (mock for now - would use Whisper API)
          const mockTranscription = `J'ai rencontré le restaurant Le Marais dans le 11ème arrondissement. 
          Le patron était présent et très intéressé par nos services. 
          Ils ont Instagram et Facebook mais peu de followers. 
          Pas d'agence actuellement. Budget moyen. 
          RDV confirmé pour jeudi prochain à 14h pour discuter d'une offre complète.`;
          
          // Analyze with AI
          const { data, error } = await supabase.functions.invoke('analyze-voice-data', {
            body: { transcription: mockTranscription }
          });
          
          if (error) throw error;
          
          if (data?.extractedData) {
            setAnalysisResult(data.extractedData);
            toast({
              title: "✨ Analyse IA terminée",
              description: "Toutes les données ont été extraites avec succès",
            });
          }
        };
      } catch (error) {
        console.error('Analysis error:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'analyser l'enregistrement",
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-8 border border-border animate-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            {isRecording ? "Enregistrement..." : audioBlob ? "Enregistrement terminé" : "Nouvelle prospection"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-8">
          {/* Recording Button */}
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
              <div
                className={`absolute inset-0 rounded-full ${
                  isRecording ? "bg-destructive/20 animate-ping" : ""
                }`}
              />
              <div className="relative flex items-center justify-center h-full">
                {isRecording ? (
                  <Square className="h-12 w-12 text-destructive-foreground fill-current" />
                ) : (
                  <Mic
                    className={`h-12 w-12 ${
                      audioBlob ? "text-muted-foreground" : "text-accent-foreground"
                    }`}
                  />
                )}
              </div>
            </button>
          </div>

          {/* Timer / Instruction */}
          <div className="text-center">
            {isRecording ? (
              <div className="space-y-2">
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Appuyez sur stop pour terminer
                </p>
              </div>
            ) : audioBlob ? (
              <p className="text-sm text-muted-foreground">
                Enregistrement de {formatTime(recordingTime)} prêt
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Appuyez sur le micro pour commencer
              </p>
            )}
          </div>

          {/* Submit Button */}
          {audioBlob && !analysisResult && (
            <button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyse IA en cours...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Analyser avec IA
                </>
              )}
            </button>
          )}
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-bold text-lg text-foreground">Analyse IA Complète</h3>
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
                <p className="font-semibold text-foreground capitalize">{analysisResult.interestLevel?.replace(/_/g, ' ')}</p>
              </div>
              
              {analysisResult.nextAction && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">Prochaine action</p>
                  <p className="font-semibold text-accent capitalize">{analysisResult.nextAction.type?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-foreground mt-1">{analysisResult.nextAction.notes}</p>
                </div>
              )}
              
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Scores sentiment</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ouverture: </span>
                    <span className="font-bold text-foreground">{analysisResult.sentiment?.openness}/10</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Urgence: </span>
                    <span className="font-bold text-foreground">{analysisResult.sentiment?.urgency}/10</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Terminer
            </button>
          </div>
        )}

        {/* Tips */}
        {!isRecording && !audioBlob && (
          <div className="mt-8 p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Mentionnez : nom du restaurant, arrondissement, statut de la prospection, prochaines actions...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
