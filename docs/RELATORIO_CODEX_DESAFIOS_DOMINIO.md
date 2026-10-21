# Lote backend — desafios White Label (proposta D116)

21/10/2026 · executor Codex · branch dev/codex-backend.

## Implementação local

Migração aditiva 017_domain_challenges.sql, dependente de 001 e 006/007 (a ordem oficial continua 001–017). Não aplicada no Cloud. Nova tabela de desafios e auditoria própria, preservando o contrato antigo de tm_domain_audit e a interface existente.
Emissão/rotação tm_issue_domain_challenge exige operador ativo super_admin, bloqueia a autorização e a reserva, confere revisão esperada e mantém status pending_verification. Cada emissão incrementa a revisão da reserva. A rotação revoga o desafio anterior na mesma transação. Token único e validação estrita de 64 caracteres hexadecimais; erro de inserção desfaz revogação, revisão e auditoria. A função não gera token: ele deve ser gerado criptograficamente pelo servidor. Nenhuma rota HTTP foi adicionada.
O novo desafio é retornado somente ao emissor autorizado; a tabela não concede SELECT nem escrita direta a authenticated/anon. Auditoria sem token é legível somente por operadores ativos. IDs da clínica e ambiente vêm exclusivamente da reserva bloqueada. Nenhuma concessão clínica é criada. Expiração finita e futura obrigatória, fornecida por política de servidor; não foi inventado prazo comercial. Hosts IP, locais/preview e nome TXT acima do limite são recusados.

## Limites e dependências da próxima etapa

Ainda não há adaptador runtime para emissão e leitura do desafio corrente, consumo de prova, endpoint, instruções de UI, TLS/roteamento nem ativação/suspensão. A verificação D114 deverá receber a reserva atualizada e conferir novamente a revisão/id corrente sob bloqueio ao persistir uma observação; um recibo DNS isolado nunca autoriza ativação. Expiração é conferida ao emitir e pelo verificador; não há job de limpeza/expiração nem duração padrão. O índice mantém uma única linha não revogada por domínio, mesmo após expiração, até a próxima rotação.
Tokens TXT não são credenciais de conta, mas não devem aparecer em logs ou auditorias comuns. O contrato da RPC só está no SQL local. Regeneração de tipos gerenciados e adaptador seguro dependem da revisão/aplicação apropriada. O novo evento não aparece no painel de auditoria antigo, deliberadamente preservado; integrar consulta/mapeamento mínimo na etapa da interface.
Não houve teste de concorrência entre duas conexões PostgreSQL reais: PGlite comprova efeitos transacionais, stale revision e rollback de erro, mas não substitui homologação concorrente Cloud.

## Validação

Nove testes novos em domain-challenges-database.test.ts com PostgreSQL PGlite: emissão, rotação, stale revision, rollback por token duplicado, permissões diretas negadas, entrada/expiração inválidas, domínios inválidos, isolamento entre clínicas/ambientes e operador revogado. Testes D114 e reservas também passaram na verificação direcionada anterior. Resultado completo, tipos e build serão registrados ao término dos processos.

## Integração e status

Este relatório é proposta de entrega, não conclusão do requisito White Label. O catálogo oficial permanece D115 até integração revisada em develop, conforme COORDENACAO_AGENTES.md. Depois integrar o lote e registrar D116 com autoria Codex e as limitações acima, sem marcar o requisito inteiro como concluído. Não editar a worktree Antigravity. main e original preservados.

## Resultado consolidado

Regressão completa: 905 testes aprovados em 112 arquivos (260,82 segundos). TypeScript sem erros; lint do novo teste sem erros; build local aprovado. Nenhum resultado equivale a aplicação no Cloud ou preview. Build alterou apenas finais de linha de routeTree.gen.ts; conteúdo e finais de linha originais foram preservados, sem alteração rastreada final.

## Integração local

Lote 35f99a6 revisado e integrado por fast-forward em develop. Catálogo oficial e Markdown atualizados nesta worktree de integração com D116, mantendo todos os requisitos globais parciais/pendentes. O documento de coordenação e os dois commits preparatórios também foram preservados. C:/dev/techmedicina-integracao é checkout exclusivo de develop; nenhuma implementação deve ocorrer ali fora da integração. Nenhum push ou troca de branch Lovable implícitos.
