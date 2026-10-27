// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DemoProvider } from "@/features/demo/context";
const { ownContext, ownShields, getUser, onAuthStateChange } = vi.hoisted(() => ({
  ownContext: vi.fn(),
  ownShields: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser,
      onAuthStateChange,
      getSession: async () => ({ data: { session: { access_token: "qa" } } }),
    },
  },
}));
vi.mock("@/features/journey/own-context-client", () => ({
  createOwnJourneyContextClient: () => ownContext,
}));
vi.mock("@/features/journey/shield-client", () => ({
  createOwnShieldClient: (scope: unknown) => () => ownShields(scope),
}));
vi.mock("@/features/journey/my-shields", () => ({
  MyShields: (props: unknown) => <output data-testid="state">{JSON.stringify(props)}</output>,
}));
import { AppShieldsSection } from "@/features/journey/app-shields-section";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "different-auth-user" } }, error: null });
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  ownContext.mockResolvedValue(scope);
  ownShields.mockResolvedValue({ marker: "authorized-overview" });
});
it("fetches and renders real scope from context endpoint, not demo clinic or Auth user ID", async () => {
  await act(async () => {
    render(
      <DemoProvider>
        <AppShieldsSection />
      </DemoProvider>,
    );
  });
  expect(ownShields).toHaveBeenCalledWith(expect.objectContaining(scope));
  expect(JSON.parse(screen.getByTestId("state").textContent!)).toMatchObject({
    ...scope,
    isDemo: false,
    status: "ready",
    overview: { marker: "authorized-overview" },
  });
  expect(screen.getByTestId("state").textContent).not.toContain("different-auth-user");
});
it("context failure never calls shield read or enables demo", async () => {
  ownContext.mockRejectedValueOnce(new Error("denied"));
  await act(async () => {
    render(
      <DemoProvider>
        <AppShieldsSection />
      </DemoProvider>,
    );
  });
  expect(ownShields).not.toHaveBeenCalled();
  expect(JSON.parse(screen.getByTestId("state").textContent!)).toMatchObject({
    isDemo: false,
    status: "error",
  });
});
it("discards a late context after logout before it can read or render shields", async () => {
  let finish!: (value: unknown) => void;
  ownContext.mockReturnValueOnce(
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
  await act(async () => {
    finish(scope);
  });
  expect(ownShields).not.toHaveBeenCalled();
  expect(screen.getByTestId("state").textContent).not.toContain(scope.patientId);
});
