import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  diff?: string;
  icon?: ReactNode;
  tone?: "up" | "down" | "neutral";
}

const toneClasses = {
  up: "text-emerald-500 bg-emerald-500/10",
  down: "text-rose-500 bg-rose-500/10",
  neutral: "text-muted-foreground bg-muted/40",
};

const KpiCard = ({ label, value, diff, icon, tone = "neutral" }: KpiCardProps) => {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card via-muted/30 to-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {icon && <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      {diff && (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
          {diff}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
