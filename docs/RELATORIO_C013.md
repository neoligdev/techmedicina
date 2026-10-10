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
