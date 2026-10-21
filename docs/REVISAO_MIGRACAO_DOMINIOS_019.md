# Revisão local — migração 019 (leitura de recibos DNS)

21/10/2026 · Codex. Não aplicada remotamente; não constitui autorização para Cloud.

Depende dos objetos 006/017/018 e da fundação 001; preservar ordem oficial. Antes de aplicar, confirmar projeto, dependências efetivas, ausência da assinatura tm_read_domain_dns_proof(uuid,uuid), backup/recuperação e privilégios. Não presumir migrações anteriores executadas.

A migração adiciona somente uma RPC SECURITY DEFINER com search_path vazio, EXECUTE revogado de PUBLIC/anon e permitido a authenticated. O corpo exige operador ativo super_admin sob lock, domínio/desafio exatos e leitura do recibo persistido. Sem SELECT direto de tabela, token, alteração de status, usuário, grants clínicos ou emissão/consumo adicional.

Homologar depois de autorização: operador consulta recibo conhecido, comum/anônimo é negado, domínio errado retorna null, rotação mantém histórico e isCurrent/isValid falsos. Prova vigente não equivale a domínio ativo nem prova TLS. O transporte server-only recalcula vencimento ao responder.

Falha no script transacional causa rollback. Após uso, preferir correção aditiva; remoção/restauração remota exige plano e autorização específicos. A sonda HTTPS deste lote não faz parte da migração, não cria endpoint nem exige nova credencial.
