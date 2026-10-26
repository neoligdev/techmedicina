# Backend isolado — consulta privada da auditoria de chaves (B023)

26/10/2026 · Executor: Codex · branch dev/codex-backend. PRD White Label §9; preserva backend multi-tenant e frontend existente.

## Entrega

Proposta local 023 acrescenta tm_read_routing_key_audit, sem endpoint e sem EXECUTE para PUBLIC/anon/authenticated. A função reconfere Super ADM ativo no banco, limita a consulta a projeto e keyId, valida cursor dentro do mesmo escopo e limita páginas a 100 eventos (25 por padrão). Ordenação determinística por instante e UUID, cursor exclusivo, sem OFFSET. Consulta retorna somente metadados da revogação e digest público; não retorna material privado, tokens, dados clínicos ou registry completo.

Adaptador server-only exige leitor privado injetado e identidade verificada. Não aceita ator no payload. Valida escopo, limite, formato, revisões consecutivas, IDs duplicados e repetição do cursor; erros de armazenamento são mapeados sem diagnósticos internos. Não cria conexão privilegiada por padrão, não provisiona chaves, não ativa domínios e não concede permissões.

## Testes

39 testes direcionados aprovados em dois arquivos: 33 testes SQL de roteamento (dois novos para leitura privada) e seis testes de contrato novos. PGlite executa a cadeia local 001,006,007,017–023; cobertura inclui negação a anon/authenticated, operador comum/inativo, escopo estrangeiro, cursor estrangeiro, limite inválido, paginação com empate de instante e retorno estrito. Linhas adicionais de auditoria são fixtures sintéticas; não representam eventos reais de produção.

Esta execução não repete a regressão geral histórica de 1.122 testes, não prova concorrência entre conexões PostgreSQL, Cloud ou DNS/TLS reais.

## Coordenação e pendências

Trabalho exclusivamente nesta worktree; frontend Antigravity e develop não editados. Usa identificador B023 para evitar colisão com a D124 do frontend e a D124 anterior do backend. A página /staus continua no estado integrado anterior: atualizar catálogo apenas durante consolidação coordenada em develop. Este relatório registra o progresso isolado e a autoria real; não afirma que o site foi atualizado.

Próximo: consolidar revisão com as entregas frontend quando concluídas; provisionamento mínimo de chaves/worker e aplicação remota continuam gates próprios. Main permanece na versão aa61b4e autorizada. Sem push, SQL remoto, DNS, grants, endpoints ou Publish nesta etapa.

TypeScript completo e ESLint direcionado aprovados usando os binários já instalados. Nenhuma instalação ou alteração do bun.lock foi necessária.
