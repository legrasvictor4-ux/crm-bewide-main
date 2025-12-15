import { render, screen, waitFor } from '@testing-library/react';
import ProspectionList from '../ProspectionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-clients', () => ({
  useClients: () => ({
    data: [
      { id: '1', company: 'ACME', first_name: 'John', last_name: 'Doe', status: 'new', lead_score: 50, date_created: new Date().toISOString() },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
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
    await waitFor(() => expect(screen.getByText(/john doe/i)).toBeInTheDocument());
  });
});
