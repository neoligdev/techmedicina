# C016 — Formulário administrativo real (integração local)

Codex, 10/10/2026. PRD 2, 4, 12.1. Formulário criar/editar integrado ao login somente após identidade e papel persistido confirmados no servidor. Inputs semânticos foscos/tema PlugPix, clínica nova inativa por padrão, atividade explicitamente escolhida; nenhum usuário/vínculo/módulo criado automaticamente.

Editar carrega a revisão atual pelo ID na API autenticada /api/platform/clinic. Papel global, UUID, retorno da mesma clínica e dados estritos verificados; sem cache. API rejeita conta anônima/local antes da consulta. Ausência 404, versão não disponível/erro de banco 503 genérico.

Formulário usa ID/revisão recebidos do servidor; conflito não sobrescreve nem repete automaticamente. Ref impede double submit, AbortController/montagem invalidam respostas tardias após saída. Erro de rede não afirma sucesso/cancelamento da transação: pede recarregar antes de tentar novamente. Atualiza lista somente após resposta HTTP/JSON válida. Não usa clínicas demonstrativas como fallback.

214/214 testes em 23 arquivos, tipos/lint/build exit 0, sete avisos antigos. Seis testes de formulário, quatro de detalhes; login 26. HTTP anônimo via ID 401 private/no-store. Screenshot anterior confirmou estilo e login local; telas de operador foram validadas via testes, não por conta real.

Cloud C015 não aplicada (Lovable sem créditos). Chrome deixou de permitir controle e não foi restabelecido pelas APIs documentadas; não houve publicação Cloud confirmada nem E2E real. Conta inicial foi solicitada ao usuário; nenhuma senha/conta/privilégio criado. Local 127.0.0.1:8081. Próxima C017: consulta global de auditoria administrativa; implantação gerenciada C015 e primeiro operador continuam pendentes.
