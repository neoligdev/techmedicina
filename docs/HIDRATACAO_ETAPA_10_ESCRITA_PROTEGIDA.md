# Hidratação — etapa 10: escrita protegida e resultado incerto

Codex, 30/10/2026. Implementação local.

POST /api/hydration/mutate aceita somente o contrato estrito create/correct/void existente. Leitura limitada por bytes reais a 4096, content-type JSON obrigatório, parâmetros de query recusados. ClinicId/patientId/ator não são aceitos no comando como autoridade. A resolução de host e Auth usa a sessão da própria requisição, compartilhada com a RPC tm_mutate_own_hydration_record (041). Read é obrigatório junto de create ou write conforme operação. A RPC permanece responsável por guarda, lock, revisão e recibo atômicos.

Schema estrito e contrato de confirmação validam recibo/registro contra comando e escopo antes da resposta. Conflitos conhecidos retornam 409; falhas desconhecidas ou conteúdo de upstream inválido retornam 503 sem revelar dados brutos. Cache privado/no-store e Vary Authorization/Host. Nenhum dado demonstrativo autoriza escrita. Localhost/preview continuam negados.

Cliente usa somente uma requisição, bearer atual, prazo máximo, sem cookies/cache/redirect. Falha após envio, timeout ou confirmação inválida é incerta: não significa que o banco não gravou. Não há retry automático. HTTP 409 exige consulta de recibo/revisão; rejeições conhecidas são separadas de resultado incerto. O chamador deverá manter comando e IDs originais em memória. Formulário de PWA e recuperação interativa ainda pendentes; sem outbox clínica.

Testes cobrem permissão read+create/write, corpo excessivo, query/escopo injetado, formato errado, conflito, erros ocultos, resposta inválida, perda de resposta após commit simulado e ausência de sessão sem envio. Integração SQL anterior comprova idempotência local, mas não substitui homologação Auth/gateway/host Cloud ou contenção de conexões reais.

Não houve aplicação SQL remoto, concessão de acesso, alteração de design, DNS, infraestrutura, main ou Publish. SQL 041–044 continua dependente de autorização e conferência remota. Status registra apenas a entrega técnica parcial.

Resultado final: 28 testes direcionados aprovados em 3 arquivos; TypeScript, lint dos arquivos alterados e build aprovados. Correções de tipagem estrita foram validadas antes do commit.
