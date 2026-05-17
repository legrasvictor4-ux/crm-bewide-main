import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddClientDialog from '@/components/AddClientDialog';

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function qc() { return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); }

describe('Phase 6b: Modal Spam & Rapid Interaction', () => {
  afterEach(() => cleanup());

  it('ouvrir/fermer 20x avec saisie à chaque fois', () => {
    for (let i = 0; i < 20; i++) {
      const { unmount } = render(
        <QueryClientProvider client={qc()}>
          <AddClientDialog open={true} onOpenChange={vi.fn()} />
        </QueryClientProvider>
      );
      expect(screen.getByLabelText(/Nom/i)).toBeInTheDocument();
      unmount();
    }
  });

  it('focus/blur spam sur les champs de saisie', () => {
    const { unmount } = render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );
    const nom = screen.getByLabelText(/Nom/i);
    const tel = screen.getByLabelText(/Numero de telephone/i);

    for (let i = 0; i < 10; i++) {
      nom.focus();
      nom.blur();
      tel.focus();
      tel.blur();
    }
    unmount();
  });

  it('taper/effacer rapidement 10x dans les champs', () => {
    const { unmount } = render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );
    const nom = screen.getByLabelText(/Nom/i);

    for (let i = 0; i < 10; i++) {
      fireEvent.change(nom, { target: { value: `Test ${i}` } });
    }
    unmount();
  });
});
