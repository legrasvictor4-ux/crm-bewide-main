import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Mic } from "lucide-react";

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
}

const AddClientDialog = ({ open, onOpenChange, onSuccess }: AddClientDialogProps) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    phone_number: "",
    email: "",
    description: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});
  const [isDictating, setIsDictating] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create client');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Client créé avec succès');
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // Reset form
      setFormData({
        name: "",
        phone_number: "",
        email: "",
        description: "",
      });
      setErrors({});
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création du client');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.phone_number || formData.phone_number.trim().length === 0) {
      newErrors.phone_number = 'Le numéro de téléphone est requis';
    }

    if (formData.email && formData.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Email invalide';
      }
    }

    if (formData.description && formData.description.length > 10000) {
      newErrors.description = 'La description doit faire moins de 10000 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    mutation.mutate(formData);
  };

  const handleDictation = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Dictée vocale non disponible sur ce navigateur");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(" ");
      // Simple heuristic: try to extract phone and email
      const phoneMatch = transcript.match(/((\\+\\d{1,3})?\\s?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2}[\\s.-]?\\d{2})/);
      const emailMatch = transcript.match(/[\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,}/);
      const name = transcript.split(",")[0] || transcript;
      setFormData((prev) => ({
        ...prev,
        name: prev.name || name.trim(),
        phone_number: phoneMatch ? phoneMatch[0] : prev.phone_number,
        email: emailMatch ? emailMatch[0] : prev.email,
        description: prev.description || transcript,
      }));
    };
    recognition.start();
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un client</DialogTitle>
          <DialogDescription>
            Créez un nouveau client dans votre base de prospection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nom du client"
                className={errors.name ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">
                Numéro de téléphone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className={errors.phone_number ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="client@example.com"
                className={errors.email ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Notes ou description du client..."
                className={errors.description ? 'border-destructive' : ''}
                rows={4}
                disabled={mutation.isPending}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDictation} disabled={isDictating || mutation.isPending}>
                <Mic className="h-4 w-4" />
                {isDictating ? "Dictée en cours..." : "Dicter les champs"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;

