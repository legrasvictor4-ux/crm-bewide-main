import { ArrowLeft, Sparkles, Phone, FolderUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIVisionAnalyzer from "@/components/AIVisionAnalyzer";
import SmartPitchGenerator from "@/components/SmartPitchGenerator";
import AICallAnalysis from "@/components/AICallAnalysis";

const AIFeatures = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Superpowers</h1>
                <p className="text-sm text-muted-foreground">
                  Fonctionnalités IA révolutionnaires
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="vision" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger value="vision" className="flex items-center gap-2">
              <span className="text-lg">📸</span>
              Vision AI
            </TabsTrigger>
            <TabsTrigger value="pitch" className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              Smart Pitch
            </TabsTrigger>
            <TabsTrigger value="prediction" className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Prédiction
            </TabsTrigger>
            <TabsTrigger value="call-analysis" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Analyse d'appels
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vision" className="space-y-6">
            <AIVisionAnalyzer />
          </TabsContent>

          <TabsContent value="pitch" className="space-y-6">
            <SmartPitchGenerator />
          </TabsContent>

          <TabsContent value="prediction" className="mt-6">
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-medium mb-4">Prédictions avancées</h3>
              <p className="text-muted-foreground">
                Fonctionnalité de prédiction à venir. Bientôt disponible !
              </p>
            </div>
          </TabsContent>

          <TabsContent value="call-analysis" className="mt-2">
            <AICallAnalysis />
          </TabsContent>

          <TabsContent value="assistant" className="space-y-6">
            <div className="text-center p-12 bg-card rounded-xl border border-border">
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-accent" />
              <h3 className="text-2xl font-bold text-foreground mb-2">
                AI Assistant Temps Réel
              </h3>
              <p className="text-muted-foreground">
                L'IA écoute tes conversations et te suggère des arguments en direct pendant la prospection
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AIFeatures;
