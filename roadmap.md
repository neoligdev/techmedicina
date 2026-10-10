# Escopo inicial

## Modernização visual — 09/10/2026

- [x] Consolidar tokens escuros/claros e superfícies foscas nas quatro áreas.
- [ ] Refinar navegação, formulários, listas, diálogos e personalização sem mudar regras.
- [ ] Verificar testes, lint e fluxos no navegador em celular, tablet e desktop.
- [ ] Registrar evidências, arquivos alterados e limites na documentação.

- [x] Quatro áreas navegáveis e seleção demonstrativa de clínica.
- [x] Tela Clínicas com busca e duas clínicas fictícias.
- [x] Identidades, adaptação a celular e páginas em preparação.
- [x] Documentação, regras futuras e verificação de navegação.

## Personalização demonstrativa

- [x] Tela de personalização e validação.
- [x] Preferências visuais por clínica no navegador e aplicação nas três áreas.
- [x] Documentação e verificação de salvar, recarregar e alternar clínicas.

Validação local de 08/10/2026: consulte `VALIDACAO_LOCAL.md` para resultados, diferenças em relação ao PRD e limites da demonstração.

## Coordenação (Adicionado)

- [x] Teste de conectividade C-000 concluído (leitura via Antigravity).
- [x] Tarefa C-001 (continuidade, documentos docs/COORDENACAO e PROGRESSO, cópia PRD e validação base).
- [x] Fracionamento e organização das etapas do PRD, respeitando dependências e limites desta etapa.

- [x] Matriz das 34 seções do PRD e dependências registrada em docs/MATRIZ_REQUISITOS.md.
- [x] Verificação visual móvel parcial e desktop, com limites registrados em docs/PROGRESSO.md.
- [x] Lote 1: Design UX/UI Premium (Off-white/Petróleo) e mockups criados (app, médico, clínica, super-admin).
- [x] Confirmar cores pelo seletor nativo do navegador. (Resolvido nas implementações seguintes)
- [x] Infraestrutura indicada pelo usuário: Lovable Cloud.
- [x] Cloud habilitado pelo usuário/Lovable (09/10/2026): Database sem tabelas; leitura `SELECT count(*)` no editor SQL → 0 tabelas (autor Codex); scaffold chegado em `origin/main` (`805bcce`).
- [ ] Confirmar/habilitar banco e autenticação e implementar políticas por clínica (Cloud habilitado; **fluxo de login/tenant ainda não implementado/validado na aplicação** — não houve teste do serviço Auth).
- [x] C-002-R2: navegação por grupos, layouts por módulo, formulários temporários e painéis sem informações clínicas inventadas.
- [x] Verificar quatro áreas e diálogo em modo móvel no preview do Lovable.
- [x] Verificar tema escuro do diálogo e marca PlugPix preservada.
- [ ] Esclarecer aviso Build unsuccessful mantido no histórico, apesar de preview atualizado.
- [x] C-003-R3: Fundação parcial de autorização lógica (`core.ts` e `guards.server.ts`) e diagnósticos testados unitariamente (403) e HTTP (401).
- [ ] Implementar autenticação real, RLS no banco, encriptação e auditoria (Pendentes da fundação global C-003).

## C006 — entrega de interface e dados demonstrativos

- [x] Design global azul marinho/fosco e gráficos administrativos.
- [x] Painéis do cliente e médico com mesma fonte fictícia, gráficos e tabelas.
- [x] QA 390px/1440px, preferências por clínica e identidade PlugPix.
- [x] Tipos, lint, 64 testes e build validados.
- [x] Base manifest/service worker sem cache de dados de saúde.
- [ ] Homologar instalação PWA em dispositivos reais e ícones por clínica.
- [ ] Validar modelo H59/H59MAX, balança e protocolos oficiais.
- [ ] Implementar dados reais, autenticação e isolamento no servidor.

## C008 — Simulador de Rentabilidade Didático

- [x] Criação de `calculator.ts` isolado sem dependências de estado.
- [x] Gráficos de barra proporcionais baseados em premissas configuráveis.
- [x] Cobertura estrita contra estouro de soma e cálculos irregulares de Infinity.
- [x] Pipeline local com validações finais passando (R3).
- [x] QA visual local (**Codex, 10/10/2026**) em `http://127.0.0.1:8080/super-admin/simulador`: desktop exemplo **Conservador/100 titulares/150 dependentes** (receita 9.500, contribuição 2.450, equilíbrio 113); **Conservador → Base vazia → Conservador/100 preservado**; comparativo **distingue incompletos**; viewport **390px** (área 375, `scrollWidth` 375, **sem overflow**); exemplo **móvel 100** após otimização inicial do Vite. Preview do Lovable **não** alegado (editor ainda `Build unsuccessful/out of date`, causa desconhecida).

## C009 — Levantamento da Fundação Lovable Cloud

- [x] Realizar mapeamento e levantamento técnico da fundação de back-end em cloud (auditoria factual `getSession()`/guardas/tenant; catálogo itens 2, 3.1, 3.2, 4, 5, 7 e 34; relatório `docs/RELATORIO_C009.md`).
- [x] Preservar credenciais (nenhum token criado, nenhum segredo aberto, nenhum DDL/dado criado; SQL executado foi somente leitura).

## C010 — Unidade de criptografia clínica server-only

- [x] Módulo `src/lib/security/clinical-crypto.server.ts` (AES-256-GCM via WebCrypto, envelope v1, AAD por clínica/paciente/registro/tipo/kid, KeyProvider injetado).
- [x] Endurecimento R1 (IV/limites estritos, snapshot de contexto/envelope/kid, provider síncrono/assíncrono sem vazar detalhes).
- [x] Revisão R2 (snapshot de `kid`/`key` antes do `subtle.encrypt`, pre-limite sem `* 2`, catches sempre falha genérica).
- [x] 23 testes em Node real; `tsc`/`lint`/`build` e suíte completa (104/104) com exit 0 (evidências `c010_r2_*` e `c010_cloud_*`).
- [ ] Keystore real, guardas, persistência, auditoria, backup e rotação de produção (PRD 3.2/4/7 permanecem parciais).

## Cloud — Integração scaffold (origin/main `805bcce`)

- [x] Fast-forward de `origin/main` incorporado com `git merge --ff-only` (sem `.env` local, sem conflitos, sem perda de alterações locais).
- [x] Dependências instaladas via `npm install` (lock `bun.lock` congelado preservado; `package-lock.json` local não versionado).
- [x] Scaffold `@supabase/supabase-js`, `drizzle` vazio e middleware/auth: lint mecânico autorizado (`eslint --fix` em `src/integrations/supabase/*.ts`, só formatação/`let`→`const`).
- [ ] Acesso clinic-aware no servidor, RLS e fluxo de login reais.

## C011 — Próxima etapa (planejada)

- **Estado (10/10/2026)**: liberada pelo Codex como próxima após o fechamento do push da C010; executor OpenCode **pára** ao fim desta rodada para o coordenador verificar o remoto e iniciar a C011.
- [x] Mapear auth gerado e validar identidade via `getUser(token)` no servidor.
- [ ] Resolver vínculos clinic-aware a partir da persistência confiável; não entregue pela C011.
- [x] Não presumir tenant no cliente; não atribuir acesso clínico ao Super ADM.

## C011 — Adaptador Auth Server-only (10/10/2026)
- [x] Substituído `getSession` nulo por adaptador confiável de `getUser(token)`.
- [x] Suíte isolada de testes garantindo ausência de bypass por parte de claims forjadas.
- [ ] Conectar autenticação real, E2E login, RLS e esquema final.

## C012 — Login Cloud (Frontend e Validação)
- [x] Rota `/login` desenhada (azul-marinho, verde-cana) apartada de AppShell.
- [x] Formulário com autocomplete, toggle senha e proteção de double submit.
- [x] Integração `signInWithPassword` e `signOut({ scope: "local" })`.
- [x] Envio de Bearer na restauração com `AbortController` controlando concorrência (sem deadlocks).
- [x] Mensagens genéricas para erros de auth.
- [ ] Implementar e atestar E2E de login Cloud completo real e configuração de RLS vinculando tenant de clínica.

Revisão final C012: Antigravity iniciou; usuário transferiu execução direta ao Codex, que corrigiu e testou restauração/renovação, logout, concorrência e indisponibilidade. 22 testes de login, 137 na suíte, tsc/lint sem erros. API responde sem cache. Evidências `c012_codex_*`; não confundir mocks com E2E. Próxima C013: persistência de clínicas/vínculos e isolamento, preservando negação por padrão.
