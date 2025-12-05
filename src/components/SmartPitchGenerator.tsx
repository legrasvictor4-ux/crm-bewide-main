import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SmartPitchGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pitch, setPitch] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [location, setLocation] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const generatePitch = async () => {
    if (!restaurantName.trim()) {
      toast({
        title: "Nom requis",
        description: "Entrez le nom du restaurant",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setPitch(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-pitch', {
        body: { 
          restaurantName,
          location,
          socialMediaData: null,
          visualAnalysis: null
        }
      });

      if (error) throw error;

      if (data?.pitch) {
        setPitch(data.pitch);
        toast({
          title: "✨ Pitch généré",
          description: "Votre pitch personnalisé est prêt",
        });
      }
    } catch (error) {
      console.error('Pitch generation error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le pitch",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    toast({
      title: "Copié",
      description: "Texte copié dans le presse-papiers",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-accent rounded-xl">
            <Sparkles className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Smart Pitch Generator
            </h3>
            <p className="text-sm text-muted-foreground">
              L'IA analyse le profil du restaurant et génère un pitch de vente ultra-personnalisé 
              avec arguments sur-mesure, objections anticipées et CTA optimisé.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Nom du restaurant *
            </label>
            <Input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Ex: Le Comptoir du Renne"
              className="bg-background"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Localisation (optionnel)
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: 11ème arrondissement"
              className="bg-background"
            />
          </div>

          <Button
            onClick={generatePitch}
            disabled={isGenerating}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer le pitch IA
              </>
            )}
          </Button>
        </div>
      </Card>

      {isGenerating && (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-accent animate-pulse" />
          <p className="text-lg font-medium text-foreground">
            L'IA crée votre pitch personnalisé...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Analyse du profil, génération des arguments, anticipation des objections...
          </p>
        </Card>
      )}

      {pitch && (
        <div className="space-y-4">
          {/* Hook */}
          <Card className="p-6 bg-gradient-to-r from-accent/20 to-primary/10 border-accent/40">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h4 className="font-bold text-lg text-foreground">🎯 Accroche</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(pitch.hook, 'hook')}
              >
                {copiedSection === 'hook' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-lg text-foreground font-medium leading-relaxed">
              "{pitch.hook}"
            </p>
          </Card>

          {/* Pain Points */}
          <Card className="p-6">
            <h4 className="font-bold text-lg text-foreground mb-4">💡 Points de Douleur & Solutions</h4>
            <div className="space-y-4">
              {pitch.painPoints.map((point: any, idx: number) => (
                <div key={idx} className="border-l-4 border-accent pl-4 py-2">
                  <p className="font-semibold text-foreground mb-1">❌ {point.problem}</p>
                  <p className="text-sm text-muted-foreground">✅ {point.solution}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* USPs */}
          <Card className="p-6">
            <h4 className="font-bold text-lg text-foreground mb-4">⭐ Arguments Uniques</h4>
            <ul className="space-y-3">
              {pitch.uniqueSellingPoints.map((point: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-accent font-bold text-xl">→</span>
                  <span className="text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Social Proof & ROI */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-3">📊 Preuve Sociale</h4>
              <p className="text-sm text-foreground">{pitch.socialProof}</p>
            </Card>
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-3">💰 ROI Estimé</h4>
              <p className="text-sm text-foreground">{pitch.estimatedROI}</p>
            </Card>
          </div>

          {/* Conversation Starters */}
          <Card className="p-6">
            <h4 className="font-bold text-lg text-foreground mb-4">💬 Questions d'Ouverture</h4>
            <ul className="space-y-2">
              {pitch.conversationStarters.map((question: string, idx: number) => (
                <li key={idx} className="text-foreground p-3 bg-secondary rounded-lg">
                  <span className="font-semibold text-accent">{idx + 1}.</span> {question}
                </li>
              ))}
            </ul>
          </Card>

          {/* Objection Handling */}
          <Card className="p-6">
            <h4 className="font-bold text-lg text-foreground mb-4">🛡️ Réponses aux Objections</h4>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground mb-1">💸 "C'est trop cher"</p>
                <p className="text-sm text-muted-foreground pl-4">{pitch.objectionHandling.price}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">⏰ "Je n'ai pas le temps"</p>
                <p className="text-sm text-muted-foreground pl-4">{pitch.objectionHandling.timing}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">🤝 "J'ai déjà une agence"</p>
                <p className="text-sm text-muted-foreground pl-4">{pitch.objectionHandling.current_agency}</p>
              </div>
            </div>
          </Card>

          {/* CTA & Offer */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6 bg-gradient-to-br from-accent/20 to-accent/10">
              <h4 className="font-bold text-foreground mb-3">🎁 Offre Personnalisée</h4>
              <p className="text-foreground font-medium">{pitch.personalizedOffer}</p>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-primary/20 to-primary/10">
              <h4 className="font-bold text-foreground mb-3">🚀 Call-to-Action</h4>
              <p className="text-foreground font-medium">{pitch.callToAction}</p>
            </Card>
          </div>

          {/* Confidence Score */}
          <Card className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Score de confiance IA</p>
            <div className="text-3xl font-bold text-accent">
              {pitch.confidence}/10
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SmartPitchGenerator;
