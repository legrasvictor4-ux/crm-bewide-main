import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import PlanPreview from "../PlanPreview";

const samplePlan = [
  { id: "a1", title: "Rdv A", start: "2025-01-15T09:00:00.000Z", opportunityScore: 9, reason: "Score 9 et proximité (1.0 km)" },
  { id: "b2", title: "Rdv B", start: "2025-01-15T11:00:00.000Z", opportunityScore: 6, reason: "Score 6 et proximité (2.0 km)" },
];

describe("PlanPreview", () => {
  it("renders plan items and triggers confirmation", () => {
    const onConfirm = vi.fn();
    render(<PlanPreview plan={samplePlan} onConfirm={onConfirm} warnings={["Attention aux adresses manquantes"]} />);

    expect(screen.getByTestId("plan-preview")).toBeInTheDocument();
    expect(screen.getByText(/Rdv A/)).toBeInTheDocument();
    expect(screen.getAllByText(/Score 9/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId("plan-confirm"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("allows adjust callback", () => {
    const onAdjust = vi.fn();
    render(<PlanPreview plan={samplePlan} onConfirm={() => undefined} onAdjust={onAdjust} />);
    fireEvent.click(screen.getByTestId("plan-adjust"));
    expect(onAdjust).toHaveBeenCalled();
  });
});
