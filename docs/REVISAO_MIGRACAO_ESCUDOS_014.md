# Revisão da migração 014 — Escudos

Codex, 14/10/2026. Fonte revisada: database/migrations/014_journey_shields.sql. NÃO aplicada no Cloud.

## Alterações propostas
Adiciona journey_shields ao recurso permitido, preservando os anteriores. Cria estado por paciente/clínica e ledger histórico com FK composta. Ativa RLS, nega escrita direta e leitura anônima. Cria funções de ranking, trigger de histórico imutável, consulta consolidada e transição atômica. Atualiza guard de leitura compartilhado para recurso exato, sem acesso implícito do Super ADM.

## Dependências e preflight
Conferir 001/008/009, Auth uid, chave paciente/clínica/usuário, constraint de grants, ausência das duas tabelas e assinaturas das funções. Migração transacional não idempotente; não reaplicar. Mudança do guard deve manter leitura legítima dos recursos antigos com respectivos grants e negar expansão entre recursos.

## Correções e evidência
D77 removeu leitura/escrita clínica pelo cargo global. D83 adicionou FOR SHARE de vínculo/grant médico durante transição. Bloqueio advisory por clínica/paciente cobre a primeira criação; histórico possui trigger contra UPDATE/DELETE e maior escudo não regride. Trinta testes locais de persistência/segurança passaram, incluindo consulta completa cliente-host-sessão-HTTP-RPC-PostgreSQL e revogação de leitura/escrita. Auth e host registry são simulados, não evidência de homologação real.

## Limites
Função de transição permite profissional verificado com grant específico e caminho privilegiado service_role. Nenhum desses acessos é criado nesta aplicação. Não ativar endpoints de gravação nem usar service-role para bypass de autorização clínica. Pontos/limiares e metodologia são candidatos em homologação, sem autorização clínica/regulatória presumida. Aplicação do schema não ativa cálculo real ou VITALIDADE.

## Aplicação autorizável
Preflight somente leitura, fonte exata, pós-verificação de definição, RLS, políticas, triggers e ACL, contagens vazias. Sem usuários/vínculos/grants, seeds, domínios/DNS, montagem de endpoints ou Publish. Não apagar dados/tabelas para rollback; correção progressiva revisada. Aplicação direta não prova ledger gerenciado. Aprovação específica do proprietário necessária.

Complemento D90: CHECKs de estado/histórico restringem score_average e score_average_rounded a 0–100, permitindo NULL quando não calculável. Falha preserva transação anterior. Não modifica pesos, limiares dos níveis ou metodologia VITALIDADE; nenhuma aplicação Cloud.
