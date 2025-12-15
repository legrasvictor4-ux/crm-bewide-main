import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddClientDialog from "@/components/AddClientDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

const mutateSpy = vi.fn();

type DictationEvent = { results: ArrayLike<{ 0: { transcript: string } }> };

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

const mockStart = vi.fn();
const mockSpeech = {
  start: mockStart,
  lang: "",
  interimResults: false,
  continuous: false,
  onstart: () => {},
  onend: () => {},
  onerror: () => {},
  onresult: (_e: DictationEvent) => {},
};

vi.stubGlobal("webkitSpeechRecognition", function () {
  return mockSpeech;
});

describe("Vocal dictation in AddClientDialog", () => {
  it("populates fields from speech result", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AddClientDialog open={true} onOpenChange={() => {}} />
      </QueryClientProvider>
    );
    const btn = screen.getByText(/Dicter les champs/i);
    fireEvent.click(btn);
    const fakeEvent = {
      results: [
        [{ transcript: "Jean Dupont, téléphone zéro six douze trente-quatre cinquante-six soixante-dix-huit jean@exemple.com" }],
      ],
    };
    mockSpeech.onresult?.(fakeEvent as DictationEvent);
    await waitFor(() => {
      expect((screen.getByLabelText(/Nom/i) as HTMLInputElement).value.length).toBeGreaterThan(0);
    });
  });
});
