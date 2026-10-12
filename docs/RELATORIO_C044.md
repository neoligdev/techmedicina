# C044 — Semântica do erro de colisão

12/10/2026. Codex. Função 006 usava 40001 para hostname reservado. Migração aditiva 007 substitui apenas o código de colisão por 23505, preservando assinatura, autorização, estado pendente, gravação e auditoria. Não editar a migração publicada 006. Transporte compartilhado mapeia 23505 para HTTP 409 com mensagem genérica protegida. Demora anterior observada no preview não tem causa comprovada; não atribuir causalidade sem teste remoto.

16 testes SQL/transporte aprovados; colisão gera 23505 sem segunda auditoria, acesso comum permanece negado. Tipos e build aprovados.

Cloud pré-condição: código antigo presente, novo ausente. 007 executada verbatim pelo SQL Editor, Query succeeded. Pós-condição: código novo=true, anon RPC=false, INSERT direto=false, reservas=1, auditorias=1. Fonte e evidência c044_cloud_collision.png registrados. Mensagem específica de duplicidade na UI ainda exige homologação após push. Sem DNS/TLS/ativação e sem Ask Lovable.
