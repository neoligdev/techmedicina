// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { DemoProvider } from "@/features/demo/context";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser } } }));
vi.mock("@/components/platform/patient-home", () => ({
  PatientHome: ({ isDemo }: { isDemo: boolean }) => (
    <output data-testid="mode">{isDemo ? "demo" : "restricted"}</output>
  ),
}));
vi.mock("@/features/journey/my-shields", () => ({
  MyShields: ({ isDemo }: { isDemo: boolean }) => (
    <output data-testid="mode">{isDemo ? "demo" : "restricted"}</output>
  ),
}));
import { PacienteDashboard } from "@/components/platform/mockups/paciente-dashboard";
import { AppShieldsSection } from "@/features/journey/app-shields-section";
afterEach(cleanup);
beforeEach(() => getUser.mockReset());
for (const [name, Component] of [
  ["painel", PacienteDashboard],
  ["escudos", AppShieldsSection],
] as const) {
  it(`${name}: network rejection keeps demo disabled`, async () => {
    getUser.mockRejectedValueOnce(new Error("network unavailable"));
    await act(async () => {
      render(
        <DemoProvider>
          <Component />
        </DemoProvider>,
      );
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("restricted");
  });
  it(`${name}: resolved auth error is not proof of missing session`, async () => {
    getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("auth server unavailable"),
    });
    await act(async () => {
      render(
        <DemoProvider>
          <Component />
        </DemoProvider>,
      );
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("restricted");
  });
  it(`${name}: confirmed absent session can enter an authorized demo environment`, async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthSessionMissingError() });
    await act(async () => {
      render(
        <DemoProvider>
          <Component />
        </DemoProvider>,
      );
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("demo");
  });
  it(`${name}: real user never falls back to demo`, async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "qa-user", user_metadata: {} } },
      error: null,
    });
    await act(async () => {
      render(
        <DemoProvider>
          <Component />
        </DemoProvider>,
      );
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("restricted");
  });
}
