import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddClientDialog from "../AddClientDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mutateSpy = vi.fn();

vi.mock("@/hooks/use-clients", () => ({
  useCreateClient: (options?: { onSuccess?: () => void }) => ({
    mutate: (payload: unknown) => {
      mutateSpy(payload);
      options?.onSuccess?.();
      return Promise.resolve();
    },
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

class MockSpeechRecognition {
  static transcript = "";
  static error: string | null = null;
  static interim = "";
  lang = "";
  interimResults = false;
  continuous = false;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (e: { error?: string }) => void;
  onresult?: (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
  start() {
    this.onstart?.();
    if (MockSpeechRecognition.error) {
      this.onerror?.({ error: MockSpeechRecognition.error });
      this.onend?.();
      return;
    }
    const results = [
      { 0: { transcript: MockSpeechRecognition.interim || MockSpeechRecognition.transcript } },
      { 0: { transcript: MockSpeechRecognition.transcript } },
    ];
    this.onresult?.({ results } as { results: ArrayLike<{ 0: { transcript: string } }> });
    this.onend?.();
  }
  stop() {
    this.onend?.();
  }
}

const setup = () => {
  const client = new QueryClient();
  (window as unknown as { __TEST_SPEECH__?: typeof MockSpeechRecognition }).__TEST_SPEECH__ = MockSpeechRecognition;
  const onSuccess = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <AddClientDialog open onOpenChange={() => {}} onSuccess={onSuccess} />
    </QueryClientProvider>
  );
  return { onSuccess };
};

describe("AddClientDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.skip("bloque l'envoi si les champs requis sont vides", async () => {
    setup();
    fireEvent.click(screen.getByText(/Creer le client/i));
    await waitFor(() => {
      expect(screen.getByText(/Le nom est requis/i)).toBeInTheDocument();
      expect(screen.getByText(/Le numéro de téléphone est requis/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("soumet un client valide en manuel", async () => {
    const { onSuccess } = setup();
    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: "Jean Dupont" } });
    fireEvent.change(screen.getByLabelText(/Numero de telephone/i), { target: { value: "+33123456789" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jd@test.com" } });
    fireEvent.click(screen.getByText(/Creer le client/i));

    await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("remplit et soumet via dictée quand les champs requis sont présents", async () => {
    setup();
    MockSpeechRecognition.transcript = "Jean Dupont téléphone 06 12 34 56 78 email jean@test.com excellent prospect";
    MockSpeechRecognition.interim = "Jean Dupont téléphone 06";
    fireEvent.click(screen.getByText(/Dicter les champs/i));
    await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Transcription/i)).toBeInTheDocument();
  });

  it("affiche une erreur de dictee lorsque le micro est refuse", async () => {
    setup();
    MockSpeechRecognition.error = "not-allowed";
    fireEvent.click(screen.getByText(/Dicter les champs/i));
    await waitFor(() => expect(screen.getByText(/Erreur de dictee/i)).toBeInTheDocument());
  });
});
