import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ActionBar from "@/components/ActionBar";

describe("ActionBar filters and sorting", () => {
  it("updates search and score filters", () => {
    const setSearch = vi.fn();
    const onFilterLeadScore = vi.fn();
    const onClearLeadFilter = vi.fn();
    const onSortLeadScore = vi.fn();

    render(
      <ActionBar
        onAdd={() => {}}
        onImport={() => {}}
        onToggleMap={() => {}}
        onSortLeadScore={onSortLeadScore}
        onFilterLeadScore={onFilterLeadScore}
        onClearLeadFilter={onClearLeadFilter}
        viewMode="list"
        setViewMode={() => {}}
        search=""
        setSearch={setSearch}
        minScore={20}
        sortByScore={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Rechercher un client/i), { target: { value: "dupont" } });
    expect(setSearch).toHaveBeenCalledWith("dupont");

    fireEvent.change(screen.getByLabelText(/Filtrer par score minimum/i), { target: { value: "35" } });
    expect(onFilterLeadScore).toHaveBeenCalledWith(35);

    fireEvent.click(screen.getByLabelText(/Filtrer lead score/i));
    expect(onFilterLeadScore).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Réinitialiser le filtre score/i));
    expect(onClearLeadFilter).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Trier par lead score/i));
    expect(onSortLeadScore).toHaveBeenCalled();
  });
});
