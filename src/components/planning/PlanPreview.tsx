import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PlanResponse } from "@/services/planning";

type PlanPreviewProps = {
  plan: PlanResponse["plan"];
  warnings?: string[];
  onConfirm: () => void;
  onAdjust?: () => void;
};

const PlanPreview = ({ plan, warnings, onConfirm, onAdjust }: PlanPreviewProps) => {
  return (
    <Card data-testid="plan-preview">
      <CardHeader>
        <CardTitle>Plan de journ\u00e9e propos\u00e9</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {warnings && warnings.length > 0 && (
          <Alert>
            <AlertDescription>{warnings.join(" ")} Validation requise.</AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          {plan.map((item, idx) => (
            <div key={`${item.id || item.title}-${idx}`} className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">#{idx + 1}</Badge>
                  <span className="font-semibold">{item.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(item.start).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{item.reason}</p>
              </div>
              <div className="text-right space-y-1">
                {item.opportunityScore != null && (
                  <Badge variant="outline">Score {item.opportunityScore}</Badge>
                )}
                {item.distanceFromPreviousKm != null && (
                  <p className="text-xs text-muted-foreground">{item.distanceFromPreviousKm.toFixed(1)} km</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          {onAdjust && (
            <Button variant="outline" onClick={onAdjust} data-testid="plan-adjust">
              Ajuster
            </Button>
          )}
          <Button onClick={onConfirm} data-testid="plan-confirm">
            Valider le plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanPreview;
