# Revisão Codex D77 — Escudos

14/10/2026. Executor Codex, checkpoint/d69-d74. Migração 014 permanece NÃO aplicada no Cloud.

A versão entregue até D74 incluía exceção de operador global em tm_can_read_journey_patient e tm_save_patient_shield_transition. Isso contradizia PRD §11.7, que não concede acesso clínico irrestrito ao Super ADM por gerenciar Escudos. Codex removeu ambas as exceções, restringiu o vínculo médico de escrita ao papel medico e exigiu g.resource=p_resource para leitura, evitando expansão de journey_goals para journey_events/shields.

28 testes PostgreSQL locais de segurança/persistência aprovados, inclusive novo teste de operador global negado para guard, RPC de consulta, RPC de gravação e leitura RLS de ambas as tabelas. Não houve alteração no Cloud ou permissões reais.

Pendência: ShieldService é orquestração local e aceita requester opcional; não montar em endpoint sem fronteira com Auth/host, grants e revisão da resposta/tenant. O JWT service_role da SQL permanece caminho privilegiado do servidor e não pode ser usado como atalho para autorização clínica de usuários. Metodologia e limiares permanecem candidatos em homologação.
