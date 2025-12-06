import { useState } from "react";
import { MapPin, Clock, CheckCircle2, AlertCircle, XCircle, Phone, Mail, Building, X, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Prospection {
  id: number;
  name: string;
  arrondissement: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
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
    address: "42 Rue de Bretagne",
    postalCode: "75003",
    city: "Paris",
    phone: "01 23 45 67 89",
    email: "contact@comptoirdelerenne.fr",
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
  const [selectedProspection, setSelectedProspection] = useState<Prospection | null>(null);

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
    <div className="relative bg-card rounded-xl shadow-md border border-border">
      {/* Client Detail Panel */}
      {selectedProspection && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSelectedProspection(null)}>
          <div className="w-full max-w-md bg-background h-full overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Détails du client</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedProspection(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-accent/20 p-3 rounded-lg">
                    <Building className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedProspection.name}</h2>
                    <p className="text-muted-foreground">{selectedProspection.contact}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Adresse</p>
                      <p className="text-muted-foreground">
                        {selectedProspection.address}<br />
                        {selectedProspection.postalCode} {selectedProspection.city}
                      </p>
                    </div>
                  </div>

                  {selectedProspection.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Téléphone</p>
                        <p className="text-muted-foreground">{selectedProspection.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedProspection.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-muted-foreground">{selectedProspection.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <p className="text-sm">{selectedProspection.notes}</p>
                  </div>
                </div>

                {selectedProspection.nextAction && (
                  <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
                    <Clock className="h-5 w-5 text-accent flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Prochaine action</p>
                      <p className="text-sm">{selectedProspection.nextAction}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
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
            onClick={() => setSelectedProspection(prospection)}
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
