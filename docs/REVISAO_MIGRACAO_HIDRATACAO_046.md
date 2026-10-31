# Revisão local — 046: fila privada de lembretes de hidratação

Codex, 31/10/2026. Proposta local, NÃO aplicada no Cloud. As autorizações anteriores de main 6a4936b e SQL 041/042/044 não incluem este arquivo. A 045 também permanece pendente de autorização própria.

SHA-256: 24da86441eed65f28481b38989d39554bbb66c3031d6adddf882bdddc5a50cc7.

## Objetos e pré-condições

Depende de 001, 041 e 045. Cria somente tm_hydration_reminder_jobs, índice parcial due e seis funções de fila/serialização. Antes de aplicar, conferir ausência dos objetos e a definição/dependências da preferência 045. Não reaplicar cegamente. Não cria usuário, grant clínico, scheduler, provedor, inscrição, segredo, worker role ou endpoint público.

A tabela tem RLS e nenhum acesso direto de PUBLIC/anon/authenticated. As funções novas também são privadas: nenhuma role de worker recebe EXECUTE nesta proposta. O bloco final remove grants automáticos de default ACL de TODOS os grantees não proprietários somente nos objetos novos; não modifica os defaults globais nem objetos preexistentes. Resolve nomes com search_path vazio, limitado à transação. Proprietário/superusuários continuam privilegiados; não apresentar isso como isolamento contra administradores do banco.

A futura escolha de identidade, autorização e privilégio do worker exige revisão própria. Não usar service role do navegador nem conceder acesso de anon/authenticated às funções para contornar a ausência de worker. Os definer usam search_path vazio e nomes qualificados.

## Unicidade e agendamento

O enqueue deriva fuso/horário de preferências persistidas, clínica/paciente ativos e vínculo único de paciente com hydration_records/read ativo. A preferência precisa estar habilitada e o horário configurado. Paciente/user ficam ligados por FK composta. Destino e consentimento de canal NÃO são autorizados pelo enqueue: o executor deve revalidá-los antes do provedor mediante adaptador confiável ainda pendente.

Uma ocorrência é única por clínica/paciente/data civil/hora. IDs diferentes, revisão nova ou repetição de hora no fim do DST não geram outra ocorrência. Retorna o job existente, conservadoramente; se a preferência mudou, o executor pode cancelar a ocorrência antiga em vez de gerar outra. A janela proposta é minuto UTC alinhado e expiração em 60 segundos, alinhada ao protótipo local sem recuperar horários perdidos; não é política comercial/clínica aprovada de notificação em produção.

Enqueue e operações são owner-only. Claim não valida por si só relógio real/consentimento: é operação CAS interna, a ser usada pelo worker que verifica horário e autorização. A seleção due é limitada a 1–100 e inclui expirados ainda queued para o worker marcá-los sem enviar. Nenhuma execução periódica foi configurada.

## Estados e preservação de incerteza

Claim só vence em queued/revisão 1, atribuindo tentativa única e revisão 2. Dispatching exige a revisão/tentativa corretas. Atualizações não alteram slot, escopo ou horários. Aceitação exige recibo opaco; delivered não é estado aceito. CHECKs usam coalesce para rejeitar valores ausentes: NULL não pode passar como aceitação sem recibo.

Estados terminais não retornam a queued. Reexecutar outra instância do worker após resultado incerto ou aceito lê o estado SQL e não reenvia. Falha de confirmação depois da chamada continua incerta; nenhuma lease ou retentativa automática libera outra tentativa. Isso reduz duplicações, mas não promete exactly-once em um sistema externo. Reconciliação por evidência de provedor ainda precisa de implementação específica.

Serialização temporal usa UTC canônico e milissegundos para manter o contrato entre leituras/transições. Relógio de aplicação e TTL do provedor continuam responsabilidades do runtime futuro. Nenhuma rede de notificação foi chamada nesta entrega.

## Testes e limites

Nove testes SQL locais abrangem unicidade de ocorrência/revisão, repetição DST, minutos inválidos, duas chamadas de claim (um vencedor), tentativa errada, estados terminais, aceitação sem recibo, delivered recusado, integração worker/SQL com resposta perdida, expiração sem provedor, paginação limitada de due, paciente/grant/preferência revogados, ACL padrão herdada removida só da fila e ID primário reaproveitado para outro slot recusado.

Os testes usam PGlite e um transporte SQL local do adaptador. As chamadas competem pela mesma instância/conexão embarcada; NÃO comprovam contenção entre conexões PostgreSQL distintas, falha de máquina, persistência em disco ou durabilidade/backup do Cloud. A estrutura SQL é persistente por definição de tabela; o ambiente remoto ainda não a contém.

Depois de eventual aplicação autorizada, conferir objetos, RLS, ACL de todas as roles/grupos, funções/search_path, índices e tabela vazia, sem provisionar worker/contas/grants por inferência. Homologação real de concorrência, consentimento/destino/provedor e operação são etapas separadas. Falha do arquivo reverte a própria transação; rollback destrutivo não autorizado.

Resultado consolidado: 127 testes aprovados em 16 arquivos na regressão ampliada de hidratação/status. Após fixar search_path no bloco de ACL, os nove testes SQL da fila e os quatro testes do catálogo passaram novamente. Build e lint dos arquivos alterados aprovados. Não somar suítes sobrepostas nem tratar esses números como suíte global de todo o projeto.

TypeScript final aprovado após anotar explicitamente como string o UUID recebido pelo fixture; ajuste somente de tipagem, sem mudança de comportamento.
