import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AvailabilityList } from "@/features/agenda/availability-list";
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222";
const props = { clinicId, doctorUserId, timeZone: "America/Bahia" };
afterEach(cleanup);
function fill() {
  fireEvent.change(screen.getByLabelText("Consultar a partir de"), {
    target: { value: "2026-10-15T00:00" },
  });
  fireEvent.change(screen.getByLabelText("Consultar até"), {
    target: { value: "2026-10-16T00:00" },
  });
}
function item(n: number) {
  return {
    id: `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`,
    clinicId,
    doctorUserId,
    sourceRequestId: clinicId,
    interval: {
      startsAt: `2026-10-15T12:${String(n).padStart(2, "0")}:00Z`,
      endsAt: "2026-10-15T13:00:00Z",
    },
    createdAt: "2026-10-14T00:00:00Z",
  };
}
it("loads explicit clinic-time window and appends next page without replacing previous items", async () => {
  const items = Array.from({ length: 20 }, (_, i) => item(i));
  const next = { id: items[19]!.id, startsAt: items[19]!.interval.startsAt };
  const load = vi
    .fn()
    .mockResolvedValueOnce({ clinicId, doctorUserId, items, next })
    .mockResolvedValueOnce({ clinicId, doctorUserId, items: [item(20)], next: null });
  render(<AvailabilityList {...props} canRead load={load} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Consultar horários" }));
  await screen.findByText("Disponibilidade consultada.");
  expect(load.mock.calls[0]?.[0].window.startsAt).toBe("2026-10-15T03:00:00.000Z");
  expect(screen.getAllByRole("listitem")).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Carregar mais horários" }));
  await screen.findByText(/15\/10\/2026, 09:20/);
  expect(screen.getAllByRole("listitem")).toHaveLength(21);
  expect(load.mock.calls[1]?.[0].after).toEqual(next);
});
it("defaults to denied and ignores late response after clinic context changes", async () => {
  let finish!: (value: unknown) => void;
  const load = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(<AvailabilityList {...props} load={load} />);
  expect(screen.queryByRole("button")).toBeNull();
  rerender(<AvailabilityList {...props} canRead load={load} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Consultar horários" }));
  rerender(<AvailabilityList {...props} clinicId={doctorUserId} canRead load={load} />);
  await act(async () => finish({ clinicId, doctorUserId, items: [item(1)], next: null }));
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(screen.getByLabelText("Consultar a partir de")).toHaveValue("");
});
