# Hidratação — etapa 3: autorização e persistência local

Codex, 29/10/2026. PRD 8.3 parcial; código local, sem SQL Cloud ou ativação de endpoint.

## Autorização

hydration_records é recurso específico reconhecido no contrato de identidade persistida verificada. Paciente precisa vínculo ativo, proprietário correto, paciente ativo na mesma clínica e grants explícitos. Read é necessário inclusive para conferir recibos de create/write. Anulação usa write, sem exclusão física. Delete/manage são negados. Super ADM e ADM da clínica não recebem acesso automático; médico também é bloqueado nesta fase própria. Leitura médica precisará revisão e implementação separada, preservando o módulo médico. Nenhuma conta ou grant foi provisionado.

Teste detectou ausência inicial da checagem de proprietário no novo recurso; corrigida antes de commit/push. Regressão inclui isolamento de dono, paciente/vínculo inativo, ausência de read e papéis administrativos/médicos.

## Proposta SQL 041

Duas tabelas com RLS sem acesso direto PUBLIC/anon/authenticated; RPCs exclusivas para registro próprio. Paciente vem de auth.uid e vínculo ativo, nunca do corpo. Helper interno sem EXECUTE público/authenticated, verifica clínica/paciente/grants sob FOR SHARE. RPCs públicas de aplicação SECURITY DEFINER/search_path vazio, EXECUTE authenticated com guarda obrigatória.

Criação/correção/anulação usam advisory lock por UUID, revisão esperada e chave de recibo (registro, solicitação). Snapshot/recibo são inseridos na mesma transação. Operação antiga repetida devolve recibo original junto do registro atual, sem regressão. Reuso da solicitação com conteúdo diferente conflita. Não há restauração, ativação, meta, pontuação ou VITALIDADE. Anulação conserva dados/histórico; não equivale a solicitação legal de exclusão. Snapshots não são WORM contra administradores do banco.

A função pura da etapa 2 é referência, não executada dentro do SQL. O SQL usa lookup indexado do recibo e registro, sem carregar o histórico completo. Timestamps de recebimento e ator vêm do servidor. Helper de serialização é STABLE, pois timestamptz em JSON depende do fuso da sessão. Dados não vão para localStorage.

## Dependências e limites

041 usa a fundação 001 e amplia o CHECK de recursos preservando os valores anteriores até journey_shields. Antes de aplicação futura, comparar a constraint vigente e seguir a ordem dos lotes planejados: não aplicar depois uma versão antiga que remova hydration_records. Não aplicar 014 ou outros lotes por inferência. Revisão remota própria é obrigatória. Unidades mL inteiras seguem proposta técnica local; sem prescrição ou metas por padrão.

O host lookup 026 é específico de Jornada e exige grants de Jornada. Não reutilizá-lo nem conceder grants de Jornada para contornar hidratação. Próxima etapa: contexto de host próprio, DTOs/HTTP, leitura paginada e PWA, com o mesmo bearer e escopo validado no servidor. Nenhuma API clínica nova foi ativada aqui.

Testes PostgreSQL local cobrem create/retry/correct/void, revisão antiga, ID repetido com conteúdo diferente, leitura/escrita de outro paciente, outra clínica, Super ADM sem vínculo, anon, RLS, helper privado, revogação de read/write, paciente inativo e rollback por falha forçada no recibo. São testes isolados; contenção entre conexões e homologação Cloud ainda pendentes. Resultado ampliado registrado após conclusão.

Fechamento: 93 testes em 11 arquivos aprovados (hidratação, autenticação/identidade e status). TypeScript e build com saída 0. Lint direcionado validado antes do commit; catálogo atualizado e cobertura conferida novamente. Não é nova regressão global. Revisão remota em docs/REVISAO_MIGRACAO_HIDRATACAO_041.md.

Retomada em 30/10/2026: arquivos conferidos sem alterações concorrentes; lote finalizado e protegido no Git, sem aplicação remota.
