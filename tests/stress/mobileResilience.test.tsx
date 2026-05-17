import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppVisibility } from '@/lib/mobile/useAppVisibility';

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function qc() { return new QueryClient({ defaultOptions: { queries: { retry: false } } }); }

describe('Phase 8: Touch Interaction Hardening', () => {
  afterEach(() => cleanup());

  it('double click submit ne crash pas', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    const nom = await screen.findByLabelText(/Nom/i);
    fireEvent.change(nom, { target: { value: 'Touch Test' } });
    fireEvent.change(await screen.findByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });

    const submitBtn = await screen.findByTestId('client-submit');
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
  });

  it('scroll agressif ne crash pas — render avec beaucoup de contenu', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    const { container } = render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    container.scrollTo = vi.fn();
    for (let i = 0; i < 5; i++) {
      container.scrollTo(0, i * 100);
    }
  });

  it('rotation écran simulée — resize event', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('orientationchange'));
  });
});

describe('Phase 6: App Resume Recovery', () => {
  it('useAppVisibility hook returns initial state', () => {
    function TestComponent() {
      const vis = useAppVisibility();
      return <div data-testid="vis">{vis.visibility}</div>;
    }
    render(<TestComponent />);
    expect(screen.getByTestId('vis').textContent).toBe('visible');
  });

  it('visibilitychange event ne crash pas', () => {
    let visState: string | null = null;
    function TestComponent() {
      const vis = useAppVisibility();
      visState = vis.visibility;
      return <div />;
    }
    render(<TestComponent />);
    expect(visState).toBe('visible');
    // Dispatch visibilitychange — the hook uses document.visibilityState which
    // is read on each event. In jsdom visibilityState is always "visible".
    document.dispatchEvent(new Event('visibilitychange'));
    expect(visState).toBe('visible');
  });
});

describe('Phase 15: Safe Routing &  Back Navigation', () => {
  it('popstate ne crash pas avec prévention active', async () => {
    const AddClientDialog = (await import('@/components/AddClientDialog')).default;
    render(
      <QueryClientProvider client={qc()}>
        <AddClientDialog open={true} onOpenChange={vi.fn()} />
      </QueryClientProvider>
    );

    window.dispatchEvent(new PopStateEvent('popstate'));
    window.history.pushState(null, '', window.location.href);
  });
});
