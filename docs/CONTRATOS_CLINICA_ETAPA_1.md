# Contrato de uso da clínica — etapa 1

Executor Codex, 28/10/2026. PRD 13.1: parcial.

Base local de rascunhos administrativos por clínica. Campos: título, moeda BRL inicial, setup em centavos, existência/valor de mensalidade, existência de cobrança por vidas, quantidade e preços de titular/dependente, observações. Null expressa decisão pendente, distinto de zero e de false. Rascunho incompleto é permitido; combinações anotadas não aprovam modelos acumuláveis ou exclusivos. Nada é somado, cobrado, aceito ou ativado. Limites numéricos são técnicos, não preços ou políticas comerciais.

API GET/PUT /api/platform/clinic-contract-draft exige ID e clinicId, sessão verificada e Super ADM ativo. Resposta estrita valida clínica, conteúdo, revisão e recibo; corpo JSON limitado a 64 KiB, sem cache. Atualização exige revisão corrente. Falha não é confirmação.

## Revisão da proposta 034

Depende apenas de 001. Novas tabelas de rascunhos e snapshots, RLS e nenhum acesso direto para anon/authenticated. RPC SECURITY DEFINER com search_path vazio revalida operador ativo e clínica existente. Uma clínica inativa pode ter proposta em preparação, sem ativação. Clínica de um rascunho é imutável via RPC. Bloqueio serializa UUID; criação repetida idêntica pelo criador e escrita sem mudança não geram versão extra. Snapshot e ator persistem na mesma transação, sem API de edição histórica. Isso não é contrato juridicamente aceito nem armazenamento WORM contra DBA.

SQL revalida campos, tipos, centavos inteiros, quantidades e limites independentemente do navegador. Rejeita ativação/aceite como campos extras. Testes detectaram expressão CASE inválida na primeira proposta; corrigida e repetida com sucesso antes de commit. Nenhuma migração remota executada.

Validação: 10 testes locais SQL/HTTP em 2 arquivos; TypeScript, lint direcionado e build aprovados. Sem teste autenticado Cloud.

## Próximas etapas

1. Editor integrado a Planos, confirmando clínica, salvamento/releitura e respostas incertas.
2. Biblioteca paginada por clínica, sem depender de UUID digitado.
3. Regras comerciais aprovadas, aceite/versionamento definitivo, cobrança e benefícios somente com decisões próprias.

Pendências do PRD mantidas: acumulação de modelos, franquia/mínimo/faixas, parcelamento/setup, vencimento, vigência, fidelidade, tributos e consequências de atraso. Nenhum gateway, DNS, credencial, main ou Publish alterado.
