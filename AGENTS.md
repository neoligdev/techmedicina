<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Application architecture

- Extend the existing server-validated login surface for account signup and brokered Google OAuth, without provisioning tenant grants; account creation must not imply clinical authorization.
- Keep the login page as the existing session-validation owner and refresh shell account identity via Auth getUser on shell navigation; avoid competing session subscriptions.

- Keep the TanStack Start file-based router, with `/` redirecting to `/super-admin`; this preserves the standard bootstrap and requested entry point.
- Wrap content routes with the shared AppShell and DemoProvider in the root route; this keeps clinic selection explicit and consistent between areas.
- Keep demo types, data, navigation, theme identity, and context in separate browser-safe modules; this supports source-code continuation without adding dependencies.
- Use a reusable placeholder through area-specific dynamic section routes validated against navigation; this makes each menu addressable without duplicating unfinished screens.
- Keep clinic selection in temporary React context only, never as authentication or tenant isolation; this demo has no persistent clinical data or backend.
- Define all visual colors through semantic CSS variables and named clinic themes; this separates clinic identities from the administrative brand.
- Keep visual preference validation, browser storage adapter, and contrast-aware CSS variable mapping in separate browser-safe demo modules; this allows replacing persistence without coupling the form to storage.
- Persist only whitelisted visual preferences keyed by immutable clinic ID and load after hydration; clinic selection stays temporary and never supplies authorization.
- Apply the reviewed tenant SQL verbatim through Lovable Cloud managed migrations and regenerate database types through managed tooling; opaque account IDs must be verified through Auth during future provisioning, not through foreign keys to managed Auth tables.
- Use the managed Database type after migration deployment and omit optional RPC arguments on creation so PostgreSQL applies its NULL defaults; this avoids stale contract intersections without changing protected-write behavior.

## Coordenação e Desenvolvimento (Adicionado)

- Nova diretriz humana (09/10/2026, C008): Codex só coordena/testa; Antigravity implementa, OpenCode será acionado como fallback apenas quando a quota falhar. Manter apenas um executor ativo por vez. Preservar o histórico, as autorias das entregas passadas e as modificações anteriores intactas. PRD INTACTO. Nada de `git add .` ou commit manual sem a aprovação explícita e posterior da coordenação.
- Apenas uma tarefa ativa por vez nesta pasta, sem edições concorrentes.
- Segredos apenas em locais apropriados, nunca versionados ou expostos em logs.
- Não inventar integrações, custos ou decisões de negócios; solicitar ao Coordenador quando bloqueante.

## Status temporário do projeto

- Diretriz humana vigente (10/10/2026): Codex implementa diretamente, testa, atualiza status e faz commit/push autorizados. Substitui a divisão coordenador/Antigravity de 09/10; manter Antigravity e OpenCode parados durante estas alterações. Preservar autorias históricas e registrar a transferência de execução.

- Em cada implementação, atualizar `src/features/project-status/catalog.json`, a data em `catalog.ts` e os registros de progresso no mesmo commit. Registrar executor real (Codex, Lovable ou Antigravity), entrega validada e próximo passo; não atribuir autoria ao coordenador quando outro agente executou.
- A rota `/staus` e o botão temporário do Super ADM são relatório manual. Verde é entrega concluída no escopo descrito; azul é requisito iniciado/parcial; amarelo é não implementado. Dados demo ou uma prévia não concluem requisitos de produção.
- Manter cobertura das 34 seções e todos os subitens do PRD; o teste de cobertura deve continuar passando quando o PRD mudar.
- Ao concluir todo o projeto, remover rota `staus.tsx`, botão/ajuste de breadcrumb em AppShell, pasta `features/project-status`, teste `project-status.test.ts` e estilos `project-status-*`; regenerar rotas, validar e registrar a remoção.

- Regenerar `docs/STATUS_PROJETO_TEMPORARIO.md` a partir do catálogo a cada atualização; removê-lo ao concluir o projeto, junto às variáveis CSS `--project-done`, `--project-progress`, `--project-pending` e seletores temporários `[data-status]`.
