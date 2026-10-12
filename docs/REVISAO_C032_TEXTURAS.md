# C032 — Reprodução de falhas na validação local de texturas

12/10/2026. Revisão Codex, ainda sem implementação ou implantação.

Após a C031 apareceram alterações locais não commitadas em `database/migrations/004_clinic_texture_branding.sql` e `src/test/clinic-texture-customization.test.ts`. Não foram sobrescritas. Solicitação de confirmação de executor único enviada ao proprietário antes de editar esses arquivos.

Em PGlite temporário, aplicadas as migrações 001–004 atuais com roles e Auth simulados. Três consultas a `tm_valid_branding` reproduziram:

| Entrada | Resultado esperado | Resultado observado |
|---|---|---|
| Objeto vazio `{}` | false | true |
| Cores e modo, sem nome | false | true |
| Preferências básicas válidas com `textureUrl=/textures/../../api/platform/clinics` | false | true |

Campos obrigatórios ausentes produzem NULL em comparações; `IF` não executa quando a condição é NULL. A allowlist de textura usa prefixo amplo em vez de recursos conhecidos. Verificação de assinatura binária não equivale a decodificação integral da imagem.

Correção proposta: validação explícita de presença/tipo e `IS DISTINCT FROM`, caminhos de assets exatamente permitidos, estrutura estrita das texturas customizadas, limites e base64 canônico com assinatura; preservar autorização, revisão e auditoria. Se 004 já tiver sido aplicada remotamente, corrigir por migração adicional; confirmar estado do Cloud antes de executar SQL. Não editar histórico publicado nem declarar integração remota concluída.

Nenhuma alteração SQL remota, concessão, dado clínico, publicação ou Ask Lovable. Não foi alterado o catálogo do status para apresentar esta revisão incompleta como entrega implementada. A meta de concluir o PRD continua aberta.

## Verificação adicional da RPC em banco temporário

Reprodução posterior com conta de operador e clínica QA exclusivamente no PGlite, sem dados reais: `tm_save_branding` aceitou as três entradas acima, retornando revisões 1, 2 e 3. A auditoria registrou três eventos `branding_updated`, inclusive o primeiro sem campos alterados. Portanto, a falha não se limita ao helper isolado: alcança gravação e CHECK da tabela pelo caminho autorizado da RPC. A validação do cliente/DTO não impede chamadas diretas à RPC com uma conta administrativa autorizada.

As permissões não foram contornadas para obter esse resultado; o problema é integridade de entrada após autorização. Isso não demonstra acesso de usuário anônimo ou de clínica alheia. Não foi testado nem afirmado que essa versão local está implantada no Cloud. Corrigir a integridade antes de promover a migração, mantendo testes de autorização e isolamento.

## Correção adicional preparada sem sobrescrever arquivos concorrentes

Novo arquivo `database/migrations/005_strict_texture_validation.sql` preserva a 004 e usa comparações explícitas `IS DISTINCT FROM` para recusar tipos/campos ausentes, além de substituir a aceitação por prefixo por lista exata de recursos estáticos. Contém helpers e RPC necessários para ser testado depois da 003, sem depender das edições locais da 004. Preserva autorização, bloqueio por clínica, revisão e auditoria; não foi aplicado no Cloud.

Novo teste `src/test/strict-texture-validation.test.ts`: 15 testes PostgreSQL aprovados, incluindo objetos incompletos, null explícito, caminhos arbitrários, base64 com assinatura inválida, lista customizada malformada e preferências válidas. Teste usa roles/Auth simulados e banco temporário; não comprova decodificação integral da imagem nem homologação real. Correção ainda aguarda revisão completa de regressão e confirmação de executor único antes de incorporar/publicar o lote; não atribuir conclusão de persistência remota.

Regressão posterior: 300 testes em 31 arquivos aprovados; TypeScript e lint do teste novo aprovados. Evidências `c032_test.txt`, `c032_tsc.txt` e `c032_lint.txt`. Durante a conferência, o diff de `src/test/clinic-texture-customization.test.ts` aumentou de duas para 66 linhas, demonstrando nova alteração externa. A suíte verde descreve o conteúdo carregado naquela execução, não garante estabilidade de arquivos alterados em paralelo. Confirmar executor único e revisar o diff consolidado antes de publicar ou implantar.
