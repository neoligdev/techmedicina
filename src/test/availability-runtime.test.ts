import { expect, it, vi } from "vitest";
import { createAgendaAvailabilityHandlers } from "@/lib/agenda/availability-runtime.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import type { AvailabilityRpc } from "@/lib/agenda/availability-write.server";
import type { AvailabilityReader } from "@/lib/agenda/availability-read.server";

const clinicId = "11111111-1111-4111-8111-111111111111";
const doctorUserId = "22222222-2222-4222-8222-222222222222";
const sourceRequestId = "33333333-3333-4333-8333-333333333333";

function createValidIdentity(
  overrides: Partial<AuthenticatedIdentity["links"][0]> = {},
): AuthenticatedIdentity {
  return {
    userId: doctorUserId,
    links: [
      {
        clinicId,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [
          { resource: "agenda", action: "write" },
          { resource: "agenda", action: "read" },
        ],
        ...overrides,
      },
    ],
  };
}

function setupTest(
  options: {
    identity?: AuthenticatedIdentity | null;
    rpc?: AvailabilityRpc;
    reader?: AvailabilityReader;
    lookupClinicId?: string;
  } = {},
) {
  const identity = options.identity !== undefined ? options.identity : createValidIdentity();
  const rpc: AvailabilityRpc =
    options.rpc ??
    vi.fn().mockImplementation(async (args) => ({
      data: {
        id: "44444444-4444-4444-8444-444444444444",
        clinic_id: args.p_clinic_id,
        doctor_user_id: doctorUserId,
        source_request_id: args.p_source_request_id,
        starts_at: args.p_starts_at,
        ends_at: args.p_ends_at,
        created_at: "2026-10-15T12:00:00Z",
      },
      error: null,
    }));

  const reader: AvailabilityReader =
    options.reader ??
    vi.fn().mockImplementation(async (sel) => [
      {
        id: "55555555-5555-4555-8555-555555555555",
        clinicId: sel.clinicId,
        doctorUserId: sel.doctorUserId,
        sourceRequestId,
        interval: {
          startsAt: "2026-10-15T12:00:00Z",
          endsAt: "2026-10-15T13:00:00Z",
        },
        createdAt: "2026-10-14T00:00:00Z",
      },
    ]);

  const handlers = createAgendaAvailabilityHandlers({
    lookup: async (hostname: string) => ({
      hostname,
      clinicId: options.lookupClinicId ?? clinicId,
      environment: "clinic_portal",
      status: "active",
    }),
    resolveSession: async (request: Request) => {
      const auth = request.headers.get("authorization");
      if (!auth || !auth.startsWith("Bearer valid_token")) return null;
      return identity ? { identity } : null;
    },
    rpc: () => rpc,
    reader: () => reader,
  });

  return { handlers, rpc, reader };
}

it("POST: médico autenticado e autorizado cadastra disponibilidade com sucesso e cabeçalhos privados", async () => {
  const { handlers } = setupTest();

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer valid_token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  expect(res.headers.get("Vary")).toBe("Authorization, Host");

  const body = (await res.json()) as {
    receipt: { sourceRequestId: string; clinicId: string; doctorUserId: string };
  };
  expect(body.receipt).toBeDefined();
  expect(body.receipt.sourceRequestId).toBe(sourceRequestId);
  expect(body.receipt.clinicId).toBe(clinicId);
  expect(body.receipt.doctorUserId).toBe(doctorUserId);
});

it("POST: requisição sem autenticação é rejeitada com status 401", async () => {
  const { handlers } = setupTest();

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(401);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe("Entre novamente para continuar");
});

it("POST: usuário sem perfil médico verificado ou sem grant agenda/write recebe 403", async () => {
  // Médico sem verificação médica
  const { handlers: handlersUnverified } = setupTest({
    identity: createValidIdentity({ medicalIdentityVerified: false }),
  });

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer valid_token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res1 = await handlersUnverified.POST(req);
  expect(res1.status).toBe(403);
  expect(((await res1.json()) as { error: string }).error).toBe("Acesso não autorizado");

  // Usuário com papel paciente
  const { handlers: handlersPatient } = setupTest({
    identity: createValidIdentity({
      role: "paciente" as unknown as AuthenticatedIdentity["links"][0]["role"],
    }),
  });
  const res2 = await handlersPatient.POST(req);
  expect(res2.status).toBe(403);

  // Médico sem grant de escrita
  const { handlers: handlersNoWrite } = setupTest({
    identity: createValidIdentity({ grants: [{ resource: "agenda", action: "read" }] }),
  });
  const res3 = await handlersNoWrite.POST(req);
  expect(res3.status).toBe(403);
});

it("POST: conflito de horário retorna status 409 com mensagem instrutiva", async () => {
  const { handlers } = setupTest({
    rpc: vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505" },
    }),
  });

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer valid_token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(409);
  const body = (await res.json()) as { error: string };
  expect(body.error).toContain("Há conflito neste horário");
});

it("POST: requisição com query string é recusada com status 400 para prevenir injeção", async () => {
  const { handlers } = setupTest();

  const req = new Request("https://portal.clinic.com/api/agenda/availability?clinicId=injected", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer valid_token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(400);
});

it("POST: tentativa de acesso multi-tenant cruzado (médico da Clínica A no portal da Clínica B) recebe 403", async () => {
  // Portal da Clínica B (outro UUID)
  const clinicIdB = "99999999-9999-4999-8999-999999999999";
  const { handlers } = setupTest({
    lookupClinicId: clinicIdB, // Host está associado à Clínica B
  });

  const req = new Request("https://portal.clinicb.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinicb.com",
      Authorization: "Bearer valid_token", // Usuário só tem vínculo com clinicId (Clínica A)
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(403);
  expect(((await res.json()) as { error: string }).error).toBe("Acesso não autorizado");
});

it("POST: sessão revogada (token invalidado) resulta em 401", async () => {
  const { handlers } = setupTest();

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer revoked_token", // Token revogado
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(401);
  expect(((await res.json()) as { error: string }).error).toBe("Entre novamente para continuar");
});

it("POST: falha na base de dados ou migração ausente retorna 503 com mensagem segura", async () => {
  const { handlers } = setupTest({
    rpc: vi.fn().mockRejectedValue(new Error("RPC tm_create_own_availability does not exist")),
  });

  const req = new Request("https://portal.clinic.com/api/agenda/availability", {
    method: "POST",
    headers: {
      Host: "portal.clinic.com",
      Authorization: "Bearer valid_token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceRequestId,
      interval: {
        startsAt: "2026-10-15T12:00:00.000Z",
        endsAt: "2026-10-15T13:00:00.000Z",
      },
    }),
  });

  const res = await handlers.POST(req);
  expect(res.status).toBe(503);
  expect(((await res.json()) as { error: string }).error).toBe(
    "Disponibilidade temporariamente indisponível",
  );
});

it("GET: consulta própria paginada retorna horários do médico com cabeçalhos privados", async () => {
  const { handlers, reader } = setupTest();

  const req = new Request(
    "https://portal.clinic.com/api/agenda/availability?start=2026-10-15T00%3A00%3A00Z&end=2026-10-16T00%3A00%3A00Z&limit=10",
    {
      method: "GET",
      headers: {
        Host: "portal.clinic.com",
        Authorization: "Bearer valid_token",
      },
    },
  );

  const res = await handlers.GET(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  expect(res.headers.get("Vary")).toBe("Authorization, Host");

  const body = (await res.json()) as { page: { items: unknown[] } };
  expect(body.page).toBeDefined();
  expect(body.page.items).toHaveLength(1);
  expect(reader).toHaveBeenCalled();
});

it("GET: query com parâmetro desconhecido é rejeitada com status 400", async () => {
  const { handlers } = setupTest();

  const req = new Request(
    "https://portal.clinic.com/api/agenda/availability?start=2026-10-15T00%3A00%3A00Z&end=2026-10-16T00%3A00%3A00Z&injected=1",
    {
      method: "GET",
      headers: {
        Host: "portal.clinic.com",
        Authorization: "Bearer valid_token",
      },
    },
  );

  const res = await handlers.GET(req);
  expect(res.status).toBe(400);
  expect(((await res.json()) as { error: string }).error).toBe("Consulta de horários inválida");
});

it("GET: usuário sem permissão agenda/read recebe 403", async () => {
  const { handlers } = setupTest({
    identity: createValidIdentity({ grants: [{ resource: "agenda", action: "write" }] }),
  });

  const req = new Request(
    "https://portal.clinic.com/api/agenda/availability?start=2026-10-15T00%3A00%3A00Z&end=2026-10-16T00%3A00%3A00Z&limit=10",
    {
      method: "GET",
      headers: {
        Host: "portal.clinic.com",
        Authorization: "Bearer valid_token",
      },
    },
  );

  const res = await handlers.GET(req);
  expect(res.status).toBe(403);
  expect(((await res.json()) as { error: string }).error).toBe("Acesso não autorizado");
});
