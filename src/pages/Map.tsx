import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MapView from "@/components/MapView";

const Map = () => {
  const navigate = useNavigate();

  // Example prospections data - this should come from your database
  const prospections = [
    {
      id: "1",
      name: "Le Comptoir du Renne",
      address: "3ème arrondissement",
      lat: 48.8644,
      lng: 2.3589,
    },
    {
      id: "2",
      name: "Restaurant Le Marais",
      address: "11ème arrondissement",
      lat: 48.8606,
      lng: 2.3810,
    },
    {
      id: "3",
      name: "Café de la Paix",
      address: "11ème arrondissement",
      lat: 48.8625,
      lng: 2.3795,
    },
  ];

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
          <MapView prospections={prospections} />
        </div>
      </div>
    </div>
  );
};

export default Map;
