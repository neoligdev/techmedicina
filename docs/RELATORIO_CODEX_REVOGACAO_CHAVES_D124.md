# D124 — Revogação auditada de chaves de roteamento

Executor Codex. Proposta local 022, não aplicada no Cloud. Base de trabalho atualizada por fast-forward para develop 3201996, preservando as entregas existentes, design e autoria Antigravity.

## Implementação

A migração 022 acrescenta revisão otimista e marcadores de revogação ao registry de chaves públicas da 020. A função privada tm_revoke_routing_key exige operador Super ADM ativo, bloqueia operador e chave, confere projeto/keyId/revisão e grava a revogação e a auditoria na mesma transação. A auditoria contém ator, instante, revisões, digest público e estado anterior; nenhuma chave privada ou dado clínico. Falha na auditoria desfaz a alteração inteira.

Repetição com revisão antiga é conflito; repetição com revisão atual retorna changed=false sem novo evento. A função não reativa chave, não provisiona chave nova e não remove histórico. O CHECK impede is_active=true enquanto existirem marcadores de revogação. Não há endpoint nem default de conexão privilegiada; nenhum EXECUTE para PUBLIC/anon/authenticated. O adaptador server-only valida input/recibo e mapeia falhas sem expor diagnóstico bruto. Ator é obtido da identidade verificada e nunca aceito como campo extra do input.

A revogação não toca domínios/DNS depois de bloquear a chave, evitando inversão com o lock order dos escritores existentes. Leituras 021 passam a reportar recibo inválido e gravações em curso são recusadas ao reconferir is_active, sem apagar a prova histórica. Não se afirma simultaneidade PostgreSQL real com o teste PGlite serializado.

## Validação

37 testes direcionados aprovados: 31 do fluxo SQL de roteamento (quatro novos, incluindo rollback por trigger sintético de auditoria) e seis de contrato da revogação. TypeScript e lint direcionado aprovados. A regressão completa do conjunto será registrada ao término; testes não comprovam Cloud, ingresso, DNS ou TLS reais.

## Limites

Identidade mínima do worker, administração/provisionamento das chaves, segredo no ingresso, aprovação/aplicação de 020–022, ativação/suspensão e homologação permanecem pendentes. Registros e testes são locais; nenhuma credencial de produção criada. PRD e adendos preservados. Status oficial somente durante integração em develop; main permanece no aa61b4e autorizado anteriormente.

## Validação consolidada do lote

Regressão do estado integrado com D123 e as correções D124/D125: 1.122 testes aprovados em 125 arquivos (314,88 segundos). TypeScript completo, lint direcionado e build aprovados. A interface foi aberta em http://127.0.0.1:8082/app/escudos; galeria demonstrativa, abertura dos detalhes de Plenitude e fechamento conferidos. Isso não é homologação Cloud ou concorrência real de conexões PostgreSQL.
