import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AvailabilityWorkspace } from "@/features/agenda/availability-workspace";
import { AvailabilityConflict } from "@/features/agenda/availability-client";

afterEach(cleanup);

const clinicId = "11111111-1111-4111-8111-111111111111";
const doctorUserId = "22222222-2222-4222-8222-222222222222";
const clinic = { id: clinicId, name: "Clínica Teste D108" };

function sampleItem(n: number) {
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

it("exibe fuso horário explícito da clínica e estado informativo de homologação", () => {
  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      isOperationalEnabled={false}
    />,
  );

  // Fuso horário identificado com clareza
  const badge = screen.getByTestId("clinic-timezone-badge");
  expect(badge).toHaveTextContent("America/Bahia");

  // Alerta informativo de segurança quando não operacional
  expect(screen.getByText(/Módulo em Homologação Técnica \(Ciclo D109\)/i)).toBeInTheDocument();
  expect(screen.getByText(/015_doctor_availability\.sql/i)).toBeInTheDocument();
});

it("suporta multiclínica com fusos horários IANA diferentes configurados nas clínicas", () => {
  const clinicBahia = { id: clinicId, name: "Clínica Bahia", timeZone: "America/Bahia" };
  const clinicSaoPaulo = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Clínica Horizonte",
    timeZone: "America/Sao_Paulo",
  };

  const { unmount } = render(
    <AvailabilityWorkspace
      clinic={clinicBahia}
      doctorUserId={doctorUserId}
      isOperationalEnabled={true}
    />,
  );
  expect(screen.getByTestId("clinic-timezone-badge")).toHaveTextContent("America/Bahia");
  unmount();

  render(
    <AvailabilityWorkspace
      clinic={clinicSaoPaulo}
      doctorUserId={doctorUserId}
      isOperationalEnabled={true}
    />,
  );
  expect(screen.getByTestId("clinic-timezone-badge")).toHaveTextContent("America/Sao_Paulo");
});

it("aplica política de segurança e bloqueia agenda quando a clínica não tem fuso IANA válido", () => {
  const clinicSemFuso = { id: clinicId, name: "Clínica Sem Fuso" };

  render(
    <AvailabilityWorkspace
      clinic={clinicSemFuso}
      doctorUserId={doctorUserId}
      canWrite={true}
      canRead={true}
      isOperationalEnabled={true}
    />,
  );

  // Exibe alerta de fuso indisponível no badge e banner
  const badge = screen.getByTestId("clinic-timezone-badge");
  expect(badge).toHaveTextContent("Indisponível / Não configurado");
  expect(screen.getByTestId("timezone-missing-alert")).toBeInTheDocument();

  // Consulta fica bloqueada
  expect(screen.getByText(/Leitura indisponível neste contexto/i)).toBeInTheDocument();
  expect(screen.getByText(/Fuso da clínica: indisponível/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Consultar horários" })).toBeNull();

  // Cadastro também fica bloqueado
  fireEvent.click(screen.getByTestId("tab-cadastrar"));
  expect(screen.getByText(/Configure o fuso da clínica antes de continuar/i)).toBeInTheDocument();
  expect(screen.getByText(/Gravação indisponível neste contexto/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Salvar disponibilidade" })).toBeNull();
});

it("permite alternar entre consulta e cadastro de disponibilidade", () => {
  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      isOperationalEnabled={true}
    />,
  );

  // Inicia na aba de consulta
  expect(screen.getByTestId("workspace-list-section")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-form-section")).toBeNull();

  // Alterna para cadastro
  fireEvent.click(screen.getByTestId("tab-cadastrar"));
  expect(screen.getByTestId("workspace-form-section")).toBeInTheDocument();
  expect(screen.queryByTestId("workspace-list-section")).toBeNull();
});

it("integra AvailabilityForm para cadastro com sucesso e reenvio de proposta", async () => {
  const send = vi.fn().mockImplementation(async (proposal) => ({
    id: "99999999-9999-4999-8999-999999999999",
    clinicId,
    doctorUserId,
    ...proposal,
    createdAt: new Date().toISOString(),
  }));

  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      canWrite={true}
      send={send}
      isOperationalEnabled={true}
    />,
  );

  fireEvent.click(screen.getByTestId("tab-cadastrar"));

  fireEvent.change(screen.getByLabelText("Início"), {
    target: { value: "2026-10-15T09:00" },
  });
  fireEvent.change(screen.getByLabelText("Término"), {
    target: { value: "2026-10-15T10:00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Salvar disponibilidade" }));

  await screen.findByText(/Disponibilidade confirmada/i);
  expect(send).toHaveBeenCalledTimes(1);
});

it("trata conflito de horários de forma segura sem crash da interface", async () => {
  const send = vi.fn().mockRejectedValueOnce(new AvailabilityConflict("Conflito detectado"));

  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      canWrite={true}
      send={send}
      isOperationalEnabled={true}
    />,
  );

  fireEvent.click(screen.getByTestId("tab-cadastrar"));

  fireEvent.change(screen.getByLabelText("Início"), {
    target: { value: "2026-10-15T09:00" },
  });
  fireEvent.change(screen.getByLabelText("Término"), {
    target: { value: "2026-10-15T10:00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Salvar disponibilidade" }));

  await screen.findByText(/Há um conflito\. Recarregue sua disponibilidade/i);
});

it("integra AvailabilityList com listagem paginada e estado vazio real sem dados forjados", async () => {
  const load = vi.fn().mockResolvedValueOnce({
    clinicId,
    doctorUserId,
    items: [sampleItem(1), sampleItem(2)],
    next: null,
  });

  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      canRead={true}
      load={load}
      isOperationalEnabled={true}
    />,
  );

  fireEvent.change(screen.getByLabelText("Consultar a partir de"), {
    target: { value: "2026-10-15T00:00" },
  });
  fireEvent.change(screen.getByLabelText("Consultar até"), {
    target: { value: "2026-10-16T00:00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Consultar horários" }));

  await screen.findByText("Disponibilidade consultada.");
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

it("exibe ausência de disponibilidade quando a consulta retorna vazia", async () => {
  const load = vi.fn().mockResolvedValueOnce({ clinicId, doctorUserId, items: [], next: null });

  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      canRead={true}
      load={load}
      isOperationalEnabled={true}
    />,
  );

  fireEvent.change(screen.getByLabelText("Consultar a partir de"), {
    target: { value: "2026-10-15T00:00" },
  });
  fireEvent.change(screen.getByLabelText("Consultar até"), {
    target: { value: "2026-10-16T00:00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Consultar horários" }));

  await screen.findByText("Nenhum intervalo neste período.");
});

it("bloqueia ações e protege contra chamadas indevidas quando canWrite e canRead são falsos", () => {
  const send = vi.fn();
  const load = vi.fn();

  render(
    <AvailabilityWorkspace
      clinic={clinic}
      doctorUserId={doctorUserId}
      timeZone="America/Bahia"
      canWrite={false}
      canRead={false}
      send={send}
      load={load}
      isOperationalEnabled={true}
    />,
  );

  // Na aba listar, sem permissão, o botão não é exibido
  expect(screen.queryByRole("button", { name: "Consultar horários" })).toBeNull();
  expect(load).not.toHaveBeenCalled();

  // Na aba cadastrar, sem permissão, o botão de salvar não é exibido
  fireEvent.click(screen.getByTestId("tab-cadastrar"));
  expect(screen.queryByRole("button", { name: "Salvar disponibilidade" })).toBeNull();
  expect(send).not.toHaveBeenCalled();
});
