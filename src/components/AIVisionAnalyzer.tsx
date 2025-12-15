import { useState, useRef } from "react";
import { Camera, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AIVisionAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  type AnalysisResult = Record<string, unknown>;
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-restaurant-image', {
        body: { imageBase64 }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast({
          title: "✨ Analyse terminée",
          description: "L'IA a analysé votre photo avec succès",
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'analyser l'image",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-success";
    if (score >= 6) return "text-warning";
    return "text-destructive";
  };

  const getGradeEmoji = (score: number) => {
    if (score >= 9) return "🏆";
    if (score >= 8) return "⭐";
    if (score >= 7) return "👍";
    if (score >= 6) return "👌";
    if (score >= 5) return "🤔";
    return "⚠️";
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent rounded-xl">
            <Camera className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-2">
              AI Vision Restaurant Analyzer
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Prends une photo de la devanture, l'IA analyse TOUT : standing, propreté, présence digitale, 
              potentiel commercial et génère une stratégie d'approche personnalisée.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="bg-accent hover:bg-accent/90"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Prendre une photo
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {imagePreview && (
        <Card className="p-4">
          <img 
            src={imagePreview} 
            alt="Restaurant" 
            className="w-full rounded-lg shadow-md"
          />
        </Card>
      )}

      {isAnalyzing && (
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-accent animate-pulse" />
          <p className="text-lg font-medium text-foreground">
            L'IA analyse votre photo...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Standing, propreté, digital, potentiel, stratégie...
          </p>
        </Card>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Quick Summary */}
          <Card className="p-6 bg-gradient-to-r from-accent/20 to-primary/10">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-accent mt-1" />
              <div>
                <h4 className="font-bold text-lg text-foreground mb-2">Résumé Express</h4>
                <p className="text-foreground">{analysis.quickSummary}</p>
              </div>
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl mb-2">{getGradeEmoji(analysis.standingScore)}</div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.standingScore)}`}>
                {analysis.standingScore}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">Standing</p>
              <p className="text-sm font-medium text-foreground capitalize mt-1">
                {analysis.standing}
              </p>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-2xl mb-2">{getGradeEmoji(analysis.cleanlinessScore)}</div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.cleanlinessScore)}`}>
                {analysis.cleanlinessScore}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">Propreté</p>
              <p className="text-sm font-medium text-foreground capitalize mt-1">
                {analysis.cleanliness}
              </p>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-2xl mb-2">{getGradeEmoji(analysis.digitalPresence.score)}</div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.digitalPresence.score)}`}>
                {analysis.digitalPresence.score}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">Digital</p>
              <p className="text-sm font-medium text-foreground mt-1">
                {analysis.digitalPresence.visible ? "Présent" : "Absent"}
              </p>
            </Card>

            <Card className="p-4 text-center bg-gradient-to-br from-accent/20 to-accent/10">
              <div className="text-2xl mb-2">💰</div>
              <div className={`text-3xl font-bold ${getScoreColor(analysis.conversionPotential)}`}>
                {analysis.conversionPotential}/10
              </div>
              <p className="text-xs text-muted-foreground mt-1">Potentiel</p>
              <p className="text-sm font-medium text-foreground capitalize mt-1">
                {analysis.estimatedBudget}
              </p>
            </Card>
          </div>

          {/* Approach Strategy */}
          <Card className="p-6">
            <h4 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Stratégie d'Approche Recommandée
            </h4>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ton à adopter</p>
                  <p className="text-foreground font-semibold capitalize">{analysis.suggestedApproach.tone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meilleur moment</p>
                  <p className="text-foreground font-semibold capitalize">{analysis.suggestedApproach.timing}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Personne à contacter</p>
                  <p className="text-foreground font-semibold capitalize">
                    {analysis.suggestedApproach.contactPerson.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Audience cible</p>
                  <p className="text-foreground font-semibold capitalize">{analysis.targetAudience}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Arguments clés</p>
                <ul className="space-y-2">
                  {analysis.suggestedApproach.keyPoints.map((point: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold">→</span>
                      <span className="text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Strengths & Opportunities */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-3">✅ Avantages Compétitifs</h4>
              <ul className="space-y-2">
                {analysis.competitiveAdvantages.map((adv: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-success">•</span>
                    {adv}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-3">💡 Opportunités d'Amélioration</h4>
              <ul className="space-y-2">
                {analysis.improvementOpportunities.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-warning">•</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVisionAnalyzer;
