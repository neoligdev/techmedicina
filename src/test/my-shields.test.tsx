import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MyShields } from "@/features/journey/my-shields";
afterEach(cleanup);
it("does not assign scores or achievements without authorized data", () => {
  render(<MyShields />);
  expect(screen.getByRole("heading", { name: "Meus Escudos" })).toBeInTheDocument();
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/Escudo ativo:/)).not.toBeInTheDocument();
});
it("rejects malformed payload before showing data", () => {
  render(<MyShields overview={{ clinicId: "other", state: { scoreAverage: 95 } }} />);
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/95 pontos/)).not.toBeInTheDocument();
});
