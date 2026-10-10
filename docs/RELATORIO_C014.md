# C014 — Consulta administrativa persistida

Executor: Codex, 10/10/2026. PRD 2, 4, 12.1.

API GET /api/platform/clinics verifica getUser e papel global persistido antes de consultar dados. Cliente publishable por requisição, com JWT confirmado e RLS; sem service_role. Resposta limitada a id, nome, atividade e data de cadastro, validada estritamente; até 100 clínicas e aviso de mais resultados. Anônimo 401, contas locais/sem papel 403, indisponibilidade 503; nenhuma resposta usa cache ou expõe erro interno.

/login mostra resumo mínimo confirmado pelo servidor e lista real para o operador. Banco vazio permanece vazio; sem fallback demo. Consulta lenta não bloqueia logout; geração/AbortController impedem reaparecimento de dados após saída. Cadastro/edição, auditoria e navegação administrativa completa ainda pendentes. Papel administrativo não concede acesso clínico.

183/183 testes em 19 arquivos, tsc/build exit 0, lint zero erros e sete avisos antigos. 13 testes do diretório e 26 de login. HTTP local 401 com private/no-store. Aplicação local http://127.0.0.1:8081 (8080 já ocupada). Não houve login real, criação de conta, operador ou concessão de acesso.

C013 Cloud incorporada por fast-forward; SQL fonte e registro gerenciado iguais após normalizar LF/CRLF. Codex confirmou remotamente cinco tabelas com RLS, anon sem leitura, authenticated sem escrita, RPC invoker e cinco políticas SELECT sem políticas de escrita. Clínicas/vínculos/operadores vazios. Screenshot c013_cloud_rpc.jpg. Lovable esgotou créditos ao concluir; Codex regenerou relatório Markdown e validou o código/tipos. Nenhuma compra.

Próxima C015: criação/edição administrativa auditada e provisionamento explícito do primeiro operador para E2E. Não derivar autorização de email, metadata ou seleção da demonstração. A política de validação médica e fornecedores de hardware/serviços continuam decisões pendentes do PRD.
