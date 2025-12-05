import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Phone, SkipForward, MessageSquare, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface Prospect {
  id: string;
  name: string;
  company: string;
  phone: string;
  score: number;
  status: "hot" | "warm" | "cold";
}

const mockProspects: Prospect[] = [
  { id: "1", name: "Jean Dupont", company: "Le Petit Bistrot", phone: "+33 6 12 34 56 78", score: 95, status: "hot" },
  { id: "2", name: "Marie Martin", company: "Café de Flore", phone: "+33 6 98 76 54 32", score: 87, status: "hot" },
  { id: "3", name: "Pierre Durand", company: "La Bonne Table", phone: "+33 6 45 67 89 01", score: 72, status: "warm" },
  { id: "4", name: "Sophie Bernard", company: "Chez Marcel", phone: "+33 6 11 22 33 44", score: 65, status: "warm" },
  { id: "5", name: "Luc Moreau", company: "Le Gourmet", phone: "+33 6 55 66 77 88", score: 58, status: "cold" },
];

const SpeedProspecting = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [note, setNote] = useState("");
  const [stats, setStats] = useState({
    calls: 0,
    answered: 0,
    interested: 0,
    skipped: 0,
    startTime: null as Date | null,
  });

  const currentProspect = mockProspects[currentIndex];
  const progress = (currentIndex / mockProspects.length) * 100;

  const startSession = () => {
    setIsActive(true);
    setStats(prev => ({ ...prev, startTime: new Date() }));
    toast.success("Mode Speed Prospecting activé ! ⚡");
  };

  const endSession = () => {
    setIsActive(false);
    toast.success(`Session terminée ! ${stats.calls} appels en ${getSessionDuration()}`);
  };

  const handleAction = (action: "answered" | "interested" | "notAnswered" | "skip") => {
    // Save note if any
    if (note.trim()) {
      console.log(`Note pour ${currentProspect.name}: ${note}`);
      setNote("");
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      calls: prev.calls + (action !== "skip" ? 1 : 0),
      answered: prev.answered + (action === "answered" || action === "interested" ? 1 : 0),
      interested: prev.interested + (action === "interested" ? 1 : 0),
      skipped: prev.skipped + (action === "skip" ? 1 : 0),
    }));

    // Next prospect
    if (currentIndex < mockProspects.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      endSession();
    }

    const messages = {
      answered: "Appel logué ✓",
      interested: "Prospect intéressé ! 🎯",
      notAnswered: "Pas de réponse",
      skip: "Passé au suivant",
    };
    toast.info(messages[action]);
  };

  const getSessionDuration = () => {
    if (!stats.startTime) return "0:00";
    const diff = Math.floor((new Date().getTime() - stats.startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot": return "bg-red-500";
      case "warm": return "bg-orange-500";
      default: return "bg-blue-500";
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
        <div className="text-center space-y-4">
          <div className="p-6 bg-accent/20 rounded-full inline-block">
            <Zap className="h-16 w-16 text-accent" />
          </div>
          <h1 className="text-4xl font-bold">Speed Prospecting</h1>
          <p className="text-xl text-muted-foreground max-w-md">
            Mode ultra-simplifié pour enchaîner les appels à vitesse maximale.
            <br />
            <strong>Un seul objectif : appeler, noter, passer au suivant.</strong>
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="p-4 rounded-lg bg-card border">
            <div className="text-3xl font-bold text-primary">{mockProspects.length}</div>
            <p className="text-sm text-muted-foreground">Prospects à appeler</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <div className="text-3xl font-bold text-red-500">{mockProspects.filter(p => p.status === "hot").length}</div>
            <p className="text-sm text-muted-foreground">Prospects chauds</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <div className="text-3xl font-bold text-green-500">~15 min</div>
            <p className="text-sm text-muted-foreground">Durée estimée</p>
          </div>
        </div>

        <Button onClick={startSession} size="lg" className="h-16 px-12 text-xl">
          <Zap className="h-6 w-6 mr-3" />
          Démarrer le Speed Mode
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {getSessionDuration()}
          </span>
          <span>{currentIndex + 1} / {mockProspects.length}</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-blue-500/20 text-center">
          <div className="text-2xl font-bold">{stats.calls}</div>
          <p className="text-xs text-muted-foreground">Appels</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/20 text-center">
          <div className="text-2xl font-bold">{stats.answered}</div>
          <p className="text-xs text-muted-foreground">Répondus</p>
        </div>
        <div className="p-3 rounded-lg bg-accent/20 text-center">
          <div className="text-2xl font-bold">{stats.interested}</div>
          <p className="text-xs text-muted-foreground">Intéressés</p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <div className="text-2xl font-bold">{stats.skipped}</div>
          <p className="text-xs text-muted-foreground">Passés</p>
        </div>
      </div>

      {/* Current Prospect Card - Maximally Simplified */}
      <Card className="border-4 border-primary bg-gradient-to-br from-primary/10 to-accent/5">
        <CardContent className="p-8 text-center space-y-6">
          <Badge className={`${getStatusColor(currentProspect.status)} text-white text-lg px-4 py-1`}>
            {currentProspect.status === "hot" ? "🔥 CHAUD" : currentProspect.status === "warm" ? "☀️ TIÈDE" : "❄️ FROID"}
          </Badge>
          
          <div>
            <h2 className="text-3xl font-bold">{currentProspect.name}</h2>
            <p className="text-xl text-muted-foreground">{currentProspect.company}</p>
          </div>
          
          <div className="text-4xl font-mono font-bold text-primary">
            {currentProspect.phone}
          </div>

          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Score: {currentProspect.score}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Note */}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note rapide (optionnel)..."
        className="h-20 text-lg"
      />

      {/* Action Buttons - Big and Clear */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => handleAction("interested")} 
          className="h-20 text-xl bg-green-500 hover:bg-green-600"
        >
          <CheckCircle className="h-8 w-8 mr-3" />
          Intéressé ! 🎯
        </Button>
        <Button 
          onClick={() => handleAction("answered")} 
          variant="secondary"
          className="h-20 text-xl"
        >
          <Phone className="h-8 w-8 mr-3" />
          Répondu
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => handleAction("notAnswered")} 
          variant="outline"
          className="h-16 text-lg"
        >
          <XCircle className="h-6 w-6 mr-2" />
          Pas de réponse
        </Button>
        <Button 
          onClick={() => handleAction("skip")} 
          variant="ghost"
          className="h-16 text-lg"
        >
          <SkipForward className="h-6 w-6 mr-2" />
          Passer
        </Button>
      </div>

      {/* End Session */}
      <Button 
        onClick={endSession} 
        variant="destructive"
        className="w-full h-12"
      >
        Terminer la session
      </Button>
    </div>
  );
};

export default SpeedProspecting;
