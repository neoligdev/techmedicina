# C037 — Reservas: contratos e fronteira local

12/10/2026. Codex. DTOs recusam hostname não canônico, ambiente indevido e campos adicionais, incluindo ator/status forjados. Fábrica de handlers exige Super ADM da identidade confiável antes de consulta/gravação. GET exige UUID único e retorna no máximo 100 registros da clínica solicitada; POST exige JSON e limita stream a 4096 bytes independentemente de Content-Length. Retorno deve corresponder a clínica, host e ambiente; erro interno não expõe detalhes. Respostas private/no-store.

Dez testes aprovados; tsc/lint aprovados. Fábrica ainda não ligada à rota ou transporte: não afirmar API operacional. Migração 006 continua local. Não alterou CSS, assets, dados, DNS ou permissões. Próximo: transporte request-bound preservando RLS/RPC e rota, depois UI/paginação antes de ampliar uso.
