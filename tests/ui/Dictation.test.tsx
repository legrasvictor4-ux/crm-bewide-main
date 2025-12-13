import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddClientDialog from "@/components/AddClientDialog";
import { vi } from "vitest";

const mockStart = vi.fn();
const mockSpeech = {
  start: mockStart,
  lang: "",
  interimResults: false,
  continuous: false,
  onstart: () => {},
  onend: () => {},
  onerror: () => {},
  onresult: (_e: any) => {},
};

vi.stubGlobal("webkitSpeechRecognition", function () {
  return mockSpeech;
});

describe("Vocal dictation in AddClientDialog", () => {
  it("populates fields from speech result", async () => {
    render(
      <AddClientDialog open={true} onOpenChange={() => {}} />
    );
    const btn = screen.getByText(/Dicter les champs/i);
    fireEvent.click(btn);
    const fakeEvent = {
      results: [
        [{ transcript: "Jean Dupont, téléphone zéro six douze trente-quatre cinquante-six soixante-dix-huit jean@exemple.com" }],
      ],
    };
    mockSpeech.onresult?.(fakeEvent as any);
    await waitFor(() => {
      expect((screen.getByLabelText(/Nom/i) as HTMLInputElement).value.length).toBeGreaterThan(0);
    });
  });
});
