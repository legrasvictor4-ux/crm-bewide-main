import ContactForm from "@/components/forms/ContactForm";
import { useEffect, useState } from "react";
import { ContactRecord } from "@/types/contact";
import { toast } from "sonner";
import VoiceIntakeDialog from "@/components/VoiceIntakeDialog";
import { Button } from "@/components/ui/button";

const ContactsPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [clients, setClients] = useState<ContactRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);

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

  const loadClients = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/clients");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Erreur lors du chargement des clients");
      setClients(payload.clients || payload.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les clients");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prospection / Contacts</h1>
        <Button variant="outline" onClick={() => setVoiceOpen(true)} data-testid="open-voice-intake">
          Capture vocale
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContactForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Tous les clients</h2>
            <Button size="sm" variant="ghost" onClick={loadClients} disabled={loadingList}>
              Rafraîchir
            </Button>
          </div>
          <div className="max-h-[480px] overflow-auto">
            {loadingList ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun client trouvé.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Entreprise</th>
                    <th className="text-left py-2">Statut</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.company + client.primaryContact?.email} className="border-t border-border/50">
                      <td className="py-2">{client.company}</td>
                      <td className="py-2 capitalize text-muted-foreground">{client.status}</td>
                      <td className="py-2">{client.opportunityScore ?? client["lead_score"] ?? "-"}</td>
                      <td className="py-2">
                        {client.primaryContact?.name} {client.primaryContact?.email ? `(${client.primaryContact.email})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <VoiceIntakeDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </div>
  );
};

export default ContactsPage;
