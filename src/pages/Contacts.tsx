import ContactForm from "@/components/forms/ContactForm";
import { useState } from "react";
import { ContactRecord } from "@/types/contact";
import { toast } from "sonner";
import VoiceIntakeDialog from "@/components/VoiceIntakeDialog";

const ContactsPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const handleSubmit = async (data: ContactRecord) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Erreur lors de l'enregistrement");
      }
      toast.success("Contact enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Nouveau contact</h1>
        <Button variant="outline" onClick={() => setVoiceOpen(true)} data-testid="open-voice-intake">
          Capture vocale
        </Button>
      </div>
      <ContactForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      <VoiceIntakeDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </div>
  );
};

export default ContactsPage;
