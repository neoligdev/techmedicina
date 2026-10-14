# Revisão da migração Jornada 013

Codex, 14/10/2026. Fonte: database/migrations/013_journey_goal_drafts.sql. Aplicação Cloud NÃO executada.

## Escopo
Cria tabela separada de propostas médicas append-only. Não altera metas vigentes, eventos ou índices; não cria usuários, vínculos ou grants. Somente seis áreas não prescritivas, estado literal draft e frequência sugerida diária/semanal. Autor e horário definidos pelo banco.

## Segurança e dependências
Depende de 001 e 008–011, Auth uid, chave composta paciente/clínica/usuário e grants journey_goals read/create. RPC SECURITY DEFINER com search_path vazio verifica médico ativo/verificado, clínica ativa, paciente ativo e bloqueia registros durante a escrita. Idempotência por clínica/paciente/autor/solicitação; mudança de conteúdo gera conflito. Escritas diretas negadas; leitura RLS somente médico autorizado. Não expõe paciente ao ADM global.

## Riscos e homologação
Executar apenas após conferir ausência dos objetos 013 e assinaturas das dependências. Migração transacional não idempotente: não reaplicar se já presente. A autorização de 008–012 não abrange 013. Não remover tabela aplicada com dados como forma de rollback; revisar correção progressiva. Revogação de grants deve impedir criação e replay, preservando histórico. Testes locais de cliente/host/sessão/HTTP/RPC/PostgreSQL verificam resposta perdida seguida de reenvio único. Auth e registro de domínio são simulados nos testes locais, sem comprovar homologação remota.

## Aplicação proposta
Após autorização específica: preflight somente leitura no SQL Editor do projeto, aplicar fonte revisada e conferir definição, RLS, privilégios, ausência de dados e funções. Sem contas, permissões clínicas, DNS, ativação de endpoints ou Publish. Homologação clínica exige contas e vínculos específicos aprovados separadamente.
