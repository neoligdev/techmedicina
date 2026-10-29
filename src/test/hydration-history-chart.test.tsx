import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, it, expect } from "vitest";
import { HydrationHistoryChart } from "@/features/hydration/history-chart";
afterEach(cleanup);
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const window = { period: "week", timeZone: "America/Bahia", asOf: "2026-10-29T15:00:00Z" };
it("renders unknown days as unknown rather than zero consumption or missed target", () => {
  render(<HydrationHistoryChart scope={scope} records={[]} window={window} />);
  expect(screen.getByText("Sem registros no período")).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(8);
  expect(screen.getAllByText("Sem registro")).toHaveLength(7);
  expect(screen.queryByText("0 mL")).not.toBeInTheDocument();
});
it("renders explicit zero accessibly and never fabricates progress toward a goal", () => {
  render(
    <HydrationHistoryChart
      scope={scope}
      records={[
        {
          ...scope,
          id: "33333333-3333-4333-8333-333333333333",
          revision: 1,
          status: "active",
          volumeMl: 0,
          occurredAt: "2026-10-29T12:00:00Z",
        },
      ]}
      window={window}
    />,
  );
  expect(screen.getByText("0 mL")).toBeInTheDocument();
  expect(screen.getByText("0 mL registrados no período")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.getByTestId("hydration-bar-2026-10-29")).toHaveStyle({ height: "0%" });
});
