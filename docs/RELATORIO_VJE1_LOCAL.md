# VJE-1 — Contratos e permissões locais

12/10/2026 · Codex. Autorização humana: implementar localmente contratos de metas/eventos, permissões e testes de isolamento. Cloud, DNS, infraestrutura, commit/push/deploy e cálculo numérico da VITALIDADE excluídos. Nenhum novo módulo de coleta servido ou API disponibilizada.

## Alterações

- src/features/journey/contracts.ts: snapshot de meta controlado pelo servidor, identidade clínica/paciente, versão, política, tipo, cadência diária/semanal, estado elegível/não aplicável/pausado e referência de prescrição para medicação. Input de autorrelato restrito a meta, ID estável de origem e instante UTC; não aceita ator, clínica, paciente, status, origem automática ou pontos.
- src/lib/journey/self-report.server.ts: montagem local server-only de evento a partir da meta/vínculo confiáveis; autor vem da identidade, não do input; IDs/versões/proveniência preservados; recusa meta diferente, não elegível e instante anterior à vigência/posterior ao recebimento. Não escreve no banco nem credita pontos.
- src/lib/auth/core.ts: recursos journey_goals/journey_events com grant explícito, clínica de contexto, proprietário e vínculo ativo do paciente. Paciente lê metas próprias e cria/lê participação própria, sem editar elegibilidade. Médico verificado pode ler/criar/alterar metas com grants e ler eventos; não cria autorrelato pelo paciente. Admin e cargo Super ADM não recebem acesso individual automático. Sem delete/manage nesses recursos.
- Parser persistido, SQL, contas e grants Cloud não alterados: continuam recusando os recursos novos não provisionados. Permissões locais testadas não representam concessão real ou RLS nova.
- Status local atualizado para PRD v0.11.3, incorporação documental D49 e etapa parcial D50; 8.10 iniciado, sem conclusão produtiva. Relatório Markdown regenerado. Design e telas de paciente preservados.

## Verificação

42 testes direcionados de contratos/autorização/host passaram. Regressão completa: 43 arquivos, 397 testes aprovados (vje1_regression.txt). TypeScript, lint e build exit 0 (vje1_tsc.txt, vje1_lint.txt, vje1_build.txt). Testes incluem campos forjados, troca de clínica/paciente/meta, falta de grant, paciente inativo, meta pausada/não aplicável, prescrição referenciada, tempo, médico não verificado, admin/global, e parser Cloud recusando grants ainda locais.

## Limites e próxima etapa

Referência de prescrição não comprova prescrição válida. Repositório confiável, consentimento, prescrição, calendário/frequência efetivos, revisão de elegibilidade e idempotência transacional são gates de VJE-2. sourceEventId é contrato de proveniência; não há índice único ou ledger persistido para provar deduplicação nesta entrega. Não há cálculo de JORNADA, média, Escudos ou VITALIDADE, nem aprovação de pesos/limiares. A cadência não implementa agenda clínica ou regra de descanso. Alterações de metas futuras devem preservar políticas centrais publicadas; permissão médica local não autoriza publicar regra global.

Sem commit/push/deploy; alterações permanecem locais para revisão. Próxima etapa requer nova autorização conforme o plano incremental. Fluxos clínicos reais e hosts White Label não foram homologados por estes testes unitários.
