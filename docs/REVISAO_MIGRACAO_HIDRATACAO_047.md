# Revisão local — 047: fonte privada de candidatos a lembretes

Codex, 31/10/2026. Proposta NÃO aplicada no Cloud. Não incluída nas autorizações anteriores de main 6a4936b e SQL 041/042/044.

SHA-256: 28c60ee8e7f107e087762273b5b71c1727ca5a8a343f4e2791e0d6f7da595de3.

## Escopo e dependências

Depende das tabelas de 001, 041 e 045; o fluxo completo usa a fila 046. Antes de qualquer aplicação remota, conferir definições/dependências e ausência da função nova. Não reaplicar cegamente. Cria apenas tm_list_hydration_reminder_candidates(text,integer), sem tabelas, grants clínicos, role de worker, endpoint, cron, credenciais ou provedor.

A função é SECURITY DEFINER com search_path vazio e nomes de objetos qualificados. Seu escopo é global entre clínicas, intencionalmente restrito ao futuro processamento interno. PUBLIC, anon e authenticated não recebem EXECUTE. O bloco final remove outros grants de default ACL somente deste objeto; defaults globais permanecem intactos. Proprietário/superusuários seguem privilegiados. Não conectar esta função a sessão do navegador nem concedê-la a papéis da aplicação.

## Seleção, limites e retomada

Retorna apenas preferências habilitadas de clínica e paciente ativos, usuário correspondente, vínculo ativo de paciente único na clínica e grant hydration_records/read. Não inclui e-mail, destino ou user_id na resposta. A autorização de canal/consentimento não é inferida dessa seleção.

Paginação keyset por (clinic_id,patient_id), limite 1–100 e leitura de um item adicional para decidir nextCursor. Cursor estrito e canônico, UUIDs minúsculos separados por dois-pontos. Não usa offset. Resposta traz preferências no contrato existente, com revisão/fuso/horários confirmados. O planejador decide se o minuto corresponde e o enqueue 046 revalida acesso e preferências ao gravar.

Adaptador server-only recebe transporte explicitamente injetado e usa argumentos estruturados para listar/enfileirar; não possui transporte padrão ou credencial. Falha após commit não retorna checkpoint avançado: repetir o lote original retorna a mesma ocorrência SQL. Sem retentativa automática ou recuperação de minutos passados. Alterações concorrentes não constituem snapshot transacional de toda a varredura: mudanças antes do cursor podem aguardar uma nova varredura no mesmo minuto, e revogação no intervalo falha de forma conservadora, sem avançar o checkpoint.

## Testes e riscos

Testes PostgreSQL embarcado exercitam o planejador e o adaptador reais: 102 pacientes fictícios em duas clínicas são percorridos em 100 + 2; repetição não duplica jobs. Perda de resposta após gravação mantém uma ocorrência. Revogação entre listagem e enqueue é recusada. Preferências desligadas, paciente inativo ou grant removido não geram candidatos; papéis de aplicação e papel com EXECUTE herdado por default ACL não conseguem chamar a função.

Ambiente PGlite local com uma instância: não comprova contenção entre conexões remotas, recuperação de máquina ou entrega de notificação. Sem autorização remota para 045–047, sem canal/inscrição/consentimento operacional e sem privilégios dedicados, não há envio real. Fonte global pode ser custosa em bases grandes; avaliar plano/índices e limite de varredura na homologação antes de cron. A janela de um minuto exige dimensionamento; falha ou atraso não deve ser apresentado como lembrete entregue.

Próxima integração exige desenho próprio da identidade do worker, transporte protegido e autorização/registro de canal. Não usar service role no cliente. Nenhuma infraestrutura ou DNS foi alterado.

Validação: regressão ampliada de hidratação, autenticação/permissões e status com 142 testes em 17 arquivos aprovada. Lint dos arquivos afetados e build Vite aprovados. Não é execução da suíte global do projeto nem homologação remota.
TypeScript final também aprovado após ajustar a tipagem estrita do transporte SQL de teste.
