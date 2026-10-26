# Revisão da proposta local 023 — leitura privada de auditoria

Depende das migrações locais 020/022 e da fundação de operadores 001. Não aplicada no Cloud. Antes de aplicação futura: verificar projeto/versões/objetos existentes, dependências, plano de recuperação e autorização específica; não reaplicar migrações históricas.

Cria somente uma função SECURITY DEFINER, search_path vazio, sem grants a PUBLIC/anon/authenticated. Nenhuma tabela, registro ou permissão clínica é alterado. Identidade do ator deverá vir de sessão verificada na fronteira privada futura; nunca encaminhar ator arbitrário do navegador. Não há default de conexão ou endpoint implementado. Owner do banco permanece confiável.

Paginação por (occurred_at,id) descendente, cursor UUID exclusivo pertencente ao mesmo projeto/chave. Evento fora do escopo é inválido; primeira página sem eventos retorna lista vazia, sem enumerar registry. Audit append-only segue como requisito operacional; esta migração não amplia permissões para editar/excluir eventos. Índice adicional e desempenho devem ser avaliados com volume real antes de expor o serviço; nenhum SLA inferido dos testes locais.

Testes PGlite cobrem autorização, escopo, limites e empates de timestamp. Homologação futura exige testar papéis reais, privilégios padrão efetivos, ator revogado, paginação e ausência de campos sensíveis no runtime autorizado. Não ativa host, não cria chave ou worker e não é aprovação de infraestrutura.
