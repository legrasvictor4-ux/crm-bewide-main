import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, Mail, MessageSquare, Linkedin, FileText, Calendar, 
  AlertTriangle, Clock, CheckCircle, Plus, Filter 
} from "lucide-react";

interface Activity {
  id: string;
  type: "call" | "email" | "sms" | "whatsapp" | "linkedin" | "document" | "meeting" | "objection";
  prospect: string;
  company: string;
  summary: string;
  details: string;
  timestamp: string;
  duration?: string;
  sentiment?: "positive" | "neutral" | "negative";
  autoLogged: boolean;
}

const mockActivities: Activity[] = [
  { id: "1", type: "call", prospect: "Jean Dupont", company: "Le Petit Bistrot", summary: "Appel découverte - très intéressé", details: "Discussion sur les besoins digitaux. Intéressé par Instagram et Google Ads.", timestamp: "Il y a 5 min", duration: "12:34", sentiment: "positive", autoLogged: true },
  { id: "2", type: "email", prospect: "Marie Martin", company: "Café de Flore", summary: "Envoi de la proposition commerciale", details: "Proposition à 1800€/mois incluant gestion réseaux sociaux + publicité.", timestamp: "Il y a 1h", autoLogged: true },
  { id: "3", type: "whatsapp", prospect: "Pierre Durand", company: "La Bonne Table", summary: "Confirmation RDV jeudi 14h", details: "RDV confirmé pour présentation détaillée.", timestamp: "Il y a 2h", sentiment: "positive", autoLogged: true },
  { id: "4", type: "linkedin", prospect: "Sophie Bernard", company: "Chez Marcel", summary: "Message de connexion accepté", details: "Sophie a accepté la demande de connexion et a répondu positivement.", timestamp: "Il y a 3h", autoLogged: true },
  { id: "5", type: "objection", prospect: "Jean Dupont", company: "Le Petit Bistrot", summary: "Objection prix", details: "Trouve le prix élevé par rapport à son budget initial de 800€.", timestamp: "Il y a 5 min", sentiment: "negative", autoLogged: true },
  { id: "6", type: "meeting", prospect: "Marie Martin", company: "Café de Flore", summary: "RDV pris : Mardi 10h", details: "Présentation complète des services avec démonstration.", timestamp: "Il y a 4h", autoLogged: true },
  { id: "7", type: "document", prospect: "Pierre Durand", company: "La Bonne Table", summary: "Catalogue envoyé", details: "Envoi du catalogue services 2024 + études de cas restaurants.", timestamp: "Hier", autoLogged: true },
  { id: "8", type: "sms", prospect: "Sophie Bernard", company: "Chez Marcel", summary: "Rappel RDV demain", details: "SMS automatique de rappel pour le RDV de demain 15h.", timestamp: "Hier", autoLogged: true },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "call": return <Phone className="h-4 w-4" />;
    case "email": return <Mail className="h-4 w-4" />;
    case "sms": return <MessageSquare className="h-4 w-4" />;
    case "whatsapp": return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "linkedin": return <Linkedin className="h-4 w-4 text-blue-600" />;
    case "document": return <FileText className="h-4 w-4" />;
    case "meeting": return <Calendar className="h-4 w-4" />;
    case "objection": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "call": return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    case "email": return "bg-purple-500/20 text-purple-500 border-purple-500/30";
    case "sms": return "bg-cyan-500/20 text-cyan-500 border-cyan-500/30";
    case "whatsapp": return "bg-green-500/20 text-green-500 border-green-500/30";
    case "linkedin": return "bg-blue-600/20 text-blue-600 border-blue-600/30";
    case "document": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    case "meeting": return "bg-primary/20 text-primary border-primary/30";
    case "objection": return "bg-red-500/20 text-red-500 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const getSentimentBadge = (sentiment?: string) => {
  switch (sentiment) {
    case "positive": return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">😊 Positif</Badge>;
    case "negative": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">😟 Négatif</Badge>;
    default: return null;
  }
};

const AutoLogActivity = () => {
  const [filter, setFilter] = useState<string>("all");

  const filteredActivities = filter === "all" 
    ? mockActivities 
    : mockActivities.filter(a => a.type === filter);

  const stats = {
    calls: mockActivities.filter(a => a.type === "call").length,
    emails: mockActivities.filter(a => a.type === "email").length,
    messages: mockActivities.filter(a => ["sms", "whatsapp", "linkedin"].includes(a.type)).length,
    objections: mockActivities.filter(a => a.type === "objection").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.calls}</p>
              <p className="text-xs text-muted-foreground">Appels logués</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Mail className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.emails}</p>
              <p className="text-xs text-muted-foreground">Emails envoyés</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.messages}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.objections}</p>
              <p className="text-xs text-muted-foreground">Objections</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Auto-Log Activités
            <Badge variant="secondary" className="ml-2">En temps réel</Badge>
          </CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter manuellement
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="call">Appels</TabsTrigger>
              <TabsTrigger value="email">Emails</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="objection">Objections</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{activity.prospect}</h4>
                            {activity.autoLogged && (
                              <Badge variant="secondary" className="text-xs">
                                🤖 Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                        {activity.duration && (
                          <p className="text-xs text-muted-foreground">⏱️ {activity.duration}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-11">
                      <p className="font-medium mb-1">{activity.summary}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      {activity.sentiment && (
                        <div className="mt-2">
                          {getSentimentBadge(activity.sentiment)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoLogActivity;
