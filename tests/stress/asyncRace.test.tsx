import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddClientDialog from '@/components/AddClientDialog';

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function qc() { return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); }

describe('Phase 6c: Async Race Conditions', () => {
  afterEach(() => cleanup());

  it('submit avec données valides — ne crash pas', async () => {
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    const nom = await screen.findByLabelText(/Nom/i);
    fireEvent.change(nom, { target: { value: 'Race Client' } });
    fireEvent.change(await screen.findByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });

    const btn = await screen.findByTestId('client-submit');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
  });

  it('unmount pendant mutation ne cause pas d\'erreur', async () => {
    const { unmount } = render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    const nom = await screen.findByLabelText(/Nom/i);
    fireEvent.change(nom, { target: { value: 'Race2' } });
    fireEvent.change(await screen.findByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });

    const btn = await screen.findByTestId('client-submit');
    fireEvent.click(btn);
    unmount();
  });
});
