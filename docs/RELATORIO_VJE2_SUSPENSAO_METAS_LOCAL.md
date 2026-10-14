# Jornada — suspensão auditada de metas e recuperação de rede

13/10/2026 · Codex. Migração 010 preparada e executada somente em PGlite isolado com 001/008/009. Não aplicada no Cloud. Nenhuma alteração de DNS, infraestrutura, commit/push ou publicação.

Médico com vínculo ativo na clínica, identidade verificada e grant journey_goals.write pode suspender uma meta existente. A função bloqueia a meta durante a transação, confere versões e condições atuais, incrementa a versão e grava auditoria com ator/UTC/versionamento. Repetir a pausa na versão atual não duplica auditoria; versão antiga gera conflito. Paciente, cargo global isolado e médico de outra clínica não podem suspender. Leitura da auditoria usa autorização de metas por clínica/paciente; nenhuma escrita direta/exclusão liberada.

Eventos anteriores conservam sua versão original. Depois da suspensão, autorrelato é recusado. A função não cria metas, reativa elegibilidade, altera pesos, prescrição ou conduta. Não implementa a pausa clínica protegida completa do adendo: motivo médico/técnico, regras de cuidado adaptado, consentimento, revisão e cálculo continuam pendentes. API e painel médico de suspensão ainda não conectados.

Também corrigida recuperação de rede do cartão D53: limite de 20 segundos inclui obtenção de sessão, HTTP e leitura do corpo. Expiração cancela a requisição e sessão resolvida tarde não inicia envio. Resultado incerto exige recarga antes de outra gravação. Teste simula gravação persistida com resposta perdida; recarga recupera a versão real sem segundo PUT ou falsa confirmação. Não presumir que timeout desfez a transação.

Verificações: 17 testes de transporte/cartões/fluxo em vje2_participation_timeout.txt; 18 testes SQL e fluxo em vje2_goal_pause.txt (incluindo seis específicos de suspensão). As suites compartilham dois testes de fluxo; não somar como 35 casos distintos. Tipos, lint da Jornada e build aprovados em vje2_goal_pause_tsc.txt, vje2_goal_pause_lint.txt e vje2_goal_pause_build.txt. Última regressão completa anterior: 451/51, antes deste incremento; aqui foram executadas verificações direcionadas e regressão SQL pertinente.

Próximo ponto: contrato/painel médico autorizado para suspensão, criação/revisão de metas e fontes de consentimento/prescrição. Ativação real continua dependente de backend/host/QA. D54 é entrega local parcial do requisito 8.10, preservando design e sem atribuir conclusão produtiva.

Continuidade servidor: operação `pauseJourneyGoal` preparada localmente. Exige contexto de host/clínica e exatamente um vínculo ativo de médico verificado com grants read/write antes de ler a meta. Repositório injetado mantém sessão/RLS e fornece vínculo confiável do paciente; outra clínica ou vínculo inativo não chegam ao RPC. Payload aceita somente ID da meta e versão esperada; versão antiga falha com conflito. Resposta estrita deve preservar propriedade, política, tipo, cadência e vigência, alterando apenas estado/versão esperados. Confirmação devolve DTO mínimo; pausa já existente não exige nova versão. Sem endpoint ou painel médico ativados.

Quinze testes de servidor/SQL passaram (`vje2_goal_pause_server.txt`), com tipos e lint aprovados (`vje2_goal_pause_server_tsc.txt`, `vje2_goal_pause_server_lint.txt`). Mantidos os gates externos e clínicos; criação/ativação de metas e revisão de prescrição não foram implementadas por esta operação.

Fronteira HTTP local posterior: handler POST injetável preparado, sem rota pública/runtime. Sessão/host resolvidos pelo servidor; método/query inesperados, JSON inválido, campos forjados e corpo maior que 4096 bytes recusados. Retorno só inclui confirmação mínima, com no-store; conflito 409 orienta recarga e erro interno retorna mensagem segura. Leitor JSON extraído e reutilizado na participação do paciente, preservando seu limite e comportamento. Vinte e sete testes HTTP/servidor/participação aprovados em `vje2_goal_pause_http.txt`, tipos e lint em logs correspondentes. Transporte autenticado operacional e painel médico continuam pendentes.

## Continuidade: cartão médico conectado localmente

Contrato de entrada/recibo agora compartilhado por servidor e browser; limite de versão respeita integer PostgreSQL. Transporte relativo POST preparado com bearer atual, resposta estrita vinculada à clínica/paciente/meta, no-store, sem cookies/redirecionamentos e conflito tipado. Prazo de 20 segundos extraído para helper reutilizado também pela participação; mantém bloqueio de envio tardio após expiração.

Cartão médico e wrapper conectado implementados com os componentes foscos existentes. Exigem confirmação explícita e permitem cancelar antes de qualquer envio. Estado suspenso só é exibido depois da confirmação válida; erro, conflito ou resposta de outro paciente não confirmam a alteração e exigem recarga. Recarga valida proprietário e não aceita versão inferior. Remontagem por contexto/meta/versão impede resposta de meta anterior alterar outra tela.

Quarenta testes em sete arquivos passaram (`vje2_goal_pause_ui.txt`), incluindo cartão → cliente → handler → repositório com fixture médica e regressão do prazo compartilhado da participação. Tipos, lint e compilação aprovados (`vje2_goal_pause_ui_tsc.txt`, `vje2_goal_pause_ui_lint.txt`, `vje2_goal_pause_ui_build.txt`). SQL testado em entregas anteriores separadamente; esse teste de UI usa repositório simulado e não comprova Auth/Cloud de ponta a ponta.

Estado atual: peças locais conectadas e verificadas, sem montagem no shell demo ou endpoint público. Consulta/recarga reais, vínculo do host à sessão, aplicação das migrações e QA clínico ainda necessários antes de ativar o painel no produto. Não há reativação de metas, revisão de prescrição, novo algoritmo, índice ou concessão clínica. Código/UI não substituem os gates externos documentados.

## Continuidade: consulta e recarga médicas locais

Migração 011 preparada e testada somente no banco isolado: getter médico com ID da meta e clínica do host, sessão própria, médico verificado/grant de leitura e clínica/paciente/vínculo ativos. Retorna meta e vínculo mínimo confiável; não grava dados, concede acesso ou ativa metas. Clínica incorreta, papel paciente e ausência de condições atuais negados.

Servidor projeta somente ID/clínica/paciente, título derivado do tipo, estado e versão, sem copiar conta/política/vigência para o browser. Handler GET injetável aceita apenas goalId único, recusa queries inesperadas, valida método e usa no-store/erros seguros. Cliente relativo autenticado valida proprietário/ID e prazo; cartão conectado usa essa recarga por padrão após conflito. Não há rota pública/runtime ativado.

Teste integrado com fixture: primeira tentativa com versão 1 é recusada; GET recupera versão 2; nova confirmação envia versão 2 e recebe estado suspenso/versão 3. Repositório da UI é simulado; SQL testado separadamente com 001/008/009/010/011. Vinte e três testes em cinco arquivos aprovados (`vje2_goal_read.txt`), tipos/lint/build aprovados nos logs vje2_goal_read correspondentes. Não representam teste de Auth/Cloud real, multi-conexão ou domínio em produção.

Próxima dependência operacional: resolver real do registro de hosts, transporte servidor na mesma sessão, migrações revisadas e conta/grants QA específicos. Criação de metas, adaptação de rotina, consentimento/prescrição e proteção clínica completa permanecem pendentes. Todas as mudanças desta continuidade são locais e a autoria é Codex.
