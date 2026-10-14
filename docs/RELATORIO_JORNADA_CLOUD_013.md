# Aplicação Jornada 013 — Lovable Cloud

Codex, 14/10/2026. Autorização humana específica recebida nesta sessão. Executada diretamente pelo SQL Editor, sem Ask Lovable.

Preflight: tabela e RPC ausentes; Auth uid, guard de leitura, cinco tabelas e chave UNIQUE paciente/clínica/usuário presentes; pacientes/vínculos/grants zero.

Fonte database/migrations/013_journey_goal_drafts.sql aplicada integralmente em transação. Confirmação ALTER exibida pelo painel foi aceita dentro do escopo autorizado. Resultado: Query succeeded.

Pós-verificação: RLS true, uma política de leitura; anon SELECT/EXECUTE false; authenticated SELECT/EXECUTE true sujeitos aos guards/RLS; INSERT/UPDATE/DELETE diretos false. SECURITY DEFINER true e search_path vazio. Corpo remoto igual ao local por MD5 após remoção de espaços (ee31a2f9cab1f9096b66f7db0a3d8f96). Rascunhos/pacientes/vínculos/grants zero.

Evidências em docs/evidencias/jornada_013_cloud_verificacao.sql, .txt e .png. Aplicação direta não comprova entrada no ledger gerenciado de migrações. Não reaplicar 013. O comentário LOCAL ONLY da fonte identifica sua origem e não o estado atual; este relatório e D68 registram o estado aplicado.

Não foram criados usuários ou acessos clínicos. Endpoints ainda não montados, sem DNS/Publish. Testes locais 589/74 anteriormente aprovados; homologação autenticada real permanece pendente.
