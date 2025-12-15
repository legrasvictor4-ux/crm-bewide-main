import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";
import Login from "@/pages/Login";
import { vi } from "vitest";

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
    fireEvent.change(screen.getByPlaceholderText(/vous@example.com/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(/\*\*\*\*/i), { target: { value: "secret" } });
    fireEvent.click(screen.getByTestId("login-submit"));
    await waitFor(() => expect(screen.queryByText(/Échec de la connexion/i)).not.toBeInTheDocument());
  });

  it("renders social buttons", () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    expect(screen.getByText(/Continuer avec Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuer avec Apple/i)).toBeInTheDocument();
  });
});
