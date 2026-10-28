# Revisão da proposta local 036 — histórico comercial

Codex, 28/10/2026. Não aplicada remotamente; não incluída no pedido de autorização 034–035.

Depende de 001 e 034. Adiciona duas RPCs de leitura de versões: consulta exata e metadados paginados. Reutiliza tabelas e índice primário de snapshots. Não adiciona tabela, índice, escrita, aceite, cobrança ou restauração.

Funções SECURITY DEFINER com search_path vazio exigem auth.uid e Super ADM ativo sob bloqueio compartilhado. EXECUTE restrito a authenticated; sem acesso direto a tabelas. Todo resultado é filtrado por draft_id E clinic_id por vínculo com o rascunho. Ator interno não é devolvido. Cursor deve existir no mesmo rascunho/clínica, com limites positivos.

Teste local inicial: 12 versões em duas páginas, preservação de null versus zero, versão corrente intacta, clínica incorreta sem dados, cursor de outra clínica rejeitado, acesso anônimo/operador revogado e leitura direta negados. Interface/cliente/API possuem testes separados. Isso não comprova homologação Cloud.

Antes de aplicar futuramente: confirmar projeto/backend, definições da 034 e ausência das novas assinaturas; se existirem, comparar, sem DROP ou reaplicação cega. Conferir ACL e resultados após aplicação gerenciada. Não aplicar junto com 034–035 por suposição de autorização. Não apagar snapshots como rollback; revisar suspensão de EXECUTE se necessário como ação própria.
