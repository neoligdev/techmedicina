# D125 — Parte 1: contexto próprio do paciente

26/10/2026 · Codex. Base consolidada e enviada: develop/dev/codex-backend 031df8a; main aa61b4e preservada.

Implementados schema mínimo, cliente HTTP e composição de handler GET /api/journey/context. Contexto vem do host de paciente e do vínculo persistido da sessão, usando os resolvedores existentes. Não aceita clínica/paciente em query/corpo, não devolve userId/grants e não concede acesso. Exige vínculo ativo e permissão de leitura de recurso Jornada. Cabeçalhos private/no-store e Vary Authorization/Host; cliente usa bearer, credentials omit, redirect error e deadline. Falha/recibo inválido nunca produz sucesso.

Cinco testes novos cobrem fluxo cliente→handler com Auth userId diferente do patientId, ausência de sessão, link/grant revogado, Super ADM sem vínculo, outra clínica, host suspenso, query/método inválidos, falta de token e retorno divergente. Com o teste persistido de autorrelato e os testes do handler de Escudos: dez testes direcionados aprovados. Não é nova execução dos 1.159 testes globais da consolidação anterior.

Esta parte é composição local, ainda sem rota registrada ou provedor runtime real. Não foi feita conexão fictícia ao frontend, ativação de domínio nem aplicação SQL remota. Próximo incremento: resolver lookup mínimo do host com provas atuais e same-bearer; então montar as rotas e substituir escopo demonstrativo por contexto autorizado. A D125 operacional completa continua em implementação, incluindo metas e persistência/homologação real. Migração 014 permanece pendente de autorização para Cloud.

TypeScript completo, lint direcionado e git diff --check aprovados.
