# Revisão local da migração 017 — desafios de domínio

Proposta, não autorização remota. 21/10/2026, Codex.

Antes de eventual aplicação: confirmar projeto Cloud, migrações/objetos anteriores, ausência dos nomes 017 e das funções/tabelas propostas; conferir papéis e privilégios, revisar backup e procedimento de recuperação. Migrar em transação como script versionado, sem reaplicar migrações históricas. 014–016 permanecem pendências independentes; não presumir sua aplicação.

Mudanças aditivas: tm_domain_challenges, índice único parcial por domínio, tm_domain_challenge_audit com RLS de leitura administrativa, RPC SECURITY DEFINER de emissão com search_path vazio e grants explícitos. tm_clinic_domains mantém CHECK apenas pending_verification. O contrato antigo de tm_domain_audit não muda.

Riscos: token bruto só no armazenamento restrito e recibo de emissão; não imprimir valores. A RPC não verifica DNS e não permite confirmar evidência. Prazo é parâmetro de política do servidor, ainda sem endpoint. Necessário revisão de privilégios no ambiente real e homologação de lock/concorrência antes de liberar uso remoto. Incrementar revision exige que adaptadores recarreguem a reserva após emissão. Não há mudança de hostname/tenant nem grants clínicos. Migrações futuras devem preservar registros/auditoria, nunca liberar hostname retirado implicitamente.

Validação posterior (somente se autorizada a aplicação): conferir presença, RLS, grants e ausência de escrita direta; testar sem credenciais de produção duas clínicas QA e operador autorizado; conferir rollback em colisão, revisão antiga, revogação do operador e nenhuma alteração de status. Não executar sondas de rede ou ativação por esta migração.

Recuperação: antes de uso, uma falha do script causa rollback integral. Após aplicação/uso, preferir migração corretiva aditiva; não apagar dados/auditoria para simular rollback. Qualquer remoção remota ou restauração de backup requer plano e autorização específica.
