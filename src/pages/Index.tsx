import { useMemo, useState } from "react";
import {
  Mic, Users, TrendingUp, Clock,
  FileSpreadsheet, CheckCircle2, XCircle, RefreshCcw, Plus, Search, X,
  Flame, Droplets, Snowflake, AlertTriangle, Euro,
} from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import ProspectionList from "@/components/ProspectionList";
import ExcelUpload from "@/components/ExcelUpload";
import { Button } from "@/components/ui/button";
import AddClientDialog from "@/components/AddClientDialog";
import { useClients } from "@/hooks/use-clients";

// ─── MRR estimé selon offre ──────────────────────────────────────────────────
const MRR_MAP: Record<string, number> = {
  "Essentiel":       39,
  "VIP trimestre":  250,
  "VIP bimestriel": 350,
};

// ─── Carte KPI ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, accent = false, warn = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 ${
      accent ? "bg-[#1a1a2e] text-white"
      : warn  ? "bg-amber-50 border border-amber-200"
      :         "bg-white border border-black/[0.06]"
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        accent ? "bg-white/15"
        : warn  ? "bg-amber-100"
        :         "bg-[#1a1a2e]/7"
      }`}>
        <span className={accent ? "text-white" : warn ? "text-amber-600" : "text-[#1a1a2e]"}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none ${accent ? "text-white" : warn ? "text-amber-700" : "text-[#1a1a2e]"}`}>
          {value}
        </p>
        <p className={`text-[11px] mt-0.5 truncate ${accent ? "text-white/60" : warn ? "text-amber-600" : "text-[#1a1a2e]/45"}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const Index = () => {
  const [showRecorder,    setShowRecorder]    = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showAddDialog,   setShowAddDialog]   = useState(false);
  const [refreshTrigger,  setRefreshTrigger]  = useState(0);
  const [search,          setSearch]          = useState("");
  const [searchOpen,      setSearchOpen]      = useState(false);

  const { data: clients = [], isLoading } = useClients({ filter: "all" });

  const stats = useMemo(() => {
    const total        = clients.length;
    const prospects    = clients.filter(c => c.status === "prospect").length;
    const actives      = clients.filter(c => c.status === "activé").length;
    const clientsActif = clients.filter(c => c.status === "client actif").length;
    const perdus       = clients.filter(c => c.status === "perdu").length;

    const chauds       = clients.filter(c => c.statut_opportunite === "chaud").length;
    const tièdes       = clients.filter(c => c.statut_opportunite === "tiède").length;
    const froids       = clients.filter(c => c.statut_opportunite === "froid").length;

    // MRR estimé
    const mrr = clients.reduce((sum, c) => {
      if (c.status !== "client actif" || !c.offre_cible) return sum;
      return sum + (MRR_MAP[c.offre_cible] ?? 0);
    }, 0);

    // Alertes : relances dépassées (date_relance < aujourd'hui, non NC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const relancesDepassees = clients.filter(c => {
      if (!c.date_relance || c.date_relance === "NC") return false;
      const [d, m, y] = c.date_relance.split("/").map(Number);
      if (!d || !m || !y) return false;
      const dt = new Date(y, m - 1, d);
      return dt < today;
    }).length;

    // Urgents : chaud + haute priorité sans date relance
    const urgents = clients.filter(
      c => c.statut_opportunite === "chaud" && c.priorite === "haute" && (!c.date_relance || c.date_relance === "NC")
    ).length;

    return { total, prospects, actives, clientsActif, perdus, chauds, tièdes, froids, mrr, relancesDepassees, urgents };
  }, [clients]);

  const kv = (n: number) => (isLoading ? "—" : n);
  const kc = (n: number) => (isLoading ? "—" : `${n} €`);

  return (
    <div className="space-y-5">

      {/* ── Barre d'actions ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1a1a2e] leading-tight">Tableau de bord</h2>
          <p className="text-[11px] text-[#1a1a2e]/45 mt-0.5">
            {isLoading ? "Chargement…" : `${stats.total} prospect${stats.total !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setSearchOpen(s => !s)}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       text-[#1a1a2e]/50 hover:text-[#1a1a2e] hover:bg-black/5 transition"
            aria-label="Rechercher">
            {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
          <button onClick={() => setShowRecorder(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       border border-black/[0.09] text-[#1a1a2e]/60
                       hover:text-[#1a1a2e] hover:bg-black/5 transition"
            aria-label="Débrief vocal">
            <Mic className="h-4 w-4" />
          </button>
          <button onClick={() => setShowAddDialog(true)}
            className="h-9 px-3.5 flex items-center gap-1.5 rounded-xl
                       bg-[#1a1a2e] text-white text-sm font-semibold
                       hover:bg-[#1a1a2e]/90 active:scale-95 transition-all">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
      </div>

      {searchOpen && (
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un prospect…"
          className="w-full h-10 px-4 rounded-xl border border-black/[0.1] bg-white
                     text-sm text-[#1a1a2e] placeholder:text-[#1a1a2e]/35
                     focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]/15 transition" />
      )}

      {/* ── KPI : Funnel statut ───────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-[#1a1a2e]/40 uppercase tracking-wide mb-2">Base</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard label="Total"        value={kv(stats.total)}        icon={<Users        className="h-[17px] w-[17px]" />} accent />
          <StatCard label="Prospects"    value={kv(stats.prospects)}    icon={<RefreshCcw   className="h-[17px] w-[17px]" />} />
          <StatCard label="Activés"      value={kv(stats.actives)}      icon={<CheckCircle2 className="h-[17px] w-[17px]" />} />
          <StatCard label="Clients actifs" value={kv(stats.clientsActif)} icon={<TrendingUp className="h-[17px] w-[17px]" />} />
        </div>
      </div>

      {/* ── KPI : Opportunités ────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-[#1a1a2e]/40 uppercase tracking-wide mb-2">Opportunités</p>
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="Chaud"  value={kv(stats.chauds)} icon={<Flame     className="h-[17px] w-[17px]" />} />
          <StatCard label="Tiède"  value={kv(stats.tièdes)} icon={<Droplets  className="h-[17px] w-[17px]" />} />
          <StatCard label="Perdus" value={kv(stats.perdus)} icon={<XCircle   className="h-[17px] w-[17px]" />} />
        </div>
      </div>

      {/* ── KPI : Alertes + MRR ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="MRR estimé"      value={kc(stats.mrr)}               icon={<Euro          className="h-[17px] w-[17px]" />} />
        <StatCard label="Relances passées" value={kv(stats.relancesDepassees)} icon={<Clock         className="h-[17px] w-[17px]" />} warn={stats.relancesDepassees > 0} />
        <StatCard label="Urgents (chaud+haute)" value={kv(stats.urgents)}      icon={<AlertTriangle className="h-[17px] w-[17px]" />} warn={stats.urgents > 0} />
        <button onClick={() => setShowExcelUpload(true)}
          className="rounded-2xl bg-white border border-black/[0.06] p-4
                     flex items-center gap-3 hover:border-[#1a1a2e]/20 hover:bg-[#1a1a2e]/[0.02]
                     active:scale-[0.98] transition-all text-left">
          <div className="w-9 h-9 rounded-xl bg-[#1a1a2e]/7 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-[17px] w-[17px] text-[#1a1a2e]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1a1a2e] leading-none">Importer</p>
            <p className="text-[11px] text-[#1a1a2e]/45 mt-0.5">Excel / CSV</p>
          </div>
        </button>
      </div>

      {/* ── Liste prospects ───────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-[#1a1a2e] mb-3">Prospects</h2>
        <ProspectionList
          refreshTrigger={refreshTrigger}
          minScore={0}
          sortByScore={false}
          search={search}
        />
      </div>

      {/* ── Modales ───────────────────────────────────────────────── */}
      {showRecorder && (
        <VoiceRecorder
          onClose={() => setShowRecorder(false)}
          onSaved={() => setRefreshTrigger(r => r + 1)}
        />
      )}

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => setRefreshTrigger(r => r + 1)}
      />

      {showExcelUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
          onClick={() => setShowExcelUpload(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <ExcelUpload onImportSuccess={() => { setRefreshTrigger(p => p + 1); setShowExcelUpload(false); }} />
              <button onClick={() => setShowExcelUpload(false)}
                className="mt-4 w-full py-2.5 rounded-xl border border-black/[0.1] text-sm font-medium text-[#1a1a2e]/60 hover:bg-black/5 transition">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
