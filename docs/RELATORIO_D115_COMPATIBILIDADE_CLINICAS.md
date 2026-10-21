# D115 — cadastro administrativo antes/depois da migração 016

21/10/2026 · Codex · PRD 12.1/2. Mudança local no checkpoint, sem schema ou configuração remota.

A inspeção Cloud de 20/10 confirmou ausência de time_zone e RPC administrativa de quatro argumentos. A D110 consultava a coluna nova em lista/detalhe e sempre enviava p_time_zone. Integrar isso diretamente na main quebraria cadastro existente antes de aplicar a 016.

A leitura agora tenta os campos completos; somente o código PostgreSQL 42703 (coluna inexistente) permite nova consulta com campos básicos. Essa segunda consulta mantém clínica/ordenação/cursor/limite, cliente autenticado e autorização existentes. Se também falhar, o erro continua indisponível. Falhas de permissão, sessão ou rede não viram fallback. Nenhum fuso é preenchido por suposição; propriedade ausente permanece ausente.

A escrita usa a assinatura antiga quando não há fuso solicitado, compatível também com os defaults da assinatura nova. Valor explícito continua sendo enviado na primeira e única tentativa. Não existe retry que remova o fuso depois de um erro. Resposta que não confirma o fuso explicitamente solicitado é recusada, sem afirmar sucesso. Null/omissão preservam o comportamento da 016 de não apagar um fuso já cadastrado.

Testes novos de contratos do runtime cobrem leitura antiga/nova, erros não estruturais sem segunda consulta, argumento ausente/nulo, pedido explícito em contrato antigo, confirmação posterior e recibo incompleto. São simulações do transporte, não homologação PostgREST do Cloud. O conjunto direcionado anterior ao último caso passou em 54 testes, incluindo os treze testes PostgreSQL da 016. Regressão final aprovada: 896 testes em 111 arquivos (265,84s), incluindo os dez testes novos de compatibilidade. Não é homologação do transporte real do Cloud.

Não é conclusão da funcionalidade de fuso no Cloud. A interface que pede configuração explícita ainda necessita a migração 016 aplicada/revisada para salvá-la; falha não é ocultada. Agenda continua desabilitada. Nenhuma main, migração, concessão clínica, DNS ou publicação foi alterada.
