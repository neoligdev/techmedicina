# Blog central — etapa 3A: leitura de versão exata

Executor: Codex. Data: 28/10/2026. PRD §15 permanece parcial.

GET /api/platform/blog-draft-version?id=UUID&revision=N consulta uma versão histórica exata. Sessão verificada e papel Super ADM exigidos antes da RPC; SQL revalida operador ativo. Resposta estrita sem ator interno, privada e sem cache. Versão inexistente retorna null; falha não se transforma em ausência. Nenhuma restauração, edição de snapshots ou publicação é exposta. Editor e design existentes preservados.

## Revisão da proposta SQL 032

Depende de 001 e 030. Reutiliza a chave primária (draft_id, revision), sem tabela ou índice novo. SECURITY DEFINER com search_path vazio; acesso direto continua negado; EXECUTE somente authenticated, condicionado a auth.uid e operador ativo. Não cria contas ou permissões clínicas. SQL local apenas: aplicação Cloud depende de autorização específica e conferência remota.

## Validação

Testes SQL locais verificam versão original após atualização, inexistência, revisão inválida, acesso anônimo, conta sem papel e proibição de leitura direta. Testes HTTP verificam autenticação, autorização, parâmetros estritos, ausência, escopo de rascunho/revisão e resposta sem cache. TypeScript, lint direcionado e build são executados antes do commit.

## Próxima parte

Listagem paginada das versões e painel de consulta somente leitura ainda pendentes. Esta entrega fornece o contrato/API, não uma interface de histórico. Também faltam revisão editorial/clínica, mídias, seleção e publicação pelas clínicas e consumo no PWA. Não houve homologação Cloud, alteração de main, DNS ou Publish.
