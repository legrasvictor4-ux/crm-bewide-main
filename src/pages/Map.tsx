import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MapView from "@/components/MapView";
import { fetchClients } from "@/services/clients";

const Map = () => {
  const navigate = useNavigate();
  const [prospections, setProspections] = useState<
    Array<{
      id: string;
      name: string;
      address?: string | null;
      lat?: number | null;
      lng?: number | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCoordinates, setHasCoordinates] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const clients = await fetchClients({ filter: "all" });
        const mapped = (clients || []).map((client) => {
          const metadata = (client as { metadata?: Record<string, unknown> }).metadata || {};
          const rawLat = (metadata as Record<string, unknown>).lat ?? (metadata as Record<string, unknown>).latitude;
          const rawLng = (metadata as Record<string, unknown>).lng ?? (metadata as Record<string, unknown>).longitude;
          const latNum = typeof rawLat === "number" ? rawLat : Number(rawLat);
          const lngNum = typeof rawLng === "number" ? rawLng : Number(rawLng);
          const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
          const address = [client.address, client.postal_code].filter(Boolean).join(" ") || null;

          return {
            id: client.id,
            name: client.company || `${client.first_name || ""} ${client.last_name}`.trim() || "Client",
            address,
            lat: hasCoords ? latNum : null,
            lng: hasCoords ? lngNum : null,
          };
        });

        setHasCoordinates(mapped.some((c) => c.lat !== null && c.lng !== null));
        setProspections(mapped);
        setError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur lors du chargement des clients";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadClients();
  }, []);

  const coordsOnly = useMemo(
    () => prospections.filter((p) => typeof p.lat === "number" && typeof p.lng === "number"),
    [prospections],
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/90 backdrop-blur-md">
        <div className="page-shell py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Carte des prospections</h1>
              <p className="text-sm text-muted-foreground">Visualisez et optimisez vos parcours</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6">
        <div className="h-full bg-card rounded-xl shadow-md border border-border overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Chargement des clients...</div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-destructive">{error}</div>
          ) : !hasCoordinates ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 px-6 text-center">
              <MapPin className="h-6 w-6" />
              <p className="text-base">Aucun client géocodé pour la carte.</p>
              <p className="text-sm text-muted-foreground">
                Complétez l’adresse ou ajoutez les coordonnées pour les afficher ici.
              </p>
            </div>
          ) : (
            <MapView prospections={coordsOnly} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;
