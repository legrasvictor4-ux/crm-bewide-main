import { useState } from "react";
import { MapPin, Clock, CheckCircle2, AlertCircle, XCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Prospection {
  id: number;
  name: string;
  arrondissement: string;
  status: "success" | "pending" | "lost" | "to_recontact";
  contact?: string;
  nextAction?: string;
  date: string;
  notes: string;
}

const mockData: Prospection[] = [
  {
    id: 1,
    name: "Le Comptoir du Renne",
    arrondissement: "3ème",
    status: "success",
    contact: "Patron + épouse",
    nextAction: "RDV demain 11h",
    date: "2025-11-30",
    notes: "Excellent rendez-vous, très intéressé par l'IA. RDV avec l'épouse qui gère la com.",
  },
  {
    id: 2,
    name: "Le Bidule",
    arrondissement: "11ème",
    status: "to_recontact",
    contact: "Patronne",
    nextAction: "Revenir 10h30-12h",
    date: "2025-11-30",
    notes: "Patronne absente. Responsable indique qu'elle gère l'Instagram elle-même, plutôt mal selon lui.",
  },
  {
    id: 3,
    name: "Les Funambules",
    arrondissement: "11ème",
    status: "lost",
    contact: "Patronne",
    date: "2025-11-30",
    notes: "Pas du tout intéressée par un community manager. Opportunité perdue pour l'instant.",
  },
  {
    id: 4,
    name: "Le Caffé Latte",
    arrondissement: "10ème",
    status: "pending",
    contact: "Patronne",
    nextAction: "Repasser dans 2 mois",
    date: "2025-11-30",
    notes: "Déjà une agence à 4000€/mois. Très intéressée par l'IA, à recontacter quand les fonctionnalités seront développées.",
  },
];

const ProspectionList = () => {
  const [filter, setFilter] = useState<string>("all");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "pending":
        return <Clock className="h-5 w-5 text-warning" />;
      case "lost":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "to_recontact":
        return <AlertCircle className="h-5 w-5 text-accent" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Client confirmé";
      case "pending":
        return "En attente";
      case "lost":
        return "Opportunité perdue";
      case "to_recontact":
        return "À relancer";
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "success":
        return "default";
      case "pending":
        return "secondary";
      case "lost":
        return "destructive";
      case "to_recontact":
        return "outline";
      default:
        return "default";
    }
  };

  const filteredData = filter === "all" 
    ? mockData 
    : mockData.filter(p => p.status === filter);

  return (
    <div className="bg-card rounded-xl shadow-md border border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-4">Prospections</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter("success")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "success"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Confirmées
          </button>
          <button
            onClick={() => setFilter("to_recontact")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "to_recontact"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            À relancer
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            En attente
          </button>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {filteredData.map((prospection) => (
          <div
            key={prospection.id}
            className="p-6 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(prospection.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {prospection.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {prospection.arrondissement} arr.
                    </span>
                    {prospection.contact && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {prospection.contact}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {prospection.notes}
                  </p>
                </div>
              </div>
              <Badge variant={getStatusVariant(prospection.status)}>
                {getStatusLabel(prospection.status)}
              </Badge>
            </div>
            {prospection.nextAction && (
              <div className="ml-8 mt-2 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-accent font-medium">{prospection.nextAction}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProspectionList;
