import { useMemo, useState, useEffect } from "react";
import { MapPin, Clock, CheckCircle2, AlertCircle, XCircle, Phone, Mail, Building, X, Map, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import AddClientDialog from "@/components/AddClientDialog";
import ClientRowActions from "@/components/ClientRowActions";
import { useClients } from "@/hooks/use-clients";
import type { Client } from "@/services/clients";

interface Prospection {
  id: string;
  name: string;
  arrondissement: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  status: "success" | "pending" | "lost" | "to_recontact" | "new";
  contact?: string | null;
  nextAction?: string | null;
  date: string;
  notes: string | null;
  lead_score?: number | null;
}

interface ProspectionListProps {
  refreshTrigger?: number;
  minScore?: number;
  sortByScore?: boolean;
  search?: string;
}

const ProspectionList = ({ refreshTrigger, minScore = 0, sortByScore = false, search = "" }: ProspectionListProps) => {
  const [filter, setFilter] = useState<string>("all");
  const [selectedProspection, setSelectedProspection] = useState<Prospection | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const mapToProspection = (client: Client): Prospection => ({
    id: client.id,
    name: client.company || `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Client sans nom",
    arrondissement: client.arrondissement || null,
    address: client.address || null,
    postalCode: client.postal_code || null,
    city: client.city || null,
    phone: client.phone || null,
    email: client.email || null,
    status: client.status as Prospection["status"],
    contact: client.contact || null,
    nextAction: client.next_action || null,
    date: client.date_created || new Date().toISOString(),
    notes: client.notes || null,
    lead_score: client.lead_score,
  });

  const { data: clientsData, isLoading, error, refetch } = useClients({
    filter,
    minScore,
    sortByScore,
    search,
  });

  const prospections = useMemo(() => (clientsData || []).map(mapToProspection), [clientsData]);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

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

  const filteredData = prospections;

  if (isLoading) {
    return (
      <div className="relative bg-card rounded-xl shadow-md border border-border p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-card rounded-xl shadow-md border border-border p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive font-medium">Erreur lors du chargement</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Une erreur est survenue'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

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
                    {selectedProspection.address && (
                      <>
                        {selectedProspection.address}
                        <br />
                      </>
                    )}
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

                {selectedProspection.notes && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Notes</h4>
                    <div className="bg-secondary/50 p-4 rounded-lg">
                      <p className="text-sm">{selectedProspection.notes}</p>
                    </div>
                  </div>
                )}

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Prospections</h2>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un client
          </Button>
        </div>
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
        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Aucun client trouvé</p>
            <p className="text-sm text-muted-foreground mt-2">
              Importez des clients depuis un fichier Excel pour commencer
            </p>
          </div>
        ) : (
          filteredData.map((prospection) => (
          <div
            key={prospection.id}
            className="p-6 hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={() => setSelectedProspection(prospection)}
          >
              <div className="flex items-start justify-between gap-4 gap-y-2 mb-3 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getStatusIcon(prospection.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg mb-1 flex items-center gap-2 break-words whitespace-normal">
                    {prospection.name}
                    {prospection.lead_score !== undefined && prospection.lead_score !== null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                        Score {prospection.lead_score}
                      </span>
                    )}
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
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(prospection.status)}>
                  {getStatusLabel(prospection.status)}
                </Badge>
                <ClientRowActions />
              </div>
            </div>
            {prospection.nextAction && (
              <div className="ml-8 mt-2 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-accent font-medium">{prospection.nextAction}</span>
              </div>
            )}
          </div>
        ))
        )}
      </div>

      {/* Add Client Dialog */}
      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
};

export default ProspectionList;
