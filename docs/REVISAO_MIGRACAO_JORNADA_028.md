# Revisão local — migração 028

Arquivo: database/migrations/028_journey_own_goals.sql. Não aplicado ao Cloud.

Dependências: fundação tenant 001 e participação Jornada 008. Runtime também depende da resolução de host 026 e da cadeia White Label revisada; não ativar pelo simples estado visual de um domínio.

A função SECURITY DEFINER usa search_path vazio e referências qualificadas. EXECUTE é retirado de PUBLIC/anon e permitido somente a authenticated. auth.uid determina a identidade; exige uma única associação ativa na clínica, papel paciente, paciente/conta correspondentes, clínica/paciente ativos e grant journey_goals/read, bloqueados FOR SHARE durante a leitura. Não altera grants, metas, participação ou eventos.

Paginação por UUID crescente (não cronológica), índice composto tenant/paciente/id, cursor pertencente ao mesmo usuário/paciente/tenant e limite 1–100. Retorna uma linha extra apenas para decidir nextCursor. Como qualquer paginação sem snapshot entre requisições, inserções/remoções concorrentes podem alterar a coleção; remoção do cursor exige reiniciar a consulta. A UI deve atualizar o snapshot antes de ações; este retorno não autoriza escrita.

Testes locais cobrem paginação completa, vazio final, cursor inexistente/de outro paciente, limites, usuário anônimo, Super ADM sem vínculo, grant revogado e ausência de concessão implícita de escrita. Nenhum dado ou usuário real criado. Aplicação remota requer preflight dos objetos/ACL e autorização específica; migrações locais não significam homologação Cloud.
