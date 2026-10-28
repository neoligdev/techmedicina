# Blog central — etapa 2: biblioteca de rascunhos (PRD §15)

Executor: Codex. Continuação da base editorial anterior, preservando editor, prévia demonstrativa e design.

## Entregue localmente

- Biblioteca no editor autenticado, com título, categoria, estado rascunho, revisão e botão de abertura. O identificador manual permanece como opção; deixa de ser necessário para navegar pelos rascunhos.
- Busca por trecho literal do título, sem distinção de maiúsculas/minúsculas; porcentagem e sublinhado não são curingas. Sem busca externa, execução de markup ou publicação.
- Paginação por UUID estável, limitada a 25 itens por padrão/50 no máximo. GET /api/platform/blog-drafts usa Auth e mesmo bearer; DTO fechado retorna apenas metadados, sem corpo, autoria de conta ou snapshots internos.
- Proposta local 031 reutiliza tabelas/índice primário da 030. Operador global Super ADM ativo verificado e bloqueado a cada leitura; clínica, médico, paciente e anônimo não obtêm acesso por seleção de área.
- Salvar atualiza a biblioteca; nova busca começa da primeira página. Resposta de consulta anterior é ignorada na mudança do ciclo de leitura/desmontagem. Abrir outro item fica bloqueado enquanto há edição não salva, gravação pendente ou confirmação incerta; releitura explícita continua permitida no fluxo de recuperação.
- Carregamento, vazio confirmado, erro e retry são distintos. API ausente/falha não vira catálogo vazio fictício.

## Validação e limites

23 testes direcionados em seis arquivos aprovados: biblioteca/interface, editor integrado, cliente, handler e persistência PostgreSQL local/PGlite. Cobrem paginação sem duplicações, busca literal, cursor inexistente/limites inválidos, revogação/anon, filtro/recibo incoerente, corpo interno não exposto e resposta antiga descartada. TypeScript com código de saída zero, lint direcionado e build aprovados. HTTP local anônimo: 401 e no-store/private; não é homologação com JWT real.

Sem SQL remoto, grants, DNS, main ou Publish neste lote. Migrações 030/031 precisam de aplicação e homologação próprias. PRD §15 segue parcial: revisão editorial/clínica, mídias/acessibilidade, disponibilização central, seleção/publicação por clínica e consumo no aplicativo não foram presumidos.

A lista é ordenada por identificador estável, não por data de atualização; não é snapshot entre requisições. Alterações concorrentes no título podem mudar a participação em um filtro; recarregar a busca recompõe a coleção. O servidor recusa cursor que deixou de pertencer ao filtro. Busca não ignora acentos nem implementa índice de texto completo; desempenho em catálogo volumoso continua sujeito à homologação. Não foi repetida uma suíte global nem somada a contagem histórica de outros lotes.
