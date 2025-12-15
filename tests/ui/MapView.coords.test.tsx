import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import MapView from "@/components/MapView";

type TestMarker = { title?: string; position?: { lat: number; lng: number } };

describe("MapView coordinates handling", () => {
  const markers: TestMarker[] = [];

  beforeEach(() => {
    (global as unknown as { google?: Record<string, unknown> }).google = {
      maps: {
        Map: function () {
          this.setCenter = vi.fn();
          this.setZoom = vi.fn();
          this.fitBounds = vi.fn();
          this.panToBounds = vi.fn();
        },
        Marker: function (opts: TestMarker) {
          markers.push(opts);
          return {
            ...opts,
            addListener: vi.fn(),
            setMap: vi.fn(),
            getPosition: () => ({ ...opts.position }),
          };
        },
        SymbolPath: { CIRCLE: "CIRCLE" },
        DirectionsService: function () {
          this.route = (_: unknown, cb: (result: unknown, status: string) => void) => cb({}, "OK");
        },
        DirectionsRenderer: function () {
          this.setDirections = vi.fn();
        },
        TravelMode: { WALKING: "WALKING" },
        InfoWindow: function () {
          this.open = vi.fn();
        },
        LatLngBounds: function () {
          this.extend = vi.fn();
          this.getCenter = vi.fn();
        },
      },
    };
    (navigator as unknown as { geolocation?: { getCurrentPosition?: (cb: (pos: { coords: { latitude: number; longitude: number } }) => void) => void } }).geolocation =
      {
        getCurrentPosition: (cb: (pos: { coords: { latitude: number; longitude: number } }) => void) =>
          cb({ coords: { latitude: 48.85, longitude: 2.35 } }),
      };
  });

  afterEach(() => {
    markers.length = 0;
    delete (global as { google?: unknown }).google;
  });

  it("renders markers only for clients with coordinates", async () => {
    render(
      <div style={{ width: "400px", height: "400px" }}>
        <MapView
          prospections={[
            { id: "1", name: "With Coords", lat: 48.86, lng: 2.35 },
            { id: "2", name: "No Coords" },
          ]}
        />
      </div>
    );

    await waitFor(() => {
      expect(markers.some((m) => m.title === "With Coords")).toBe(true);
    });

    expect(markers.some((m) => m.title === "No Coords")).toBe(false);
  });
});
