# Relatório de Implementação: Unidade de Criptografia Clínica (C010)

## 1. Contexto, Executor e Escopo

- **Coordenador**: Codex (coordenação e teste; revisões **R1 e R2** solicitadas).
- **Executor desta etapa**: OpenCode, acionado como fallback após o executor primário (Antigravity) apresentar "Failed to fetch"; **não há confirmação de esgotamento de quota**. Tarefa curta autorizada pelo humano via coordenação.
- **Escopo entregue**: unidade **server-only** de criptografia simétrica de texto clínico com **AES-256-GCM** usando a WebCrypto nativa, mais testes unitários em Node. **Somente escopo unitário (D10).**
- **Fora de escopo (não implementado)**: persistência, banco de dados, RLS, endpoint de decriptação, integração frontend/backend/API, keystore real, geração/armazenamento de chaves, auditoria, backup e rotação de produção.
- **Restrições respeitadas (C010)**: sem novas dependências no escopo da C010; sem `node:crypto` (usa WebCrypto `crypto.subtle`); sem segredos/valores de env; PRD mantido como encontrado; nenhum commit/push. Requisitos de produção (PRD 3.2/4/7) seguem **parciais (azuis)**. **Nota pós-merger**: o `npm install` das dependências do scaffold Cloud (`@supabase/supabase-js`, `drizzle-*`, `postgres`) atualizou o `package-lock.json` local preexistente (untracked) — registrado, não stage nem removido.

## 2. Módulo Entregue

Arquivo: `src/lib/security/clinical-crypto.server.ts`.

- **Marcador server-only**: `import "@tanstack/react-start/server-only"` (mesmo padrão das guardas existentes). O módulo **nunca** é importado pelo cliente.
- **Algoritmo**: `AES-256-GCM` (WebCrypto), chave de 256 bits, IV de **12 bytes** aleatório (`crypto.getRandomValues`) por cifragem, **tag 128 bits**. Nenhum algoritmo implementado manualmente; apenas `crypto.subtle.encrypt/decrypt`.
- **Envelope tipado v1**: `{ version: 1, alg: "A256GCM", kid, iv, ciphertext }`, com `iv`/`ciphertext` em **base64 canônico estrito** (regex + re-encode idêntico).
- **AAD**: `JSON.stringify` de um array determinístico `[version, alg, kid, clinicId, patientId, recordId, recordType]` codificado em UTF-8, vinculando o ciphertext ao contexto e ao `kid`.
- **KeyProvider obrigatório e injetado**: `getActiveKey()` (cifrar) e `getKeyForKid(kid)` (decifrar). Sem chave default; **fail-closed** se o provedor estiver indisponível ou o `kid` for desconhecido. Chaves validadas: tipo `secret`, AES-GCM, `length === 256`, **não extraível**, usos contendo `encrypt` e `decrypt`.
- **Erro genérico único**: `ClinicalCryptoError: falha na operacao de criptografia clinica` — não vaza texto, identificadores nem material de chave.
- **Limites documentados e exportados** (`CLINICAL_CRYPTO_LIMITS`): `maxIdentifierLength = 256`, `maxPlaintextBytes = 256 * 1024`, `maxCiphertextBytes = maxPlaintextBytes + 16`, `maxCiphertextBase64Chars` derivado de `maxCiphertextBytes`.
- **Especificações de referência** no cabeçalho: `https://www.w3.org/TR/webcrypto/` e `https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams`.
- **Limite de segurança documentado**: AAD impede transplante de contexto/kid, mas **não** impede replay do mesmo registro no mesmo contexto; anti-replay real exige versionamento em banco e auditoria futuros.

## 3. Endurecimento R1 Aplicado

Revisão solicitada pelo coordenador antes do encerramento; todas as correções foram implementadas e cobertas por teste:

1. `iv` base64 com **exatamente 16 caracteres** validado **antes** de qualquer `Buffer.from`/decode.
2. Limite de `plaintext.length` verificado **antes** do `TextEncoder`; bytes UTF-8 validados por round-trip (rejeita surrogate isolado e excesso de bytes).
3. Limite de ciphertext **derivado** de `maxPlaintextBytes + 16` (tag GCM), aplicado ao comprimento base64 (pré-decode) e ao total de bytes decodificados.
4. Identificadores apenas com espaços são rejeitados, **sem normalizar** IDs legítimos.
5. `getActiveKey`/`getKeyForKid` capturam **throw síncrono** e **rejeição assíncrona**, convertendo ambos em erro genérico.
6. **Snapshot** de contexto/envelope/kid antes de qualquer `await`; lookup/AAD/retorno usam os mesmos valores capturados, impedindo mutação tardia durante o provedor.
7. `usages`/`algorithm` malformados são rejeitados **sem vazar `TypeError`**.

## 3.1 Endurecimento R2 Aplicado

Revisão final do coordenador; correções implementadas e cobertas por teste:

1. **Snapshot de `kid`/`key` antes do `crypto.subtle.encrypt`**: o objeto `active` devolvido pelo provedor pode ser mutado durante o `await`; o envelope e o AAD usam o `kid`/`key` resolvidos antes da chamada (não mais `active.kid`/`active.key` após o await).
2. **Pré-limite de plaintext** por unidades UTF-16 sem o fator `* 2` (para texto UTF-8 válido, bytes ≥ unidades UTF-16); a checagem por bytes segue depois do encode.
3. **Catches nunca repropagam `ClinicalCryptoError`** do provedor/externos: qualquer erro (inclusive `ClinicalCryptoError` com mensagem adulterada contendo segredo) vira uma **falha genérica nova**, sem reutilizar a mensagem recebida.
4. **Comentários de fronteira** documentam snapshot de contexto **antes** do provedor e `kid` **após** o provedor e **antes** do await de criptografia.

## 4. Testes

Arquivo: `src/test/clinical-crypto.test.ts` — **23 testes**, ambiente **Node** (`// @vitest-environment node`), WebCrypto real (sem mock):

- Round-trip UTF-8 com acentos e emojis; IV diferente a cada cifragem.
- Adulteração de ciphertext e de IV; chave errada sob o mesmo `kid`; `kid` desconhecido.
- Transplante de contexto (clínica/paciente/registro/tipo).
- Envelope malformado, versão, `alg`, base64 e tamanhos inválidos.
- Identificadores só com espaços (sem normalização) e IDs legítimos preservados.
- Limites de plaintext/UTF-8 e limites de ciphertext derivados (porte base64 e porte de bytes).
- **Throw síncrono** do provedor sem vazamento de detalhes internos.
- **Mutação tardia** de contexto durante `getActiveKey`/`getKeyForKid` não altera o vínculo original.
- Troca de `kid` falha **mesmo quando dois kids resolvem para a mesma chave** (AAD contém o `kid`).
- `usages`/`algorithm` malformado sem `TypeError`.
- Rotação: cifra com a chave ativa e decifra pelo `kid` do envelope.
- Falha genérica sem vazar texto, IDs ou chaves.
- **(R2)** mutação de `active.kid` durante `subtle.encrypt` (via spy) mantém o `kid` original no envelope e o round-trip funciona.
- **(R2)** envelope mutado durante `getKeyForKid` é ignorado (snapshot) — decifração permanece correta.
- **(R2)** provedor lançando `ClinicalCryptoError` com mensagem adulterada (contendo segredo) é convertido em falha genérica, sem reproduzir a mensagem.

## 5. Verificação

- `tsc --noEmit`: **EXIT_CODE=0**.
- `eslint .`: **EXIT_CODE=0** (0 erros; 7 avisos de Fast Refresh preexistentes).
- Criptografia: **23/23**, `EXIT_CODE=0`.
- Suíte completa: **104/104** em 14 arquivos, `EXIT_CODE=0`.
- `vite build`: **EXIT_CODE=0**.

Histórico de falhas transitórias registrado em `docs/evidencias/c010_validacao.md`: uma rodada completa apresentou **2 timeouts** no teste do simulador (**causa não comprovada**, não diagnosticado como contenção); o arquivo passou **6/6** isoladamente e as rodadas completas seguintes passaram. **Não** foi aumentado o `testTimeout` global nem desabilitado teste algum.

Evidências: `docs/evidencias/c010_tsc.txt`, `c010_lint.txt`, `c010_test_crypto.txt`, `c010_test.txt`, `c010_build.txt`, `c010_simulator_isolated.txt`, `c010_validacao.md`; revisões e ciclo final `c010_r2_{tsc,test_crypto,test,lint,build}.txt` e `c010_cloud_{tsc,test,lint,build}.txt` (exit codes reais capturados logo após cada processo).

## 6. Status e Próxima Etapa

- Entrega **verde apenas no recorte unitário** (D10). Escopo de demonstração não conclui requisitos de produção.
- Pendências para produção: keystore real (KMS/secret manager), guardas de sessão/autorização reais, persistência, RLS, auditoria, backup e rotação de chaves em produção; revisão de tamanho de texto versus modelo de prontuário.
- **Próxima etapa (C011)**: mapear o auth gerado e o `getClaims` confiável e preparar acesso clinic-aware no servidor — **sem** presumir tenant no cliente e **sem** atribuir acesso clínico ao Super ADM.
- **OpenCode OCIOSO** ao fim da C010. Stage preparado; aguardando liberação da coordenação para commit/push.

## 7. Arquivos Alterados nesta Tarefa

- `src/lib/security/clinical-crypto.server.ts` (novo).
- `src/test/clinical-crypto.test.ts` (novo).
- `src/test/setup.ts` (ajuste defensivo: stubs de `window` só quando `window` existe, para permitir ambiente Node).
- `src/features/project-status/catalog.json` (entrega **D10** na C010; os itens 2, 3.1, 3.2, 4, 5, 7 e 34 foram alterados **durante a C009**) e data mantida em `catalog.ts`.
- `docs/RELATORIO_C010.md`, `docs/evidencias/c010_*` (novos/atualizados: `c010_r2_*` e `c010_cloud_*`).
- `docs/RELATORIO_C009.md`, `docs/PROGRESSO.md`, `docs/COORDENACAO.md`: correção C009 (Cloud ativado pelo usuário/Lovable; SQL somente leitura executado pelo Codex; cronologia do catálogo) e adendos C010/R2.
- `roadmap.md` (raiz): C009/C010/Cloud/C011 registrados (roadmap real).
- `src/integrations/supabase/*.ts` (7 arquivos do scaffold Cloud): `eslint --fix` mecânico autorizado pelo Coordenador (formatação + `let`→`const`, sem alterar auth); `drizzle/schema.ts` **não** alterado.
- `docs/STATUS_PROJETO_TEMPORARIO.md`: regenerado pelo gerador existente (script não versionado).
