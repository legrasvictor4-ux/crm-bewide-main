import { useState } from "react";
import { Mic, Calendar, Map, Users, TrendingUp, Clock, Sparkles, Zap, ArrowRight, FileSpreadsheet } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import ProspectionList from "@/components/ProspectionList";
import ExcelUpload from "@/components/ExcelUpload";
import StatsCard from "@/components/StatsCard";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AIChatWidget from "@/components/AIChatWidget";

const Index = () => {
  const [showRecorder, setShowRecorder] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowExcelUpload(false);
  };

  return (
    <>
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">BeWide AI</h1>
                <p className="text-xs text-muted-foreground">CRM Prospection</p>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <Link to="/agenda" className="nav-link flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Agenda</span>
              </Link>
              <Link to="/map" className="nav-link flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Carte</span>
              </Link>
              <Link to="/pro-tools">
                <Button variant="outline" size="sm" className="gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Pro Tools</span>
                </Button>
              </Link>
              <Link to="/ai-features">
                <Button size="sm" className="gap-2 shadow-lg shadow-accent/25">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Powers</span>
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard icon={Users} label="Prospections" value="24" trend="+12%" trendUp />
          <StatsCard icon={Calendar} label="RDV confirmés" value="8" trend="+25%" trendUp />
          <StatsCard icon={Clock} label="À relancer" value="5" trend="-8%" trendUp={false} />
          <StatsCard icon={TrendingUp} label="Conversion" value="33%" trend="+5%" trendUp />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProspectionList refreshTrigger={refreshTrigger} />
          </div>
          
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowExcelUpload(true)}
                  className="w-full btn-primary flex items-center justify-center gap-3"
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  Importer un fichier Excel
                </button>
                <button
                  onClick={() => setShowRecorder(true)}
                  className="w-full btn-secondary flex items-center justify-center gap-3"
                >
                  <Mic className="h-5 w-5" />
                  Nouvelle prospection vocale
                </button>
                <Link to="/map" className="block">
                  <button className="w-full btn-secondary flex items-center justify-center gap-3">
                    <Map className="h-5 w-5" />
                    Planifier un parcours
                  </button>
                </Link>
              </div>
            </div>

            {/* Today's Agenda */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Aujourd'hui</h3>
                <Link to="/agenda" className="text-accent text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Voir tout <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                <Link to="/agenda" className="block">
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="text-sm font-bold text-accent">11:00</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Le Comptoir du Renne</p>
                      <p className="text-xs text-muted-foreground">3ème arr. - RDV avec la patronne</p>
                    </div>
                    <span className="badge-success text-xs px-2 py-1 rounded-lg">RDV</span>
                  </div>
                </Link>
                <Link to="/agenda" className="block">
                  <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="text-sm font-bold text-accent">14:30</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Zone 11ème arr.</p>
                      <p className="text-xs text-muted-foreground">5 prospections à faire</p>
                    </div>
                    <span className="badge-accent text-xs px-2 py-1 rounded-lg">Terrain</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal */}
      {showRecorder && (
        <VoiceRecorder onClose={() => setShowRecorder(false)} />
      )}

      {/* Excel Upload Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExcelUpload(false)}>
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <ExcelUpload onImportSuccess={handleImportSuccess} />
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowExcelUpload(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AIChatWidget />
    </main>
    </>
  );
};

export default Index;