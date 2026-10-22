# Persistência privada do roteamento White Label — proposta de entrega local

22/10/2026 · executor Codex · dev/codex-backend.

## Reserva e implementação

020_domain_routing_persistence.sql reservada após conferir ausência em develop,
Antigravity e backend. Proposta LOCAL; não aplicada no Cloud. Depende de 001,
006, 017–019. Sem provisionamento de chave, worker, endpoint ou domínio ativo.

Registry privado armazena digest SPKI DER/SHA-256 da chave pública, não chave
privada. Writers e tabelas não têm grants para anon/authenticated/PUBLIC.
Auditoria expõe somente metadados a operadores Super ADM ativos, sem nonce.
Emissão confere domínio/clínica/ambiente/revisão, DNS vigente e registro de chave,
serializa pelo domínio e rotaciona o desafio. Colisões desfazem toda a escrita.
Consumo reconfere operador, DNS, revisão, digest e validade da chave sob locks;
recibo, consumo único e auditoria são gravados atomicamente. Não ativa domínio.

O adaptador server-only lê estado confiável, valida assinatura e HTTPS e exige
um writer privado injetado. O retorno é estritamente conferido campo a campo.
Conflitos tornam-se 409; falhas de infraestrutura são sanitizadas. SQL confia no
verificador privado revisado e não implementa Ed25519 dentro do banco. Não expor
os writers ou um executor SQL genérico ao navegador.

## Testes e limitações

45 testes direcionados aprovados: 27 da assinatura e 18 da persistência. Cobrem
consumo único, rotação, rollback, tenant incorreto, acesso do browser, auditoria,
revogação/alteração de operador, DNS, chave, digest e revisão durante a observação,
validade da chave reduzida, expiração e retorno de persistência adulterado.
TypeScript e lint direcionado aprovados. PGlite em memória e fixtures sintéticas;
não houve consulta ao Cloud, domínio real ou dados clínicos.
PGlite usa uma conexão serializada: estes testes não são um ensaio de concorrência
entre sessões de um PostgreSQL remoto. Os locks estão definidos no SQL proposto.

## Próximas dependências

Provisionamento mínimo de worker e chaves exige revisão/autorização própria.
Leitura de desafio/recibo adequada ao worker, auditoria de administração das
chaves, homologação de ingresso/egress, ativação/suspensão e SSR por domínio
permanecem pendentes. PRD, adendos e frontend preservados.

A tentativa de checkpoint local foi rejeitada pela revisão automática por faltar
autorização explícita para commit. O comando inteiro foi bloqueado antes de
executar; nenhum git add, commit ou merge foi realizado nesta continuação.
Integração de código em develop e atualização remota aguardam decisões próprias.
O status temporário deve informar backend local validado e integração pendente,
sem declarar o requisito White Label integralmente concluído.

## Resultado consolidado — 22/10/2026

Regressão completa do backend: 1.026 testes aprovados em 118 arquivos (263,64 s).
TypeScript, lint direcionado e build local aprovados. Quatro testes do catálogo
de /staus aprovados na worktree de integração. D119 e D120 registradas no catálogo
local com autoria Codex, alcance da validação e limites explícitos; nenhum requisito
produtivo do PRD foi marcado como concluído. PRD e adendos preservados.
O status remoto do Lovable não foi atualizado: main e GitHub não foram alterados.
Commit e merge locais continuam pendentes da aprovação específica solicitada.

## Aprovação do checkpoint local

22/10/2026: proprietário autorizou explicitamente commit e integração locais em
develop após regressão aprovada. Substitui a pendência de autorização descrita
acima; não inclui push, main, publicação ou aplicação de SQL no Cloud.
