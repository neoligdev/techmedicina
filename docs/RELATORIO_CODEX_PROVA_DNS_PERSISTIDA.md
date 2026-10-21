# White Label — prova DNS persistida (proposta D117)

21/10/2026 · Codex · dev/codex-backend. PRD §2/adendo URLs §9; continuidade de D114/D116. Implementação local, sem Cloud ou DNS alterados.

## Fluxo implementado

018_domain_dns_observations.sql depende da 017. RPC de leitura administrativa retorna somente a reserva e o desafio correntes, não expirados, não revogados e não consumidos. Valida operador e mantém locks de leitura. DTO explícito evita expor futuras colunas da tabela.
A função privada de gravação da prova bloqueia operador, domínio e desafio, reconfere revisão/estado/expiração e instante observado, grava digest e ator sem token bruto e consome o desafio na mesma transação. Rotação ou expiração durante a consulta invalida a gravação. A tabela de provas não tem acesso para anon/authenticated; a função de gravação também não. Não foi criado papel, chave ou grant de worker. Somente o proprietário do banco pode executar no modelo local testado.
Orquestrador server-only createPersistedDnsVerifier recebe identidade autenticada e ID do domínio, lê estado confiável, executa o verificador TXT e persiste exclusivamente o recibo gerado no servidor. Valida o recibo retornado inclusive escopo, digest e instantes. Falhas de armazenamento são sanitizadas; conflito transacional vira 409. Não aceita flags de prova de formulário/browser. Nenhum endpoint público foi adicionado.

## Validação e limites

Testes locais usam PostgreSQL PGlite e DNS injetado. Cobrem caminho completo, consumo único, bloqueio de provas enviadas pelo navegador, rotação/revogação/expiração entre leitura e gravação, domínio incorreto, erro sanitizado e recibo divergente. Não comprovam DNS real, concorrência entre conexões de produção ou runtime node:dns no Cloud. Resultados consolidados registrados após os processos de regressão.
Não há integração com transporte/worker real: read/record são dependências do serviço. A futura identidade do executor, o privilégio mínimo, armazenamento de segredo e vinculação do ator à sessão exigem revisão antes de conceder execução. Nunca conectar a função privada ao client publishable/browser nem aceitar actor_user_id vindo do corpo da requisição.
Prova DNS não ativa domínio. TLS, roteamento do projeto, suspensão/retirada, leitura operacional mínima por tenant e política de revalidação continuam pendentes. Não foi definida duração comercial. Perda de resposta após commit requer leitura administrativa futura do recibo persistido; replay do desafio consumido é recusado. Nenhuma reserva muda de clínica/ambiente, nenhum grant clínico é emitido.

## Status e integração

Status oficial será atualizado somente em develop após revisão do lote, preservando autoria Codex e requisito White Label parcial. main e branch/worktree Antigravity não são alteradas. A publicação do status no preview depende de futura integração aprovada na main, pois Lovable continua conectado a ela.

## Resultado consolidado

11 testes novos de persistência/orquestração; 30 testes direcionados aprovados. Regressão completa: 916 testes aprovados em 113 arquivos (316,98 segundos). TypeScript, lint dos arquivos alterados e build local aprovados. Nenhuma evidência de aplicação Cloud ou DNS real é inferida desses testes.

## Integração

656c769 revisado e integrado em develop com merge explícito, preservando D116 e catálogo anterior. D117 registrada somente na integração. Não houve edição da worktree Antigravity nem main. A conexão GitHub do connector foi consultada e informa push=false; o transporte Git local autorizado permanece disponível. Nenhum PR remoto foi criado ou mesclado automaticamente.
