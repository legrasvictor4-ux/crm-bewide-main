import { useRef, useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, MicOff, ChevronDown, ChevronUp, Eye, Save, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCreateClient } from "@/hooks/use-clients";
import type { CreateClientInput } from "@/services/clients";
import type { Json } from "@/integrations/supabase/types";
import { useIsMounted } from "@/hooks/useSafeEffect";
import { useVoiceMachine } from "@/lib/voice/voiceWorkflowMachine";
import { createSafeRecognition } from "@/lib/voice/safeSpeechRecognition";
import { setTranscript, getTranscript, appendTranscript, resetTranscriptStore } from "@/lib/voice/voiceTranscriptStore";
import { sanitizeClientForDb } from "@/schema/sanitizeClient";

type Status            = 'prospect' | 'activé' | 'client actif' | 'perdu';
type StatutOpportunite = 'chaud' | 'tiède' | 'froid' | 'perdu' | 'gagné';
type Role              = 'patron' | 'manager' | 'salarié' | 'autre' | 'NC';
type Priorite          = 'haute' | 'moyenne' | 'basse';
type OffreCible        = 'Essentiel' | 'VIP trimestre' | 'VIP bimestriel' | 'À qualifier';
type CanalAcquisition  = 'terrain' | 'référence' | 'À qualifier';

interface FormData {
  name:               string;
  status:             Status;
  statut_opportunite: StatutOpportunite | "";
  priorite:           Priorite | "";
  role:               Role | "";
  phone:              string;
  email:              string;
  address:            string;
  offre_cible:        OffreCible | "";
  canal_acquisition:  CanalAcquisition | "";
  date_relance:       string;
  motif_objection:    string;
}

// ─── Référentiels ─────────────────────────────────────────────────────────────
const STATUSES: { value: Status; label: string; color: string }[] = [
  { value: "prospect",     label: "Prospect",     color: "#6366f1" },
  { value: "activé",       label: "Activé",       color: "#f59e0b" },
  { value: "client actif", label: "Client actif", color: "#10b981" },
  { value: "perdu",        label: "Perdu",        color: "#ef4444" },
];

const STATUTS_OPP: { value: StatutOpportunite; label: string; color: string }[] = [
  { value: "chaud",  label: "Chaud",  color: "#16a34a" },
  { value: "tiède",  label: "Tiède",  color: "#2563eb" },
  { value: "froid",  label: "Froid",  color: "#64748b" },
  { value: "gagné",  label: "Gagné",  color: "#059669" },
  { value: "perdu",  label: "Perdu",  color: "#ef4444" },
];

const ROLES: Role[] = ["patron", "manager", "salarié", "autre", "NC"];

const PRIORITES: { value: Priorite; color: string }[] = [
  { value: "haute",   color: "#ef4444" },
  { value: "moyenne", color: "#f59e0b" },
  { value: "basse",   color: "#64748b" },
];

const OFFRES: OffreCible[]       = ["Essentiel", "VIP trimestre", "VIP bimestriel", "À qualifier"];
const CANAUX: CanalAcquisition[] = ["terrain", "référence", "À qualifier"];

// ─── ChipGroup ────────────────────────────────────────────────────────────────
interface ChipGroupProps<T extends string> {
  options:  { value: T; label?: string; color: string }[];
  value:    T | "";
  onChange: (v: T) => void;
}
function ChipGroup<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{
              borderColor: o.color,
              background:  active ? o.color : "transparent",
              color:       active ? "#fff"   : o.color,
            }}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all">
            {o.label ?? o.value}
          </button>
        );
      })}
    </div>
  );
}

// ─── Parsing IA langage naturel ───────────────────────────────────────────────
function parseVoice(text: string): Partial<FormData> {
  const phoneMatch = text.match(/(\+?\d[\d\s.\-()]{6,})/);
  const emailMatch = text.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/i);

  let statut_opportunite: StatutOpportunite | "" = "";
  if (/c'est chaud|chaud|intéress|motiv|rdv|rendez.vous/i.test(text)) statut_opportunite = "chaud";
  else if (/tiède|à revoir|pas décidé|plus tard|dans\s+\d/i.test(text))  statut_opportunite = "tiède";
  else if (/signé|deal|accord|validé|gagné/i.test(text))                  statut_opportunite = "gagné";
  else if (/pas intéress|refus|perdu|froid/i.test(text))                  statut_opportunite = "perdu";

  let status: Status = "prospect";
  if (/activé|app installée|compte ouvert/i.test(text)) status = "activé";
  if (/client|payant|abonnement/i.test(text))           status = "client actif";
  if (/perdu|abandonné/i.test(text))                    status = "perdu";

  const cleaned = text
    .replace(phoneMatch?.[0] ?? "", "")
    .replace(emailMatch?.[0] ?? "", "")
    .split(/[,.\n]/)[0]
    .trim();

  return {
    name: cleaned, status, statut_opportunite,
    phone: phoneMatch?.[0].replace(/\s+/g, " ").trim() ?? "",
    email: emailMatch?.[0] ?? "",
    canal_acquisition: "terrain",
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EMPTY: FormData = {
  name: "", status: "prospect",
  statut_opportunite: "", priorite: "", role: "",
  phone: "", email: "", address: "",
  offre_cible: "", canal_acquisition: "terrain",
  date_relance: "", motif_objection: "",
};

export default function AddClientDialog({ open, onOpenChange, onSuccess }: Props) {
  const [form,        setForm]        = useState<FormData>(EMPTY);
  const [nameError,   setNameError]   = useState("");
  const [more,        setMore]        = useState(true);
  const [dictating,   setDictating]   = useState(false);
  const [interimText, setInterimText] = useState("");
  const [dictationError, setDictationError] = useState("");
  const [transcriptionPreview, setTranscriptionPreview] = useState("");
  const [showReview,  setShowReview]  = useState(false);
  const recogRef         = useRef<SpeechRecognition | null>(null);
  const dictTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationLockRef  = useRef(false);
  const mounted          = useIsMounted();
  const vm               = useVoiceMachine();

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recogRef.current) {
        try { recogRef.current.stop(); } catch { /* already stopped */ }
      }
      if (dictTimerRef.current) {
        clearTimeout(dictTimerRef.current);
        dictTimerRef.current = null;
      }
    };
  }, []);

  const mutation = useCreateClient({
    onSuccess: () => {
      if (!mounted.current) return;
      toast.success("Prospect ajouté ✓");
      setForm(EMPTY);
      setNameError("");
      setMore(false);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e: Error) => {
      if (!mounted.current) return;
      toast.error(e.message ?? "Erreur lors de la création");
    },
  });

  const safeOnOpenChange = (nextOpen: boolean) => {
    const closingBlocked = mutation.isPending || dictating || mutationLockRef.current;
    if (!nextOpen && closingBlocked) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mounted.current) return;
    if (!form.name.trim()) { setNameError("Le nom est requis"); return; }
    if (mutationLockRef.current) return;
    setDictationError("");
    mutation.mutate(toPayload(form));
  };

  const set = (field: keyof FormData, value: string) => {
    if (!mounted.current) return;
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "name" && value.trim()) setNameError("");
  };

  const toPayload = (f: FormData): CreateClientInput => ({
    name:               f.name.trim()         || null,
    status:             f.status,
    statut_opportunite: f.statut_opportunite  || null,
    priorite:           f.priorite            || null,
    role:               f.role                || null,
    phone:              f.phone.trim()        || null,
    email:              f.email.trim()        || null,
    address:            f.address.trim()      || null,
    offre_cible:        f.offre_cible         || null,
    canal_acquisition:  f.canal_acquisition   || null,
    date_relance:       f.date_relance.trim() || null,
    motif_objection:    f.motif_objection.trim() || null,
  });

  // ── Dictée vocale ────────────────────────────────────────────────────────
  const handleDictation = () => {
    const testSR = (window as any).__TEST_SPEECH__ as any | undefined;
    const SR = testSR || (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Dictée vocale non disponible"); return; }
    if (dictating) { recogRef.current?.stop(); return; }

    const rec = new SR();
    recogRef.current = rec;
    rec.lang = "fr-FR"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    const finalRef = { current: "" };

    rec.onstart = () => {
      if (!mounted.current) return;
      setDictationError("");
      setDictating(true);
      setShowReview(false);
      resetTranscriptStore();
      dictTimerRef.current = window.setTimeout(() => {
        if (!mounted.current) return;
        rec.stop();
      }, 30_000);
    };

    rec.onresult = (ev: any) => {
      if (!mounted.current) return;
      let fp = "";
      let ip = "";
      const results = Array.from(ev.results as any[]);
      results.forEach((r: any, idx: number) => {
        const transcriptPart = r?.[0]?.transcript ?? "";
        const isFinal =
          typeof r?.isFinal === "boolean"
            ? r.isFinal
            : results.length === 1
              ? idx === 0
              : idx > 0;

        if (isFinal) fp += transcriptPart + " ";
        else ip += transcriptPart;
      });

      const nextPreview = (fp + ip).trim();
      finalRef.current = fp.trim();

      setInterimText(nextPreview);
      setTranscriptionPreview(nextPreview);

      if (finalRef.current) {
        const parsed = parseVoice(finalRef.current);
        setForm((prev) => ({
          ...prev,
          name: parsed.name || prev.name,
          status: parsed.status ?? prev.status,
          statut_opportunite: parsed.statut_opportunite ?? prev.statut_opportunite,
          phone: parsed.phone || prev.phone,
          email: parsed.email || prev.email,
          canal_acquisition: parsed.canal_acquisition || prev.canal_acquisition,
        }));
      }
    };

    rec.onend = () => {
      if (!mounted.current) return;
      setDictating(false);
      setInterimText("");
      if (dictTimerRef.current) { clearTimeout(dictTimerRef.current); dictTimerRef.current = null; }
      const text = finalRef.current;
      if (!text) return;

      const parsed = parseVoice(text);
      setTranscriptionPreview(text);
      setForm(prev => ({
        ...prev,
        name:               parsed.name               || prev.name,
        status:             parsed.status             ?? prev.status,
        statut_opportunite: parsed.statut_opportunite ?? prev.statut_opportunite,
        phone:              parsed.phone              || prev.phone,
        email:              parsed.email              || prev.email,
        canal_acquisition:  parsed.canal_acquisition  || prev.canal_acquisition,
      }));
      setShowReview(true);
      toast.info("Champs pré-remplis — vérifiez et confirmez avant enregistrement.");
    };

    rec.onerror = (ev: any) => {
      if (!mounted.current) return;
      if (ev.error === "not-allowed") {
        setDictationError("Erreur de dictee : micro refusé");
      } else if (ev.error !== "no-speech") {
        setDictationError("Erreur de dictee : micro non accessible");
      }
      toast.error("Erreur de dictee");
      setDictating(false);
      setInterimText("");
      if (dictTimerRef.current) { clearTimeout(dictTimerRef.current); dictTimerRef.current = null; }
    };
    rec.start();
  };

  return (
    <Dialog open={open} onOpenChange={safeOnOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Nouveau prospect</DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire d&apos;ajout d&apos;un prospect terrain
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* Nom établissement */}
          <div className="space-y-1">
            <Label htmlFor="name">Nom établissement <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input
                id="name"
                aria-label="Nom"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="Le Comptoir, Brasserie du Marché…"
                className={nameError ? "border-destructive" : ""}
                disabled={mutation.isPending}
                autoFocus
              />
              <Button type="button" variant="outline" size="icon"
                className={dictating ? "border-red-400 text-red-500 animate-pulse" : ""}
                onClick={handleDictation} disabled={mutation.isPending}
                title="Dicter">
                <span className="sr-only">Dicter les champs</span>
                {dictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            {dictationError && (
              <p className="text-xs text-destructive" role="alert">
                {dictationError}
              </p>
            )}
            {transcriptionPreview && (
              <p className="text-xs text-muted-foreground">
                Transcription: {transcriptionPreview.slice(0, 80)}
              </p>
            )}
            {dictating && (
              <p className="text-xs text-muted-foreground animate-pulse">
                {interimText || "🎙 Parle… nom, statut, opportunité détectés"}
              </p>
            )}
            {showReview && !dictating && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 mt-1">
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span>Champs pré-remplis par dictée — vérifiez avant d'enregistrer.</span>
              </div>
            )}
          </div>

          {/* Statut + Opportunité + Priorité + Rôle */}
          <div className="space-y-1">
            <Label>Statut</Label>
            <ChipGroup<Status>
              options={STATUSES}
              value={form.status}
              onChange={v => set("status", v)}
            />
          </div>

          <div className="space-y-1">
            <Label>Opportunité</Label>
            <ChipGroup<StatutOpportunite>
              options={STATUTS_OPP}
              value={form.statut_opportunite}
              onChange={v => set("statut_opportunite", v)}
            />
          </div>

          <div className="space-y-1">
            <Label>Priorité</Label>
            <ChipGroup<Priorite>
              options={PRIORITES.map(p => ({ value: p.value, label: p.value, color: p.color }))}
              value={form.priorite}
              onChange={v => set("priorite", v)}
            />
          </div>

          <div className="space-y-1">
            <Label>Rôle</Label>
            <div className="flex flex-wrap gap-1">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => set("role", r)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    form.role === r
                      ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                      : "border-black/20 text-[#1a1a2e]/60"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Champs optionnels */}
          <button type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMore(v => !v)}>
            {more ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {more ? "Masquer les détails" : "Contact, adresse, offre, objection…"}
          </button>

          {more && (
            <div className="space-y-3 border-t pt-3">

              <div className="space-y-1">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address}
                  onChange={e => set("address", e.target.value)}
                  placeholder="12 rue de la Roquette" disabled={mutation.isPending} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    aria-label="Téléphone"
                    value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                    placeholder="+33 6…"
                    disabled={mutation.isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    aria-label="Email"
                    value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="contact@…"
                    disabled={mutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="date_relance">Date relance</Label>
                <Input id="date_relance" value={form.date_relance}
                  onChange={e => set("date_relance", e.target.value)}
                  placeholder="JJ/MM/AAAA ou NC" disabled={mutation.isPending} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Offre cible</Label>
                  <div className="flex flex-col gap-1">
                    {OFFRES.map(o => (
                      <button key={o} type="button" onClick={() => set("offre_cible", o)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border text-left transition-all ${
                          form.offre_cible === o
                            ? "bg-[#004878] text-white border-[#004878]"
                            : "border-black/15 text-[#1a1a2e]/60"
                        }`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Canal</Label>
                  <div className="flex flex-col gap-1">
                    {CANAUX.map(c => (
                      <button key={c} type="button" onClick={() => set("canal_acquisition", c)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border text-left transition-all ${
                          form.canal_acquisition === c
                            ? "bg-[#60A830] text-white border-[#60A830]"
                            : "border-black/15 text-[#1a1a2e]/60"
                        }`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="motif">Motif / objection</Label>
                <Input id="motif" value={form.motif_objection}
                  onChange={e => set("motif_objection", e.target.value)}
                  placeholder="Prix, pas le moment, déjà équipé…" disabled={mutation.isPending} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1"
              onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={mutation.isPending}
              data-testid="client-submit"
            >
              {mutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
                : "Creer le client"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
