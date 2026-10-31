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

## C013 — Fundação persistida (Codex direto)

- [x] Migração aditiva de clínicas, pacientes opacos, vínculos/grants e operadores, sem seed administrativo.
- [x] RLS de leitura própria, escrita pelo navegador negada; RPC invoker sem ID de usuário recebido.
- [x] Adaptador lê grants persistidos somente após getUser; validação estrita e fallback sem privilégios.
- [x] PostgreSQL em memória: 12 testes de isolamento/integridade; suíte 166/166, tsc/lint sem erros.
- [x] Lovable aplicou a revisão d70f8de sem alterar SQL; verificou cinco tabelas vazias, RLS, privilégios, políticas e RPC invoker; migração e tipos gerenciados registrados.
- [ ] Homologar Auth/gateway/RLS ponta a ponta com conta e vínculos reais (não criados nesta aplicação).
- [ ] C014: administração real de clínicas, vínculos e auditoria com escrita autorizada no servidor. Operador inicial não criado automaticamente.

## C014 — Consulta administrativa (Codex)

- [x] API/lista de clínicas reais, Super ADM persistido, RLS e ausência de cache.
- [x] 183 testes, tipos/lint/build aprovados.
- [ ] C015: criação/edição auditada e provisionamento explícito para E2E.

## C015 — Cadastro auditado (Codex, local)

- [x] Migração/RPC auditada, revisão otimista, API POST validada e 204 testes.
- [ ] Aplicação gerenciada Cloud, tipos e E2E real.
- [ ] C016: formulário administrativo e consulta da auditoria.

## C016 — Formulário administrativo (local)

- [x] Criar/editar, versão por ID protegido, conflitos, invalidação e 214 testes.
- [ ] Aplicação C015 Cloud e E2E com operador real.
- [ ] C017: consulta global de auditoria administrativa.

## C017 — Consulta de auditoria (local)

- [x] API/painel global restrito, sem conteúdo clínico, 226 testes.
- [ ] Implantar C015, regenerar tipos e homologar com operador real.
- [ ] Paginação integral, auditoria clínica/recusas e fluxos assistenciais.

## Cadastro e entrada — Lovable (10/10/2026)

- [x] Cadastro por e-mail com confirmação, entrada Google, indicação de sessão e saída; sem perfil, tabelas ou grants novos.
- [x] 230 testes aprovados e tela de cadastro verificada no navegador; relatório manual atualizado.
- [ ] Homologar confirmação recebida por e-mail e OAuth com conta real (depende de interação do titular); não criar contas de teste ou vínculos automaticamente.

## C018 — Cloud e primeiro operador

- [x] C015 aplicada, migração gerenciada equivalente e RLS remota conferida.
- [x] Primeiro Super ADM persistido provisionado após autorização específica.
- [x] 230 testes, tsc, build e lint sem erros.
- [ ] Homologar login, criação/edição de clínicas e auditoria reais; continuar vínculos e isolamento.

## C020 — Consulta administrativa

- [x] Auditoria com navegação por cursor de horário/ID e validação estrita.
- [x] 232 testes locais, TypeScript, build e lint sem erros.
- [ ] Homologar consulta com sessão real e eventos Cloud; continuar persistência dos demais recursos.

## C021 — Rede administrativa

- [x] Paginação por cadastro/ID, navegação para registros anteriores e retorno aos recentes.
- [x] Lista recarregada no servidor após gravação confirmada; respostas tardias descartadas após logout.
- [ ] Homologar com sessão real e continuar vínculos/recursos administrativos.

## C022 — Segurança de dependências

- [x] Dependências sinalizadas no lockfile atualizadas, sem troca das versões declaradas dos módulos.
- [x] Instalação frozen e bun audit sem alertas; 234 testes, tsc/build aprovados.
- [ ] Recuperar diagnóstico e build do preview Lovable; homologar sessão real do titular.

## C024 — Persistência da identidade visual

- [x] Fundação SQL/RLS/RPC e contrato validados localmente com revisão e auditoria.
- [ ] Aplicar no Cloud, regenerar tipos e integrar API/formulário com sessão real.

## C025 — Homologação administrativa

- [x] Sessão real do Super ADM, criação/edição de clínica QA inativa e auditoria conferidas no preview.
- [ ] Homologar isolamento entre contas e fluxos clínicos conforme seus requisitos; não concluídos pelo teste administrativo.

## C023 — Runtime do preview

- [x] Reconexão Chrome e confirmação da C022 R1 renderizada.
- [x] Reinício do preview pelo Lovable; formulário de login/hidratação verificados por Codex.
- [ ] Homologar sessão real e operações administrativas; continuar requisitos de persistência.

## C027 — Adendo v0.11.1 / White Label

- [x] PRD incorporado, fonte e versão anterior preservadas; inventário/risco/dependência/plano de testes documentados.
- [x] Identificadores preservados e teste de cobertura aprovado sem alterar código.
- [ ] Aprovação do proprietário para WL-1/código; migração e configuração externa terão gates posteriores.
- Desenvolvimento automático suspenso nesta fase documental por instrução humana específica. Plano: docs/PLANO_INCREMENTAL_WHITE_LABEL_v0_11_1.md. Status da aplicação ainda não reflete os novos textos do adendo; atualização depende de autorização de código.

## C026 — API de identidade visual

- [x] Migração 003 aplicada diretamente e privilégios conferidos no Cloud.
- [x] Fronteira HTTP e transporte PostgREST protegidos implementados.
- [ ] Conectar formulário e homologar salvar/recarregar no preview.


## Retomada Codex — 29/10/2026

Registros anteriores preservam o estado de suas datas. Referência atual: docs/STATUS_PROJETO_TEMPORARIO.md. Desenvolvimento direto autorizado e ativo, preservando frontend e personalização.

- [x] Main integrada exatamente até 5b4ff09; preview renderiza 147 entregas e navegação hidratada.
- [x] Cloud 034–035 aplicado após autorização, dependências/ausência prévias e RLS/ACL posteriores conferidas.
- [x] Corrigida consulta sem bearer no painel legado de políticas, em develop.
- [x] Cadastro, biblioteca e consulta histórica de metadados de dispositivos preparados/testados localmente, sem integração liberada.
- [ ] Homologar rascunhos comerciais com sessão real de Super ADM.
- [ ] Cloud 036–039 depende de revisão e autorização própria; não aplicado por inferência.
- [ ] Main posterior a 5b4ff09 depende de autorização própria. Develop não atualiza o preview conectado à main.
- [ ] Regras pendentes e hardware real continuam necessários; entregas técnicas parciais não concluem o PRD.

- [x] Lista paginada de revisões de dispositivos — etapa local 4, SQL 040 não aplicada; status 153. Posterior ao candidato a705177.

## Hidratação — retomada 30/10/2026

- [x] Etapa local 3: recurso próprio, autorização e persistência transacional proposta 041, sem grants provisionados.
- [x] Etapa local 4: listagem por intervalo/cursor, proposta 042 e fronteira HTTP/cliente preparados; status 157.
- [ ] Contexto de host próprio, registro de runtime/rota e integração no PWA.
- [ ] SQL 041–042 no Cloud depende de revisão e autorização específica; não aplicado.

## Hidratação — contexto e PWA, 30/10/2026

- [x] Etapa local 5: contexto próprio, proposta 043 e rotas GET de leitura com host/sessão/grant verificados.
- [x] Etapa local 6: painel de consulta no PWA, fuso explícito e resultado somente após todas as páginas.
- [ ] Homologação Cloud/host/contas com autorizações específicas; SQL 041–043 local.
- [ ] Escrita HTTP, recuperação de recibo e formulário de registro/correção.
- [ ] Metas/restrições, lembretes/canais, IA e leitura médica continuam pendentes.

## Hidratação — preferências locais, 30/10/2026

- [x] Meta diária informada pelo paciente, sem valor/fórmula automática, e horários/fuso de lembretes no PWA, API e proposta SQL local 045.
- [x] Recibos idempotentes, revisão otimista, isolamento próprio e bloqueio integrado de consumo/filtros enquanto preferências estão incertas.
- [ ] Aplicar 045 somente após autorização específica e pré-checagem; main permanece na candidata autorizada 6a4936b.
- [ ] Homologar host/cadeia 043 e vínculos QA autorizados; 041/042/044 já aplicadas e verificadas no Cloud.
- [ ] Implementar entrega real de lembretes e observações seguras da IA. Salvar horários ainda não agenda nem envia notificações.

Revisão e limites: docs/REVISAO_MIGRACAO_HIDRATACAO_045.md.

## Hidratação — avisos com tela aberta, 30/10/2026

- [x] Avisos visuais locais por horário/fuso confirmado, com deduplicação em memória, pausa em edição e aba oculta, sem recuperar horários perdidos.
- [ ] Entrega em segundo plano e deduplicação durável dependem de canal/infraestrutura autorizados; avisos visuais não concluem esse escopo.
- [ ] 045 e main 804be82 seguem sem nova autorização explícita; 043/grants clínicos também não ativados.

Detalhes e testes: docs/HIDRATACAO_LEMBRETES_TELA_ABERTA.md.

## Hidratação — controle de tentativa local, 31/10/2026

- [x] Referência server-only com reivindicação CAS, barreira antes do provedor, escopo/consentimento e tratamento de resultado incerto sem reenvio automático.
- [ ] Implementar armazenamento durável/unique por ocorrência, autorização corrente e canal/provedor antes de qualquer ativação real; testes atuais usam fila/provedor fictícios.
- [ ] Definir recibos verificados e reconciliação; aceitação pelo provedor não significa entrega.

Limites: docs/HIDRATACAO_CONTROLE_ENTREGA_LOCAL.md.

## Hidratação — fila SQL privada local, 31/10/2026

- [x] Proposta 046: unicidade por ocorrência civil, claim/transições CAS, estados terminais e ACL privada, com adaptador ligado ao executor local.
- [x] Testes em PostgreSQL embarcado conferem idempotência, resposta perdida entre instâncias e negação de grants padrão herdados sem alterar defaults globais.
- [ ] 046 não aplicada; requer 045, revisão de privilégios de worker, autorização e homologação remota própria. Sem scheduler, provider ou notificações reais.
- [ ] Concorrência entre conexões reais, recuperação de máquina, TTL e recibos verificados ainda pendentes.

Revisão: docs/REVISAO_MIGRACAO_HIDRATACAO_046.md.

## Hidratação — planejador local, 31/10/2026

- [x] Contrato server-only de lotes, ordem, checkpoint e ocorrência no minuto confirmado; falhas não avançam checkpoint.
- [ ] Fonte privada paginada, adaptador SQL e integração com fila ainda necessários; cron e notificações permanecem desativados.
- Registro e limites: docs/HIDRATACAO_PLANEJADOR_LOCAL.md.

## Hidratação — candidatos e fila integrados localmente, 31/10/2026

- [x] Proposta privada 047 e adaptador de planejamento/enqueue; limites, keyset, ACL e revalidação de acesso testados em PostgreSQL embarcado.
- [x] Fluxo de 102 pacientes fictícios em duas clínicas; replay e resposta perdida após commit sem duplicação.
- [ ] Aplicação remota 045–047, identidade/transporte do worker, canal/consentimento e operação real pendentes. Não há notificações ativas.
- Revisão: docs/REVISAO_MIGRACAO_HIDRATACAO_047.md.

## Prontuário — núcleo local, 31/10/2026

- [x] Evoluções cifradas, imutáveis, com complemento e confirmação de ID; autoria/cronologia preservadas e auditoria de acesso sem texto.
- [ ] Histórico paginado e interface integrada; Auth/host profissional, KMS/rotação/backup e assinatura ainda não operacionais.
- [ ] 048 não aplicada no Cloud; nenhum grant clínico provisionado. Revisão: docs/REVISAO_MIGRACAO_PRONTUARIO_048.md.

## Prontuário — histórico paginado local, 31/10/2026

- [x] Proposta 049/serviço/adaptador: páginas cifradas, cursor data/ID, auditoria de leitura e validação completa antes de decifrar; reautoriza antes da devolução.
- [x] 102 evoluções fictícias em páginas 100 + 2, sem duplicação na fronteira e com troca de conta bloqueada.
- [ ] Interface, contexto Auth/host, cadastro profissional verificado e KMS reais; 048–049 não aplicadas no Cloud. Assinatura não definida.

## Prontuário — fronteira HTTP local, 31/10/2026

- [x] Factory protegida com autorização existente, dados de contexto do servidor, JSON limitado, no-store e confirmação por ID sem retry automático.
- [x] Teste HTTP + serviço + criptografia + SQL PGlite usando contexto e texto fictícios; sem exposição de rota.
- [ ] Cliente/UX de incerteza, workspace, resolvedor Auth/host/profissional, KMS e acesso clínico autorizado. Nenhum endpoint produtivo ativado.
