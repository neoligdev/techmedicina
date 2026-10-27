# D125 — Parte 9: recuperação por identificador exato

Executor: Codex. Evolução da parte 8, preservando sua interface e estados de reenvio.

GET /api/journey/self-report-status aceita apenas sourceEventId UUID. Clínica e paciente são derivados do host/sessão verificados. O runtime reutiliza o mesmo bearer para lookup e RPC; DTOs estritos verificam escopo e identificador na saída. Cache privado/no-store e Vary Authorization/Host.

A proposta SQL local 029 consulta o próprio evento pela chave única existente, sem limite da página recente nem leitura sequencial de todo o ledger. A conferência passa a usar esta rota, mantendo conflito de meta/horário com precisão, desconhecido para ausência e nenhum POST adicional. Outro paciente, Super ADM sem vínculo, anônimo ou grant de leitura revogado não ganham acesso.

A parte 8 descreve o estágio anterior limitado a 100 eventos; a parte 9 substitui essa limitação no código local. Continua sem outbox persistente ou ID recuperável automaticamente após fechar/recarregar a página. Nenhum ponto, prescrição ou VITALIDADE é atribuído por confirmação de evento. SQL remoto, vínculos/grants, domínio/DNS, main e Publish permanecem fora do lote. A proposta anterior de preview d823544 não inclui automaticamente esta etapa.

Testes usam banco PostgreSQL local PGlite, incluindo evento antigo fora dos 100 recentes, fonte de outro paciente sem exposição, ausência, revogação, anônimo e contrato HTTP/cliente. Resultados finais serão registrados no fechamento.

Fechamento: 61 testes direcionados aprovados em quatro arquivos; cenário SQL/runtime ampliado e novamente aprovado no arquivo de persistência. TypeScript confirmado com código de saída zero, lint direcionado e build aprovados. HTTP local com UUID sintético: host demo recusado com 403, no-store/private e Vary Authorization/Host. Nenhuma nova regressão global atribuída a este lote; a referência anterior 1.204/136 mantém seu escopo histórico.
