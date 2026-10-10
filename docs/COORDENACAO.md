# Coordenação - Techmedicina

## Papéis

- **Coordenador**: Codex (avalia requisitos, aprova ações, lê relatórios, delega etapas e valida interface/regras de negócio). O Codex NUNCA deve editar o projeto diretamente.
- **Executor**: Antigravity (executa código, compilações, testes e documentação na pasta do projeto). Único executor ativo nesta pasta.

## Diretrizes e Regras de Retomada

- **Tarefa Única**: Apenas uma tarefa ativa por vez na mesma pasta. Codex não editará arquivos nem fará verificações concorrentes.
- **Autorização**: A instrução atual autoriza coordenação e desenvolvimento imediato (Divergência registrada com frase antiga do PRD que adiava comandos, porém o PRD original é mantido intacto).
- **Trabalho Autônomo**: Agente deve continuar tarefas viáveis até concluir critérios ou encontrar bloqueio concreto, não encerrando o fluxo só porque concluiu um micro-passo.
- **Ambiente base**: Pasta absoluta `C:/Users/marco/OneDrive/Desktop/PROGRAMAÇÃO/techmedicina/techmedicina`, Repositório `https://github.com/neoligdev/techmedicina.git`, branch `main`.

Transferência final C-001-R2: executor OCIOSO; coordenador assumiu revisão documental e visual. Ver PROGRESSO.md. Durante execução do Antigravity, continuam proibidas edições ou checks concorrentes.

## Infraestrutura e Sincronização (Atualizado 09/10/2026)

O usuário informou que o projeto usa Lovable Cloud, conectado via GitHub. A configuração efetiva de DB e Auth ainda não foi verificada, devendo prosseguir localmente.

### Autorização de Desenvolvimento Contínuo

O usuário autorizou explicitamente o desenvolvimento contínuo (PRD contínuo).
O executor Antigravity é o único executor autorizado e é responsável por realizar os **commits e push normais** diretamente, de acordo com o fluxo, sem precisar delegar o push ao Coordenador. A restrição antiga de envio ao GitHub está completamente superada para estas tarefas autorizadas.
Não há autorização para ativação de deploy em nuvem ("Publish/Cloud activation") neste momento.

Antigravity permanece OCIOSO. Codex assume a tarefa de revisão e sincronização Git. origin/main foi atualizado por fetch e estava alinhado com HEAD (0/0) antes do commit. bun.lock permanece a referência versionada; package-lock.json preexistente não rastreado fica local. Logs .log são ignorados pelo Git; resumo reproduzível está em docs/EVIDENCIAS_VALIDACAO.md.

Após o push, conferir o commit efetivamente sincronizado no Lovable antes de considerar seu preview validado. Push bem-sucedido não comprova atualização do preview.

## Atualização humana — 09/10/2026

O usuário autorizou explicitamente o Codex a implementar diretamente a modernização global e os painéis demonstrativos, fazer commit e push. Esta decisão substitui o executor exclusivo Antigravity registrado anteriormente. Preservar uma tarefa/executor ativo por vez, Git sem reescrita e requisitos do PRD. Resultados atuais em RELATORIO_C006.md.

## Próxima Etapa: C009 (09/10/2026)

A próxima tarefa (C009) focará no levantamento da fundação **Lovable Cloud**, sem criação de credenciais, inserção de dependências ou alteração da produção atual. O Antigravity permanece como executor, enquanto o Codex atuará coordenando e testando.

## Adendo C009 — Retomada via OpenCode (09/10/2026)

- **Retomada**: OpenCode acionado como executor fallback para a C009 após falhas de conexão do executor primário ("Failed to fetch" observado duas vezes), não por quota confirmadamente esgotada; Codex manteve coordenação/teste. Uma única tarefa ativa por vez.
- **C009 concluída como auditoria factual** (somente leitura de código): relatório `docs/RELATORIO_C009.md` registra `getSession()` → `null`, resource resolver default → `undefined`, regras puras sem autenticação real e tenant demo sem isolamento real; verificação por nomes sem migrations/banco/config/criptografia no repositório. Nenhum PRD, dado, backend ou produção foi alterado; sem commit/push. **Correção factual (R2)**: o `catalog.json` **foi** alterado **durante a C009** (itens 2, 3.1, 3.2, 4, 5, 7 e 34 — achado da auditoria); a entrega D10 foi adicionada apenas na C010. Histórico preservado.
- **Infraestrutura**: Lovable Cloud escolhida; não criar Supabase externo. **O usuário habilitou manualmente o Cloud**: screenshot de Database sem tabelas e editor SQL disponível; a ativação é atribuída ao usuário/Lovable, não a agentes. **Evidência de leitura (autor Codex)**: o editor SQL executou **somente leitura** — `SELECT count(*) AS public_tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';` → **0** — sem DDL/dados; **fluxo de login/tenant ainda não implementado/validado na aplicação** (não houve teste do serviço Auth). Cloud mantido como principal; repositório Supabase externo separado no GitHub não implica runtime ligado. Estado remoto não verificável antes do scaffold (Reconnecting, timeout, Failed to fetch; origem remota confirmou `1d996b0` via `git ls-remote`, e o público retornou 404 — sem provar o preview do editor). **Pós-auditoria**: `origin/main` avançou para `805bcce` (*Activated Supabase cloud*) — scaffold `@supabase/supabase-js`, `drizzle` vazio e middleware/auth, ainda sem fluxo login/tenant real.
- **C010 proposta (não aprovada/não implementada)**: criptografia server-only AES-256-GCM com KeyProvider injetado e testes de adulteração/AAD (clínica, paciente, registro). Aguarda decisão explícita da coordenação.
- **Estado**: OpenCode OCIOSO ao fim da C009. Preservar autorias e histórico; PRD preservado como encontrado.

## Adendo C010 — Unidade de criptografia server-only (09/10/2026)

- **Executor**: OpenCode (fallback após "Failed to fetch" do executor primário; quota **não** comprovada). Codex coordenou/testou e solicitou revisões **R1 e R2**.
- **Entrega (só escopo unitário, D10)**: `src/lib/security/clinical-crypto.server.ts` — AES-256-GCM via WebCrypto nativa, IV 12 bytes por cifragem, tag 128, envelope v1 (`version`/`alg`/`kid`/`iv`/`ciphertext`), base64 canônico estrito, AAD (versão/alg/kid/clínica/paciente/registro/tipo) e `ClinicalKeyProvider` injetado (sem chave default; fail-closed). Erro genérico sem vazamento. Sem persistência, endpoint, integração ou chave real.
- **R1 aplicada**: IV 16 chars pré-decode; limite de `plaintext.length` antes do encode + validação UTF-8; limite de ciphertext derivado (`maxPlaintextBytes + 16`); IDs só com espaços rejeitados sem normalizar; provider captura throw síncrono/async; snapshot antes de awaits; `usages`/`algorithm` malformado sem `TypeError`.
- **Checks (EXIT_CODE=0)**: `tsc`, `eslint` (0 erros/7 avisos), cripto 20/20, suíte completa **101/101**/14 arquivos, `vite build`. Histórico de 2 timeouts transitórios no teste do simulador (**causa não comprovada**; não diagnosticado como contenção); 6/6 isolado e rodadas completas seguintes passaram; **sem** aumentar timeout global nem desabilitar testes.
- **Correção C009**: o usuário habilitou manualmente o Lovable Cloud (Database sem tabelas, editor SQL disponível); ativação atribuída ao usuário/Lovable, não a agentes. **Registro corrigido**: SQL **só leitura** posteriormente executado pelo Codex no editor (SELECT de contagem → **0**); nenhum DDL/dado criado; **fluxo de login/tenant ainda não implementado/validado na aplicação** (não houve teste do serviço Auth); o histórico inicial sem SQL foi preservado. Cloud principal mantido; Supabase externo separado não implica runtime ligado.
- **Limites**: PRD 3.2/4/7 permanecem parciais; anti-replay não é global; keystore/guardas/persistência/auditoria/backup/rotação de produção pendentes.
- **Estado**: OpenCode **OCIOSO**. Sem commit/push até revisão do coordenador.

## Adendo C010 — Revisão R2 do Codex aplicada (09/10/2026)

- **Executor**: OpenCode (único executor ativo). Codex emitiu a revisão R2; sem commit/push.
- **Correções de código**: snapshot de `kid`/`key` copiados **antes** de `crypto.subtle.encrypt` (o objeto `active` pode ser mutado durante o await e o envelope/AAD usam o valor resolvido); pré-limite de plaintext por unidades UTF-16 sem o fator `* 2` (bytes UTF-8 ≥ unidades para texto válido); catches **nunca** repropagam `ClinicalCryptoError` do provedor/externos — sempre falha genérica nova (mensagem adulterada com segredo não vaza); comentários documentam snapshot de contexto antes do provedor e `kid` após o provedor antes do await.
- **Testes (3 novos, total 23/23)**: mutação de `active.kid` durante `subtle.encrypt` (via spy) mantém `kid` original e round-trip; envelope mutado durante `getKeyForKid` ignorado pelo snapshot; provedor lançando `ClinicalCryptoError` com mensagem adulterada convertido em falha genérica.
- **Checks (EXIT_CODE=0)**: `node node_modules/typescript/bin/tsc --noEmit`, `eslint` (0 erros/7 avisos), cripto **23/23**, suíte completa **104/104**/14 arquivos, `vite build`. Evidências novas em `docs/evidencias/c010_r2_{tsc,test_crypto,test,lint,build}.txt` e `c010_cloud_{tsc,test,lint,build}.txt` com `$LASTEXITCODE` real capturado logo após cada processo (as antigas `c010_*.txt` continham exit code capturado fora de ordem e permanecem como histórico).
- **Cloud incorporado**: `origin/main` → `805bcce` (*Activated Supabase cloud*) via `git merge --ff-only origin/main` (sem conflitos; **sem `.env` local**). Dependências novas instaladas com `npm install` (atualizou o `package-lock.json` local preexistente, untracked — registrado, **não** stage/remove). Lint do scaffold autorizado: `eslint --fix` mecânico (formatação + `let`→`const` sem alterar auth) aplicado apenas a `src/integrations/supabase/*.ts`.
- **Correções documentais**: a alegação de "catálogo/código intactos" foi corrigida — o `catalog.json` **foi** alterado **durante a C009** (itens 2, 3.1, 3.2, 4, 5, 7 e 34) e a entrega **D10** foi adicionada na C010; timeouts do simulador registrados como **causa não comprovada**, não como contenção; registro de SQL Cloud corrigido para **somente leitura** (SELECT → 0), execução pelo Codex, ativação pelo usuário/Lovable.
- **Roadmap**: `roadmap.md` na raiz atualizado com C009/C010 (é o roadmap real); na `docs/MATRIZ_REQUISITOS.md` removidas apenas as edições C009/C010 do OpenCode, preservando as demais diferenças já existentes.
- **Estado**: OpenCode **OCIOSO**. Aguardando liberação do coordenador para commit/push.

## Adendo C010 — Liberação final, QA C008 e fechamento (10/10/2026)

- **Liberação final do Codex**: os **27 arquivos staged** foram revisados; código e checks **aprovados** (104/104, tsc, lint, build). Autorizado **commit normal** com título `feat: add server-only clinical encryption and align Cloud scaffold`, autor/committer **PlugPix** `<plugpix.brasil@gmail.com>`, e **push normal** para `origin/main` (sem force/rebase/amend; se o remoto avançar, parar e reportar).
- **Data**: `catalog.ts` `updatedAt` e STATUSMD regenerados com **10/10/2026**; apenas o teste de status reexecutado.
- **QA C008 (Codex, local)**: `http://127.0.0.1:8080/super-admin/simulador` — desktop Conservador/100 titulares/150 dependentes (receita 9.500, contribuição 2.450, equilíbrio 113); Conservador → Base vazia → Conservador/100 preservado; comparativo distingue incompletos; viewport 390px (área 375, scrollWidth 375, sem overflow); exemplo móvel 100 após otimização inicial do Vite. **Não** alegado QA no preview do Lovable (editor ainda `Build unsuccessful/out of date`, causa desconhecida).
- **Evidências**: `c010_tsc.txt` antigo **inconsistente/desconsiderado** (exit fora de ordem); válidas = `c010_r2_*` e `c010_cloud_*`. Afirmações "auth não funciona" substituídas por "fluxo de login/tenant ainda não implementado/validado na aplicação (não houve teste do serviço Auth)".
- **Próxima C011**: mapear o auth gerado e o `getClaims` confiável, preparar acesso clinic-aware no servidor; **não** presumir tenant no cliente; **não** atribuir acesso clínico ao Super ADM. Início com o coordenador após verificação do remoto.
- **Estado**: OpenCode pára ao fim desta rodada (após push) para o coordenador verificar o remoto e iniciar a C011.

## Adendo C011

Próximo Passo Planejado: C012 (Login visual e E2E) e fechamento do fluxo RLS Auth. — Revisão R4 do Codex (10/10/2026)

- **Executor**: Antigravity.
- **Entrega R4**: Limites seguros try-catch envolvendo `createClient`, `getRequest` e `getUser`. Suporte de lógica `sb_secret_` expurgado da API cliente. 
- **Testes Ajustados**: Sem tipos `any`; stub/unstub de ambiente controlados (`vi.stubEnv`); concorrência simultânea com Deferred promises e asserts rigorosos de instâncias clientes isoladas; testes assertivos `requireAuth` 401 e requisição cliente forjada 403.
- **Logs reais**: Saída sem máscaras de comandos encadeados. `EXIT_CODE` coletado localmente.
- **Notas da nuvem**: API Lovable retornou 404 `project_not_found` para conexão externa, e o preview remoto continuou `build unsuccessful`. Nenhum DDL, nem adminclient criados.

- **Codex QA**: Validado via `curl` sem credenciais retornando `HTTP 401 Missing session` limpo, sem alegar login real.
## Adendo C012 — Login Cloud e UX Premium (10/10/2026)

- Usuário substituiu a coordenação com Antigravity por **execução direta do Codex**, incluindo testes, status e commit/push. Antigravity cancelado antes das correções; OpenCode ocioso. Um único executor.
- Antigravity iniciou o login; Codex revisou e corrigiu fluxo de login sem evento, renovação de token, restauração atrasada, concorrência entre probes, logout e falhas de configuração. API agora bloqueia cache nas respostas; UI usa cores semânticas e marca PlugPix.
- SDK gerado preservado. Senha sem trim; nenhuma permissão clínica derivada de metadados. Confirmar identidade não libera dados ou área administrativa real.
- Evidências válidas desta revisão: `c012_codex_*`, tsc/lint exit 0 e suíte 137/137. R1 não é aprovação: seu lint registra exit 1/50 erros, apesar do relato anterior.
- Cloud já habilitado pelo usuário/Lovable; nenhuma migração ou conta criada nesta entrega. Login real E2E e RLS continuam pendentes.
- Controle do navegador retornou `Transport closed`; preview/QA visual desta revisão não confirmados. Push autorizado pelo usuário, normal em main com PlugPix, após validação.
- Próxima C013: preparar domínio persistido de clínicas e vínculos, com testes de isolamento e negação por padrão. Não usar o Supabase externo como segundo runtime.
