import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const kpis = [
  { title: "Sessions CRM Bewide", value: "2 430", change: "+2.1%", up: true },
  { title: "Leads qualifiés", value: "1 186", change: "+5.4%", up: true },
  { title: "Temps moyen fiche (min)", value: "6.4", change: "-2.3%", up: false },
  { title: "Messages WA envoyés", value: "328", change: "+9.8%", up: true },
];

const lineData = [
  { label: "15", value: 240 },
  { label: "16", value: 260 },
  { label: "17", value: 80 },
  { label: "18", value: 120 },
  { label: "19", value: 210 },
  { label: "20", value: 260 },
  { label: "21", value: 240 },
  { label: "22", value: 200 },
  { label: "23", value: 220 },
  { label: "24", value: 260 },
  { label: "25", value: 290 },
  { label: "26", value: 320 },
  { label: "27", value: 280 },
  { label: "28", value: 260 },
];

const radarData = [
  { channel: "Web Bewide", value: 72 },
  { channel: "WhatsApp", value: 88 },
  { channel: "Email", value: 63 },
  { channel: "Appels", value: 54 },
];

const lowerCards = [
  { title: "Top plateforme", subtitle: "Dashboard Bewide", value: "1 883 sessions" },
  { title: "Top source", subtitle: "Campagne Inbound", value: "420 sessions" },
  { title: "Top canal", subtitle: "WhatsApp", value: "2 010 sessions" },
  { title: "Nouveaux leads", subtitle: "Prospects ajoutés", value: "326" },
];

const statsCards = [
  { label: "Prospects en ligne", value: 312, max: 512 },
  { label: "Nouveaux contacts", value: 136, max: 381 },
  { label: "CA moyen (€/jour)", value: 3076.25, delta: "+2.1%" },
];

const Analytics = () => {
  return (
    <div className="pb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Vue tableau de bord (sessions, canaux, revenus).</p>
        </div>
        <Button variant="outline">Download CSV</Button>
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
                <p className="text-xs text-muted-foreground">Mon ● Tue ● Wed ● Thu ● Fri</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                {item.up ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                <span className={item.up ? "text-emerald-600" : "text-rose-600"}>{item.change}</span>
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Sessions overview</CardTitle>
              <p className="text-xs text-muted-foreground">01/15/19 – 01/28/19</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="cursor-pointer">Today</span>
              <span className="cursor-pointer rounded-full bg-primary/10 px-2 py-1 text-primary">7d</span>
              <span className="cursor-pointer">2w</span>
              <span className="cursor-pointer">1m</span>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 400]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Views by browser</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="channel" />
                <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardContent className="grid gap-4 md:grid-cols-4 pt-6">
            {lowerCards.map((card) => (
              <div key={card.title} className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-sm font-semibold">{card.subtitle}</p>
                <p className="text-xs text-muted-foreground">{card.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-950">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsCards.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200/60 p-3 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-sm">
                  <span>{stat.label}</span>
                  {stat.max ? <span className="text-muted-foreground text-xs">Max {stat.max}</span> : null}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xl font-semibold">{typeof stat.value === "number" ? stat.value : stat.value.toString()}</span>
                  {stat.delta && <Badge variant="secondary">{stat.delta}</Badge>}
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
