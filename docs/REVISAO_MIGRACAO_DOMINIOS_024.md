# Revisão da migração local 024

Dependências: 020 registry, 022 revisão/revogação e tabela de auditoria, fundação de operadores 001. Aplicação remota depende de conferência dos objetos e grants efetivos, plano de recuperação e autorização específica. Não aplicada ao Cloud.

Cria função SECURITY DEFINER com search_path vazio, sem EXECUTE comum, consulta limitada por projeto e campo explícito, sem SELECT amplo ou DML concedido. Identidade da chamada futura deve derivar de sessão verificada em fronteira privada. Índice da auditoria é aditivo, não muda sua semântica; implantação sobre volume real requer análise de duração/bloqueios antes de executar CREATE INDEX. Não escolher automaticamente variante concorrente dentro desta transação.

Homologar limites, papéis, operador revogado, páginas vazias e ordenação ASCII real; conferir que metadados não sejam interpretados como autorização ou ativação. Banco owner continua confiável. Nenhum endpoint, chave ou identidade operacional provisionado.
