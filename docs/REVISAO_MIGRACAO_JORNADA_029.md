# Revisão local — migração 029

Arquivo: database/migrations/029_journey_own_self_report_status.sql. Não aplicado no Cloud.

Dependências SQL: fundação multi-tenant 001 e Jornada 008. O runtime continua dependendo da resolução segura de host 026 e da cadeia White Label; uma flag de domínio ativo isolada não habilita este endpoint.

Função SECURITY DEFINER com search_path vazio e objetos qualificados. EXECUTE revogado de PUBLIC/anon, permitido a authenticated. Identidade por auth.uid; associação única ativa na clínica, papel paciente, clínica/paciente ativos, conta do paciente correspondente e grant journey_events/read. Linhas de autorização bloqueadas FOR SHARE durante a leitura.

Busca exata por clínica/paciente/source='self_report'/source_event_id aproveita a restrição única já existente da migração 008; ator também deve corresponder à conta. Retorno mínimo próprio com evento ou null, sem ator/política/metadados internos. Um UUID pertencente a outro paciente não revela se o registro existe. Não depende de participação habilitada ou grant create para confirmar uma escrita anterior, mas exige o grant de leitura atual.

Não cria tabela, índice adicional, evento, preferência, conta, grant ou auditoria de escrita. Ausência não prova falha de uma transação concorrente; o formulário mantém o estado incerto e a mesma chave. Revisar objetos/ACL no Cloud e obter autorização própria antes de aplicação remota. Homologar também origem, JWT/RLS e revogação reais.
