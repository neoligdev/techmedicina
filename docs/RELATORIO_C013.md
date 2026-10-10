# C013 — Clínicas e vínculos persistidos (10/10/2026)

Executor **Codex direto**. Base `cf9e07e`, main, origem neoligdev/techmedicina. Antigravity/OpenCode parados.

## Entrega

- Migração aditiva `database/migrations/001_tenant_foundation.sql`: clínicas, associação opaca de pacientes/contas, vínculos locais, grants explícitos e operadores globais. Tudo nasce inativo; sem criação de contas, vínculos ou operadores por seed/email/metadata.
- FK composta protege paciente/clínica/conta; papéis locais admin/médico/paciente. Sem conteúdo clínico ou dados pessoais nesta etapa.
- RLS nas cinco tabelas, leitura própria, anônimo bloqueado e nenhuma escrita concedida ao navegador. Operador persistido vê cadastro de clínicas sem vínculo médico automático. Paciente vê somente sua associação ativa.
- RPC `tm_resolve_identity`: SECURITY INVOKER, RLS, auth.uid(), search_path vazio e sem parâmetro de usuário. Filtra vínculos/clínicas/pacientes inativos.
- Adaptador consulta RPC somente após getUser(token); parser estrito verifica usuário, UUIDs, grants, papéis e duplicidade. Falha/migração ausente nunca concede privilégios; mantém identidade confirmada sem links.
- Drizzle gerado preservado. Lovable será acionado para aplicar a migração revisada e manter registro gerenciado; sem dois escritores simultâneos.

## Evidências

- PGlite 0.5.8, dependência exclusiva de testes fixada em package.json/bun.lock. PostgreSQL em WASM, isolado em memória; papéis/auth.uid simulados para testes, sem conexão a dados reais.
- 12 testes SQL/RLS, 13 testes de parser e 4 adicionais do adaptador. Suíte 166/166 em 18 arquivos; tsc/lint exit 0, sete avisos Fast Refresh antigos. Evidências `c013_*`, incluindo build.
- npm sem modificar/versionar package-lock preexistente; Bun oficial via npm atualizou nove linhas do lock, sem scripts. Nenhum audit fix ou upgrade amplo.
- Cloud SQL somente leitura: schema auth existe, nenhuma tabela pública. Chrome voltou a responder; preview C012 renderizou D12/12 entregas, mas cartões remotos ainda mostram aviso de build. Não equivale a homologação do backend.
- Conector Lovable retorna 404 para o projeto; editor autorizado disponível. Nenhum novo projeto ou backend criado.

## Pendências

D13 verde somente como entrega de código e validação local; requisitos produtivos do PRD seguem azuis até aplicação/verificação Cloud e E2E. Testes locais não comprovam gateway JWT, PostgREST/RLS remoto ou login real. Resource resolver clínico permanece negando por padrão. Sem prontuário, keystore, auditoria persistida ou bootstrap de operador. Próxima C014: administração real separada da demo, com autorização persistida e escrita controlada no servidor.

Referências: [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database Lovable](https://docs.lovable.dev/features/database), [PGlite](https://pglite.dev/docs/).

### Revisão Cloud — 10/10/2026
Lovable recusou aplicação exata: FKs ao schema auth.users e ordem GRANT/RLS incompatíveis com suas regras gerenciadas. Nenhuma tabela criada nessa tentativa. Removidas as três FKs de conta, mantendo IDs UUID opacos, associação composta paciente/clínica/conta e autorização auth.uid(). Provisionamento futuro precisa confirmar existência/status da conta via Auth API. GRANT/REVOKE agora antecedem RLS dentro da mesma transação. 12/12 testes PostgreSQL aprovados sem tabela auth.users simulada. Incorporados commits gerenciados e corrigido lint do timer/formatação sem alterar destino de tokens. Aplicação remota permanece pendente.

### Aplicação Cloud confirmada — Lovable, 10/10/2026

Revisão Codex `d70f8de` aplicada uma vez no Cloud existente, após verificar ausência dos objetos. Registro gerenciado: `drizzle/migrations/0000_c013_tenant_foundation_d70f8de.sql`, idêntico à fonte após normalizar LF/CRLF no checkout Windows (SHA256 `b435909e4508aece38c616ea5e3bcd87f6369168c7f90c5e2e8efbc2ea3f56e0`). Tipos gerados automaticamente; commit gerenciado observado `e94fb0f`.

Consultas remotas confirmam cinco tabelas vazias e com RLS ativa, cinco políticas SELECT para authenticated, anon sem acesso e authenticated sem escrita (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER). Service role conserva acesso administrativo por default ACL do ambiente, sem alteração do SQL ou concessões a pessoas. Associação composta paciente/clínica/conta intacta, nenhuma FK para Auth.

`tm_resolve_identity()` conferida via `pg_get_functiondef`: retorna jsonb, STABLE, zero argumentos, SECURITY INVOKER (`prosecdef=false`), search_path vazio; EXECUTE negado a anon e concedido a authenticated. Definição mantém auth.uid() e os filtros de atividade. Nenhum dado, conta ou vínculo criado. Aplicação/inspeção remota não homologa login, JWT/gateway ou isolamento ponta a ponta com contas e vínculos reais; esses testes continuam pendentes. Sem alterações de frontend, Auth ou billing.
