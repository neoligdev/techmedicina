# C015 — Criação/edição auditada de clínicas (validação local)

Executor Codex, 10/10/2026. PRD 2, 4 e 12.1.

Migração 002_clinic_administration.sql adiciona revisão otimista, auditoria administrativa append-only e RPC tm_save_clinic. Escrita ocorre apenas para operador persistido ativo; actor vem de auth.uid, nunca de parâmetro/email/metadata. Função definer com search_path vazio, autorização revalidada no banco a cada chamada, parâmetros fechados e trigger auditando na mesma transação. Eventos guardam IDs/campos alterados/data, sem textos clínicos ou valores do cadastro. Usuários não escrevem diretamente em clínica/auditoria. Revisão incompatível recusa atualização sem registro parcial; não há exclusão.

API POST /api/platform/clinics confirma identidade no servidor, exige papel global persistido, limita stream a 4096 bytes antes de parsear, valida JSON e campos exatos, responde sem cache. Ator, role, clínica de demo e campos extras são recusados. Conflito 409, auth 401/403, payload 400/413/415 e falha genérica 503 sem detalhes internos. Usa cliente publishable por requisição e RPC; sem service_role. Contrato RuntimeDatabase pertence ao projeto para RPC revisada pendente, sem editar tipos gerados.

204/204 testes em 21 arquivos, tsc/lint/build exit 0, sete avisos antigos. 14 testes de API e sete em PostgreSQL real em memória. Inicialização WASM excedeu dez segundos com verificações concorrentes; execução da suíte isolada aprovou 204/204 e prazo de setup do novo banco foi ajustado para 30s, preservando todos os asserts. Não é teste Cloud/gateway real.

PENDENTE: migração C015 NÃO aplicada no Cloud; Lovable ficou sem créditos ao finalizar C013. Não houve compra, operador ou vínculo criado. Cadastro/edição via API retorna indisponibilidade se RPC ausente; GET C014 permanece independente. Formulário administrativo, aplicação gerenciada/tipos, consulta de auditoria e E2E com operador real são próximos passos. Pergunta sobre primeira conta enviada ao usuário; definição de senha não será realizada pelo agente.
