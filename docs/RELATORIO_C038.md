# C038 — Transporte e rota de reservas

12/10/2026. Codex. GET/POST /api/platform/domains integrado no código com fábrica protegida da C037. Reutiliza contexto e transporte de clinic-branding-runtime, exportados sem mudar seu comportamento: getUser/resolvedor persistido, bearer da requisição, chave pública, no-store e redirect error. GET envia filtro de UUID e seleção explícita, ordem estável e limit 101; retorna cem/hasMore. POST chama tm_reserve_domain com três parâmetros, sem status/ator forjados.

22 testes de handlers/transporte/reserva e transporte prévio aprovados. TypeScript/lint/build aprovados; rota gerada pelo build. Capturas remotas não se aplicam a esta entrega local: migração 006 ainda não implantada, endpoint não homologado no Cloud. UI/paginação anterior/posse/TLS/ativação pendentes. Nenhuma alteração de layout, dado, domínio, segredo ou publicação. Próximo: implantação revisada e interface.
