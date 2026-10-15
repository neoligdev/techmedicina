import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AvailabilityForm } from "@/features/agenda/availability-form";
import { clinicTimeToInstant } from "@/features/agenda/local-time";
import { availabilityProposalSchema } from "@/features/agenda/availability";
afterEach(cleanup);
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222";
const props = { clinicId, doctorUserId, timeZone: "America/Bahia" };
function fill() {
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-10-15T09:00" } });
  fireEvent.change(screen.getByLabelText("Término"), { target: { value: "2026-10-15T10:00" } });
}
function saved(input: ReturnType<typeof availabilityProposalSchema.parse>) {
  return { id: clinicId, clinicId, doctorUserId, ...input, createdAt: "2026-10-15T12:00:00Z" };
}
it("converts explicit clinic timezone, rejects calendar errors, gaps and folds", () => {
  expect(clinicTimeToInstant("2026-10-15T09:00", "America/Bahia")).toBe("2026-10-15T12:00:00.000Z");
  expect(() => clinicTimeToInstant("2026-02-30T09:00", "UTC")).toThrow("inválido");
  expect(() => clinicTimeToInstant("2026-03-08T02:30", "America/New_York")).toThrow("não existe");
  expect(() => clinicTimeToInstant("2026-11-01T01:30", "America/New_York")).toThrow("ambíguo");
  expect(() => clinicTimeToInstant("2026-10-15T09:00", "invalid/zone")).toThrow("Fuso");
});
it("uncertain write locks inputs, reuses request and only receipt confirms", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("lost"))
    .mockImplementationOnce(async (input) => saved(input));
  render(<AvailabilityForm {...props} canWrite send={send} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Salvar disponibilidade" }));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.getByLabelText("Início")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reenviar mesmo intervalo" }));
  await screen.findByText(/Disponibilidade confirmada/);
  expect(send.mock.calls[0]?.[0]).toEqual(send.mock.calls[1]?.[0]);
  expect(send.mock.calls[0]?.[0].interval.startsAt).toBe("2026-10-15T12:00:00.000Z");
  fireEvent.click(screen.getByRole("button", { name: "Adicionar outro intervalo" }));
  expect(screen.getByLabelText("Início")).toHaveValue("");
});
it("requires authority and clinic timezone", () => {
  const send = vi.fn();
  const { rerender } = render(<AvailabilityForm {...props} send={send} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(<AvailabilityForm {...props} timeZone="" canWrite send={send} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(send).not.toHaveBeenCalled();
});
it("ignores late response after clinician changes", async () => {
  let finish!: (value: unknown) => void;
  const send = vi.fn(
    (input: ReturnType<typeof availabilityProposalSchema.parse>) =>
      new Promise((resolve) => {
        finish = () => resolve(saved(input));
      }),
  );
  const { rerender } = render(<AvailabilityForm {...props} canWrite send={send} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Salvar disponibilidade" }));
  rerender(<AvailabilityForm {...props} doctorUserId={clinicId} canWrite send={send} />);
  await act(async () => {
    finish(null);
  });
  expect(screen.queryByText(/Disponibilidade confirmada/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Salvar disponibilidade" })).not.toBeDisabled();
});
