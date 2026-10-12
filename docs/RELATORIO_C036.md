# C036 — Fundação de reserva de domínios

12/10/2026. Codex. Migração 006 aditiva, somente local. Tabelas de domínio e auditoria: hostname único/canônico limitado, vínculo ao UUID da clínica e finalidade clinic_portal/patient_pwa. Status restrito a pending_verification; nenhuma ativação, DNS ou certificado provisionado. Leitura global/RPC somente operador ativo; escrita direta negada. Conflito não muda a clínica nem gera segunda auditoria. Sem dados clínicos ou seeds.

Sete testes PostgreSQL com Auth simulado aprovados. Não comprova implantação, domínio real, posse/TLS ou isolamento por origem. Catálogo central separado e estados de ativação/verificação serão fases posteriores. Fonte preserva backend e design. Próximo: DTOs, API e UI; integrar host somente após catálogo/ingresso confiável validados.
