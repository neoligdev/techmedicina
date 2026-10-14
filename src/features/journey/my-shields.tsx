import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patientShieldOverviewSchema, SHIELD_TIERS } from "./contracts";

/** Presentation only; the server must authorize the patient's overview first. */
export function MyShields({
  overview,
  clinicId,
  patientId,
}: {
  overview?: unknown;
  clinicId?: string;
  patientId?: string;
}) {
  const parsed = patientShieldOverviewSchema.safeParse(overview);
  const data = parsed.success ? parsed.data : null;
  const scoped =
    data &&
    clinicId &&
    patientId &&
    data.clinicId === clinicId &&
    data.patientId === patientId &&
    data.state.clinicId === clinicId &&
    data.state.patientId === patientId &&
    data.history.every((event) => event.clinicId === clinicId && event.patientId === patientId);
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 pb-28 md:p-8">
      <header>
        <p className="text-sm text-muted-foreground">JORNADA · Acompanhamento</p>
        <h1 className="text-3xl font-semibold">Meus Escudos</h1>
        <p className="mt-2 text-muted-foreground">
          Suas conquistas fazem parte da sua história. Uma mudança no escudo ativo preserva as
          conquistas anteriores.
        </p>
      </header>
      {!scoped ? (
        <Card>
          <CardHeader>
            <CardTitle>Seu histórico estará aqui</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Nenhum histórico autorizado foi carregado. A conexão com seu acompanhamento está em
              preparação.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Não há pontuação ou conquista atribuída nesta tela.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Escudo ativo: {SHIELD_TIERS[data.state.activeShield].name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.state.isProvisional && (
                <p>Estado provisório: acompanhamento ainda em formação.</p>
              )}
              <p>
                JORNADA: {data.state.scoreAverageRounded ?? "indisponível"}
                {data.state.scoreAverageRounded !== null ? " pontos" : ""}
              </p>
              <p>{data.state.evaluableDaysCount} dias avaliáveis na janela.</p>
              {data.state.isProvisional ? (
                <p>O progresso será mostrado quando houver acompanhamento suficiente.</p>
              ) : data.nextTier ? (
                <div className="space-y-2">
                  <p>Próximo escudo: {data.nextTier.name}</p>
                  <progress
                    className="h-2 w-full accent-primary"
                    aria-label="Progresso para o próximo escudo"
                    max={100}
                    value={data.progress.progressPercentage}
                  />
                  <p className="text-sm">
                    {data.progress.pointsNeededToNextTier} pontos até o próximo nível, conforme os
                    critérios em homologação.
                  </p>
                </div>
              ) : (
                <p>Você está no último nível da JORNADA.</p>
              )}
              <p>VITALIDADE: indisponível/não calculada.</p>
              <p className="text-sm text-muted-foreground">
                Critérios de Escudos em homologação; não representam avaliação clínica.
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.values(SHIELD_TIERS).map((tier) => {
              const earned = data.history.some(
                (event) =>
                  event.shield === tier.id &&
                  (event.action === "promotion" ||
                    event.action === "initial" ||
                    event.action === "reacquisition"),
              );
              const active = data.state.activeShield === tier.id;
              return (
                <Card key={tier.id}>
                  <CardContent className="space-y-2 pt-6">
                    <Shield aria-hidden="true" className="h-9 w-9 text-primary" />
                    <h2 className="font-semibold">{tier.name}</h2>
                    <p className="text-sm">
                      {active ? "Ativo" : earned ? "Conquistado" : "Bloqueado"}
                    </p>
                    <p className="text-xs text-muted-foreground">Arte oficial em aprovação</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Histórico de conquistas</CardTitle>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <p>Nenhuma conquista registrada.</p>
              ) : (
                <ul className="space-y-4">
                  {data.history.map((event) => (
                    <li key={event.id} className="rounded-lg border border-border p-4">
                      <h3 className="font-medium">{SHIELD_TIERS[event.shield].name}</h3>
                      <time dateTime={event.occurredAt}>
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Bahia",
                        }).format(new Date(event.occurredAt))}{" "}
                        · America/Bahia
                      </time>
                      <p>JORNADA: {event.scoreAverage ?? "indisponível"}</p>
                      <p>VITALIDADE: indisponível/não calculada.</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
