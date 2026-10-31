# Prontuário — evoluções cifradas e imutáveis (proposta local 048)

Codex, 31/10/2026. PRD 3.2, 4 e 5. Apenas implementação local; nenhuma aplicação remota autorizada ou realizada.

SHA-256 da 048: e569b91c2e3646775923a7f311a2a16b6d4b4a997b50f8cf778f51454036c8bf.

## Entrega

Contrato de criação de evolução (texto, ID imutável, complemento opcional), serviço server-only e adaptador SQL com ator capturado de sessão verificada pelo chamador. A identidade profissional (nome, CRM, UF e UUID) é fornecida por autorização confiável, nunca pelo corpo do navegador. A integração real de Auth, host, cadastro profissional e keystore ainda não existe neste fluxo; não há endpoint ou chave padrão.

Reutiliza a criptografia clínica C010, preservando autoria histórica: AES-256-GCM, chave não exportável injetada, IV novo por cifragem e AAD por clínica/paciente/registro/tipo/kid. Texto, autoria profissional, data e vínculo do complemento ficam dentro do payload cifrado. Metadados mínimos de escopo, autor UUID e cronologia permanecem no banco para autorização/consulta. Ao abrir, o serviço confere AAD e igualdade dos metadados com o payload; reautoriza antes de devolver texto e recusa troca de conta. Não promete zerar memória de strings JavaScript.

SQL 048 depende de 001 e cria tabela privada de evoluções, índice cronológico, auditoria privada e funções de guarda/serialização/append/leitura. RLS habilitada; objetos novos sem ACL de PUBLIC/anon/authenticated nem de papéis herdados por default ACL. Defaults globais não são alterados. As RPCs aceitam ator interno confiável e não podem ser concedidas diretamente ao navegador; não são substituto de getUser/host. Nenhum papel ou grant foi provisionado.

Guarda exige clínica/paciente ativos, médico ativo com identidade verificada e prontuario/read; criar exige ainda create. Travas de leitura das linhas de autorização impedem revogação concorrente durante a operação SQL. Outro médico autorizado da mesma clínica pode ler; admin/Super ADM não recebem acesso pelo cargo. Verificação cadastral real de nome/CRM/UF é uma dependência obrigatória do provedor de autorização, não foi simulada como produção.

UPDATE/DELETE de evolução e auditoria são recusados por trigger; não existe método de edição/exclusão. Complemento é nova evolução e a função exige original na mesma clínica/paciente. Proprietário/superusuário pode administrar o banco, alterar triggers ou truncar: não apresentar este mecanismo como imutabilidade contra administradores do banco ou assinatura digital legal.

Append atômico retorna a ocorrência existente no conflito de ID somente no mesmo escopo/autor. O serviço decifra e confirma texto/complemento originais; comando diferente é conflito e nunca substitui o original. Mesmo comando repetido mantém autoria/data do primeiro registro. Perda de resposta não dispara retry: repetir explicitamente o ID original pode recuperar a ocorrência. Falha após gravação continua incerta até essa confirmação. Auditoria replay_lookup registra apenas que o SQL encontrou o ID; não significa que o serviço confirmou conteúdo. Falhas de acesso abortadas não são eventos persistidos desta auditoria; registrar tentativas negadas requer camada operacional própria.

## Validação e próximos passos

Testes usam PGlite, chaves efêmeras geradas somente no processo de teste e conteúdo fictício. Conferem ausência de texto claro no SQL/auditoria, leitura cifrada, comando repetido, conflito, triggers, complemento, médico colega, admin recusado, outro tenant recusado, revogação, troca de sessão, AAD trocado, chave ausente, envelope vazio recusado e ACL herdada removida. Não comprovam contenção entre conexões remotas nem durabilidade/recuperação de máquina.

Próxima etapa: histórico paginado, interface segura de escrita/leitura, ligação de host/sessão e recuperação de resposta incerta. Antes de produção: aprovação/aplicação SQL, contas/vínculos/grants específicos, cadastro/validação profissional, KMS/rotação/backup/recuperação de chaves, auditoria operacional e homologação clínica. Fluxo de assinatura permanece PENDENTE no PRD; esta entrega não é prontuário eletrônico completo nem evolução assinada.

Design, addenda White Label/Jornada/VITALIDADE, backend existente e registros históricos foram preservados. Nenhuma regra clínica, escore ou assinatura foi inventada.

Verificação desta entrega: 37 testes direcionados em três arquivos aprovados (prontuário, criptografia e status), lint dos arquivos afetados e build Vite aprovados. Página local /staus conferida pela tela com 171 entregas; Database do Lovable Cloud carrega e mostra zero pacientes, vínculos e registros de hidratação. Nenhum SQL remoto foi aplicado. Evidência visual local: artifacts/prontuario/status-171-local.png, no workspace principal.
TypeScript final aprovado. Serviço sem chave/identidade/transporte padrão; a camada operacional deve verificar Auth, host e identidade profissional antes de usar as funções privadas.
