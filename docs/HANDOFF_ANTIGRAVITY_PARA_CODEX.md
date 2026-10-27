# PLUGPIX TECHMEDICINA — HANDOFF DEFINITIVO DO ANTIGRAVITY PARA O CODEX

**Data:** 26/10/2026
**De:** Antigravity (Executor Frontend & PWA)
**Para:** Codex (Desenvolvedor Principal e Integral)
**Branch de Integração:** `develop`
**Referência Consolidada:** `75a7818` (e commit de documentação de handoff)
**Status da Suíte Vitest:** 1.112 testes aprovados em 123 arquivos (100% verde)

---

## 1. INTRODUÇÃO E OBJETIVO DO DOCUMENTO

Este documento formaliza o encerramento do ciclo de desenvolvimento paralelo estabelecido em `docs/COORDENACAO_AGENTES.md` e a transferência integral da governança técnica, arquitetura, frontend, backend, banco de dados e testes para o **Codex**.

Todo o código desenvolvido pelo Antigravity encontra-se auditado, validado e integrado à branch `develop`, sem pendências não comitadas, perdas de código ou regressões funcionais.

---

## 2. FUNCIONALIDADES FRONTEND CONCLUÍDAS

O frontend encontra-se implementado e estruturado no padrão TanStack Start, React 18, Tailwind CSS / Vanilla CSS semântico e Zod:

1. **Portal do Paciente / PWA (`/app`):**
   - **Cartão de VITALIDADE:** Apresenta os 5 pilares normativos do PRD (§11.3) — Alimentação, Hidratação, Sono, Movimento e Mente — com status visual, ícones acessíveis, sem inventar dados numéricos.
   - **Cartão de JORNADA:** Nível ativo de escudo, média de pontuação na janela móvel de 7 dias, contagem de dias avaliáveis, indicador do próximo escudo, distância em pontos e regra de regressão (§11.5).
   - **Formulários de Autorrelato:**
     - *Hidratação:* registro em ml e copos, validação de limites diários.
     - *Sono:* registro de duração em horas e avaliação subjetiva de qualidade.
     - *Humor:* seletor de escala visual de bem-estar.
     - *Alimentação:* seleção de refeições saudáveis com autorrelato explícito.
     - *Atividade Física:* modalidade esportiva, duração em minutos e nível de intensidade.
     - *Medicamentos:* adesão rotineira blindada contra registros fictícios — se o paciente não tiver prescrição médica ativa (`hasPrescription=false`), exibe mensagem neutra e desabilita a pontuação desse pilar.
   - **Blindagem Ética de Score ("Meu Score"):**
     - O valor 785 está restrito ao modo de demonstração.
     - Para usuários reais com sessão autenticada, o card exibe o estado "Em calibração" com botão para modal explicativo detalhando que o score necessita de acompanhamento clínico.
   - **Estados da JORNADA Conforme D124:**
     - `loading`: animação neutra de sincronização, sem presumir ausência de dados.
     - `insufficient_evaluations`: menos de 3 dias avaliáveis exibe estado informativo de janela em formação e **nunca** atribui o escudo Origem indevidamente.
     - `provisional`: entre 3 e 6 dias avaliáveis exibe o escudo preliminar indicando claramente avaliação provisória.
     - `ready`: janela completa de 7 dias avaliáveis com consolidação normativa.
     - `error`: estado explícito de indisponibilidade com ação de repetição (`retry`).
     - *Invalidação e cancelamento:* requisições assíncronas em voo são imediatamente invalidadas e descartadas ao trocar de clínica ou deslogar.

2. **Seção e Galeria de Escudos (`/app/escudos`):**
   - Implementada na D123 via componente canônico `MyShields` e container `AppShieldsSection`.
   - Galeria com os 5 escudos da JORNADA: **Origem**, **Ritmo**, **Avanço**, **Equilíbrio** e **Plenitude**.
   - Renderização visual através de `ShieldArtImage`.
   - Destaque em alta fidelidade do escudo ativo.
   - Painel de histórico imutável de conquistas, mantendo datas mesmo após regressão de pontuação.
   - Modal explicativo de cada escudo com critérios normativos, pontuações mínimas e janela móvel.

3. **Módulos Super ADM (`/super-admin`):**
   - `/super-admin/planos`: Catálogo de planos e precificação.
   - `/super-admin/simulador`: Simulador determinístico de receita e precificação clínica.
   - `/super-admin/dominios`: Gestão de domínios white-label e registros DNS.
   - `/super-admin/clinicas`: Gestão multi-tenant de clínicas e identidades visuais.
   - `/super-admin/auditoria`: Auditoria administrativa de acessos.

---

## 3. ENTREGAS D122, D123 E D124

- **D122 (Auditoria e Segurança de Dados no PWA):**
  - Isolamento de armazenamento: proibição de salvar dados clínicos em `localStorage` para contas reais.
  - Testes específicos em `src/test/patient-demo-auth-failure.test.tsx` e `src/test/patient-vitalidade-jornada.test.tsx`.
  - Integrada e consolidada em `develop` no commit `3201996`.
- **D123 (Galeria Canônica e Histórico de Escudos):**
  - Criação da página `/app/escudos` e componente `MyShields`.
  - Histórico de conquistas, modal explicativo e galeria interativa.
  - Integrada no commit `3201996`.
- **D124 (Preparação para Dados Reais e Resiliência de Estados):**
  - Tratamento estrito de `loading`, `insufficient_evaluations`, `provisional`, `ready` e `error`.
  - Blindagem do card Meu Score (bloqueio do 785 em contas reais).
  - Invalidação de respostas assíncronas obsoletas via `requestIdRef` e `onAuthStateChange`.
  - Integrada no commit `75a7818`.

---

## 4. CONTRATOS, SCHEMAS E CLIENTES COMPARTILHADOS

Os seguintes arquivos estão consolidados em `src/features/journey/`:

| Arquivo | Finalidade | Status |
| :--- | :--- | :--- |
| `contracts.ts` | Schemas Zod normativos (`patientShieldOverviewSchema`, `journeySelfReportInputSchema`, etc.) | **Completo e testado** |
| `shield-client.ts` | Cliente HTTP autenticado (`fetch` para `/api/journey/shields`) | **Completo e testado** |
| `self-report-client.ts` | Cliente HTTP autenticado (`fetch` para `/api/journey/self-report`) | **Completo e testado** |
| `shield-endpoint.server.ts` | Handler de servidor para endpoint de escudos | **Implementado (aguarda rota HTTP)** |
| `self-report-handler.server.ts` | Handler de servidor para autorrelatos | **Implementado (aguarda rota HTTP)** |
| `shield-rpc-reader.server.ts` | Leitor server-side para chamada à RPC `tm_get_patient_shield_overview` | **Implementado (aguarda RPC Cloud)** |
| `journey-score-engine.ts` | Motor de cálculo diário e janelas móveis de 7 dias | **Completo e testado (100%)** |
| `journey-shield-engine.ts` | Motor de transição e regressão de escudos | **Completo e testado (100%)** |

---

## 5. RECURSOS AINDA DEMONSTRATIVOS

1. **Seletor de Clínicas no Header:** opera em memória via `useDemoClinic` (`src/features/demo/context.tsx`).
2. **Prescrições Médicas Ativas:** no frontend é controlada pela prop booleana `hasPrescription` (definida como `false` por padrão para não inventar receitas).
3. **Módulos Super ADM sem Backend:** utilizam adaptadores em memória com contratos prontos para persistência.

---

## 6. DEPENDÊNCIAS DE BACKEND (ROTEIRO PARA O CODEX NA D125)

| Dependência | Descrição | O que falta fazer |
| :--- | :--- | :--- |
| **`GET /api/journey/shields`** | Rota HTTP TanStack Start | Criar `src/routes/api/journey/shields.ts` conectando a `handleShieldEndpoint` |
| **`POST /api/journey/self-report`** | Rota HTTP TanStack Start | Criar `src/routes/api/journey/self-report.ts` conectando a `handleJourneySelfReportPost` |
| **RPC `tm_get_patient_shield_overview`** | Função SQL no banco | Aplicar `supabase/migrations/014_journey_shields.sql` no Supabase Cloud |
| **RPC `tm_submit_journey_self_report`** | Função SQL no banco | Verificar aplicação da migração 012 no Cloud |
| **Consulta de Prescrições Ativas** | Endpoint/RPC de receitas médicas | Desenvolver consulta segura no prontuário vinculada ao paciente e clínica |

---

## 7. PENDÊNCIAS COMERCIAIS E CLÍNICAS

- **Validação Clínica:** Aprovação formal dos pesos do autorrelato por médico responsável antes de ativar pontuação diagnóstica.
- **Prontuário Eletrônico:** Modelagem de receitas médicas válidas (CRM, posologia, data de validade) para alimentar a adesão medicamentosa.
- **Tabelas de Planos e Preços:** Sincronização comercial com gateway de pagamento (PlugPix / Stripe).

---

## 8. SEGURANÇA E POLÍTICAS RLS PENDENTES DE HOMOLOGAÇÃO

- **RLS em `journey_shields` e `journey_shield_assignments`:** Verificar isolamento estrito por tenant (`clinic_id`) e paciente (`patient_id = auth.uid()`).
- **Validação de Tenant no Servidor:** Garantir que o `clinicId` e `patientId` enviados nos cabeçalhos sejam checados contra a sessão JWT no servidor, nunca confiando cegamente no cliente.

---

## 9. MIGRAÇÕES SQL APLICADAS LOCALMENTE E PENDENTES NO CLOUD

- `supabase/migrations/014_journey_shields.sql`: Define tabelas `journey_shields`, `journey_shield_assignments`, índices e a RPC `tm_get_patient_shield_overview`.
- **Status:** Disponível localmente no repositório; **não executada no Supabase Cloud**.

---

## 10. COMMITS RELEVANTES DO ANTIGRAVITY

- `4dd66d2`: `feat(pwa): evolui tela de escudos com galeria canonica, destaque e historico imutavel (D123)`
- `a485af0`: `test(security): audita resiliencia de jornada, fallback de dados e isolamento de habitos (D122)`
- `3201996`: `merge: integrate client shields gallery and journey security tests (D122-D123)`
- `bdfaeaa`: `feat(journey): prepara consumo real de jornada, corrige estados e protege score em contas reais (D124)`
- `3be9f3a`: `fix(journey): cancela respostas assincronas obsoletas na troca de usuario ou clinica (D124)`
- `769d5a2`: `fix(journey): remove mutacao de ref no cleanup para conformidade com linter (D124)`
- `d0e3870`: `merge: integrate journey real data preparation and state hardening (D124)`
- `75a7818`: `Merge branch 'dev/antigravity-frontend' into develop`

---

## 11. HEAD ATUAL E CONSOLIDAÇÃO

- **HEAD de `origin/develop`:** `75a78184f4fb2bc7cce0ef12bb2fa0be2c815598`
- **Integridade de `dev/antigravity-frontend`:** Todos os commits do frontend são ancestrais diretos de `develop`.

---

## 12. PRÓXIMOS INCREMENTOS RECOMENDADOS PARA O CODEX

1. **Executar `git fetch origin develop` e rebase/merge seguro na branch `dev/codex-backend`:** Absorver todas as novidades da D124 e este documento de handoff.
2. **Montar as rotas TanStack Start em `src/routes/api/`:** Conectar os endpoints HTTP aos handlers existentes.
3. **Homologar migração 014 no banco:** Aplicar no Supabase Cloud assim que autorizado pela coordenação.
4. **Executar teste ponta a ponta:** Validar fluxo completo desde o envio de autorrelato no PWA até o cálculo do escudo na galeria `/app/escudos`.

---

## 13. DECLARAÇÃO DE CONCLUSÃO E TRANSFERÊNCIA

O Antigravity concluiu com êxito todas as atribuições designadas para a interface, segurança de frontend e preparação para dados reais da JORNADA.

A governança técnica e desenvolvimento integral do Techmedicina estão transferidos ao **Codex**.
