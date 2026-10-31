
## Planejador de lembretes em lotes — 31/10/2026

Referência local server-only: cada chamada lê no máximo 100 preferências em ordem por clínica/paciente e considera somente o minuto atual no fuso confirmado. A página inteira é validada antes de gravar. Checkpoint avança apenas se todo o lote concluir; falha exige repetir o checkpoint original, apoiando-se na unicidade SQL 046. Não existe retry automático.

O enqueue deve usar a função atômica 046, que revalida acesso/preferências. Resultado já existente para a mesma ocorrência é aceito inclusive com outra revisão/UUID; a autorização de envio continua sendo responsabilidade do worker. O planejador não constitui autorização de envio.

Dependências ainda abertas: fonte privada paginada de preferências com ACL revisada, transporte/enqueue real, testes integrados com essa fonte, privilégios dedicados, agendador, canal e consentimento. Não há endpoint público, provedor ou ativação remota. Mudanças durante uma varredura não formam snapshot transacional; horários perdidos não são recuperados.

Testes usam dependências simuladas para validar limites, ordenação, cursor, minuto expirado, resposta estrangeira e falha incerta. Não comprovam entrega ou deduplicação de banco por si; esta última foi exercitada separadamente nos testes locais da 046.

Validação desta etapa: 37 testes direcionados em quatro arquivos aprovados (planejador, fila, executor e status), TypeScript, lint dos arquivos afetados e build Vite aprovados. Não foi repetida a suíte global. Main permanece 6a4936b; nenhuma migração remota aplicada nesta etapa.

## Integração privada com SQL 047 — 31/10/2026

A fonte paginada e o adaptador de enqueue agora possuem proposta e testes integrados locais, incluindo 102 pacientes fictícios entre clínicas, replay do primeiro lote, perda de resposta após commit e revogação no intervalo. Substitui a pendência de fonte/adaptador local descrita acima. A aplicação remota, o transporte operacional/identidade do worker e o envio real continuam pendentes. Revisão: REVISAO_MIGRACAO_HIDRATACAO_047.md.
