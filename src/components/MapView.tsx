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
    lead_score?: number | null;
    phone?: string | null;
    email?: string | null;
  }>;
  minScore?: number;
  search?: string;
}

const MapView = ({ prospections = [], minScore = 0, search = "" }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

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
    infoWindowRef.current = new google.maps.InfoWindow();

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

    const filtered = prospections.filter((p) => {
      const hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
      const scoreOk = (p.lead_score ?? 0) >= minScore;
      const term = search.toLowerCase();
      const matchSearch = !term || p.name.toLowerCase().includes(term) || (p.address || "").toLowerCase().includes(term);
      return hasCoords && scoreOk && matchSearch;
    }) as Array<{
      lat: number;
      lng: number;
      name: string;
      address?: string | null;
      lead_score?: number | null;
      phone?: string | null;
      email?: string | null;
    }>;

    const bounds = new google.maps.LatLngBounds();
    const markers: google.maps.Marker[] = [];

    const clusters: { center: { lat: number; lng: number }; items: typeof filtered }[] = [];
    const threshold = 0.002; // rough proximity in degrees for clustering

    filtered.forEach((p) => {
      let added = false;
      for (const cluster of clusters) {
        if (Math.abs(cluster.center.lat - p.lat) < threshold && Math.abs(cluster.center.lng - p.lng) < threshold) {
          cluster.items.push(p);
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.push({ center: { lat: p.lat, lng: p.lng }, items: [p] });
      }
    });

    clusters.forEach((cluster) => {
      if (cluster.items.length === 1) {
        const prospect = cluster.items[0];
        const marker = new google.maps.Marker({
          position: { lat: prospect.lat, lng: prospect.lng },
          map,
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
        marker.addListener("mouseover", () => {
          if (!infoWindowRef.current) return;
          const content = `
            <div style="min-width:180px;font-size:12px;">
              <div style="font-weight:600">${prospect.name}</div>
              ${prospect.lead_score ? `<div>Lead score: ${prospect.lead_score}</div>` : ""}
              ${prospect.phone ? `<div>Tél: ${prospect.phone}</div>` : ""}
              ${prospect.email ? `<div>Email: ${prospect.email}</div>` : ""}
              ${prospect.address ? `<div>${prospect.address}</div>` : ""}
            </div>`;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        });
        markers.push(marker);
        bounds.extend(marker.getPosition()!);
      } else {
        const count = cluster.items.length;
        const marker = new google.maps.Marker({
          position: cluster.center,
          map,
          label: {
            text: String(count),
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: "#6366F1",
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
        });
        marker.addListener("mouseover", () => {
          if (!infoWindowRef.current) return;
          const names = cluster.items.slice(0, 5).map((p) => p.name).join("<br/>");
          const content = `<div style="min-width:150px;font-size:12px;"><div style="font-weight:600">${count} clients</div>${names}</div>`;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(map, marker);
        });
        markers.push(marker);
        bounds.extend(marker.getPosition()!);
      }
    });

    if (filtered.length > 0) {
      map.fitBounds(bounds);
      map.panToBounds(bounds);
    }

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, prospections, minScore, search]);

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
