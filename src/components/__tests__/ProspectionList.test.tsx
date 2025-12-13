import { render, screen, waitFor } from '@testing-library/react';
import ProspectionList from '../ProspectionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn(),
  },
}));

const clients = [
  { id: '1', first_name: 'John', last_name: 'Doe', status: 'new', date_created: new Date().toISOString() },
];

vi.spyOn((await import('@/integrations/supabase/client')).supabase, 'select').mockReturnValue({
  order: () => ({
    eq: () => ({ data: clients, error: null }),
    then: () => ({}),
  }),
});

const renderComponent = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProspectionList />
    </QueryClientProvider>
  );

describe('ProspectionList', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders loading then data', async () => {
    renderComponent();
    expect(screen.getByText(/chargement des clients/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/john doe/i)).toBeInTheDocument());
  });
});
