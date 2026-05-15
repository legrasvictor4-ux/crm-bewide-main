import { useMemo, useState } from "react";
import {
  Mic,
  Map,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Plus,
} from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import ProspectionList from "@/components/ProspectionList";
import ExcelUpload from "@/components/ExcelUpload";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ActionBar from "@/components/ActionBar";
import AddClientDialog from "@/components/AddClientDialog";
import { useClients } from "@/hooks/use-clients";

const StatCard = ({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-primary font-medium mt-0.5">{sub}</p>}
    </div>
  </div>
);

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

  const { data: clients = [], isLoading: clientsLoading } = useClients({
    filter: "all",
  });

  const stats = useMemo(() => {
    const total = clients.length;
    const newCount = clients.filter((c) => c.status === "new").length;
    const pending = clients.filter((c) => c.status === "pending").length;
    const success = clients.filter((c) => c.status === "success").length;
    const lost = clients.filter((c) => c.status === "lost").length;
    const toRecontact = clients.filter((c) => c.status === "to_recontact").length;
    const convRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const avgScore =
      total > 0
        ? Math.round(clients.reduce((s, c) => s + (c.lead_score ?? 0), 0) / total)
        : 0;
    return { total, newCount, pending, success, lost, toRecontact, convRate, avgScore };
  }, [clients]);

  const handleImportSuccess = () => {
    setRefreshTrigger((p) => p + 1);
    setShowExcelUpload(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Barre d'actions */}
      <div className="sticky top-[57px] z-30 bg-card border-b border-border">
        <div className="px-4 py-3 lg:px-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Tableau de bord</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Vue d'ensemble du pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setShowExcelUpload(true)} className="gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Importer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRecorder(true)} className="gap-1.5">
                <Mic className="h-3.5 w-3.5" />
                Dictée
              </Button>
              <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Ajouter
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

      <div className="px-4 py-5 lg:px-6 space-y-6">
        {/* KPI cards — données réelles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          <StatCard
            label="Total clients"
            value={clientsLoading ? "—" : stats.total}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Nouveaux"
            value={clientsLoading ? "—" : stats.newCount}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            label="En attente"
            value={clientsLoading ? "—" : stats.pending}
            icon={<RefreshCcw className="h-5 w-5" />}
          />
          <StatCard
            label="Convertis"
            value={clientsLoading ? "—" : stats.success}
            icon={<CheckCircle2 className="h-5 w-5" />}
            sub={stats.total > 0 ? `${stats.convRate}% taux de conversion` : undefined}
          />
          <StatCard
            label="À recontacter"
            value={clientsLoading ? "—" : stats.toRecontact}
            icon={<RefreshCcw className="h-5 w-5" />}
          />
          <StatCard
            label="Perdus"
            value={clientsLoading ? "—" : stats.lost}
            icon={<XCircle className="h-5 w-5" />}
          />
          <StatCard
            label="Score moyen"
            value={clientsLoading ? "—" : stats.avgScore > 0 ? `${stats.avgScore}/100` : "—"}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
            <Link to="/map" className="flex items-center gap-4 w-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Map className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Carte</p>
                <p className="text-[11px] text-primary font-medium mt-0.5">Voir le territoire →</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Liste de prospections */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Prospections</h2>
          <ProspectionList
            refreshTrigger={refreshTrigger}
            minScore={minScore}
            sortByScore={sortByScore}
            search={search}
          />
        </div>
      </div>

      {showRecorder && <VoiceRecorder onClose={() => setShowRecorder(false)} />}

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => setRefreshTrigger((r) => r + 1)}
      />

      {showExcelUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowExcelUpload(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
    </div>
  );
};

export default Index;
