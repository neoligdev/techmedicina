# Revisão local — migração 031

Fonte: database/migrations/031_central_blog_draft_list.sql. Não aplicada remotamente neste lote. Dependências: fundação 001 e rascunhos editoriais 030.

A única alteração é criar tm_list_blog_drafts(text,uuid,integer). Não cria tabela, índice ou grant sobre dados. SECURITY DEFINER, search_path vazio e referências qualificadas; EXECUTE revogado de PUBLIC/anon e permitido a authenticated com auth.uid e operador global Super ADM ativo verificados FOR SHARE. Papel declarado em corpo/query/metadados não é autoridade.

Consulta limitada 1–50, busca literal position(lower(query) in lower(title)), UUID de cursor validado na coleção filtrada, ordem crescente por UUID e uma linha extra para definir a próxima página. Aproveita chave primária para avanço estável. A busca pode percorrer mais linhas que o tamanho de saída; sem promessa de desempenho em grandes catálogos. Não executa SQL dinâmico ou regex enviada pelo cliente.

Resposta contém query e metadados mínimos (ID, status draft, título, categoria, revisão e atualização), sem corpo/editor/identidade de atores ou versões internas. Não publica, seleciona por clínica, concede acesso clínico, altera documento ou escreve auditoria editorial.

Implantação futura: conferir projeto, dependências, assinatura/ausência de função 031 e ACLs; obter autorização específica, validar JWT real e revogação. Falha/ausência da função deve permanecer indisponibilidade explícita, sem fallback para conteúdo demonstrativo. Não remover tabelas ou snapshots editoriais como rollback de uma função de leitura.
