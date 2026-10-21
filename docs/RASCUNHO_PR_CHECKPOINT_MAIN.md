# Rascunho de integração para revisão — ainda não aberto no GitHub

Base: main. Origem: checkpoint/d69-d74. Não mesclar automaticamente nem executar Publish.

## Proposta de descrição

As entregas posteriores à D85 corrigem integridade dos Escudos e implementam a fundação de disponibilidade médica com isolamento por clínica, fuso explícito, transporte autenticado e paginação. A composição da agenda permanece desabilitada por padrão até homologação. A compatibilidade D115 preserva o cadastro administrativo no schema anterior à migração 016; fuso solicitado explicitamente nunca é descartado para forçar sucesso.

A retomada consolidou o trabalho D108–D112 do Antigravity, confirmou o estado remoto por metadados e acrescentou plano mestre do PRD e prova DNS local de posse. Essa prova não ativa domínios nem comprova TLS/roteamento. O PRD permanece incompleto.

## Verificações antes de abrir/tornar apto à integração

- Confirmar SHA do checkpoint e regressão completa após D115; preservar os resultados anteriores como históricos.
- Revisar todo o diff desde main, incluindo migrações 014–016, sem aplicá-las automaticamente.
- Validar que AGENDA_OPERATIONAL_ENABLED permanece desligada e nenhum outro fluxo depende silenciosamente de schema remoto ausente.
- Conferir ausência de segredos/dados pessoais desnecessários nos arquivos novos e nas capturas.
- Homologar cadastro/auditoria existentes e personalização no preview após integração autorizada, inclusive erro seguro ao pedir fuso sem 016.
- Revisar o lote e definir estratégia de integração; manter migrações, concessões, DNS, ativação de domínio e publicação produtiva em gates separados.

## Situação da ferramenta

Consulta por GitHub CLI em 21/10/2026 não conseguiu listar PRs porque gh não está autenticado. O comando não criou PR nem alterou a main. Push Git utiliza o acesso Git já existente e é independente dessa autenticação. Não foi solicitada nem criada credencial adicional. Este arquivo é um rascunho local; não alegar que existe PR remoto a partir dele.
