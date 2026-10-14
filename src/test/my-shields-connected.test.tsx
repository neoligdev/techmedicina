import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MyShieldsConnected } from "@/features/journey/my-shields-connected";
afterEach(cleanup);
const props = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  getAccessToken: async () => "qa",
};
it("default denial never requests health data", () => {
  const fetcher = vi.fn();
  render(<MyShieldsConnected {...props} fetcher={fetcher} />);
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("Consulta indisponível");
});
it("failed read can retry with fresh session", async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error("network"));
  render(<MyShieldsConnected {...props} canRead fetcher={fetcher} />);
  await screen.findByRole("button", { name: "Tentar novamente" });
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("button", { name: "Tentar novamente" });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Acompanhamento carregado.")).not.toBeInTheDocument();
});
it("late result after permission revocation does not revive old screen", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(<MyShieldsConnected {...props} canRead fetcher={fetcher} />);
  await act(async () => {});
  rerender(<MyShieldsConnected {...props} canRead={false} fetcher={fetcher} />);
  await act(async () => {
    finish(Response.json({ overview: null }));
  });
  expect(screen.getByRole("status")).toHaveTextContent("Consulta indisponível");
  expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
});
