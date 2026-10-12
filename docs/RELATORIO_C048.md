# C048 — Consulta protegida da auditoria de domínios

12/10/2026. Codex. Endpoint GET /api/platform/domain-audit verifica identidade global Super ADM antes de validar parâmetros ou consultar. clinicId/domainId obrigatórios, cursor horário/ID pareado, filtros de clínica/reserva preservados no transporte com bearer/chave pública existentes. Domínio e eventos passam DTOs estritos e recusa de tenant/reserva incompatíveis. Até cem eventos por página; privado e sem cache; erros sem detalhes internos. RLS existente preservada, sem migrações ou concessões.

Painel acionado por botão Auditoria na reserva, consulta explícita e autor/horário, sem link ativo. Mudança de página/clínica/sessão desmonta painel e cancela pedido. Timeout 20s, estado anterior limpo durante consulta, erro não mantém eventos alheios. Componentes/estilos existentes e design preservados.

20 testes de handlers/painel/reservas/transporte aprovados. TypeScript, lint e build registrados; rotas regeneradas pelo build. Homologação real posterior ao push ainda pendente.

Inspeção somente leitura de Domains no Lovable recuperada por teclado: painel mostrou URL techmedicina.lovable.app e controles para conectar/comprar, sem host próprio listado. Wizard de conexão aberto sem preencher/submeter domínio, cancelado. Nenhum DNS, publicação ou compra. Documentação oficial confirma múltiplos subdomínios individualmente conectados; com domínio principal os demais redirecionam para ele, e sem principal servem igualmente. Isso exige gate de configuração para White Label: https://docs.lovable.dev/features/custom-domain (consultada em 12/10/2026). Evidência c048_lovable_domains.png.
