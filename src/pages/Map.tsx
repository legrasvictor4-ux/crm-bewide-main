import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MapView from "@/components/MapView";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const { data, error: fetchError } = await supabase
          .from("clients")
          .select("id, first_name, last_name, company, address, city, postal_code, arrondissement, metadata")
          .order("date_created", { ascending: false });

        if (fetchError) throw fetchError;

        const mapped = (data || []).map((client) => {
          const metadata = (client as { metadata?: Record<string, unknown> }).metadata || {};
          const rawLat = metadata.lat ?? metadata.latitude;
          const rawLng = metadata.lng ?? metadata.longitude;
          const lat = typeof rawLat === "number" ? rawLat : null;
          const lng = typeof rawLng === "number" ? rawLng : null;
          const address = [client.address, client.postal_code, client.city].filter(Boolean).join(" ") || null;

          return {
            id: client.id,
            name: client.company || `${client.first_name || ""} ${client.last_name}`.trim() || "Client",
            address,
            lat,
            lng,
          };
        });

        setProspections(mapped);
        setError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erreur lors du chargement des clients";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Carte des prospections</h1>
              <p className="text-sm text-muted-foreground">
                Visualisez et optimisez vos parcours
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 p-6">
        <div className="h-full bg-card rounded-xl shadow-md border border-border overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Chargement des clients...
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-destructive">
              {error}
            </div>
          ) : prospections.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Aucun client avec coordonnées disponible pour la carte.
            </div>
          ) : (
            <MapView prospections={prospections} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;
