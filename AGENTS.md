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

- Keep the TanStack Start file-based router, with `/` redirecting to `/super-admin`; this preserves the standard bootstrap and requested entry point.
- Wrap content routes with the shared AppShell and DemoProvider in the root route; this keeps clinic selection explicit and consistent between areas.
- Keep demo types, data, navigation, theme identity, and context in separate browser-safe modules; this supports source-code continuation without adding dependencies.
- Use a reusable placeholder through area-specific dynamic section routes validated against navigation; this makes each menu addressable without duplicating unfinished screens.
- Keep clinic selection in temporary React context only, never as authentication or tenant isolation; this demo has no persistent clinical data or backend.
- Define all visual colors through semantic CSS variables and named clinic themes; this separates clinic identities from the administrative brand.
- Keep visual preference validation, browser storage adapter, and contrast-aware CSS variable mapping in separate browser-safe demo modules; this allows replacing persistence without coupling the form to storage.
- Persist only whitelisted visual preferences keyed by immutable clinic ID and load after hydration; clinic selection stays temporary and never supplies authorization.

## Coordenação e Desenvolvimento (Adicionado)

- Em 09/10/2026, o usuário autorizou explicitamente o Codex a implementar diretamente, validar, fazer commit e push. Esta autorização substitui a restrição anterior de execução exclusiva pelo Antigravity. Manter apenas um executor ativo por vez.
- Apenas uma tarefa ativa por vez nesta pasta, sem edições concorrentes.
- Segredos apenas em locais apropriados, nunca versionados ou expostos em logs.
- Não inventar integrações, custos ou decisões de negócios; solicitar ao Coordenador quando bloqueante.

## Status temporário do projeto

- Em cada implementação, atualizar `src/features/project-status/catalog.json`, a data em `catalog.ts` e os registros de progresso no mesmo commit. Registrar executor real (Codex, Lovable ou Antigravity), entrega validada e próximo passo; não atribuir autoria ao coordenador quando outro agente executou.
- A rota `/staus` e o botão temporário do Super ADM são relatório manual. Verde é entrega concluída no escopo descrito; azul é requisito iniciado/parcial; amarelo é não implementado. Dados demo ou uma prévia não concluem requisitos de produção.
- Manter cobertura das 34 seções e todos os subitens do PRD; o teste de cobertura deve continuar passando quando o PRD mudar.
- Ao concluir todo o projeto, remover rota `staus.tsx`, botão/ajuste de breadcrumb em AppShell, pasta `features/project-status`, teste `project-status.test.ts` e estilos `project-status-*`; regenerar rotas, validar e registrar a remoção.

- Regenerar `docs/STATUS_PROJETO_TEMPORARIO.md` a partir do catálogo a cada atualização; removê-lo ao concluir o projeto, junto às variáveis CSS `--project-done`, `--project-progress`, `--project-pending` e seletores temporários `[data-status]`.
