// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthSessionMissingError } from "@supabase/supabase-js";
import { DemoProvider } from "@/features/demo/context";
const { getUser, onAuthStateChange } = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser,
      onAuthStateChange,
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));
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
beforeEach(() => {
  getUser.mockReset();
  onAuthStateChange
    .mockReset()
    .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
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

it("escudos: a late initial user lookup cannot override a subsequent sign-out", async () => {
  let finish!: (value: unknown) => void;
  getUser.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await act(async () => {
    render(
      <DemoProvider>
        <AppShieldsSection />
      </DemoProvider>,
    );
  });
  const callback = onAuthStateChange.mock.calls[0]![0] as (event: string, session: null) => void;
  await act(async () => {
    callback("SIGNED_OUT", null);
  });
  expect(screen.getByTestId("mode")).toHaveTextContent("demo");
  await act(async () => {
    finish({ data: { user: { id: "old-user" } }, error: null });
  });
  expect(screen.getByTestId("mode")).toHaveTextContent("demo");
});
it("escudos: a late failed lookup cannot replace a subsequently authenticated session", async () => {
  let finish!: (value: unknown) => void;
  getUser.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await act(async () => {
    render(
      <DemoProvider>
        <AppShieldsSection />
      </DemoProvider>,
    );
  });
  const callback = onAuthStateChange.mock.calls[0]![0] as (
    event: string,
    session: { user: { id: string } },
  ) => void;
  await act(async () => {
    callback("SIGNED_IN", { user: { id: "new-user" } });
  });
  await act(async () => {
    finish({ data: { user: null }, error: new AuthSessionMissingError() });
  });
  expect(screen.getByTestId("mode")).toHaveTextContent("restricted");
});
