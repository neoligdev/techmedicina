# D125 — Parte 7: revalidação automática da participação

Executor: Codex. Continuação independente da versão 7c1551b proposta para preview.

Ao iniciar gravação da participação, o painel bloqueia novos envios de hábitos. Ao terminar, inclusive em resposta incerta/conflito, reconsulta a disponibilidade no servidor. O controle manual permanece disponível como recuperação, mas deixa de ser necessário no fluxo comum. Nenhum grant é criado e a confirmação transacional da escrita continua obrigatória.

A revalidação não remonta o formulário de um autorrelato incerto: seu identificador e instante originais são mantidos para reenvio. Ao mudar paciente/conta, mantém-se a desmontagem e o descarte das respostas anteriores.

Testes direcionados: 17 aprovados em quatro arquivos (participação, cartão conectado, formulários e painel), incluindo resposta perdida de participação e conservação do ID após bloqueio/revalidação. TypeScript, lint direcionado e build aprovados. A regressão global de 1.204 testes/136 arquivos pertence à versão anterior 7c1551b; não atribuir esse total como nova execução global desta melhoria.

Sem SQL, grants, DNS, infraestrutura, main ou Publish alterados. D125 e PRD permanecem parciais; homologação real e dados estruturados continuam pendentes. A aprovação de preview solicitada é especificamente para 7c1551b e não inclui automaticamente esta parte posterior.

Correção de validação: a confirmação TypeScript anterior da parte 6 foi prematura. O log completo continha erros exactOptionalPropertyTypes no repasse de fetcher opcional. Propriedades ausentes agora são omitidas, sem enfraquecer tsconfig ou contratos. O callback opcional da parte 7 recebe o mesmo tratamento. Não integrar 7c1551b isoladamente; utilizar o lote corrigido após a validação indicada nesta entrega.
