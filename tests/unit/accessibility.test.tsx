import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function qc() { return new QueryClient({ defaultOptions: { queries: { retry: false } } }); }

describe('Phase 15: Accessibility — formulaires testés avec getByLabelText', () => {
  it('AddClientDialog a tous les champs accessibles via label', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Numero de telephone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('AddClientDialog a un bouton submit accessible', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Creer le client/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });

  it('le bouton Dicter les champs est accessible', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    const dictBtn = screen.getByRole('button', { name: /Dicter les champs/i });
    expect(dictBtn).toBeInTheDocument();
  });
});
