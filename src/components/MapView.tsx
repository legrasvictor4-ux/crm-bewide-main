/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, Locate } from "lucide-react";

interface MapViewProps {
  prospections?: Array<{
    id: string;
    name: string;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
  }>;
}

const MapView = ({ prospections = [] }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    // Initialize map
    const newMap = new google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 48.8566, lng: 2.3522 }, // Paris center
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    setMap(newMap);

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          newMap.setCenter(pos);

          // Add user marker
          new google.maps.Marker({
            position: pos,
            map: newMap,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3B82F6",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            },
            title: "Votre position",
          });
        },
        () => {
          console.log("Geolocation permission denied");
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!map || prospections.length === 0) return;

    const withCoords = prospections.filter(
      (p) => typeof p.lat === "number" && typeof p.lng === "number"
    ) as Array<{ lat: number; lng: number; name: string }>;

    // Clear existing markers
    withCoords.forEach((prospect) => {
      new google.maps.Marker({
        position: { lat: prospect.lat, lng: prospect.lng },
        map: map,
        title: prospect.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10B981",
          fillOpacity: 0.8,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });
    });
  }, [map, prospections]);

  const optimizeRoute = () => {
    const withCoords = prospections.filter(
      (p) => typeof p.lat === "number" && typeof p.lng === "number"
    );

    if (!map || !userLocation || withCoords.length === 0) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
    });

    const waypoints = withCoords.slice(0, -1).map((p) => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: true,
    }));

    const destination = withCoords[withCoords.length - 1];

    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRenderer.setDirections(result);
        }
      }
    );
  };

  const centerOnUser = () => {
    if (map && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(15);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
        <Button
          onClick={centerOnUser}
          className="bg-card shadow-lg border border-border"
          size="lg"
        >
          <Locate className="h-4 w-4 mr-2" />
          Ma position
        </Button>
        {prospections.length > 0 && (
          <Button
            onClick={optimizeRoute}
            className="bg-accent text-accent-foreground shadow-lg"
            size="lg"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Optimiser le parcours
          </Button>
        )}
      </div>
    </div>
  );
};

export default MapView;
