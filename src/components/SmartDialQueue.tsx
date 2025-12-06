import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Play, Pause, SkipForward, Clock, TrendingUp, Users, Flame } from "lucide-react";
import { toast } from "sonner";

interface Prospect {
  id: string;
  name: string;
  company: string;
  phone: string;
  score: number;
  lastContact: string;
  timezone: string;
  bestTime: string;
  dealValue: string;
  status: "hot" | "warm" | "cold";
}

const mockProspects: Prospect[] = [
  { id: "1", name: "Patronne", company: "Le Bidule", phone: "+33 6 12 34 56 78", score: 95, lastContact: "Il y a 2 jours", timezone: "Europe/Paris", bestTime: "10h30-12h", dealValue: "2,500€/mois", status: "hot" },
  { id: "2", name: "Patron + épouse", company: "Le Comptoir du Renne", phone: "+33 6 98 76 54 32", score: 87, lastContact: "Aujourd'hui", timezone: "Europe/Paris", bestTime: "11h00", dealValue: "3,800€/mois", status: "hot" },
  { id: "3", name: "Patronne", company: "Les Funambules", phone: "+33 6 45 67 89 01", score: 35, lastContact: "Il y a 1 semaine", timezone: "Europe/Paris", bestTime: "N/A", dealValue: "0€", status: "cold" },
  { id: "4", name: "Patronne", company: "Le Caffé Latte", phone: "+33 6 11 22 33 44", score: 65, lastContact: "Il y a 3 jours", timezone: "Europe/Paris", bestTime: "Dans 2 mois", dealValue: "4,000€/mois", status: "warm" },
];

const SmartDialQueue = () => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [callsCompleted, setCallsCompleted] = useState(0);
  const [sessionStats, setSessionStats] = useState({ answered: 0, voicemail: 0, noAnswer: 0 });

  const currentProspect = mockProspects[currentIndex];
  const progress = (currentIndex / mockProspects.length) * 100;

  const startSession = () => {
    setIsSessionActive(true);
    toast.success("Session de prospection démarrée !");
  };

  const pauseSession = () => {
    setIsSessionActive(false);
    toast.info("Session en pause");
  };

  const nextCall = (result: "answered" | "voicemail" | "noAnswer") => {
    setSessionStats(prev => ({ ...prev, [result]: prev[result] + 1 }));
    setCallsCompleted(prev => prev + 1);
    
    if (currentIndex < mockProspects.length - 1) {
      setCurrentIndex(prev => prev + 1);
      toast.success("Passage au prospect suivant");
    } else {
      setIsSessionActive(false);
      toast.success("Session terminée ! 🎉");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "bg-red-500";
      case "warm": return "bg-orange-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockProspects.length}</p>
              <p className="text-xs text-muted-foreground">Dans la file</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Phone className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessionStats.answered}</p>
              <p className="text-xs text-muted-foreground">Répondus</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mockProspects.filter(p => p.status === "hot").length}</p>
              <p className="text-xs text-muted-foreground">Prospects chauds</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round((sessionStats.answered / (callsCompleted || 1)) * 100)}%</p>
              <p className="text-xs text-muted-foreground">Taux réponse</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Smart Dial Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression</span>
              <span>{currentIndex + 1} / {mockProspects.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Prospect Card */}
          {currentProspect && (
            <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{currentProspect.name}</h3>
                      <Badge className={`${getStatusColor(currentProspect.status)} text-white`}>
                        {currentProspect.status === "hot" ? "🔥 Chaud" : currentProspect.status === "warm" ? "☀️ Tiède" : "❄️ Froid"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{currentProspect.company}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{currentProspect.score}%</div>
                    <p className="text-xs text-muted-foreground">Score conversion</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Téléphone</p>
                    <p className="font-mono font-medium">{currentProspect.phone}</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Dernier contact</p>
                    <p className="font-medium">{currentProspect.lastContact}</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Meilleur moment</p>
                    <p className="font-medium text-green-500">{currentProspect.bestTime}</p>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Valeur deal</p>
                    <p className="font-medium text-primary">{currentProspect.dealValue}</p>
                  </div>
                </div>

                {/* Call Actions */}
                {isSessionActive && (
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => nextCall("answered")} className="flex-1 bg-green-500 hover:bg-green-600">
                      ✅ Répondu
                    </Button>
                    <Button onClick={() => nextCall("voicemail")} variant="secondary" className="flex-1">
                      📞 Messagerie
                    </Button>
                    <Button onClick={() => nextCall("noAnswer")} variant="outline" className="flex-1">
                      ❌ Pas de réponse
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Session Controls */}
          <div className="flex gap-4">
            {!isSessionActive ? (
              <Button onClick={startSession} size="lg" className="flex-1 h-14 text-lg">
                <Play className="h-5 w-5 mr-2" />
                Démarrer la session
              </Button>
            ) : (
              <>
                <Button onClick={pauseSession} variant="secondary" size="lg" className="flex-1 h-14">
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
                <Button onClick={() => nextCall("noAnswer")} variant="outline" size="lg" className="h-14">
                  <SkipForward className="h-5 w-5 mr-2" />
                  Passer
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            File d'attente optimisée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockProspects.map((prospect, index) => (
              <div 
                key={prospect.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  index === currentIndex 
                    ? "bg-primary/20 border border-primary" 
                    : index < currentIndex 
                      ? "bg-muted/50 opacity-50" 
                      : "bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">{index + 1}</span>
                  <Badge className={`${getStatusColor(prospect.status)} text-white text-xs`}>
                    {prospect.score}%
                  </Badge>
                  <div>
                    <p className="font-medium">{prospect.name}</p>
                    <p className="text-sm text-muted-foreground">{prospect.company}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{prospect.bestTime}</p>
                  <p className="text-xs text-muted-foreground">{prospect.dealValue}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDialQueue;
