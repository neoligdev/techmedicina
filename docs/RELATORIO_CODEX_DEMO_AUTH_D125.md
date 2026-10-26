# D125 — Falha de autenticação não ativa demonstração do paciente

Executor Codex. Correção de comportamento na interface já criada pelo Antigravity; layout e autoria das entregas originais preservados. Sem alterações no cliente Supabase gerado, serviços, credenciais ou Cloud.

## Falha reproduzida

PacienteDashboard e AppShieldsSection tratavam rejeição da consulta getUser e resposta com erro como se comprovassem ausência de sessão. Nos ambientes que permitem demo, isso ativava Alex/fixtures mesmo sem confirmar o estado de autenticação. O teste patient-demo-auth-failure.test.tsx reproduziu quatro falhas: erro de rede e erro retornado pelo SDK nos dois componentes.

## Correção

Helper compartilhado patientSessionPresence classifica resposta válida, ausência conhecida de sessão e estado desconhecido. Erro genérico/rejeição mantém hasSession=null, que já é restritivo em shouldEnablePatientDemo. Só ausência confirmada (incluindo AuthSessionMissingError reconhecido pelo type guard oficial do SDK) pode habilitar demo, ainda condicionada à política de ambiente existente. Usuário presente com erro contraditório também permanece restrito. Os componentes limpam nome/ID de apresentação na falha. Não cria nova assinatura de sessão nem muda a propriedade da sessão de login.

Não modifica dados clínicos, RLS ou permissões. Esta correção não conclui o fluxo de autenticação clínica nem a integração dos autorrelatos. A galeria e o histórico da D123 continuam com a autoria Antigravity; o catálogo deve registrar essa entrega ainda ausente e atribuir a correção D125 ao Codex.

## Verificações

Oito regressões novas comprovam o gate dos componentes; junto aos testes de galeria e painel, 27 testes direcionados aprovados. TypeScript e lint direcionado aprovados. Falhas são simuladas no SDK; não representam incidente Cloud observado. Resultado de regressão/build do conjunto será registrado após a conclusão dos processos ativos.

## Situação de integração

Código local na branch backend; catálogo atualizado somente ao integrar em develop. main segue aa61b4e e o preview D118 já homologado. D119–D125 não são enviados à main por essa autorização antiga. Aplicação SQL, worker/DNS e Publish continuam fora do escopo.

## Validação consolidada do lote

Após a correção, 1.122 testes aprovados em 125 arquivos; TypeScript completo, lint direcionado e build aprovados. Os quatro cenários inicialmente falhos passaram. A galeria local carregou demo somente após confirmar ausência de sessão; abertura/fechamento de detalhes conferidos no navegador. Nenhuma falha de rede real ou identidade de paciente foi provocada/usada no Cloud.
