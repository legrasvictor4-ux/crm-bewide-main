import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

async function fetchAnalyticsData() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, status, lead_score, date_created, city")
    .order("date_created", { ascending: true });
  if (error) throw error;
  return data as Client[];
}

function buildLineData(clients: Client[]) {
  const now = new Date();
  const days: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    const value = clients.filter(c => c.date_created?.slice(0, 10) === key).length;
    days.push({ label, value });
  }
  return days;
}

function buildRadarData(clients: Client[]) {
  const statuses: Record<string, string> = {
    new:          "Nouveaux",
    pending:      "En cours",
    success:      "Signés",
    lost:         "Perdus",
    to_recontact: "À recontacter",
  };
  return Object.entries(statuses).map(([key, label]) => ({
    channel: label,
    value: clients.filter(c => c.status === key).length,
  }));
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau", pending: "En cours", success: "Signé",
  lost: "Perdu", to_recontact: "À recontacter",
};

const Analytics = () => {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["analytics-clients"],
    queryFn: fetchAnalyticsData,
    staleTime: 60_000,
  });

  const total      = clients.length;
  const qualified  = clients.filter(c => (c.lead_score ?? 0) >= 60 || c.status === "success").length;
  const avgScore   = total > 0
    ? Math.round(clients.reduce((s, c) => s + (c.lead_score ?? 0), 0) / total)
    : 0;

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const newThisMonth = clients.filter(c => c.date_created >= thisMonth).length;
  const newLastMonth = clients.filter(c => c.date_created >= lastMonth && c.date_created <= endLastMonth).length;
  const newDelta     = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth * 100).toFixed(1) : null;

  const successCount = clients.filter(c => c.status === "success").length;
  const convRate     = total > 0 ? ((successCount / total) * 100).toFixed(1) : "0";

  const kpis = [
    {
      title: "Total contacts",
      value: total.toLocaleString("fr-FR"),
      change: newDelta ? `${parseFloat(newDelta) >= 0 ? "+" : ""}${newDelta}%` : "—",
      up: newDelta ? parseFloat(newDelta) >= 0 : true,
      sub: "vs mois dernier",
    },
    {
      title: "Leads qualifiés (score ≥ 60)",
      value: qualified.toLocaleString("fr-FR"),
      change: total > 0 ? `${((qualified / total) * 100).toFixed(0)}%` : "—",
      up: true,
      sub: "du total",
    },
    {
      title: "Score moyen",
      value: `${avgScore} / 100`,
      change: avgScore >= 50 ? "Bon" : avgScore >= 30 ? "Moyen" : "Faible",
      up: avgScore >= 50,
      sub: "lead score",
    },
    {
      title: "Taux de conversion",
      value: `${convRate}%`,
      change: successCount > 0 ? `${successCount} signés` : "Aucun signé",
      up: successCount > 0,
      sub: "statut Signé",
    },
  ];

  const lineData  = buildLineData(clients);
  const radarData = buildRadarData(clients);

  const cityCounts = clients.reduce<Record<string, number>>((acc, c) => {
    const key = c.city || "Inconnu";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

  const statusCounts = (["new", "pending", "success", "lost", "to_recontact"] as const).map(s => ({
    label: STATUS_LABELS[s],
    value: clients.filter(c => c.status === s).length,
    max: total,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Données réelles de votre base — {total} contacts chargés.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.title} className="border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold">{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                {item.up
                  ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                <span className={item.up ? "text-emerald-600" : "text-rose-600"}>{item.change}</span>
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Contacts créés — 14 derniers jours</CardTitle>
            <p className="text-xs text-muted-foreground">Par date d'ajout dans la base</p>
          </CardHeader>
          <CardContent className="h-72">
            {lineData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Aucune donnée sur cette période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} contact(s)`, "Ajoutés"]} />
                  <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.4} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {total === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Aucun contact
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="channel" tick={{ fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardContent className="grid gap-4 md:grid-cols-3 pt-6">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs text-muted-foreground">Top ville</p>
              <p className="text-sm font-semibold">{topCity?.[0] ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{topCity?.[1] ?? 0} contact(s)</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs text-muted-foreground">Nouveaux ce mois</p>
              <p className="text-sm font-semibold">{newThisMonth}</p>
              <p className="text-xs text-muted-foreground">contacts ajoutés</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs text-muted-foreground">Contacts signés</p>
              <p className="text-sm font-semibold">{successCount}</p>
              <p className="text-xs text-muted-foreground">{convRate}% de conversion</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Contacts par statut</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200/60 p-3 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-sm">
                  <span>{stat.label}</span>
                  {stat.max > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {((stat.value / stat.max) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-semibold">{stat.value}</span>
                  <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: stat.max > 0 ? `${(stat.value / stat.max) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
