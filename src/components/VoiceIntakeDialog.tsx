import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface VoiceIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceIntakeDialog = ({ open, onOpenChange }: VoiceIntakeDialogProps) => {
  const [transcript, setTranscript] = useState("");
  const [preview, setPreview] = useState<unknown>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "preview" | "existing" | "created">("idle");

  const ingest = async (commit = false) => {
    try {
      setStatus("loading");
      const res = await fetch("/api/voice/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, confirm: commit }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Erreur vocale");
      setPreview(payload);
      setStatus(payload.status === "existing" ? "existing" : commit ? "created" : "preview");
      if (commit && payload.status === "created") {
        toast.success("Contact créé");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
      setStatus("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capture vocale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Collez une transcription ou dictez..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            data-testid="voice-transcript"
          />
          <div className="flex gap-2">
            <Button onClick={() => ingest(false)} disabled={status === "loading"}>
              Prévisualiser
            </Button>
            <Button variant="secondary" onClick={() => ingest(true)} disabled={status === "loading"}>
              Confirmer et créer
            </Button>
          </div>
          {preview && (
            <Alert>
              <AlertDescription>
                Statut: {preview.status}
                <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(preview, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceIntakeDialog;
