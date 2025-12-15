import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AddClientDialog from "@/components/AddClientDialog";
import { vi } from "vitest";

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

type DictationResult = { transcript: string };
type DictationEvent = { results: ArrayLike<{ 0: DictationResult }> };

interface TestSpeech {
  start: () => void;
  onresult?: (event: DictationEvent) => void;
  onstart?: () => void;
  onend?: () => void;
  onerror?: (event: { error?: string }) => void;
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
}

type TestGlobal = typeof globalThis & {
  __TEST_SPEECH__?: new () => TestSpeech;
  __lastSpeechInstance?: TestSpeech;
  fetch?: typeof fetch;
};

const queryClient = new QueryClient();

describe("Vocal add client", () => {
  beforeEach(() => {
    (globalThis as TestGlobal).__TEST_SPEECH__ = function MockSpeech(this: TestSpeech) {
      (globalThis as TestGlobal).__lastSpeechInstance = this;
      this.start = () => {};
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as TestGlobal).__TEST_SPEECH__;
    delete (globalThis as TestGlobal).__lastSpeechInstance;
  });

  it("fills fields from dictation and submits", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddClientDialog open={true} onOpenChange={() => {}} />
      </QueryClientProvider>
    );

    const button = screen.getByText(/Dicter les champs/i);
    fireEvent.click(button);

    const instance = (globalThis as TestGlobal).__lastSpeechInstance;
    instance?.onresult?.({
      results: [[{ transcript: "Jean Test, +33611223344 jean@test.com" }]],
    } as DictationEvent);

    fireEvent.change(screen.getByLabelText(/Nom/i), { target: { value: "Jean Test" } });
    fireEvent.change(screen.getByLabelText(/Numero de telephone/i), { target: { value: "+33611223344" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "jean@test.com" } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Notes" } });

    fireEvent.click(screen.getByTestId("client-submit"));

    await waitFor(() => expect(mutateSpy).toHaveBeenCalled());
  });
});
