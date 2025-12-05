import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, TrendingUp, CheckCircle, Loader2, Sparkles, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CallWindow {
  analysis: {
    totalProspects: number;
    analyzedPeriod: string;
  };
  optimalWindows: Array<{
    day: string;
    date: string;
    slots: Array<{
      start: string;
      end: string;
      score: number;
      expectedResponseRate: number;
      prospectsToCall: Array<{
        id: string;
        name: string;
        reason: string;
        priority: number;
      }>;
      recommendation: string;
    }>;
  }>;
  weeklySchedule: {
    monday: { best: string; avoid: string };
    tuesday: { best: string; avoid: string };
    wednesday: { best: string; avoid: string };
    thursday: { best: string; avoid: string };
    friday: { best: string; avoid: string };
  };
  insights: {
    bestDay: string;
    bestTimeSlot: string;
    worstDay: string;
    averageResponseRate: number;
    tips: string[];
  };
  automatedSchedule: Array<{
    datetime: string;
    prospect: string;
    duration: number;
    type: string;
    autoConfirm: boolean;
  }>;
}

const mockProspects = [
  { id: "1", name: "Le Petit Bistrot", timezone: "Europe/Paris", sector: "Restaurant" },
  { id: "2", name: "Café de Flore", timezone: "Europe/Paris", sector: "Café" },
  { id: "3", name: "La Bonne Table", timezone: "Europe/Paris", sector: "Restaurant" },
];

const CallWindowOptimizer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [windowData, setWindowData] = useState<CallWindow | null>(null);
  const [confirmedSlots, setConfirmedSlots] = useState<Set<string>>(new Set());

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-call-windows', {
        body: { 
          prospects: mockProspects,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          callHistory: []
        }
      });

      if (error) throw error;
      
      setWindowData(data.windowsData);
      toast.success("Analyse terminée !");
    } catch (error) {
      console.error('Error analyzing call windows:', error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSlot = (slotId: string) => {
    setConfirmedSlots(prev => new Set([...prev, slotId]));
    toast.success("Créneau ajouté à l'agenda !");
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 70) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Optimiseur de Fenêtres d'Appel
            <Badge className="bg-accent text-accent-foreground">IA Prédictive</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            L'IA analyse vos prospects et calcule les meilleurs moments pour les appeler selon leur profil, 
            fuseau horaire, historique et taux de réponse.
          </p>
          <Button onClick={handleAnalyze} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Analyser mes créneaux optimaux
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {windowData && (
        <>
          {/* Insights */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{windowData.insights.bestDay}</div>
                <p className="text-sm text-muted-foreground">Meilleur jour</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{windowData.insights.bestTimeSlot}</div>
                <p className="text-sm text-muted-foreground">Meilleur créneau</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-red-500">{windowData.insights.worstDay}</div>
                <p className="text-sm text-muted-foreground">À éviter</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">{windowData.insights.averageResponseRate}%</div>
                <p className="text-sm text-muted-foreground">Taux réponse moyen</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Planning hebdomadaire recommandé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(windowData.weeklySchedule).map(([day, schedule]) => (
                  <div key={day} className="text-center p-4 rounded-lg border bg-card">
                    <p className="font-medium capitalize mb-3">{day === 'monday' ? 'Lundi' : day === 'tuesday' ? 'Mardi' : day === 'wednesday' ? 'Mercredi' : day === 'thursday' ? 'Jeudi' : 'Vendredi'}</p>
                    <div className="space-y-2">
                      <div className="p-2 bg-green-500/20 rounded text-sm">
                        <p className="text-xs text-muted-foreground">✅ Idéal</p>
                        <p className="font-medium text-green-500">{schedule.best}</p>
                      </div>
                      <div className="p-2 bg-red-500/20 rounded text-sm">
                        <p className="text-xs text-muted-foreground">❌ Éviter</p>
                        <p className="font-medium text-red-500">{schedule.avoid}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimal Windows */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Créneaux optimaux détaillés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {windowData.optimalWindows.map((window) => (
                    <div key={window.date} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{window.day}</span>
                        <Badge variant="secondary">{window.date}</Badge>
                      </div>
                      
                      {window.slots.map((slot, slotIndex) => {
                        const slotId = `${window.date}-${slot.start}`;
                        const isConfirmed = confirmedSlots.has(slotId);
                        
                        return (
                          <div 
                            key={slotIndex}
                            className={`p-4 rounded-lg border ${isConfirmed ? 'bg-green-500/10 border-green-500/30' : 'bg-card hover:bg-muted/50'} transition-colors`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="text-lg font-bold">{slot.start} - {slot.end}</div>
                                <Badge className={getScoreColor(slot.score)}>
                                  {slot.score}% score
                                </Badge>
                                <Badge variant="outline">
                                  {slot.expectedResponseRate}% réponse
                                </Badge>
                              </div>
                              {!isConfirmed ? (
                                <Button onClick={() => confirmSlot(slotId)} size="sm">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Valider ce créneau
                                </Button>
                              ) : (
                                <Badge className="bg-green-500">✓ Confirmé</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{slot.recommendation}</p>
                            
                            <div className="flex flex-wrap gap-2">
                              {slot.prospectsToCall.map((prospect) => (
                                <div key={prospect.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                  <Phone className="h-3 w-3" />
                                  <span className="text-sm font-medium">{prospect.name}</span>
                                  <span className="text-xs text-muted-foreground">({prospect.reason})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Conseils IA</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {windowData.insights.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CallWindowOptimizer;
