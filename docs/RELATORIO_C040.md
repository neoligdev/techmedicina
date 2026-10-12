# C040 — Reservas administrativas no Cloud

12/10/2026. Codex. Pré-condições SQL confirmaram ausência das tabelas/RPC. Migração 006 aplicada verbatim pelo SQL Editor; Query succeeded. RLS nas duas tabelas, INSERT direto authenticated=false, EXECUTE anon=false, authenticated=true; RPC exige operador ativo.

Conta Super ADM existente reservou gestao.qa-techmedicina.test para clínica QA inativa, finalidade gestão/médico. Reserva pending_verification persistiu após Refresh. Consulta confirmou revisão 1 e uma entrada de auditoria. Sem DNS, TLS, ativação ou acesso clínico.

Teste de duplicidade permanece pendente: interface observada em Reservando… por tempo prolongado, banco sem duplicação. Investigar resposta/limites na próxima etapa; não alegar homologação completa do erro.

Regressão: 37 arquivos, 346 testes aprovados. Evidências c040_test.txt, c040_cloud_rls.png, c040_reservation_ui.png. Nenhum Ask Lovable; CSS/assets preservados.
