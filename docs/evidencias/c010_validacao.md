# Validação da Entrega C010 (Unidade de criptografia clínica server-only)

Executor: **OpenCode** (fallback — o executor primário Antigravity apresentou "Failed to fetch"; quota **não** comprovada como esgotada). Codex coordena e testa. **Liberação final do Codex** nesta rodada (revisão R2 + checks 104/104 aprovados) para commit/push com a data 10/10/2026.

Escopo: **apenas unitário** (D10). Cifra/decifra de texto clínico com AES-256-GCM via WebCrypto nativa, sem persistência, endpoint, integração frontend/backend/API/DB, keystore real ou chaves reais. Requisitos de produção (PRD 3.2/4/7) permanecem **parciais (azuis)**.

## 1. Checks finais (com exit codes)

- **TypeScript (`tsc --noEmit`)**: `EXIT_CODE=0`.
- **Linting (`eslint .`)**: `EXIT_CODE=0` (0 erros; 7 avisos conhecidos de Fast Refresh, não bloqueantes).
- **Testes unitários de criptografia (`vitest`)**: `EXIT_CODE=0`. **23/23** testes no arquivo `src/test/clinical-crypto.test.ts` (ambiente Node real, `@vitest-environment node`).
- **Suíte completa (`vitest`)**: `EXIT_CODE=0`. **104/104** testes aprovados em **14 arquivos**.
- **Build (`vite build`)**: `EXIT_CODE=0` (client/SSR/Nitro Cloudflare).

Evidências **válidas** (exit real capturado logo após cada processo): `c010_r2_{tsc,test_crypto,test,lint,build}.txt` (revisão R2) e `c010_cloud_{tsc,test,lint,build}.txt` (rodada final pós-Cloud). **Desconsiderado**: `c010_tsc.txt` antigo, cujo exit code foi capturado fora de ordem e é **inconsistente**; os demais logs antigos (`c010_lint.txt`, `c010_test*.txt`, `c010_build.txt`) permanecem apenas como histórico, **não** como evidência válida. `c010_simulator_isolated.txt` segue como histórico do teste isolado (6/6).

## 2. Histórico de execuções de teste (transparência)

- Rodada completa pré-R1 (baseline): **93/93** em 14 arquivos.
- Uma rodada completa intermediária apresentou **2 timeouts** em `src/features/super-admin/simulator/__tests__/index.test.tsx` (testes `deve renderizar a interface base` e `deve preencher inputs sem perder o foco usando fireEvent`, limite de 5000 ms). **Causa não comprovada** (não diagnosticada como contenção): o mesmo arquivo passou **6/6** isoladamente (`c010_simulator_isolated.txt`, `EXIT_CODE=0`) e as rodadas completas seguintes voltaram a passar.
- **Não** foi aumentado o `testTimeout` global e **nenhum** teste foi desabilitado, ignorado ou removido.
- Após o endurecimento R1: criptografia **20/20** e suíte completa **101/101**, ambas `EXIT_CODE=0`.
- Após a revisão **R2** e o ciclo final pós-Cloud: criptografia **23/23** e suíte completa **104/104**, ambas `EXIT_CODE=0`.

## 3. Endurecimento R1 aplicado (somente escopo unitário)

- IV base64 validado com **exatamente 16 caracteres antes** de qualquer `Buffer.from`.
- Limite de `plaintext.length` antes do `TextEncoder`, validação de round-trip UTF-8 (rejeita surrogate isolado) e verificação de bytes depois.
- Limite de ciphertext **derivado** de `maxPlaintextBytes + 16` (tag GCM), com porte no comprimento base64 e no total de bytes decodificados.
- Rejeição de identificadores apenas com espaços **sem** normalizar IDs legítimos.
- `getActiveKey`/`getKeyForKid`: captura de **throw síncrono e rejeição assíncrona** convertidos em `ClinicalCryptoError` genérico.
- **Snapshot** de contexto/envelope/kid antes de qualquer `await`; lookup, AAD e retorno usam os mesmos valores, impedindo mutação tardia durante o provedor.
- Validação de `usages`/`algorithm` malformado **sem vazar `TypeError`**.
- AAD permanece vinculando versão/alg/kid/clínica/paciente/registro/tipo.

## 3.1 Endurecimento R2 aplicado

- Snapshot de `kid`/`key` copiado **antes** de `crypto.subtle.encrypt`; envelope/AAD não dependem do objeto `active` mutável durante o await.
- Pré-limite de plaintext por unidades UTF-16 **sem** o fator `* 2`.
- Catches **nunca** repropagam `ClinicalCryptoError` do provedor/externos — sempre falha genérica nova (sem reproduzir mensagem adulterada com segredo).
- Comentários documentam snapshot de contexto antes do provedor e `kid` após o provedor antes do await.
- 3 testes novos: mutação de `active.kid` durante `subtle.encrypt` (spy), envelope mutado durante `getKeyForKid`, provedor com `ClinicalCryptoError` adulterado.

## 4. Não declarações (limites mantidos)

- Sem declaração de anti-replay global (AAD impede transplante de contexto; replay no mesmo registro exige versionamento em banco/auditoria futuros).
- Sem backend, banco, RLS, autenticação, keystore, persistência, migração ou chave real. **Cloud**: ativação atribuída ao **usuário/Lovable** (não a agentes); o editor SQL executou **somente leitura** (`SELECT count(*) ... public_tables` → **0**, autor Codex), **sem** DDL/dados; **fluxo de login/tenant ainda não implementado/validado na aplicação** (não houve teste do serviço Auth); scaffold Cloud chegou via `origin/main` (`805bcce`) como scaffold sem fluxo login/tenant real.

## 5. QA C008 — simulador (10/10/2026, Codex, local)

Executado pelo **Codex** em `http://127.0.0.1:8080/super-admin/simulador` (build local após a otimização inicial do Vite):

- Desktop: exemplo **Conservador**, 100 titulares, 150 dependentes → receita **9.500**, contribuição **2.450**, equilíbrio **113**.
- Troca **Conservador → Base (vazia) → Conservador/100** preserva as entradas (100 titulares mantidos).
- Comparativo **distingue cenários incompletos**.
- Viewport **390px**: área 375, `scrollWidth` 375, **sem overflow** horizontal; exemplo **móvel 100** válido após a otimização inicial do Vite.
- **Não** foi alegado QA no preview do Lovable: o preview do editor permanece `Build unsuccessful/out of date`, causa desconhecida.

## 6. Encaminhamento

- **Autorização**: liberação final do Codex para commit/push desta entrega (27 arquivos + ajustes de fechamento 10/10/2026).
- **Próxima C011**: mapear auth gerado e `getClaims` confiável, preparar acesso clinic-aware no servidor; **não** presumir tenant no cliente; **não** atribuir acesso clínico ao Super ADM. Nenhuma validação do fluxo de login/tenant foi executada nesta entrega.
