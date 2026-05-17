import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppLayout from "../layout/AppLayout";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

describe("AppLayout", () => {
  it("renders top navigation, sidebar, and content", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppLayout title="Dashboard">
            <div>Content</div>
          </AppLayout>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Content")).not.toBeNull();
    expect(screen.getByLabelText("Navigation principale")).not.toBeNull();
  });
});
