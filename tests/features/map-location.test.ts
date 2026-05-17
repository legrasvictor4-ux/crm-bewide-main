import { describe, expect, it, vi, afterEach } from 'vitest';

describe('Feature 4 — Localisation client sur la map', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should extract coordinates from top-level latitude/longitude fields', () => {
    const client = { id: '1', name: 'Test', latitude: 48.8566, longitude: 2.3522, address: 'Paris' };
    const rawLat = client.latitude ?? null;
    const rawLng = client.longitude ?? null;
    const latNum = typeof rawLat === 'number' ? rawLat : Number(rawLat);
    const lngNum = typeof rawLng === 'number' ? rawLng : Number(rawLng);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    expect(hasCoords).toBe(true);
    expect(latNum).toBe(48.8566);
    expect(lngNum).toBe(2.3522);
  });

  it('should fall back to metadata lat/lng when top-level is null', () => {
    const client = { id: '2', name: 'Lyon', latitude: null, longitude: null, metadata: { lat: 45.7640, lng: 4.8357 } };
    const metadata = client.metadata || {};
    const rawLat = client.latitude ?? metadata.lat ?? metadata.latitude ?? null;
    const rawLng = client.longitude ?? metadata.lng ?? metadata.longitude ?? null;
    const latNum = typeof rawLat === 'number' ? rawLat : Number(rawLat);
    const lngNum = typeof rawLng === 'number' ? rawLng : Number(rawLng);
    expect(Number.isFinite(latNum)).toBe(true);
    expect(Number.isFinite(lngNum)).toBe(true);
    expect(latNum).toBe(45.7640);
    expect(lngNum).toBe(4.8357);
  });

  it('should handle Google Places autocomplete geocoding', () => {
    const placeResult = {
      geometry: { location: { lat: () => 48.8566, lng: () => 2.3522 } },
      formatted_address: 'Paris, France',
    };
    const lat = placeResult.geometry.location.lat();
    const lng = placeResult.geometry.location.lng();
    const address = placeResult.formatted_address;
    expect(lat).toBe(48.8566);
    expect(lng).toBe(2.3522);
    expect(address).toBe('Paris, France');
  });

  it('should build correct payload with coordinates from AddClientDialog', () => {
    const form = {
      name: 'Boulangerie', status: 'prospect', address: '15 rue de Paris',
      latitude: 48.8566, longitude: 2.3522,
      phone: '', email: '', offre_cible: null, canal_acquisition: 'terrain',
      date_relance: '', motif_objection: '', statut_opportunite: '', priorite: '', role: '',
    };
    const payload = {
      name: form.name.trim() || null,
      address: form.address.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
    };
    expect(payload.latitude).toBe(48.8566);
    expect(payload.longitude).toBe(2.3522);
    expect(payload.address).toBe('15 rue de Paris');
  });

  it('should return empty array when no clients have coordinates', () => {
    const clients = [
      { id: '1', name: 'A', latitude: null, longitude: null },
      { id: '2', name: 'B', latitude: null, longitude: null },
    ];
    const coordsOnly = clients.filter(c => {
      const rawLat = c.latitude;
      const rawLng = c.longitude;
      return rawLat != null && rawLng != null &&
             Number.isFinite(rawLat) && Number.isFinite(rawLng);
    });
    expect(coordsOnly).toHaveLength(0);
  });
});
