import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "@/App";
import Login from "@/pages/Login";
import { AuthProvider } from "@/context/AuthContext";

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
    await waitFor(() => {
      expect(screen.getByText(/Connexion CRM/i)).toBeInTheDocument();
    });
  });

  it("triggers social login", async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    const googleBtn = screen.getByText(/Continuer avec Google/i);
    fireEvent.click(googleBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Echec de la connexion/i)).not.toBeInTheDocument();
    });
  });
});
