# Revisão local 026 — resolução mínima do host do paciente

26/10/2026 · Codex · NÃO aplicada ao Cloud.

Depende de 001/006/007, recursos Jornada 008/009/014 e cadeia de provas 017–025. Confirmar todas as dependências, versões, constraints e ACL efetivas antes de pedir autorização de implantação. Não reaplicar SQL histórico. O incremento não cria usuários, vínculos, grants clínicos, chaves, DNS ou hosts ativos.

Função SECURITY DEFINER com search_path vazio, somente EXECUTE para authenticated. Consulta exige auth.uid(), hostname exato e domínio patient_pwa ativo, clínica ativa, snapshot de ativação compatível com a revisão do domínio e prazo vigente. Reconferidos desafio/prova DNS, desafio/recibo de roteamento, digest e janela da chave sem revogação. Não aceita o status active isolado como prova. A função verifica um único vínculo ativo na clínica e paciente ativo associado ao mesmo user_id, além de grant read em recurso Jornada. Paciente de outra clínica, Super ADM sem vínculo e usuário desconhecido não descobrem registros; retorna NULL. Sem SELECT global de registry/tabela de ativação.

Retorno mínimo hostname/clinicId/environment/status, sem provas, tokens, materiais de chave, nomes ou dados de saúde. Este RPC não concede direito de ler eventos/Escudos: handlers/RPCs clínicos continuam validando grants específicos e paciente próprio na mesma sessão. Leitura é snapshot: futura revogação deve ser observada na requisição seguinte; requisição já autorizada não tem garantia de cancelamento instantâneo entre processos. Não são feitas alegações de concorrência remota com PGlite.

Testes locais usam provas emitidas/assinadas/consumidas pelos módulos reais e PWA desde a reserva, sem editar prova assinada após emissão. Incluem revogação, expiração, paciente/clínica inativos, grant removido, snapshot ausente e fluxo runtime cliente próprio com autorrelato idempotente. Antes de operação real, homologar proxy/ingresso, TTL/revalidação, privilégio mínimo, dois tenants e sessão real no Cloud. Falta operacional não é contornada por service_role.

Recuperação: mudanças são aditivas; preferir correção progressiva revisada. Não remover tabelas/provas/auditoria como rollback automático. Sem aprovação de SQL remoto, DNS, publicação ou permissões por este documento.
