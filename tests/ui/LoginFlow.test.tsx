import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../../src/App";
import Login from "../../src/pages/Login";
import { AuthProvider } from "../../src/context/AuthContext";

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<any>("@/context/AuthContext");
  return {
    ...actual,
    useAuth: () => ({
      login: vi.fn().mockResolvedValue(undefined),
      token: null,
      email: null,
    }),
    AuthProvider: actual.AuthProvider,
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Login flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects to login when no token", async () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    // Fermer l'intro si elle est affichée
    const skipBtn = screen.queryByRole("button", { name: /Passer/i });
    if (skipBtn) fireEvent.click(skipBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });
  });

  it("triggers social login", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const skipBtn = screen.queryByRole("button", { name: /Passer/i });
    if (skipBtn) fireEvent.click(skipBtn);

    const googleBtn = screen.getByText(/Se connecter avec Google/i);
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Echec de la connexion/i)).not.toBeInTheDocument();
    });
  });
});
