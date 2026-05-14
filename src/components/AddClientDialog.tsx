import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Mic, MicOff, Activity } from "lucide-react";
import { toast } from "sonner";
import { useCreateClient } from "@/hooks/use-clients";
import type { CreateClientInput } from "@/services/clients";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ClientFormData {
  name: string;
  phone_number: string;
  email: string;
  description: string;
  city: string;
  districtType: "arrondissement" | "quartier" | null;
  arrondissementNumber?: number | null;
  districtName?: string | null;
}

const arrondissementCities: Record<string, number> = {
  paris: 20,
  lyon: 9,
  marseille: 16,
};

const AddClientDialog = ({ open, onOpenChange, onSuccess }: AddClientDialogProps) => {
  const initialData = useMemo<ClientFormData>(
    () => ({
      name: "",
      phone_number: "",
      email: "",
      description: "",
      city: "",
      districtType: null,
      arrondissementNumber: null,
      districtName: null,
    }),
    []
  );

  type SpeechRecognitionType = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
    start: () => void;
  };

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [isDictating, setIsDictating] = useState(false);
  const [dictationMessage, setDictationMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const arrondissementCount =
    arrondissementCities[formData.city.trim().toLowerCase()] || 0;
  const arrondissementList = arrondissementCount
    ? Array.from({ length: arrondissementCount }, (_, idx) => idx + 1)
    : [];

  const mutation = useCreateClient({
    onSuccess: () => {
      toast.success("Client cree avec succes");
      setFormData(initialData);
      setErrors({});
      setDictationMessage(null);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error & { validationErrors?: string[] }) => {
      if (error.validationErrors && error.validationErrors.length > 0) {
        const mapped: Partial<Record<keyof ClientFormData, string>> = {};
        error.validationErrors.forEach((msg) => {
          if (msg.includes("name")) mapped.name = "Le nom est requis";
          if (msg.includes("phone_number")) mapped.phone_number = "Le numero de telephone est requis";
          if (msg.includes("email")) mapped.email = "Email invalide";
        });
        setErrors(mapped);
      }
      toast.error(error.message || "Erreur lors de la creation du client");
    },
  });

  const detectDistrictType = (city: string): ClientFormData["districtType"] => {
    const key = city.trim().toLowerCase();
    if (arrondissementCities[key]) return "arrondissement";
    if (key.length === 0) return null;
    return "quartier";
  };

  const toPayload = (data: ClientFormData): CreateClientInput => ({
    last_name: data.name.trim(),
    phone: data.phone_number.trim() || null,
    email: data.email.trim() || null,
    status: "new",
    notes: [
      data.description?.trim() || null,
      data.city ? `Ville : ${data.city}` : null,
      data.districtType === "arrondissement" && data.arrondissementNumber
        ? `Arrondissement : ${data.arrondissementNumber}`
        : data.districtType === "quartier" && data.districtName
        ? `Quartier : ${data.districtName}`
        : null,
    ].filter(Boolean).join("\n") || null,
    metadata: {
      city: data.city?.trim() || null,
      districtType: data.districtType,
      districtName: data.districtName || null,
      arrondissementNumber: data.arrondissementNumber || null,
    },
  });

  const validateForm = (data: ClientFormData = formData): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!data.name || data.name.trim().length === 0) {
      newErrors.name = "Le nom est requis";
    }

    if (!data.phone_number || data.phone_number.trim().length === 0) {
      newErrors.phone_number = "Le numero de telephone est requis";
    }

    if (data.email && data.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        newErrors.email = "Email invalide";
      }
    }

    if (!data.city || data.city.trim().length === 0) {
      newErrors.city = "La ville est requise";
    }

    if (data.districtType === "arrondissement" && !data.arrondissementNumber) {
      newErrors.arrondissementNumber = "Choisissez un arrondissement";
    }

    if (data.description && data.description.length > 10000) {
      newErrors.description = "La description doit faire moins de 10000 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate(toPayload(formData));
  };

  const parseTranscript = (text: string): Partial<ClientFormData> => {
    const phoneMatch = text.match(/(\+?\d[\d\s.-]{6,})/);
    const emailMatch = text.match(/[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    const cleanedPhone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, " ").replace(/\s+/g, " ").trim() : "";

    const sentences = text
      .split(/[,.;:]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const candidateName = sentences[0] || text;

    return {
      name: candidateName,
      phone_number: cleanedPhone || undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      description: text,
    };
  };

  const handleDictation = () => {
    const SpeechRecognition =
      (window as unknown as { __TEST_SPEECH__?: SpeechRecognitionType; webkitSpeechRecognition?: new () => SpeechRecognitionType; SpeechRecognition?: new () => SpeechRecognitionType })
        .__TEST_SPEECH__ ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionType }).webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionType }).SpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Dictee vocale non disponible sur ce navigateur");
      setDictationError("Micro non supporte par ce navigateur.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      setIsDictating(true);
      setDictationMessage("Ecoute en cours...");
      setDictationError(null);
      setTranscript("");
    };
    recognition.onend = () => {
      setIsDictating(false);
      setDictationMessage(null);
    };
    recognition.onerror = (event: { error?: string }) => {
      setIsDictating(false);
      setDictationMessage(null);
      setDictationError("Erreur de dictee. Reessaie.");
      if (event?.error === "not-allowed") {
        toast.error("Micro non autorise. Verifie les permissions.");
      }
    };
    recognition.onresult = (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => {
      const fullTranscript = Array.from(event.results)
        .map((r: { 0: { transcript: string } }) => r[0].transcript)
        .join(" ");
      setTranscript(fullTranscript);
      const parsed = parseTranscript(fullTranscript);
      setFormData((prev) => {
        const nextData: ClientFormData = {
          ...prev,
          name: parsed.name?.trim() || prev.name,
          phone_number: parsed.phone_number || prev.phone_number,
          email: parsed.email || prev.email,
          description: prev.description || parsed.description || "",
        };
        const ok = validateForm(nextData);
        if (ok && !mutation.isPending) {
          mutation.mutate(toPayload(nextData));
        } else {
          toast.error("Champs requis manquants apres dictee.");
        }
        return nextData;
      });
    };
    recognition.start();
  };

  const handleChange = (field: keyof ClientFormData, value: string | number | null) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value } as ClientFormData;
      if (field === "city") {
        const district = detectDistrictType(String(value));
        next.districtType = district;
        if (district !== "arrondissement") {
          next.arrondissementNumber = null;
        }
        if (district === "arrondissement") {
          next.districtName = null;
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] flex flex-col" aria-label="Ajouter un client">
        <DialogHeader className="shrink-0">
          <DialogTitle>Ajouter un client</DialogTitle>
          <DialogDescription>Créer un nouveau client dans votre base de prospection.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-3 py-3 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                data-testid="client-name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nom du client"
                className={errors.name ? "border-destructive" : ""}
                disabled={mutation.isPending}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">
                Numero de telephone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                data-testid="client-phone"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className={errors.phone_number ? "border-destructive" : ""}
                disabled={mutation.isPending}
                aria-invalid={!!errors.phone_number}
              />
              {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                data-testid="client-email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="client@example.com"
                className={errors.email ? "border-destructive" : ""}
                disabled={mutation.isPending}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                Ville <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Paris, Lyon, Marseille..."
                className={errors.city ? "border-destructive" : ""}
                disabled={mutation.isPending}
                aria-invalid={!!errors.city}
              />
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label>
                Arrondissement / Quartier
              </Label>
              {formData.districtType === "arrondissement" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-between w-full"
                    onClick={() => setPickerOpen(true)}
                  >
                    {formData.arrondissementNumber ? `Arrondissement ${formData.arrondissementNumber}` : "Choisir un arrondissement"}
                  </Button>
                  {errors.arrondissementNumber && <p className="text-sm text-destructive">{errors.arrondissementNumber}</p>}
                </>
              ) : (
                <Input
                  value={formData.districtName || ""}
                  onChange={(e) => handleChange("districtName", e.target.value)}
                  placeholder="Quartier (optionnel)"
                  disabled={mutation.isPending}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                data-testid="client-description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Notes ou description du client..."
                className={errors.description ? "border-destructive" : ""}
                rows={2}
                disabled={mutation.isPending}
                aria-invalid={!!errors.description}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDictation}
                disabled={isDictating || mutation.isPending}
                aria-pressed={isDictating}
                aria-label="Activer la dictee vocale"
              >
                {isDictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isDictating ? "Ecoute en cours..." : "Dicter les champs"}
              </Button>
              {dictationMessage && <p className="text-sm text-muted-foreground">{dictationMessage}</p>}
            </div>
            {(dictationMessage || dictationError || transcript) && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  {dictationMessage && <span>{dictationMessage}</span>}
                  {dictationError && <span className="text-destructive">{dictationError}</span>}
                </div>
                {transcript && (
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">Transcription :</span>{" "}
                    <span className="bg-accent/10 px-1 rounded">{transcript}</span>
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="client-submit">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                "Creer le client"
              )}
            </Button>
          </DialogFooter>
        </form>
        <Drawer open={pickerOpen} onOpenChange={setPickerOpen} shouldScaleBackground={false}>
          <DrawerContent className="pb-[max(var(--safe-bottom),16px)]">
            <DrawerHeader>
              <DrawerTitle>Choisir un arrondissement</DrawerTitle>
            </DrawerHeader>
            <div className="relative px-4">
              <div className="ios-wheel">
                <div className="ios-wheel-highlight" aria-hidden />
                {arrondissementList.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`ios-wheel-item w-full ${formData.arrondissementNumber === num ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                    onClick={() => {
                      handleChange("arrondissementNumber", num);
                      setPickerOpen(false);
                    }}
                  >
                    {num}e arrondissement
                  </button>
                ))}
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="ghost" className="h-[44px] w-full">
                  Fermer
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
