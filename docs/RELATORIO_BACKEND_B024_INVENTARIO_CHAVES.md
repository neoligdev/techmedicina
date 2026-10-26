# Backend isolado B024 — inventário privado de chaves

26/10/2026 · Codex · dev/codex-backend · continuidade do PRD White Label §9.

## Implementado localmente

Migração proposta 024: função privada tm_list_routing_keys, condicionada a Super ADM persistido ativo, projeto explícito, cursor lexical exclusivo e limite 1–100 (padrão 25). Ordenação COLLATE C compatível com comparação ASCII do contrato TypeScript; keyId aceita somente caracteres ASCII definidos. O cursor é uma fronteira lexical, não um comprovante de existência de chave. Projetos sem chaves retornam lista vazia. A função não modifica registry, domínio ou permissões e não concede EXECUTE a PUBLIC/anon/authenticated.

Metadados retornados: identificador da chave, revisão, digest público, flag administrativa, janela de validade e marcadores de revogação. Nenhuma chave privada ou token. isActive sozinho não comprova validade temporal nem autoriza uso: os escritores/verificadores continuam obrigados a reconferir estado e janela sob seus próprios contratos. A consulta é um snapshot administrativo, não uma operação de ativação.

Adaptador server-only usa leitor privado injetado, valida identidade administrativa antes de consultar, rejeita ator extra no payload, escopo divergente, chaves duplicadas/desordenadas, repetição de cursor, intervalo temporal inválido e combinação incompatível de revogação/atividade. Campos extras, inclusive material de chave, invalidam resposta. Não cria conexão privilegiada ou endpoint.

Índice composto adicional (project_id,key_id,occurred_at DESC,id DESC) apoia a consulta B023. Não há afirmação de desempenho em produção; benchmark e política operacional de volume permanecem pendentes.

## Validação

47 testes aprovados em três arquivos: 35 de persistência SQL (dois novos), seis de auditoria e seis de inventário. O SQL real roda no PGlite com cadeia local até 024. Testa papéis de browser negados, operador inativo, isolamento por projeto, página lexical, limites inválidos e metadados antes/depois de revogação. Dados e identidades são sintéticos. Não é regressão geral, homologação Cloud ou teste de concorrência remota.

## Progresso e próximos passos

Etapa local concluída; aplicação 024 no Cloud não autorizada nem executada. Frontend, develop e main não alterados. Página /staus ainda depende de consolidação coordenada: este relatório é o registro de progresso da branch backend enquanto Antigravity trabalha no frontend. Não disputar a edição do catálogo na integração. B023/B024 evitam colisão com os identificadores D124 usados pelos dois agentes.

Administração de chaves ainda precisa de provisão segura, definição do worker/ingresso, homologação de privilégios e futura interface administrativa; inventário não conclui White Label em produção. Integração e preview devem preservar as entregas frontend e a correção D125 sem sobrescritas. Sem DNS, compra, permissões clínicas, SQL remoto ou Publish.

TypeScript completo, ESLint direcionado e git diff --check aprovados.
