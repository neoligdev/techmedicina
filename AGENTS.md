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

- Codex atua exclusivamente como Coordenador (revisa, testa, analisa); Antigravity atua como o único Executor (cria código, documentos, executa comandos). O Codex nunca deve editar os arquivos do projeto.
- Apenas uma tarefa ativa por vez nesta pasta, sem edições concorrentes.
- Segredos apenas em locais apropriados, nunca versionados ou expostos em logs.
- Não inventar integrações, custos ou decisões de negócios; solicitar ao Coordenador quando bloqueante.
