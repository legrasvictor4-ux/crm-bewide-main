import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, MicOff, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useCreateClient } from "@/hooks/use-clients";
import type { CreateClientInput } from "@/services/clients";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "new" | "pending" | "success" | "lost" | "to_recontact";

interface FormData {
  name:               string;
  status:             Status;
  phone:              string;
  email:              string;
  city:               string;
  arrondissement:     string;
  notes:              string;
}

// ─── Statuts affichés à l'utilisateur ────────────────────────────────────────
const STATUSES: { value: Status; label: string; color: string }[] = [
  { value: "new",          label: "Nouveau",        color: "#6366f1" },
  { value: "pending",      label: "En cours",       color: "#f59e0b" },
  { value: "to_recontact", label: "À recontacter",  color: "#3b82f6" },
  { value: "success",      label: "Signé",          color: "#10b981" },
  { value: "lost",         label: "Perdu",          color: "#ef4444" },
];

// ─── Parsing IA langage naturel ───────────────────────────────────────────────
const CITIES = ["paris","lyon","marseille","bordeaux","toulouse","nantes","lille","strasbourg","nice","rennes","montpellier","grenoble"];

function parseVoice(text: string): Partial<FormData> {
  const t = text.toLowerCase();

  // Téléphone
  const phoneMatch = text.match(/(\+?\d[\d\s.\-()]{6,})/);

  // Email
  const emailMatch = text.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/i);

  // Ville
  const cityMatch = CITIES.find(c => t.includes(c));
  const city = cityMatch
    ? cityMatch.charAt(0).toUpperCase() + cityMatch.slice(1)
    : "";

  // Arrondissement : "3e", "3ème", "15ème arrondissement", "arrondissement 8"
  const arrMatch =
    text.match(/(\d{1,2})(?:e(?:r)?|è?me)\s*(?:arr?(?:ondissement)?)?/i) ||
    text.match(/arr?(?:ondissement)?\s*(\d{1,2})/i);
  const arrondissement = arrMatch ? `${arrMatch[1]}e` : "";

  // Statut détecté depuis les mots-clés
  let status: Status = "new";
  if (/intéress|motiv|rappel|recontact|plus tard|dans\s+\d/i.test(text)) status = "to_recontact";
  if (/signé|deal|accord|ok|validé|contrat/i.test(text))                  status = "success";
  if (/pas intéress|refus|non merci|négatif|froid|fermé/i.test(text))     status = "lost";
  if (/en cours|rdv|rendez.vous|visite|rencontré|relance/i.test(text))     status = "pending";

  // Nom : premier segment propre avant les données structurées
  const cleaned = text
    .replace(phoneMatch?.[0] ?? "", "")
    .replace(emailMatch?.[0] ?? "", "")
    .split(/[,.\n]/)[0]
    .trim();

  return {
    name:           cleaned,
    status,
    phone:          phoneMatch?.[0].replace(/\s+/g, " ").trim() ?? "",
    email:          emailMatch?.[0] ?? "",
    city,
    arrondissement,
    notes:          text,
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EMPTY: FormData = {
  name: "", status: "new", phone: "", email: "",
  city: "", arrondissement: "", notes: "",
};

export default function AddClientDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form,        setForm]        = useState<FormData>(EMPTY);
  const [nameError,   setNameError]   = useState("");
  const [more,        setMore]        = useState(false);   // champs optionnels cachés
  const [dictating,   setDictating]   = useState(false);
  const recogRef = useRef<any>(null);

  const mutation = useCreateClient({
    onSuccess: () => {
      toast.success("Prospect ajouté ✓");
      setForm(EMPTY);
      setNameError("");
      setMore(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Erreur lors de la création");
    },
  });

  // ── Champ générique ──────────────────────────────────────────────────────
  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "name" && value.trim()) setNameError("");
  };

  // ── Payload vers Supabase ────────────────────────────────────────────────
  const toPayload = (f: FormData): CreateClientInput => ({
    last_name:      f.name.trim(),
    status:         f.status,
    phone:          f.phone.trim()          || null,
    email:          f.email.trim()          || null,
    city:           f.city.trim()           || null,
    arrondissement: f.arrondissement.trim() || null,
    notes:          f.notes.trim()          || null,
    metadata:       {} as Record<string, unknown>,
  });

  // ── Soumission ───────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setNameError("Le nom est requis"); return; }
    mutation.mutate(toPayload(form));
  };

  // ── Dictée vocale ────────────────────────────────────────────────────────
  const handleDictation = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Dictée vocale non disponible"); return; }

    if (dictating) { recogRef.current?.stop(); return; }

    const rec = new SR();
    recogRef.current = rec;
    rec.lang = "fr-FR";
    rec.interimResults = false;
    rec.continuous = false;

    rec.onstart = () => setDictating(true);
    rec.onend   = () => setDictating(false);
    rec.onerror = () => { setDictating(false); toast.error("Micro non accessible"); };

    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ");
      const parsed = parseVoice(transcript);
      setForm(prev => ({
        ...prev,
        name:           parsed.name           || prev.name,
        status:         parsed.status         ?? prev.status,
        phone:          parsed.phone          || prev.phone,
        email:          parsed.email          || prev.email,
        city:           parsed.city           || prev.city,
        arrondissement: parsed.arrondissement || prev.arrondissement,
        notes:          parsed.notes          || prev.notes,
      }));
      if (parsed.city || parsed.arrondissement) setMore(true);
    };

    rec.start();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" aria-label="Ajouter un prospect">
        <DialogHeader>
          <DialogTitle>Nouveau prospect</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* ── Statut (chips) ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("status", s.value)}
                style={{
                  borderColor: s.color,
                  background:  form.status === s.value ? s.color : "transparent",
                  color:       form.status === s.value ? "#fff"   : s.color,
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── Nom (seul champ obligatoire) ───────────────────────────── */}
          <div className="space-y-1">
            <Label htmlFor="name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Restaurant, personne, entreprise…"
                className={nameError ? "border-destructive" : ""}
                disabled={mutation.isPending}
                autoFocus
              />
              {/* Bouton micro inline */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={dictating ? "border-red-400 text-red-500 animate-pulse" : ""}
                onClick={handleDictation}
                disabled={mutation.isPending}
                title="Dicter (IA comprend ville, arrondissement, statut…)"
              >
                {dictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            {dictating && (
              <p className="text-xs text-muted-foreground animate-pulse">
                🎙 Parle… L'IA détecte la ville, l'arrondissement et l'état automatiquement
              </p>
            )}
          </div>

          {/* ── Téléphone (affiché directement, souvent utile) ─────────── */}
          <div className="space-y-1">
            <Label htmlFor="phone">Téléphone <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="+33 6 12 34 56 78"
              disabled={mutation.isPending}
            />
          </div>

          {/* ── Champs optionnels masqués ──────────────────────────────── */}
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMore(v => !v)}
          >
            {more ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {more ? "Masquer les champs optionnels" : "Ajouter : ville, email, notes…"}
          </button>

          {more && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={e => set("city", e.target.value)}
                    placeholder="Paris, Lyon…"
                    disabled={mutation.isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="arr">Arrondissement</Label>
                  <Input
                    id="arr"
                    value={form.arrondissement}
                    onChange={e => set("arrondissement", e.target.value)}
                    placeholder="3e, 15e…"
                    disabled={mutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="contact@example.com"
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  placeholder="Infos utiles, contexte, prochaine action…"
                  rows={3}
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          )}

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
                : "Ajouter"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
