# C026 — Migração e API de identidade visual

10/10/2026. Executor: Codex. Sem mensagens no Ask Lovable.

Pré-condições verificadas no SQL Editor: tm_clinic_branding ausente e restrição original de auditoria existente. Executada a migração database/migrations/003_clinic_branding.sql integralmente, em transação. Confirmação Query succeeded. Consulta posterior: RLS=true, anon SELECT=false, anon RPC=false, authenticated UPDATE=false, authenticated RPC=true, tabela vazia. Captura c026_cloud_privileges.jpg. A restrição foi substituída para acrescentar branding_updated; nenhuma linha foi excluída. Aplicação direta no SQL Editor, sem criação de arquivo de migração gerenciada automático. Não reaplicar a mesma migração.

API /api/platform/branding GET/PUT: sessão validada por getUser/resolvedor persistido, clínica UUID estrita, papel e concessão para gravar; leitura da identidade exige vínculo ativo ou operador. Corpo com limite real de 560000 bytes, sem depender de Content-Length. Preferências e retorno validados, ID cruzado bloqueado, respostas sem cache e erros sem detalhes internos. Transporte mantém bearer da requisição e chave pública, sem service_role, sem seguir redirects. JSON unknown validado por DTOs; tipos gerados existentes não foram editados. Regeneração gerenciada ainda pendente.

20 testes novos de fronteira e transporte aprovados. Regressão completa: 263 testes em 28 arquivos aprovados; TypeScript, lint dos arquivos alterados e compilação aprovados. Evidências c026_*. A primeira checagem de tipos identificou acesso possivelmente indefinido no array do mock de teste, corrigido antes do commit. Formulário autenticado ainda não conectado; não alegar homologação real da API nem aplicação da identidade nos ambientes clínicos. Super ADM permanece PlugPix.
