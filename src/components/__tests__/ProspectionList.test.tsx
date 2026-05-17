import { render, screen, waitFor } from '@testing-library/react';
import ProspectionList from '../ProspectionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-clients', () => ({
  useClients: () => ({
    data: [
      {
        id: '1',
        company: null,
        first_name: 'John',
        last_name: 'Doe',
        status: 'prospect',
        lead_score: 50,
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        address: null,
        postal_code: null,
        arrondissement: null,
        contact: null,
        role: null,
        statut_opportunite: null,
        priorite: null,
        next_action: null,
        notes: null,
        motif_objection: null,
        offre_cible: null,
        canal_acquisition: null,
        enrichment_data: null,
        business_description: null,
        segmentation: null,
        enriched_at: null,
        email: null,
        phone: null,
        imported_at: null,
        source_file: null,
        metadata: {},
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const renderComponent = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProspectionList />
    </QueryClientProvider>
  );

describe('ProspectionList', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders data when loaded', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/john doe/i)).not.toBeNull();
    });
  });
});
