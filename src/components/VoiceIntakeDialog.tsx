import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, Save, Ban, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useVoiceMachine } from "@/lib/voice/voiceWorkflowMachine";
import { setTranscript, getTranscript } from "@/lib/voice/voiceTranscriptStore";
import { startTrace } from "@/lib/voice/voiceTrace";

interface VoiceIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceIntakeDialog = ({ open, onOpenChange }: VoiceIntakeDialogProps) => {
  const [transcript, setLocalTranscript] = useState("");
  const [preview, setPreview] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(new AbortController());
  const traceRef = useRef<ReturnType<typeof startTrace> | null>(null);
  const vm = useVoiceMachine();

  const ingest = useCallback(async (commit: boolean) => {
    const text = transcript.trim();
    if (!text) {
      toast.error("Veuillez entrer une transcription");
      return;
    }

    abortRef.current.abort();
    abortRef.current = new AbortController();
    traceRef.current = startTrace();
    setError(null);

    if (!commit) {
      vm.transcriptReady(text);
    } else {
      vm.confirmSave();
    }

    setIsLoading(true);
    traceRef.current.emit(commit ? "SAVE_STARTED" : "EXTRACTION_STARTED", { length: text.length });

    try {
      const res = await fetch("/api/voice/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, confirm: commit }),
        signal: abortRef.current.signal,
      });
      const payload = await res.json();

      if (!res.ok) throw new Error(payload.error || "Erreur vocale");

      setPreview(payload);

      if (commit && payload.status === "created") {
        traceRef.current.emit("SAVE_SUCCESS");
        vm.saveDone();
        toast.success("Contact créé");
        onOpenChange(false);
      } else if (!commit) {
        traceRef.current.emit("REVIEW_SHOWN");
      }
    } catch (error) {
      if ((error as any)?.name === "AbortError") return;
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      traceRef.current?.emit("ERROR_OCCURRED", { error: msg });
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [transcript, onOpenChange, vm]);

  const handleCancel = useCallback(() => {
    abortRef.current.abort();
    traceRef.current?.emit("CANCELLED", { reason: "user" });
    setError(null);
    setPreview(null);
    vm.cancel();
    onOpenChange(false);
  }, [onOpenChange, vm]);

  const handlePreview = () => ingest(false);
  const handleConfirmCreate = () => ingest(true);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) handleCancel();
      else onOpenChange(true);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capture vocale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Collez une transcription ou dictez..."
            value={transcript}
            onChange={(e) => {
              setLocalTranscript(e.target.value);
              setTranscript(e.target.value, "paste");
            }}
            data-testid="voice-transcript"
            disabled={isLoading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {!preview ? (
              <div className="flex gap-2 w-full">
                <Button onClick={handlePreview} disabled={isLoading || !transcript.trim()} className="flex-1">
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Analyse…</> : <><Eye className="h-4 w-4 mr-1" /> Prévisualiser</>}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Button onClick={handleConfirmCreate} disabled={isLoading} className="flex-1">
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sauvegarde…</> : <><Save className="h-4 w-4 mr-1" /> Confirmer et créer</>}
                </Button>
                <Button variant="secondary" onClick={() => setPreview(null)} disabled={isLoading}>
                  Modifier
                </Button>
              </div>
            )}
          </div>

          {preview && (
            <Alert>
              <AlertDescription>
                <div className="text-xs font-semibold mb-1">
                  {preview.status === "existing" ? "Prospect existant détecté" : "Aperçu"}
                </div>
                <pre className="text-xs whitespace-pre-wrap mt-2 max-h-60 overflow-y-auto">{JSON.stringify(preview, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceIntakeDialog;
