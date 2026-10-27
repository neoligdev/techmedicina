# D125 operacional — Jornada e hábitos: mapa da implementação existente

26/10/2026 · Codex. Entrega iniciada por auditoria de integração; não confundir com D125-AUTH histórica. Não concluída.

## Reutilização obrigatória

- GET /api/journey/shields: createOwnShieldEndpoint → host/session → readOwnShields → createOwnShieldRpcReader → tm_get_patient_shield_overview. Handler/cliente existem; rota/runtime real ainda não montados.
- POST /api/journey/self-report: createJourneyEndpoints.selfReport → submitJourneySelfReport → createJourneyRpcRepository.selfReportRpc → tm_submit_journey_self_report_for_clinic. Não usar o RPC anterior sem escopo da clínica do host. Idempotência e reenvio após resposta perdida já têm teste cliente→HTTP→SQL local.
- Migração 014: database/migrations/014_journey_shields.sql; revisão anterior em docs/REVISAO_MIGRACAO_ESCUDOS_014.md continua válida. Há estado e ledger imutável com chaves compostas, RLS/grants explícitos e sem privilégio clínico pelo Super ADM.

## Lacunas verificadas

1. Componentes ainda obtêm clínica pelo DemoProvider e usam Auth user.id como patientId. São identificadores diferentes; scope real deve vir de vínculo persistido autorizado, derivado do host, sem cabeçalho de clínica escolhido pelo navegador.
2. Host resolver rejeita corretamente localhost/preview para o caminho clínico real. A montagem operacional necessita lookup mínimo de domínio ativo, validade/evidências atuais e sessão Auth verificada; não inventar host ativo ou mapear a primeira clínica para fazer a UI funcionar.
3. Não há rotas HTTP Jornada registradas no router. Precisam ser compostas com provedor same-bearer/RLS, sem service_role, e testes por tenant.
4. Migração 014 ainda não aplicada no Cloud por este lote; confirmar estado em preflight antes de pedir autorização específica. Isso bloqueia homologação remota de Escudos, não implementação/testes locais.
5. Formulários reais devem consumir metas elegíveis autorizadas e recibos persistidos. O input de evento existente registra cumprimento de meta, não quantidade arbitrária de água/sono. Não converter silenciosamente os valores demonstrativos em pontuação ou dados clínicos sem contrato próprio.
6. Escrita de transições de Escudo permanece privada/sem endpoint. O SQL histórico admite médico com grant específico e caminho service_role; não habilitar nenhum deles como atalho para clientes nem permitir score do browser.

## Sequência executável

A. Consolidar branches e regressão global; atualizar status oficial com autorias e limites reais.
B. Compor runtime testável de sessão/host/RPC e contrato mínimo de contexto paciente, com negação por padrão e sem novas credenciais. Recuperar patientId do vínculo, não de getUser.id.
C. Montar rotas locais reutilizando handlers; testar sessão ausente, clínica errada, grant revogado, corpo inválido, idempotência e histórico insuficiente.
D. Integrar frontend ao contexto real e metas autorizadas; preservar demo explicitamente separada e UI existente.
E. Revisão/preflight e aprovação específica de 014 e dependências antes de aplicação Cloud, sem grants QA automáticos. Homologar duas clínicas e pacientes autorizados com dados fictícios e contas aprovadas.

## Critério de conclusão

Paciente autorizado registra cumprimento de meta elegível, recarrega e recupera o evento sem duplicação; outro paciente/tenant não lê nem escreve. Escudos usam estado/histórico persistidos ou insuficiência honesta, sem score fictício. Erro não habilita demo. Cloud, hosts e contas QA são evidências distintas dos testes locais. Nenhuma fórmula VITALIDADE criada.
