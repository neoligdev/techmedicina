# Consolidação Codex — retomada integral 26/10/2026

## Auditoria e preservação

Remoto verificado por fetch: origin/develop 75a7818, main aa61b4e. Base comum inicial Codex/develop 3201996. Commits Codex exclusivos 0629fd3,5529ffc,137dce4,e0b96c7 e 111a555 preservados. Merge não destrutivo 79873be reuniu frontend Antigravity até 769d5a2 com backend local; nenhum módulo refeito por autoria. Handoff documental 034c44c surgiu durante a auditoria e será igualmente preservado. Original conserva auxiliares não rastreados históricos; demais worktrees estavam limpas na primeira conferência. Nenhuma main ou infraestrutura alterada.

Correção adicional Codex: callback inicial getUser não pode substituir evento posterior de login/logout; AbortController marca a vida do escopo de Escudos para descartar retorno após desmontagem/troca de clínica. Mantidos loader, erro, galeria, tema e cliente criados por Antigravity. Testes novos exercitam as duas ordens de corrida de autenticação; dez testes Auth aprovados e 43 direcionados UI aprovados antes dos dois casos adicionais.

## Divergências do handoff versus código

O handoff Antigravity é histórico de colaboração, não prova de operação. O projeto usa React 19 (package.json), não React 18. Migração 014 está em database/migrations/014_journey_shields.sql, não supabase/migrations; tabelas reais tm_patient_shield_states e tm_shield_history_events. patient_id é UUID de paciente distinto do Auth user_id: nunca comparar indiscriminadamente patient_id=auth.uid(). O teste patient-demo-auth-failure.test.tsx foi criado pelo Codex em 5529ffc; atribuição desse arquivo a D122 no handoff não altera a autoria Git. Nomes de handlers/motores referidos no handoff devem ser conferidos nos arquivos reais; não duplicar serviços por nome inexato.

Pontuação JORNADA é adesão a metas; não é diagnóstica. Os parâmetros candidatos não se tornam regra clínica aprovada por constarem de um componente. O frontend prepara consumo HTTP, mas usa atualmente contexto demonstrativo e em alguns pontos Auth user.id no lugar de patientId: a D125 operacional precisa derivar o escopo de vínculos persistidos do servidor. Não criar concessões clínicas para contornar esse requisito. Gateway de pagamento não é escolhido automaticamente a partir de exemplos do handoff.

## Próxima prioridade — D125 operacional

Reutilizar createOwnShieldEndpoint, createJourneyEndpoints, createJourneyRpcRepository, createOwnShieldRpcReader e os clientes HTTP existentes. Falta montagem runtime de rotas, resolução segura do host real e da sessão/vínculo do paciente, integração de metas autorizadas com formulários e homologação controlada da persistência. Há fluxo local cliente→handler→RPC→SQL para autorrelato com reenvio idempotente; não reiniciar do zero. A migração 014 continua somente local. Nenhuma aplicação Cloud, vínculo QA ou fórmula VITALIDADE autorizados por esta consolidação.

Para nomes sem colisão: D124 (frontend Antigravity), D124-BACKEND (revogação Codex), D125-AUTH (correção anterior Codex), B023/B024/B025 (incrementos privados locais), D125 operacional (nova prioridade, ainda parcial).
