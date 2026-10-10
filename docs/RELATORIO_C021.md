# C021 — Rede administrativa por páginas

Codex, 10/10/2026.

A consulta administrativa de clínicas permite navegar além dos primeiros 100 cadastros, por cursor de created_at/ID e ordem descendente de criação. Ambas as colunas fazem parte da ordenação e do filtro, com desempate por ID. O botão Clínicas mais recentes reinicia a consulta. Ativas e inativas permanecem consultáveis exclusivamente pelo operador persistido.

Cada requisição passa pelo Auth e pela autorização global antes de validar o cursor. Data ISO/UUID, ausência de duplicação e somente os dois parâmetros esperados são exigidos antes da leitura; nenhum filtro livre é interpolado. O cliente por requisição continua sujeito a RLS, sem service_role, novas permissões ou migração. Respostas mantêm private/no-store, DTO administrativo estrito e limite de 100 linhas, com leitura de uma linha adicional para detectar continuação.

Após uma criação/edição confirmada, o diretório é consultado novamente no servidor, evitando adicionar linhas localmente e invalidar a fronteira da página. Falhas temporárias preservam a página para nova tentativa; 401/403 limpam a lista. Sinal de cancelamento e revisão da sessão descartam respostas tardias após logout/renovação.

Verificação local: 234 testes, 25 arquivos; TypeScript e build aprovados; lint sem erros, sete avisos Fast Refresh existentes. Testes acrescentados cobrem cursor inválido/incompleto/duplicado/extra, precedência da autenticação, cursor da última linha e descarte de página tardia depois do logout. Evidências c021_*.txt.

Limites: login/JWT/gateway e paginação não homologados com sessão real. A entrada do titular segue pendente. Não há snapshot imutável da consulta; novos cadastros são vistos ao retornar à primeira página. Administração completa, vínculos, recursos clínicos e demais requisitos do PRD permanecem parciais.
