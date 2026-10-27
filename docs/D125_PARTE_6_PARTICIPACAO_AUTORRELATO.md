# D125 — Parte 6: participação e autorrelatos no paciente autenticado

Executor: Codex. Continuidade das partes 1–5, sem reconstrução do design ou do backend.

## Implementação

- GET/PUT `/api/journey/participation` registrados no runtime, reaproveitando os handlers/RPC 009, validação de host e uma única sessão verificada por requisição. PUT conserva revisão esperada, conflito e auditoria; leitura não altera participação.
- GET `/api/journey/self-report-access` expõe somente preferência própria e disponibilidade decorrente de participação ativa e grant `journey_events/create`. Esse snapshot não concede acesso, não substitui a autorização transacional da escrita e não habilita medicamentos/protocolos.
- Controle existente de participação montado no painel real de `/app/escudos`. Ativação exige permissão de criação; a pausa preserva histórico e não equivale a consentimento clínico ou mudança de tratamento.
- Formulários de autorrelato para metas persistidas elegíveis e de tipos suportados, com confirmação explícita da atividade, vigência, nova consulta de disponibilidade imediatamente antes de enviar e recibo validado pelo cliente existente.
- ID de evento e instante são mantidos em memória durante reenvios incertos na mesma instância. Não há outbox persistente ou retomada garantida após recarga/fechamento da página; revisar o histórico antes de um novo registro nesses casos. Não armazenar dados clínicos em localStorage.
- Após confirmação, relê o histórico sem reiniciar o formulário confirmado. Uma página antiga em voo não pode sobrescrever essa atualização. Troca de paciente/sessão descarta callbacks anteriores.

## Evidência e limites

Testes direcionados: participação (49 testes/8 arquivos), formulários/runtime (23/5), SQL e cliente de disponibilidade (48/2), corrida do histórico (5/1). Esses conjuntos se sobrepõem; não somar como contagem única. TypeScript e lint direcionado aprovados; build local aprovado. O cenário SQL composto usa banco local real PGlite: ler participação inicial, ativar com revisão, consultar metas/disponibilidade, gravar/repetir sem duplicar, reler, pausar com auditoria e preservar o histórico.

Não foram aplicados SQL, grants ou dados de QA no Cloud, nem configuração de domínio/DNS ou Publish. O preview continua limitado à versão autorizada na main até nova integração específica. A execução da suíte global é registrada no fechamento abaixo.

D125 e PRD continuam parciais: estes formulários registram cumprimento de atividade (autorrelato), não quantidades clínicas, metas prescritas, avaliação diária, apuração automática de pontos ou cálculo de VITALIDADE. Entitlements, calendário/descanso, prescrições, eventos estruturados e homologação real continuam sujeitos às etapas e decisões já registradas. Formulário de medicação genérico não foi criado. A biblioteca visual, texturas e autorias anteriores são preservadas.

Verificação HTTP do servidor local em 127.0.0.1:8082: GET participation e self-report-access recusam o host demonstrativo com 403; Cache-Control no-store/private e Vary Authorization/Host presentes. Nenhuma sessão real ou dado clínico foi usado nesse teste. Essa recusa esperada não é falha de build nem prova de funcionamento do fluxo autenticado em Cloud.

## Fechamento da validação

Regressão global final: **1.204 testes aprovados em 136 arquivos**, duração 412,74 s. TypeScript e build final aprovados. Lint global: zero erros e sete avisos históricos de Fast Refresh. Verificação do diff sem ocorrência dos padrões de credenciais procurados; não constitui auditoria exaustiva de segredos. Nenhum package-lock.json ou arquivo de credenciais incluído.
