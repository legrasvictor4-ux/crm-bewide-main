import { useMemo, useState, useEffect, useRef } from "react";
import { MapPin, Clock, AlertCircle, X, Loader2, Flame, Droplets, Snowflake } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddClientDialog from "@/components/AddClientDialog";
import ClientRowActions from "@/components/ClientRowActions";
import { useClients } from "@/hooks/use-clients";
import type { Client } from "@/services/clients";

interface Prospection {
  id:                 string;
  name:               string | null;
  address?:           string | null;
  phone?:             string | null;
  email?:             string | null;
  status:             'prospect' | 'activé' | 'client actif' | 'perdu';
  statut_opportunite: 'chaud' | 'tiède' | 'froid' | 'perdu' | 'gagné' | null;
  priorite:           string | null;
  role?:              string | null;
  dateRelance?:       string | null;
  motif_objection?:   string | null;
  offre_cible?:       string | null;
  canal_acquisition?: string | null;
}

interface ProspectionListProps {
  refreshTrigger?: number;
  minScore?:       number;
  sortByScore?:    boolean;
  search?:         string;
}

// ─── Référentiels affichage ───────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "prospect":     { label: "Prospect",     color: "#6366f1", bg: "#eff0fe" },
  "activé":       { label: "Activé",       color: "#f59e0b", bg: "#fffbeb" },
  "client actif": { label: "Client actif", color: "#10b981", bg: "#ecfdf5" },
  "perdu":        { label: "Perdu",        color: "#ef4444", bg: "#fef2f2" },
};

const OPP_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  "chaud": { label: "Chaud", color: "#16a34a", bg: "#dcfce7", icon: <Flame  className="h-3 w-3" /> },
  "tiède": { label: "Tiède", color: "#2563eb", bg: "#dbeafe", icon: <Droplets className="h-3 w-3" /> },
  "froid": { label: "Froid", color: "#64748b", bg: "#f1f5f9", icon: <Snowflake className="h-3 w-3" /> },
  "gagné": { label: "Gagné", color: "#059669", bg: "#d1fae5", icon: null },
  "perdu": { label: "Perdu", color: "#ef4444", bg: "#fee2e2", icon: null },
};

const FILTERS = [
  { value: "all",          label: "Tous",        field: "status"            },
  { value: "prospect",     label: "Prospects",   field: "status"            },
  { value: "activé",       label: "Activés",     field: "status"            },
  { value: "client actif", label: "Clients",     field: "status"            },
  { value: "chaud",        label: "Chaud",       field: "statut_opportunite" },
  { value: "tiède",        label: "Tiède",       field: "statut_opportunite" },
  { value: "perdu",        label: "Perdus",      field: "status"            },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("") || "?";
}

// ─── Composant ────────────────────────────────────────────────────────────────
const ProspectionList = ({
  refreshTrigger, minScore = 0, sortByScore = false, search = "",
}: ProspectionListProps) => {
  const [filterIdx, setFilterIdx] = useState(0);
  const [selected,  setSelected]  = useState<Prospection | null>(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const mountedRef              = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const activeFilter = FILTERS[filterIdx];

  const mapToProspection = (c: Client): Prospection => ({
    id:                 c.id,
    name:               c.name || "Sans nom",
    address:            c.address || null,
    phone:              c.phone || null,
    email:              c.email || null,
    status:             c.status as Prospection["status"],
    statut_opportunite: c.statut_opportunite as Prospection["statut_opportunite"],
    priorite:           c.priorite || null,
    role:               c.role || null,
    dateRelance:        c.date_relance || null,
    motif_objection:    c.motif_objection || null,
    offre_cible:        c.offre_cible || null,
    canal_acquisition:  c.canal_acquisition || null,
  });

  const { data: clientsData, isLoading, error, refetch } = useClients({
    filter:      activeFilter.value === "all" ? "all" : activeFilter.value as any,
    filterField: activeFilter.field as any,
    minScore,
    sortByScore,
    search,
  });

  const prospections = useMemo(
    () => (clientsData || []).map(mapToProspection),
    [clientsData],
  );

  useEffect(() => {
    if (refreshTrigger && mountedRef.current) refetch();
  }, [refreshTrigger, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a1a2e]/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-[#1a1a2e]/50">Erreur lors du chargement</p>
        <button onClick={() => refetch()} className="text-xs text-[#1a1a2e] underline">Réessayer</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f, i) => (
          <button key={f.value + f.field} onClick={() => setFilterIdx(i)}
            className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              i === filterIdx
                ? "bg-[#1a1a2e] text-white"
                : "bg-white border border-black/[0.09] text-[#1a1a2e]/60 hover:border-[#1a1a2e]/25"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      {prospections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14">
          <p className="text-sm font-medium text-[#1a1a2e]/40">Aucun prospect trouvé</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-[#1a1a2e] underline">
            Ajouter le premier
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {prospections.map(p => {
            const st  = STATUS_MAP[p.status] ?? STATUS_MAP["prospect"];
            const opp = p.statut_opportunite ? OPP_MAP[p.statut_opportunite] : null;

            return (
              <div key={p.id} onClick={() => setSelected(p)}
                className="bg-white rounded-2xl border border-black/[0.06] px-4 py-3.5 flex items-center gap-3
                            hover:border-[#1a1a2e]/15 active:bg-[#1a1a2e]/[0.02]
                            transition-all cursor-pointer">

                {/* Avatar */}
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: st.bg, color: st.color }}>
                  {initials(p.name || "")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-[#1a1a2e] truncate leading-snug">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.address && (
                      <span className="text-[11px] text-[#1a1a2e]/45 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />{p.address}
                      </span>
                    )}
                    {p.role && (
                      <span className="text-[11px] text-[#1a1a2e]/35">{p.role}</span>
                    )}
                    {p.dateRelance && p.dateRelance !== "NC" && (
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />{p.dateRelance}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                  {opp && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: opp.bg, color: opp.color }}>
                      {opp.icon}{opp.label}
                    </span>
                  )}
                </div>

                <div onClick={e => e.stopPropagation()}>
                  <ClientRowActions clientId={p.id} clientName={p.name || undefined}
                    onDeleted={() => { refetch(); setSelected(null); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Panneau détail ────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/30 backdrop-blur-[1px]"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>

            <div className="w-9 h-[3px] bg-black/12 rounded-full mx-auto mt-3 sm:hidden" />

            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const st = STATUS_MAP[selected.status] ?? STATUS_MAP["prospect"];
                  return (
                    <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: st.bg, color: st.color }}>
                      {initials(selected.name || "")}
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <p className="font-bold text-[#1a1a2e] truncate">{selected.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.role && (
                      <span className="text-xs text-[#1a1a2e]/45">{selected.role}</span>
                    )}
                    {selected.statut_opportunite && (() => {
                      const opp = OPP_MAP[selected.statut_opportunite];
                      return (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: opp.bg, color: opp.color }}>
                          {opp.icon}{opp.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[#1a1a2e]/40 hover:text-[#1a1a2e] hover:bg-black/5 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="flex-1 px-5 py-4">
              <div className="space-y-3">

                {/* Adresse */}
                {selected.address && (
                  <Row icon={<MapPin className="h-4 w-4" />} label="Adresse">
                    {selected.address}
                  </Row>
                )}

                {/* Contact */}
                {selected.phone && (
                  <Row icon={<span className="text-sm">📞</span>} label="Téléphone">
                    <a href={`tel:${selected.phone}`} className="text-[#1a1a2e] underline-offset-2 hover:underline">{selected.phone}</a>
                  </Row>
                )}
                {selected.email && (
                  <Row icon={<span className="text-sm">✉️</span>} label="Email">
                    <a href={`mailto:${selected.email}`} className="text-[#1a1a2e] underline-offset-2 hover:underline">{selected.email}</a>
                  </Row>
                )}

                {/* Détails */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Rôle",     value: selected.role },
                    { label: "Priorité", value: selected.priorite },
                    { label: "Offre",    value: selected.offre_cible },
                    { label: "Canal",    value: selected.canal_acquisition },
                  ].filter(r => r.value).map(r => (
                    <div key={r.label} className="rounded-xl bg-[#F4F5F8] px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#1a1a2e]/40 uppercase tracking-wide">{r.label}</p>
                      <p className="text-xs font-medium text-[#1a1a2e] mt-0.5">{r.value}</p>
                    </div>
                  ))}
                </div>

                {/* Relance */}
                {selected.dateRelance && selected.dateRelance !== "NC" && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Relance</p>
                      <p className="text-sm text-amber-800">{selected.dateRelance}</p>
                    </div>
                  </div>
                )}

                {/* Motif objection */}
                {selected.motif_objection && (
                  <div className="rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mb-1">Objection</p>
                    <p className="text-sm text-red-700">{selected.motif_objection}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      <AddClientDialog open={showAdd} onOpenChange={setShowAdd} onSuccess={() => refetch()} />
    </>
  );
};

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-[#F4F5F8] flex items-center justify-center shrink-0 text-[#1a1a2e]/50">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#1a1a2e]/40 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#1a1a2e] mt-0.5">{children}</p>
      </div>
    </div>
  );
}

export default ProspectionList;
