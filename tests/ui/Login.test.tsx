import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import Login from "../../src/pages/Login";
import { vi, describe, it, expect } from "vitest";

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<any>("@/context/AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      login: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Login page", () => {
  it("submits email/password login", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    fireEvent.change(screen.getByPlaceholderText(/email@myclerk\.app/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() => expect(screen.queryByText(/Échec de la connexion/i)).not.toBeInTheDocument());
  });

  it("renders social buttons", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const skipBtn = screen.queryByRole("button", { name: /Passer/i });
    if (skipBtn) fireEvent.click(skipBtn);

    expect(screen.getByText(/Se connecter avec Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Se connecter avec Apple/i)).toBeInTheDocument();
  });
});
