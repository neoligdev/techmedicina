# Aplicação autorizada: contratos 034–035

Executor: Codex. Registro: 29/10/2026.

Antes da aplicação, dependências tm_clinics, tm_platform_operators, auth.uid e papéis confirmados. Tabelas, RPCs e índice novos ausentes. Arquivos enviados integralmente e executados em ordem, ambos com Query succeeded no SQL Editor do projeto Techmedicina.

SHA256 034: 87b5a84ed0a7267c68cadb4c803a9c083313f6ed681d7b8cff44ee5c909967a0.
SHA256 035: f258251dae20cd05592f8a21b7f19ac7fe7cbfacf2964003d46184a5e43b8b54.

Verificação posterior: duas tabelas com RLS; anon e authenticated sem SELECT/INSERT/UPDATE/DELETE direto. Três RPCs com SECURITY DEFINER, search_path vazio, EXECUTE authenticated permitido e PUBLIC/anon negado. Índice clinic_id/id presente. Zero rascunhos e zero versões. A verificação é estrutural; não substitui homologação autenticada de escrita. Nenhuma conta, vínculo clínico, aceite, cobrança ou benefício criado.

Main enviada exatamente até 5b4ff09. As entregas posteriores de dispositivos não foram promovidas. Migrações 036–038 continuam locais. Recebimento de commits pelo Lovable observado, compilação/hidratação do novo preview ainda deve ser confirmada.

Evidência: evidencias/contratos-clinica/cloud-034-035-verificado.png.

Verificação posterior do preview: /staus renderizou 147 entregas, atualização 28/10, cobertura iniciada 26% e conclusão integral 0%. Menu abriu e navegação para Planos funcionou; cartão de contratos recusou edição sem sessão. Isso confirma renderização e interação nessas telas, não escrita autenticada. O painel legado de políticas fazia GET sem bearer, corrigido na etapa seguinte somente em desenvolvimento.
