import type { Client } from '@/services/clients';

let counter = 0;

export function buildClient(overrides: Partial<Client> = {}): Client {
  counter++;
  return {
    id: `client-${counter}`,
    first_name: null,
    last_name: `Test Client ${counter}`,
    email: null,
    phone: null,
    company: null,
    address: null,
    postal_code: null,
    arrondissement: null,
    contact: null,
    status: 'prospect' as const,
    notes: null,
    next_action: null,
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
    imported_at: null,
    source_file: null,
    enrichment_data: null,
    business_description: null,
    segmentation: null,
    lead_score: 0,
    enriched_at: null,
    metadata: null,
    ...overrides,
  };
}

export function buildClientList(count: number, overrides: Partial<Client> = {}): Client[] {
  return Array.from({ length: count }, () => buildClient(overrides));
}
