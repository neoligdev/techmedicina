# C041 — Limite de espera das reservas

12/10/2026. Codex. C040 observou envio de hostname duplicado em espera prolongada. Não há prova da causa remota; esta correção protege a interface independentemente dela. GET e POST abortam após 20 segundos. Gravação sem confirmação limpa a lista e exige recarga antes de novo envio, porque cancelamento do cliente não garante cancelamento no servidor. Colisão 409 confirmada mantém a consulta válida. Limpeza de timers no fim e desmontagem preserva cancelamento.

Quatro testes do painel aprovados, incluindo fetch sem resposta que rejeita ao abortar. TypeScript aprovado; build registrado em c041_build.txt. CSS/assets preservados. Homologação remota posterior ao push ainda pendente.
