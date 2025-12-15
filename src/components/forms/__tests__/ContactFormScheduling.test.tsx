import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { contactRecordSchema, type ContactRecord } from "@/types/contact";

const baseContact: ContactRecord = {
  company: "ACME",
  address: "1 rue",
  postalCode: "75000",
  city: "Paris",
  status: "prospect",
  opportunityScore: 5,
  primaryContact: { name: "Jean", role: "CEO", phone: "0102030405", email: "jean@example.com" },
  appointment: {
    date: "2025-01-15T09:00",
    summary: "Demo",
  },
};

vi.mock("@/services/scheduling", () => ({
  validateAppointment: vi.fn(),
}));

describe("ContactForm scheduling validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fillRequiredFields = async () => {
    await userEvent.clear(screen.getByTestId("company"));
    await userEvent.type(screen.getByTestId("company"), baseContact.company);
    await userEvent.type(screen.getByTestId("address"), baseContact.address);
    await userEvent.type(screen.getByTestId("postalCode"), baseContact.postalCode);
    await userEvent.type(screen.getByTestId("city"), baseContact.city);
    await userEvent.type(screen.getByTestId("primaryContact.name"), baseContact.primaryContact.name);
    await userEvent.type(screen.getByTestId("primaryContact.role"), baseContact.primaryContact.role);
    await userEvent.type(screen.getByTestId("primaryContact.phone"), baseContact.primaryContact.phone);
    await userEvent.type(screen.getByTestId("primaryContact.email"), baseContact.primaryContact.email);
    await userEvent.selectOptions(screen.getByTestId("status"), "prospect");
    await userEvent.clear(screen.getByTestId("opportunityScore"));
    await userEvent.type(screen.getByTestId("opportunityScore"), String(baseContact.opportunityScore ?? 5));
    await userEvent.type(screen.getByTestId("appointment.date"), baseContact.appointment?.date ?? "");
    await userEvent.type(screen.getByTestId("appointment.summary"), baseContact.appointment?.summary ?? "");
  };

  it("blocks submit on hard conflict", async () => {
    const handleSubmit = vi.fn();
    const { default: ContactForm } = await import("../ContactForm");
    const validator = vi.fn().mockResolvedValue({
      success: true,
      conflicts: [{ code: "TIME_OVERLAP", message: "Chevauchement" }],
      travelCheck: 0,
    });

    render(<ContactForm onSubmit={handleSubmit} defaultValues={baseContact} validateAppointmentFn={validator} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByTestId("submit-contact"));

    await waitFor(() => expect(validator).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Chevauchement/)).toBeInTheDocument());
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("allows confirmation on warning-only conflict", async () => {
    const handleSubmit = vi.fn();
    const { default: ContactForm } = await import("../ContactForm");
    const validator = vi.fn().mockResolvedValue({
      success: true,
      conflicts: [{ code: "TRAVEL_TOO_TIGHT", message: "Trajet court", blocking: false }],
      travelCheck: 1,
    });

    render(<ContactForm onSubmit={handleSubmit} defaultValues={baseContact} validateAppointmentFn={validator} />);

    await fillRequiredFields();
    fireEvent.click(screen.getByTestId("submit-contact"));

    await waitFor(() => expect(validator).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("travel-warning")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Confirmer/));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
  });
});
