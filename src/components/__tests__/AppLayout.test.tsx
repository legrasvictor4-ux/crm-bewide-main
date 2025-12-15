import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLayout from "../layout/AppLayout";
import { MemoryRouter } from "react-router-dom";

describe("AppLayout", () => {
  it("renders top navigation, sidebar, and content", () => {
    render(
      <MemoryRouter>
        <AppLayout title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByLabelText("Navigation principale")).toBeInTheDocument();
  });
});
