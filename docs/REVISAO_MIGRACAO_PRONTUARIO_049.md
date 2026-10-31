# Revisão local — 049: histórico de evoluções cifradas

Codex, 31/10/2026. PRD 3.2/4/5. Proposta local, NÃO aplicada no Cloud. Depende de 001 e 048; nenhuma nova autorização clínica, chave ou infraestrutura criada.

SHA-256: 8b298d305495c21461560fb6ced8cd012e3ac7fb66bb6dd530277a46ade5ce0c.

## Objetos e invariantes

Acrescenta a restrição de precisão em milissegundos a recorded_at da tabela 048: a serialização existente não pode truncar silenciosamente microssegundos e causar perda de linhas na fronteira. O serviço já grava UTC canônico nessa precisão. Antes de aplicação remota, conferir ausência da função/restrição e se existem linhas incompatíveis. Se houver, parar e revisar; não arredondar nem alterar evoluções definitivas. A proposta não modifica a migração 048 já versionada.

Nova função privada tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer) valida acesso médico pelo helper existente e recebe cursor completo de horário/ID ou ambos nulos, limite 1–100, horário finito e sem precisão maior. Ordem mais recente primeiro, por data/ID decrescentes, sem offset. Lê um item adicional somente para decidir continuação; somente a página devolvida gera auditoria read, sem texto. Tabela de auditoria guarda UUIDs de escopo/ator/registro e horário, não nome/CRM/texto.

Mantém owner-only: remove EXECUTE de PUBLIC, anon, authenticated e de outros default ACL grantees deste objeto, preservando defaults globais. Não cria rota, serviço, segredo, papel ou grant. O ator tem de vir da sessão verificada de servidor; não conceder a RPC diretamente a papéis de aplicação, pois p_actor não é uma prova de autenticação.

## Serviço e transporte

Adaptador explícito envia argumentos estruturados; serviço recebe autorização/chave/listagem injetadas. A página inteira é validada (tamanho, escopo de cada linha, ordem estrita e cursor igual ao último item) antes de decifrar qualquer linha. Um único opener server-only é compartilhado com criação/leitura individual e verifica payload/AAD/metadados. Texto é liberado só após reautorizar e confirmar o mesmo usuário que iniciou a consulta. Não há cache, localStorage ou persistência de texto no navegador nesta entrega.

Resultados não incluem total estimado. Novas inserções não reescrevem registros anteriores, mas uma navegação de várias páginas não é snapshot transacional entre chamadas: para ver novas evoluções, reiniciar a consulta. Não foi adicionada consulta clínica ao Super ADM. Auditoria desta camada descreve leituras SQL bem-sucedidas, não comprova visualização humana ou captura de tentativas negadas.

## Testes e limitações

PostgreSQL embarcado/PGlite: 102 evoluções fictícias cifradas na mesma data percorrem páginas 100 + 2 com desempate por UUID; recarregar a primeira página preserva a ordem. Função privada inacessível aos papéis de aplicação e a papel com grants padrão herdados. Cursor/limite inválidos e admin são recusados. Página com paciente alheio não chega ao provedor de chave; troca de conta antes da devolução bloqueia o texto. Os testes anteriores de criptografia, autoria, imutabilidade e recuperação continuam aplicáveis.

Não comprova concorrência entre conexões remotas, recuperação em disco, KMS, validação cadastral de CRM, assinatura ou prontuário completo. Endpoint/host/Auth de produção, interface, UX de resposta incerta, chaves/backup/rotação e vínculos aprovados permanecem necessários. Nenhum SQL remoto ou deploy foi executado.

Validação: regressão ampliada com 192 testes em 20 arquivos aprovada (prontuário, criptografia, hidratação, identidade/permissões e status), além de TypeScript, lint dos arquivos afetados e build Vite. Não é execução da suíte global. Status local conferido pela tela: 172 entregas; busca por Prontuário e evoluções retorna o item parcial com dependências explícitas.

## Conferência remota somente leitura

SQL Editor do Lovable carregou e executou a consulta de verificação já existente, sem alteração do texto. Resultado observado: tm_hydration_records e receipts com RLS; SELECT/INSERT/UPDATE/DELETE diretos de anon/authenticated negados; funções internas privadas e quatro RPCs próprias autenticadas sem EXECUTE de PUBLIC/anon; índice próprio presente; registros/recibos/pacientes/vínculos/grants todos zero; host043 ausente. JSON observado em evidencias/prontuario/cloud-somente-leitura-20261031.json. Não aplicou 045–049, não criou contas/acessos e não confirma homologação de prontuário no Cloud.
