# Blog central — etapa 3C: lista paginada de versões

Executor: Codex. Data: 28/10/2026. PRD §15 permanece parcial.

## Entrega

O histórico oferece listagem sob demanda, inicialmente com 10 revisões em ordem decrescente. Cada item mostra título histórico e data e abre o painel somente leitura já existente. Mais páginas usam cursor de revisão exclusivo; atualizar a lista reinicia a paginação. Edições não salvas permanecem intactas. É possível consultar uma revisão que outro editor salvou depois da versão carregada, sem mudar a revisão do formulário nem contornar a concorrência do salvamento.

GET /api/platform/blog-draft-versions valida UUID, cursor inteiro positivo, limite 1–50, parâmetros únicos e ausência de chaves extras. A resposta estrita confere rascunho, ordem decrescente, cursor, limite e ausência de campos privados. Sessão e Super ADM são verificados antes da RPC. Mesmo bearer e sem service role; resposta privada/no-store. Cliente usa token atual e prazo máximo.

## Revisão da proposta SQL 033

Local apenas. Depende de 001 e 030, sem nova tabela/índice. Reutiliza chave primária (draft_id,revision) em ordem reversa. SECURITY DEFINER, search_path vazio, operador ativo revalidado com bloqueio compartilhado; anônimo sem EXECUTE e contas autenticadas sem operador negadas. Cursor deve existir no mesmo rascunho. Retorna apenas revisão, título e data; não corpo, autoria interna ou dados clínicos. Não cria grants clínicos e não modifica snapshots.

Revisões novas não deslocam páginas antigas: o cursor usa número imutável menor que a última revisão da página. A lista não promete um snapshot transacional entre requisições. Falha tem mensagem própria, sem apresentar coleção vazia; repetir a listagem retorna ao início. Respostas atrasadas são descartadas ao trocar rascunho/revisão/cliente ou desmontar.

## Validação

Testes SQL locais: 12 versões, duas páginas, nova revisão entre páginas, cursor estrangeiro/inválido, limites, ausência de campos privados, anônimo/conta sem operador/revogação. Testes HTTP/cliente: escopo, ordem, duplicatas, cache e bearer, parâmetros e métodos inválidos. Interface: paginação/seleção, falha/retry/vazio, resposta atrasada e integração com editor sujo, incluindo versão mais recente no servidor. 27 testes direcionados em 6 arquivos aprovados, incluindo cobertura do status. TypeScript, lint direcionado e build verificados antes do commit. A rota local recusou acesso anônimo com 401, private/no-store e Vary Authorization; isso não comprova execução da RPC no Cloud.

## Limites

Sem aplicação de 033 no Cloud, homologação autenticada remota ou alteração de main/preview/Publish/DNS. PRD §15 ainda requer revisão editorial/clínica, mídias, seleção/publicação por clínica e consumo no PWA. Sem restauração automática ou publicação de versões.
