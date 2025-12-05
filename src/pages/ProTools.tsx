import { ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SmartDialQueue from "@/components/SmartDialQueue";
import AutoLogActivity from "@/components/AutoLogActivity";
import ProspectEnricher from "@/components/ProspectEnricher";
import SmartSearch from "@/components/SmartSearch";
import CallWindowOptimizer from "@/components/CallWindowOptimizer";
import SpeedProspecting from "@/components/SpeedProspecting";
import ProspectScanner from "@/components/ProspectScanner";

const ProTools = () => {
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
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Pro Tools</h1>
                <p className="text-sm text-muted-foreground">Outils de prospection avancés</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="dial-queue" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-8 h-auto">
            <TabsTrigger value="dial-queue" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">📞</span>
              <span className="text-xs">Smart Dial</span>
            </TabsTrigger>
            <TabsTrigger value="auto-log" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">📝</span>
              <span className="text-xs">Auto-Log</span>
            </TabsTrigger>
            <TabsTrigger value="enricher" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">✨</span>
              <span className="text-xs">Enrichir</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">🧠</span>
              <span className="text-xs">Recherche</span>
            </TabsTrigger>
            <TabsTrigger value="windows" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">⏰</span>
              <span className="text-xs">Créneaux</span>
            </TabsTrigger>
            <TabsTrigger value="speed" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">⚡</span>
              <span className="text-xs">Speed</span>
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex flex-col items-center gap-1 py-3">
              <span className="text-lg">🔍</span>
              <span className="text-xs">Scanner</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dial-queue"><SmartDialQueue /></TabsContent>
          <TabsContent value="auto-log"><AutoLogActivity /></TabsContent>
          <TabsContent value="enricher"><ProspectEnricher /></TabsContent>
          <TabsContent value="search"><SmartSearch /></TabsContent>
          <TabsContent value="windows"><CallWindowOptimizer /></TabsContent>
          <TabsContent value="speed"><SpeedProspecting /></TabsContent>
          <TabsContent value="scanner"><ProspectScanner /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProTools;
