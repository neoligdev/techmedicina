# Relatório C011 - Adaptador Auth Server-only

## Resumo da Implementação

- **Executor**: Antigravity (autorizado pelo Coordenador Codex, Revisão R3 aplicada)
- **Data**: 10/10/2026
- **Escopo**: Substituir mock `getSession` (que retornava sempre null) por um adaptador server-only request-bound seguro, limitando falhas e rejeitando explicitamente falsificações de variáveis e metadata.
- **Arquivos Criados/Alterados**:
  - `src/lib/auth/supabase-adapter.server.ts` (criado)
  - `src/lib/auth/guards.server.ts` (modificado)
  - `src/routes/api/access-check.ts` (modificado)

## Detalhes (R4 Aplicada)

- **Segurança de Execução**: `createClient`, `getRequest` e `getUser` limitados por try/catch seguro, retornando `null`.
- **Bloqueio de Falsificações**: `sb_secret_` é rejeitado, metadata e permissões não são confiados se a sessão real falhar.
- **Testes Resilientes (Sem `any`)**: Promessas controladas (Deferred) e mock isolation atestam a concorrência assíncrona.
- **Comportamento 401 Genuíno**: Garantido que `/api/access-check` devolve 401 quando o cabeçalho não está presente (sem chamar `getUser`), ou quando validado negativamente pelo `getUser`.

## Limitações Conhecidas (Logout)
A sessão não é invalidada remotamente de forma instantânea. Tokens emitidos podem continuar sendo validados pelo Auth server até a data de expiração, mesmo após `signOut()` no cliente. Referência: https://supabase.com/docs/reference/javascript/auth-signout

- **E2E e RLS**: Falta integração ponta a ponta (login visual) e implantação do RLS real. A ausência de headers na API resulta em 401 Genuíno observável em testes, sem que getUser seja chamado (evitando consultas desnecessárias ao Auth Server).

## Limitações Registradas

- **E2E e RLS**: Falta integração ponta a ponta (login visual).
- **Remote Preview**: API Lovable retornou `404 project_not_found` na conexão manual do Codex (o que não prova indisponibilidade do editor web), porém o status do preview online permanece "build unsuccessful" sem causa rastreável. 
- **Esquema de Dados**: Nenhum script DDL inserido. Nenhuma conta criada nem cliente admin (adminclient) adicionado na C011.
