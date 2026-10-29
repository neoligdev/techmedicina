# Políticas: correção do carregamento autenticado

Codex, 29/10/2026. O preview revelou GET /api/platform/clinics sem Authorization no painel legado, causando HTTP 401 mesmo quando havia sessão. Agora cada carregamento usa token recebido ou sessão atual, com no-store, credentials omit e redirect error. Sem token não consulta o endpoint. Respostas antigas são descartadas ao trocar props/token ou desmontar. Servidor permanece responsável pela autorização.

Dois testes novos cobrem bearer e ausência de chamada anônima, dentro de 20 testes direcionados aprovados. Não altera design, regras comerciais, persistência de políticas, SQL ou grants. Não confundir sucesso local das políticas demonstrativas com gravação no Cloud.

Validação final: 24 testes (20 políticas + 4 cobertura/status), TypeScript, lint direcionado e build aprovados. Navegador local /super-admin/planos confirma aviso de login e ausência do erro HTTP 401 sem sessão. Main não inclui esta correção.
