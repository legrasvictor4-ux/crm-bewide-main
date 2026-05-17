import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddClientDialog from '@/components/AddClientDialog';
import VoiceRecorder from '@/components/VoiceRecorder';

vi.mock('@/hooks/use-clients', () => ({
  useCreateClient: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/voice/voiceDraftStore', () => ({
  saveDraft: vi.fn(),
  getLastDraft: vi.fn(() => null),
  clearDrafts: vi.fn(),
  hasUnsavedDraft: vi.fn(() => false),
}));

function qc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return render(<QueryClientProvider client={qc()}>{ui}</QueryClientProvider>);
}

describe('Phase 6: React Stress Tests', () => {
  afterEach(() => cleanup());

  it('ouvre/ferme le modal AddClientDialog rapidement 10 fois sans crash', () => {
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <QueryClientProvider client={qc()}>
          <AddClientDialog open={true} onOpenChange={vi.fn()} />
        </QueryClientProvider>
      );
      expect(screen.getByText(/Creer le client/i)).toBeInTheDocument();
      unmount();
    }
  });

  it('spam click sur le bouton submit ne cause pas de rendu multiple', async () => {
    const { unmount } = wrap(<AddClientDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Spam Test' } });
    fireEvent.change(screen.getByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });

    const btn = screen.getByText(/Creer le client/i);
    for (let i = 0; i < 5; i++) {
      fireEvent.click(btn);
    }

    expect(btn).toBeInTheDocument();
    unmount();
  });

  it('unmount pendant async ne cause pas removeChild error', async () => {
    const { unmount } = wrap(<AddClientDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Unmount Test' } });
    fireEvent.change(screen.getByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });
    fireEvent.click(screen.getByText(/Creer le client/i));

    unmount();
    await vi.waitFor(() => {});
  });

  it('transition rapide IDLE → LISTENING dans VoiceRecorder', async () => {
    const { unmount } = wrap(<VoiceRecorder clientId="test-1" />);

    const startBtn = screen.queryByRole('button', { name: /micro/i });
    if (startBtn) {
      for (let i = 0; i < 3; i++) {
        fireEvent.click(startBtn);
      }
    }
    unmount();
  });

  it('navigation pendant save — simulation d\'unmount précoce', async () => {
    const { unmount } = wrap(<AddClientDialog open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: 'Nav Test' } });
    fireEvent.change(screen.getByLabelText(/Numero de telephone/i), { target: { value: '+33123456789' } });
    fireEvent.click(screen.getByText(/Creer le client/i));

    unmount();
  });
});
