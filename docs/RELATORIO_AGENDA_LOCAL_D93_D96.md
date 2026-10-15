# Agenda — integração local D93–D96

Executor Codex. Continuação no checkpoint/d69-d74, sem aplicação Cloud ou montagem de endpoint.

Contratos usam instantes explícitos e UTC; não definem duração padrão nem recorrência. Disponibilidade própria exige médico verificado, vínculo ativo único e agenda/write. SQL 015 revalida a permissão sob bloqueio, deriva o médico de auth.uid(), serializa médico/clínica, confere sobreposição e reenvio por source_request_id. Não são consultas nem reservas de pacientes.

D95: serviço e POST ligados a domínio clinic_portal e à sessão da mesma requisição. JSON limitado, sem query de identidade, no-store; recibo estrito de clínica/médico/solicitação/intervalo antes de confirmar.

D96: cliente usa bearer fresco, no-store, sem cookies/redirecionamento e prazo de 20s incluindo sessão/rede/corpo. Integração cliente-host-sessão-HTTP-RPC-PostgreSQL local comprovou que resposta perdida após commit é recuperada sem duplicar o horário. 22 testes de contratos/HTTP/SQL passaram; seis testes adicionais do cliente passaram, cobrindo identidade, recibos divergentes e conflito.

Limites: Auth/registro de host simulados; PostgreSQL PGlite executa o SQL local. Não prova homologação do Cloud nem concorrência com conexões PostgreSQL independentes. SQL 015 não aplicado; formulário, consulta/paginação e ciclo de operação ainda pendentes. Regras do PRD sobre duração, recorrência, bloqueios, quem agenda, reagendamento, cancelamento, faltas e notificações exigem decisões posteriores. Não foi usada a disponibilidade como acesso a prontuário.
