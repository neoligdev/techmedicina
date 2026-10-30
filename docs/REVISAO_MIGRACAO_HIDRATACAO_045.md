# Revisão local — 045: preferências de hidratação

Codex, 30/10/2026. Não aplicada no Cloud. Nenhuma autorização anterior para 041/042/044 se estende automaticamente a este arquivo.

## Escopo e dependências

Depende da fundação 001 e do helper próprio de 041. Acrescenta tm_hydration_preferences, tm_hydration_preference_receipts e RPCs tm_get_own_hydration_preferences / tm_save_own_hydration_preferences. Não altera constraint de recursos, registros de consumo, metas médicas/Jornada, usuários ou grants. Antes de aplicar, confirmar ausência dos quatro objetos, definição do helper 041 e estado do backend correto.

A implementação local usa hydration_records/read para consulta e hydration_records/read+write para salvar preferências do próprio paciente. Trata esse recurso como acompanhamento próprio de hidratação, incluindo preferências. Esse escopo deve ser considerado na revisão de qualquer futuro grant QA; não criar/gravar grants por inferência. Médico, ADM e Super ADM não recebem acesso automático.

## Dados e semântica

Meta é informada pelo paciente: inteiro positivo em mL ou null (sem meta). Não há valor padrão, fórmula por peso, limite clínico, prescrição, cálculo de VITALIDADE ou alteração de metas médicas. Teto numérico é somente a precisão segura de inteiros JavaScript.

Fusos suportados nesta etapa: Bahia, São Paulo e UTC, alinhados à consulta atual. Até 24 horários HH:mm distintos/dia é limite técnico de payload, não recomendação de frequência. remindersEnabled registra preferência de querer lembretes, não comprova canal ativo, agendamento, envio, entrega ou leitura. Sem preferência habilitada, horários podem ser mantidos para futura reativação. Agendamento real/DST, permissões de dispositivo, canais e execução em segundo plano permanecem pendentes.

## Segurança, revisão e recibos

RLS nas duas tabelas, sem acesso direto de PUBLIC/anon/authenticated. RPC SECURITY DEFINER com search_path vazio; EXECUTE somente authenticated sujeito a helper próprio, vínculo e grants ativos. FK composta vincula clínica/paciente/user; consulta nunca deriva autoridade do paciente informado pelo cliente. Recibo por clínica/paciente/solicitação, lock transacional e expectedRevision evitam sobrescrita concorrente. Mesma solicitação retorna recibo original e revisão atual; payload alterado sob mesmo ID conflita.

RPC de leitura permite recuperar recibo específico sem gravar. Ausência de recibo não prova falha de operação em voo. Escrita e recibo são atômicos. As funções não apagam histórico. Não foi testada contenção real entre múltiplas conexões.

## API e PWA

GET/POST /api/hydration/preferences é local. Host/Auth verificados por requisição e mesma sessão nas RPCs; sem service role, confiança em seletor visual ou escopo recebido. POST limitado a 4 KB reais e JSON estrito. Respostas são validadas por escopo, revisão, conteúdo e comando original; erros não expõem upstream. Sem cache/cookies/redirects, somente um envio e confirmação explícita em resultado incerto.

A tela exige carregar preferências antes de editar; meta ausente fica em branco e fuso exige seleção. Conflitos obrigam recarregar. Recibo incerto bloqueia edição, consulta de histórico e comandos de consumo; repetição usa comando/ID original. Fechar a tela perde correlação em memória e não cancela escrita. Nenhum payload é salvo em browser storage. Salvar horários não solicita permissões nem agenda notificações.

## Verificação e aplicação futura

Testes locais cobrem schema, persistência SQL, recibos antigos com revisão atual, conflitos, outro paciente/clínica, grants revogados, acesso direto negado, horários inválidos, formulário, resposta perdida, sessão única e escrita sem grant. Conferir RLS/ACLs/contagens depois de eventual aplicação. Não reexecutar cegamente se algum objeto existir. Arquivo usa transação; falha reverte sua própria aplicação. Rollback destrutivo não é autorizado.

SHA-256 revisado: 5fe9ea9e07c6d82f2c5365d262e4bb0971adb8ee61c1b459916bf05db3234913. Compilação e lint dos arquivos alterados aprovados. Testes de interface usam sessões/respostas fictícias; a proteção local/preview foi mantida no navegador e /staus local mostrou 165 entregas. Não houve homologação de paciente real nesta etapa.

## Proteção adicional de troca de sessão

A tela autenticada vincula getSession ao userId que a abriu e invalida o callback após desmontagem. Se a conta mudar enquanto o token é obtido, a solicitação anterior não é enviada com o token da nova conta. Testes exercitam troca de conta antes de salvar e conclusão de getSession após logout. Isso reforça também os registros de consumo existentes; a autorização real continua exclusivamente no servidor.

Regressão ampliada final: 97 testes aprovados em 13 arquivos. Nenhuma nova suíte global de todo o projeto foi executada; estes números não devem ser somados às regressões anteriores. Build e lint dos arquivos alterados aprovados. O ajuste final de literal bearer dos fixtures é apenas tipagem, sem mudança de comportamento.

TypeScript final aprovado após a tipagem literal dos fixtures.
