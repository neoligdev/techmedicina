import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { AuthApiError, type AuthChangeEvent, type Session, type User } from "@supabase/supabase-js";
import { LoginPage } from "../login-page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signIn,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.subscribe,
    },
  },
}));
const user: User = {
  id: "test-user",
  app_metadata: { role: "super_admin" },
  user_metadata: { role: "admin", clinicId: "forged" },
  aud: "authenticated",
  created_at: "2026-10-10T00:00:00Z",
};
function session(token = "test-token"): Session {
  return {
    access_token: token,
    refresh_token: "refresh-test",
    token_type: "bearer",
    expires_in: 3600,
    user,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
let callback: (event: AuthChangeEvent, value: Session | null) => void;
async function form() {
  await screen.findByLabelText("E-mail");
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "teste@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "  senha exata  " } });
}
function emit(event: AuthChangeEvent, value: Session | null) {
  act(() => callback(event, value));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://mock.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signIn.mockResolvedValue({ data: { user, session: session() }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.fetch.mockImplementation(async () => Response.json({ status: "ok" }));
  mocks.subscribe.mockImplementation((listener: typeof callback) => {
    callback = listener;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Login Cloud — identidade confirmada pelo servidor", () => {
  it("mantém a marca, rótulos, autocomplete e distinção da demonstração", async () => {
    render(<LoginPage />);
    await form();
    expect(screen.getByText("PlugPix")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
    expect(screen.getByRole("link", { name: "Explorar demonstração" })).toHaveAttribute(
      "href",
      "/",
    );
  });
  it("preserva a senha e valida a resposta do login mesmo sem evento do SDK", async () => {
    render(<LoginPage />);
    await form();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("Conta autenticada");
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "teste@example.com",
      password: "  senha exata  ",
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/access-check",
      expect.objectContaining({
        cache: "no-store",
        headers: { Authorization: "Bearer test-token" },
      }),
    );
    expect(screen.getByText("Acesso aguardando vínculo autorizado")).toBeInTheDocument();
    expect(screen.queryByText("super_admin")).not.toBeInTheDocument();
    expect(screen.queryByText("forged")).not.toBeInTheDocument();
  });
  it("bloqueia submissão duplicada durante o provider", async () => {
    const pending = deferred<Awaited<ReturnType<typeof sessionResult>>>();
    mocks.signIn.mockReturnValue(pending.promise);
    render(<LoginPage />);
    await form();
    const button = screen.getByRole("button", { name: "Entrar" });
    fireEvent.click(button);
    fireEvent.submit(button.closest("form")!);
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => pending.resolve(sessionResult()));
    await screen.findByText("Conta autenticada");
  });
  it.each(["provider-error", "throw", "no-session"])(
    "mostra falha genérica: %s",
    async (failure) => {
      if (failure === "throw") mocks.signIn.mockRejectedValue(new Error("secret provider detail"));
      else
        mocks.signIn.mockResolvedValue({
          data: { user: null, session: null },
          error:
            failure === "provider-error"
              ? new AuthApiError("secret provider detail", 400, "invalid_credentials")
              : null,
        });
      render(<LoginPage />);
      await form();
      fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível entrar.");
      expect(screen.queryByText(/secret provider/)).not.toBeInTheDocument();
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );
  it.each([401, 500, "html", "wrong-json", "network"])(
    "recusa confirmação inválida: %s",
    async (result) => {
      mocks.getSession.mockResolvedValue({ data: { session: session() }, error: null });
      if (typeof result === "number")
        mocks.fetch.mockResolvedValue(new Response("error", { status: result }));
      else if (result === "network") mocks.fetch.mockRejectedValue(new Error("network secret"));
      else if (result === "html")
        mocks.fetch.mockResolvedValue(new Response("<html>preview</html>"));
      else mocks.fetch.mockResolvedValue(Response.json({ status: "other" }));
      render(<LoginPage />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível confirmar a sessão",
      );
      expect(screen.queryByText("Conta autenticada")).not.toBeInTheDocument();
    },
  );
  it("restaura e revalida o token atualizado sem assumir autoridade local", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("restored") }, error: null });
    render(<LoginPage />);
    await screen.findByText("Conta autenticada");
    emit("TOKEN_REFRESHED", session("refreshed"));
    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenLastCalledWith(
        "/api/access-check",
        expect.objectContaining({ headers: { Authorization: "Bearer refreshed" } }),
      ),
    );
    await screen.findByText("Conta autenticada");
  });
  it("o fim de uma validação velha não encerra a validação nova", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<LoginPage />);
    await form();
    emit("SIGNED_IN", session("old"));
    emit("TOKEN_REFRESHED", session("new"));
    await act(async () => first.resolve(Response.json({ status: "ok" })));
    expect(screen.getByText("Confirmando sessão no servidor…")).toBeInTheDocument();
    expect(screen.queryByText("Conta autenticada")).not.toBeInTheDocument();
    await act(async () => second.resolve(Response.json({ status: "ok" })));
    await screen.findByText("Conta autenticada");
  });
  it("logout local limpa campos e impede confirmação tardia mesmo sem evento SIGNED_OUT", async () => {
    const pending = deferred<Response>();
    mocks.fetch.mockReturnValue(pending.promise);
    render(<LoginPage />);
    await form();
    emit("SIGNED_IN", session());
    fireEvent.click(screen.getByRole("button", { name: "Sair desta sessão" }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" }));
    await act(async () => pending.resolve(Response.json({ status: "ok" })));
    expect(screen.queryByText("Conta autenticada")).not.toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("");
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });
  it.each(["error", "throw"])("não anuncia logout bem-sucedido em falha: %s", async (mode) => {
    mocks.getSession.mockResolvedValue({ data: { session: session() }, error: null });
    if (mode === "throw") mocks.signOut.mockRejectedValue(new Error("secret"));
    else mocks.signOut.mockResolvedValue({ error: new AuthApiError("secret", 500, "unknown") });
    render(<LoginPage />);
    await screen.findByText("Conta autenticada");
    fireEvent.click(screen.getByRole("button", { name: "Sair desta sessão" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível encerrar a sessão",
    );
    expect(screen.getByRole("button", { name: "Sair desta sessão" })).toBeEnabled();
  });
  it("ignora restauração inicial atrasada depois de SIGNED_OUT", async () => {
    const pending = deferred<{ data: { session: Session | null }; error: null }>();
    mocks.getSession.mockReturnValue(pending.promise);
    render(<LoginPage />);
    emit("SIGNED_OUT", null);
    await act(async () => pending.resolve({ data: { session: session() }, error: null }));
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });
  it.each(["url", "key", "secret"])(
    "contém configuração ausente/insegura sem inicializar SDK: %s",
    async (missing) => {
      vi.stubEnv(
        missing === "url" ? "VITE_SUPABASE_URL" : "VITE_SUPABASE_PUBLISHABLE_KEY",
        missing === "secret" ? "sb_secret_rejected" : "",
      );
      render(<LoginPage />);
      expect(await screen.findByRole("alert")).toHaveTextContent("temporariamente indisponível");
      expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
      expect(mocks.subscribe).not.toHaveBeenCalled();
      expect(mocks.getSession).not.toHaveBeenCalled();
    },
  );
  it("contém erro síncrono de inicialização do SDK", async () => {
    mocks.subscribe.mockImplementation(() => {
      throw new Error("secret config");
    });
    render(<LoginPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("temporariamente indisponível");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });
  it("desinscreve e aborta a requisição no unmount", async () => {
    const pending = deferred<Response>();
    mocks.fetch.mockReturnValue(pending.promise);
    const view = render(<LoginPage />);
    await form();
    emit("SIGNED_IN", session());
    const options: RequestInit = mocks.fetch.mock.calls[0]![1];
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    expect(options.signal?.aborted).toBe(true);
    await act(async () => pending.resolve(Response.json({ status: "ok" })));
  });
});
function sessionResult() {
  return { data: { user, session: session() }, error: null };
}
