import { useState } from "react";
import { Mic, Map, Users, TrendingUp, Clock, Sparkles, ArrowRight, FileSpreadsheet, Download, LineChart } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import ProspectionList from "@/components/ProspectionList";
import ExcelUpload from "@/components/ExcelUpload";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ActionBar from "@/components/ActionBar";
import LeadScoreLegend from "@/components/LeadScoreLegend";
import AddClientDialog from "@/components/AddClientDialog";
import KpiCard from "@/components/dashboard/KpiCard";
import TrendLine from "@/components/dashboard/TrendLine";
import MiniBarChart from "@/components/dashboard/MiniBarChart";
import RadarChart from "@/components/dashboard/RadarChart";

const Index = () => {
  const navigate = useNavigate();
  const [showRecorder, setShowRecorder] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [minScore, setMinScore] = useState(0);
  const [sortByScore, setSortByScore] = useState(false);
  const [search, setSearch] = useState("");

  // Sample data; replace with live queries when available
  const kpiData = [
    { label: "Total Clients", value: "2 430", diff: "+8.2%", tone: "up" as const, icon: <Users className="h-4 w-4" /> },
    { label: "Lead Score moyen", value: "64", diff: "+3.1%", tone: "up" as const, icon: <TrendingUp className="h-4 w-4" /> },
    { label: "Nouveaux cette semaine", value: "58", diff: "+12", tone: "up" as const, icon: <Clock className="h-4 w-4" /> },
    { label: "Taux de conversion", value: "27%", diff: "-1.4%", tone: "down" as const, icon: <LineChart className="h-4 w-4" /> },
    { label: "Imports Excel", value: "12", diff: "+3", tone: "up" as const, icon: <Download className="h-4 w-4" /> },
  ];

  const trendData = [
    { label: "Lun", value: 22 }, // nouveaux leads/clients générés
    { label: "Mar", value: 28 },
    { label: "Mer", value: 35 },
    { label: "Jeu", value: 42 },
    { label: "Ven", value: 31 },
    { label: "Sam", value: 18 },
    { label: "Dim", value: 24 },
  ];

  const sourcesData = [
    { label: "Social (posts IA)", value: 48 },
    { label: "Prospection (scripts IA)", value: 22 },
    { label: "Référencement local", value: 18 },
    { label: "Email nurturing", value: 12 },
  ];

  const leadScoreData = [
    { label: "80-100", value: 32 },
    { label: "60-79", value: 54 },
    { label: "40-59", value: 67 },
    { label: "< 40", value: 18 },
  ];

  const browserData = [
    { label: "Social", value: 62 },
    { label: "Prospection", value: 28 },
    { label: "Référencement", value: 34 },
    { label: "Email", value: 22 },
  ];

  const platformData = [
    { label: "Desktop", value: 71 },
    { label: "Mobile", value: 23 },
    { label: "Tablet", value: 6 },
  ];

  const sessionData = [
    { label: "<1 min", value: 14 },
    { label: "1-3 min", value: 38 },
    { label: "3-10 min", value: 29 },
    { label: "10+ min", value: 19 },
  ];

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowExcelUpload(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Workspace Action Bar */}
      <div className="sticky top-16 z-30">
        <div className="bg-card backdrop-blur border border-border rounded-b-3xl shadow-md">
          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">Workspace Prospection</span>
                  <span className="text-xs text-muted-foreground leading-tight">Vue synthèse du pipeline et des actions rapides</span>
                </div>
              </div>
              <div className="flex items-stretch gap-2 w-full md:w-auto flex-wrap justify-stretch md:justify-end">
                <Button size="sm" variant="secondary" onClick={() => setShowExcelUpload(true)} className="gap-2 w-full md:w-auto">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import
                </Button>
                <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2 w-full md:w-auto">
                  <Sparkles className="h-4 w-4" /> Ajouter un client
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowRecorder(true)} className="gap-2 w-full md:w-auto">
                  <Mic className="h-4 w-4" /> Dictée
                </Button>
              </div>
            </div>
            <ActionBar
              onAdd={() => setShowAddDialog(true)}
              onImport={() => setShowExcelUpload(true)}
              onToggleMap={() => navigate("/map")}
              onSortLeadScore={() => setSortByScore((s) => !s)}
              onFilterLeadScore={(n) => setMinScore(n)}
              onClearLeadFilter={() => setMinScore(0)}
              viewMode={viewMode}
              setViewMode={setViewMode}
              search={search}
              setSearch={setSearch}
              minScore={minScore}
              sortByScore={sortByScore}
            />
          </div>
        </div>
      </div>

      <div className="page-shell py-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {kpiData.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} diff={kpi.diff} tone={kpi.tone} icon={kpi.icon} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TrendLine title="Évolution des clients" data={trendData} subtitle="7 derniers jours (leads/clients générés)" />
              <MiniBarChart title="Top canaux d'acquisition" data={sourcesData} />
              <MiniBarChart title="Répartition lead score" data={leadScoreData} />
            </div>

            <div className="flex items-center justify-between px-1 pb-4">
              <h2 className="text-xl font-bold text-foreground">Prospections</h2>
              <LeadScoreLegend />
            </div>
            <ProspectionList
              refreshTrigger={refreshTrigger}
              minScore={minScore}
              sortByScore={sortByScore}
              search={search}
            />
          </div>

          <div className="space-y-6">
            <RadarChart title="Efficacité des canaux" data={browserData} />
            <MiniBarChart title="Usage plateformes" data={platformData} />
            <MiniBarChart title="Durée des sessions" data={sessionData} />
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <Button className="w-full justify-center gap-3" onClick={() => setShowExcelUpload(true)}>
                  <FileSpreadsheet className="h-5 w-5" />
                  Importer un fichier Excel
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-3"
                  onClick={() => setShowRecorder(true)}
                >
                  <Mic className="h-5 w-5" />
                  Nouvelle prospection vocale
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-3"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Sparkles className="h-5 w-5" />
                  Ajouter un client
                </Button>
                <Link to="/map" className="block">
                  <Button variant="ghost" className="w-full justify-center gap-3">
                    <Map className="h-5 w-5" />
                    Planifier un parcours
                  </Button>
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

      {/* Add Client Dialog */}
      {showAddDialog && (
        <AddClientDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={() => setRefreshTrigger((r) => r + 1)} />
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

    </main>
  );
};

export default Index;
