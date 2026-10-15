# Agenda — integração local D93–D96

Executor Codex. Continuação no checkpoint/d69-d74, sem aplicação Cloud ou montagem de endpoint.

Contratos usam instantes explícitos e UTC; não definem duração padrão nem recorrência. Disponibilidade própria exige médico verificado, vínculo ativo único e agenda/write. SQL 015 revalida a permissão sob bloqueio, deriva o médico de auth.uid(), serializa médico/clínica, confere sobreposição e reenvio por source_request_id. Não são consultas nem reservas de pacientes.

D95: serviço e POST ligados a domínio clinic_portal e à sessão da mesma requisição. JSON limitado, sem query de identidade, no-store; recibo estrito de clínica/médico/solicitação/intervalo antes de confirmar.

D96: cliente usa bearer fresco, no-store, sem cookies/redirecionamento e prazo de 20s incluindo sessão/rede/corpo. Integração cliente-host-sessão-HTTP-RPC-PostgreSQL local comprovou que resposta perdida após commit é recuperada sem duplicar o horário. 22 testes de contratos/HTTP/SQL passaram; seis testes adicionais do cliente passaram, cobrindo identidade, recibos divergentes e conflito.

Limites: Auth/registro de host simulados; PostgreSQL PGlite executa o SQL local. Não prova homologação do Cloud nem concorrência com conexões PostgreSQL independentes. SQL 015 não aplicado; formulário, consulta/paginação e ciclo de operação ainda pendentes. Regras do PRD sobre duração, recorrência, bloqueios, quem agenda, reagendamento, cancelamento, faltas e notificações exigem decisões posteriores. Não foi usada a disponibilidade como acesso a prontuário.

## D104 — leitura própria paginada

Codex implementou contrato de período explícito e cursor início/ID, com limite técnico de até 50 itens. O período seleciona intervalos cujo início esteja em [início, término). A consulta usa agenda/read e escopo derivado do vínculo médico ativo único e verificado. Não concede leitura a portador apenas de agenda/write. O leitor injetado recebe filtro, ordenação esperada e limite mais um para detectar continuidade; o serviço rejeita dados fora do escopo, janela, cursor, ordem ou tamanho e itens duplicados. Dez testes novos e regressão de contrato/HTTP totalizaram 27 aprovados; TypeScript e quatro testes do status aprovados. Integração SQL, HTTP e interface desta leitura ainda pendentes; sem montagem de rota ou Cloud.

## D105 — leitor SQL sob RLS

Adaptador usa SQL parametrizado na tabela tm_doctor_availability com clínica e médico explícitos, janela semiaberta, cursor composto início/ID, ordenação e limite. O executor precisa usar a identidade autenticada da mesma requisição, sem service-role. Linhas PostgreSQL são convertidas por contrato estrito e novamente verificadas pelo serviço. Teste PGlite usando migrações 001 e 015 percorreu três intervalos em páginas de um item sem duplicação; execução como operador global retornou vazio e revogação de agenda/read também retornou vazio. Dezesseis testes de leitura/SQL aprovados, TypeScript e quatro testes de status aprovados. Auth e identidade de conexão são simulados no teste; não há rota montada, migração Cloud ou conexão PostgreSQL operacional configurada por esta entrega.

## D106 — fronteira GET privada

A fábrica não montada exige host clinic_portal ativo e sessão da própria requisição. A consulta aceita somente início/fim, limite e cursor completo, rejeita parâmetros repetidos, identidade injetada, limite inválido e método diferente de GET. Respostas são private/no-store, variam por Authorization/Host e não expõem diagnósticos internos. Dez testes HTTP novos mais dez de serviço passaram; dez testes HTTP e seis SQL passaram em outra execução, com composição de HTTP-host-sessão-SQL e revogação de leitura no PostgreSQL local. Esses conjuntos se sobrepõem e não devem ser somados como testes únicos. Falta cliente e interface; não há rota ativa ou homologação Cloud.
