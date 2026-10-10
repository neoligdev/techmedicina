# Relatório de Auditoria: Fundação de Sessão e Segurança (C009)

## 1. Contexto, Executor e Escopo

- **Coordenador**: Codex (coordenação e testes).
- **Executor desta etapa**: OpenCode, acionado como fallback conforme diretriz C008 após falhas de conexão do executor primário ("Failed to fetch" observado duas vezes); não há confirmação de esgotamento de quota. Tarefa curta, autorizada pelo humano via coordenação.
- **Escopo**: leitura de `AGENTS.md`, `src/lib/auth/core.ts` e `src/lib/auth/guards.server.ts`; auditoria factual por nomes de pacote/config/migrations (sem abrir secrets/env); documentação em `docs/RELATORIO_C009.md`, adendos em `docs/PROGRESSO.md` e `docs/COORDENACAO.md`. Sem buscas web repetidas.
- **Restrições respeitadas**: nenhum arquivo de código, backend ou produção foi alterado nesta etapa, e o PRD foi mantido como encontrado (já figura modificado no `git status`); não se afirma identidade byte a byte sem hash de referência. **Correção factual (R2)**: o `catalog.json` **foi** alterado **durante esta auditoria C009** — itens 2, 3.1, 3.2, 4, 5, 7 e 34 registram o achado da auditoria; a entrega **D10** foi adicionada apenas na **C010**. Nenhum commit/push.

## 2. Auditoria Factual do Código de Autenticação

### 2.1 `getSession()` retorna `null` sempre

`src/lib/auth/guards.server.ts:15-18`:

```ts
export async function getSession(): Promise<AuthenticatedIdentity | null> {
  // Simulação vazia para segurança
  return null;
}
```

Não há fonte de sessão real (login, token, cookie, provider, banco). Todo fluxo de `requireAuth` (guards.server.ts:44-53) cai em `throwUnauthorized("Missing session")` na ausência de um resolvedor injetado. O aplicativo demonstrativo funciona porque **não utiliza estas guardas** nos seus fluxos; não é a fábrica injetável que sustenta a demo. A exportação real (`defaultGuards`) usa justamente o `getSession` vazio.

### 2.2 Resource resolver (default) indefinido

`src/lib/auth/guards.server.ts:81-86`:

```ts
async function defaultResourceResolver(
  resourceId: string,
  resourceType: ResourceType,
): Promise<ResourceMetadata | undefined> {
  return undefined;
}
```

O resolvedor de metadados de recurso (dono da clínica, paciente vinculado, rascunho) retorna sempre `undefined`. Consequência objetiva: qualquer autorização que dependa de `ownerClinicId`/`ownerPatientId`/`patientLink` é negada por padrão (seguro por negação), mas nenhum acesso legítimo a dado clínico consegue ser autorizado porque não há camada de acesso a dados. A guarda protege o que não existe: não há persistência clínica real atrás da guarda.

### 2.3 Regras puras não são autenticação real

`src/lib/auth/core.ts` implementa `isAuthorized(context, resource, action, metadata)` como um avaliador puro (allowlists, invariantes de papel, regras de prontuário). Isso é **autorização declarativa**, não **autenticação**:

- O `AuthContext` é construído pelo chamador; não existe função que prove quem é o usuário.
- Sem fluxo de login/credencial/token, o `identity.userId` e os `links` são dados de entrada arbitrariamente montáveis.
- Os testes existentes aprovam esses caminhos unitariamente, mas não há integração com um provedor de identidade; não se afirma um número total de testes não comprovado nesta auditoria.
- Logo: o sistema "nega por padrão" corretamente, porém nada autentica. O estado válido de segurança hoje é *negação universal* para dados clínicos.

### 2.4 Demo tenant context não é isolamento real

`AGENTS.md` (linha 20) registra a própria arquitetura: a seleção de clínica vive em **React context temporário** (DemoProvider no root route) e "nunca [é] authentication or tenant isolation". Conclusão auditável:

- O contexto de clínica alterna identidade visual e roteamento demonstrativo, mas qualquer payload/importação poderia forjar `currentClinicId`.
- Não há namespace de dados, RLS, chave por tenant ou separação física entre clínicas.
- Isso é coerente com o escopo "demo", mas não pode ser tratado como multitenancy.

## 3. Verificação por Nomes (Pacote / Config / Migrations)

Verificação apenas por nomes — nenhum valor de secret/env foi aberto.

- **Migrations**: nenhum diretório `migrations/`, `supabase/`, `sql/` ou `db/` no repositório (Glob sem resultados).
- **Clientes de banco**: `package.json` não contém `@supabase/*`, `pg`, `prisma`, `drizzle-orm`, `kysely` nem ORM/driver. A única ocorrência relevante é `db0` (com `drizzle-orm` como peer opcional e não instalado) em `bun.lock`/`package-lock.json`, transitivo e não usado pelo código.
- **Configuração de banco**: não foi encontrada nenhuma configuração de banco de dados no repositório (nem por nomes de arquivo, nem por referências no código). Arquivos `.env`/`.env.*`, se existirem, não foram inspecionados por conteúdo. A ausência de um glob `config.*` isolado não é, por si, prova de inexistência de configuração.
- **Criptografia**: nenhum uso de `node:crypto` (AES) nem WebCrypto `subtle` em `src` (grep sem resultados). *(Estado válido à época da auditoria; posteriormente a C010 criou `src/lib/security/clinical-crypto.server.ts` com WebCrypto `subtle` — ver adendo.)*
- **Conclusão**: não foi encontrada camada de persistência, sessão ou criptografia no código atual. A fundação C003 permanece como motor de regras puro. (Conclusão limitada ao que foi localizado por nomes neste repositório; não é garantia absoluta de inexistência de configuração remota.)

**Adendo pós-auditoria**: depois desta C009, `origin/main` avançou para o commit `805bcce` (`Activated Supabase cloud`), trazendo scaffold de integração — `@supabase/supabase-js`, `drizzle` (esquema vazio) e middleware/auth em `src/integrations/supabase/*`. Isso não anula os achados da auditoria (não foi testado login/tenant real); representa o início da fundação Cloud — o fluxo de login/tenant ainda não foi implementado/validado na aplicação (não houve teste do serviço Auth).

## 4. Infraestrutura e Estado Remoto

- **Infraestrutura escolhida**: Lovable Cloud (informada pelo usuário e registrada em AGENTS.md/PROGRESSO.md). **Não criar Supabase externo** fora dessa escolha; qualquer banco/RLS deve respeitar a fundação Lovable Cloud ou decisão explícita do usuário.
- **Habilitação manual pelo usuário (atualização)**: o próprio usuário habilitou manualmente o Lovable Cloud agora. Um *screenshot* da tela Database mostra **nenhuma tabela** criada e o editor SQL **disponível**. Isso **não** foi executado nem ativado pelo Codex nem pelo OpenCode. **Adendo (evidência de leitura, autor Codex)**: posteriormente o Codex abriu o Cloud Database e o editor SQL **executou apenas uma consulta de leitura** — `SELECT count(*) AS public_tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';` — com **resultado 0** (nenhuma tabela). **Nenhum** DDL, inserção, dado ou alteração de schema foi criado por qualquer agente; **fluxo de login/tenant ainda não implementado/validado na aplicação** (não houve teste do serviço Auth). O histórico inicial sem SQL foi preservado.
- **Cloud principal e subdomínio externo**: mantém-se o Lovable Cloud como provedor principal, conforme decisão anterior. Um repositório Supabase externo separado no GitHub **não implica** runtime ligado nem substitui a escolha do Cloud; nenhum vínculo de runtime foi verificado.
- **Cloud remoto não verificável nesta sessão**: registrado pela coordenação:
  - Coordenador observou conexão instável (`Reconnecting`) e timeout no navegador; Antigravity observou `Failed to fetch`.
  - O commit `1d996b0` (`feat: adiciona simulador didatico de rentabilidade`) foi confirmado na origem remota pelo coordenador via `git ls-remote`. A URL pública `https://techmedicina.lovable.app/super-admin/simulador` retornou **404**; isso não prova o estado do preview no editor, que não foi verificado por esta auditoria.
  - Alinhado com registros anteriores (C006/C002-R2): *push bem-sucedido não comprova atualização do preview nem publicação*.
  - **Atualização (pós-auditoria)**: o scaffold de integração chegou via `origin/main` em `805bcce` (`Activated Supabase cloud`) com SDK gerado, `drizzle` vazio e middleware de auth; o Codex registrou leitura via editor SQL com `public_tables=0`. Ainda **sem** fluxo de login/tenant real implementado/validado na aplicação (não houve teste do serviço Auth).
- **Diretriz mantida**: não alegar validade de ambiente remoto sem evidência direta; continuar testes e execução localmente.

## 5. Plano Concreto — Fundação de Acesso Confiável

Próxima fundação (roadmap de implementação, sem inventar integrações):

1. **Sessão confiável no servidor** — provedor de sessão real (cookie/PKCE) injetado em `createGuardFactory`, substituindo o `getSession` que devolve `null`; identidade provém de auth, nunca do chamador.
2. **Vínculo clínica (clinic link)** — persistir `ClinicLink` ativo por usuário+clínica com `medicalIdentityVerified`, `grants` e `patientId`, validado no servidor (não em React context).
3. **RLS (Row Level Security)** — isolamento por `clinic_id` no banco, alinhado à fundação Lovable Cloud; nenhuma consulta sem filtro de tenancy imposto pelo banco.
4. **Médico aprovado** — identidade médica verificada obrigatória (CRM verificado) antes de criar/editar prontuário, consistente com a regra de ouro de `core.ts:112-117`.
5. **Prontuário append-only** — modelo imutável: novas versões por inserção, sem `update`/`delete` de registros definitivos (rascunho é etapa anterior distinta).
6. **Auditoria** — trilha imutável de eventos (quem/quando/o quê/nível de acesso). Conforme o PRD (seção 2), a consulta global dos registros de auditoria é exclusiva do Super ADM; nenhum outro papel recebe permissão de auditoria não definida. Auditoria não concede acesso administrativo automático ao conteúdo clínico.

Cada item exige aprovação da coordenação e só avança uma tarefa ativa por vez.

## 6. Proposta C010 (não implementada nesta tarefa)

- **Objetivo**: criptografia em repouso **server-only** com `AES-256-GCM`.
- **Design**: módulo `server-only` usando `node:crypto`; chave fornecida por **KeyProvider injetado** (interface de derivação/carregamento), sem chave no código-fonte nem em valor de env versionado.
- **AAD (Additional Authenticated Data)**: vincular `clinicId`, `patientId` e `id` do registro ao ciphertext (e ao versão/schema) para que dados movidos entre clínicas/pacientes/registros falhem na decriptação.
- **Testes obrigatórios propostos**: adulteração de ciphertext; adulteração/troca de AAD (clínica≠, paciente≠, registro≠); round-trip correto; falha de chave errada; recusa de valores nulos/vazios.
- **Estado**: **apenas proposta**. Não implementada agora, sem dependências novas, sem commit/push. Aguarda aprovação explícita da coordenação para virar C010.

## 7. Status do Executor

OpenCode **OCIOSO** ao fim da C009. Nesta etapa, foram alterados quatro arquivos de documentação/catálogo; nenhum código, PRD ou histórico foi alterado. **Correção factual (R2)**: o `catalog.json` **foi** alterado **durante esta C009** (itens 2, 3.1, 3.2, 4, 5, 7 e 34); a entrega **D10** foi adicionada apenas na **C010**.

## 8. Arquivos Alterados nesta Tarefa

- `docs/RELATORIO_C009.md` (novo)
- `docs/PROGRESSO.md` (adendo)
- `docs/COORDENACAO.md` (adendo)
- `src/features/project-status/catalog.json` (itens 2, 3.1, 3.2, 4, 5, 7 e 34 — achado da auditoria)

Histórico preservado; a entrega D10 do catálogo pertence à C010 (mesma sessão do mesmo executor), sem tentativa de reverter autorias.