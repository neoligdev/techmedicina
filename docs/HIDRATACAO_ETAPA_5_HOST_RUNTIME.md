# Hidratação — etapa 5: host próprio e leitura local

Codex, 30/10/2026. PRD 8.3 parcial.

Rotas locais GET /api/hydration/context e /api/hydration/records registradas no TanStack. Contexto retorna somente clínica/paciente derivados de host e vínculo. A rota de registros utiliza a listagem preparada na etapa 4. Não existe escrita HTTP nesta fase.

Reutilizado somente o validador de host createJourneyHostSessionResolver, que não contém grants específicos de Jornada; lookup e verificação de hidratação são próprios. O helper verifica Host/authority, ambiente patient_pwa, host ativo, vínculo único e papel paciente. Localhost, preview, nomes reservados, host divergente e privilégios globais sem vínculo próprio são recusados. Não há fallback de tenant ou demo.

Runtime possui uma Promise de Auth por requisição. Consulta de domínio e RPC de leitura usam o mesmo objeto de sessão/bearer verificado; a próxima requisição resolve novamente. Transporte padrão reutiliza Auth getUser + identidade persistida e chave publicável, sem service role. Campos desconhecidos, scope fornecido na query e resposta incompatível são negados. Contexto e dados privados/no-store, Vary Authorization/Host.

## Revisão SQL 043 — somente local

Nova RPC tm_resolve_patient_hydration_host(text). Preserva cadeia de provas, recibos, ativação, revisão e chave da consulta White Label 026, mas exige especificamente hydration_records/read. Não chama a consulta de Jornada e não exige seus grants. Requer a cadeia de domínio até 025 e vocabulário de recursos de 041; 026 é referência, não chamada. Não aplicar dependências pendentes por inferência.

A consulta verifica clínica/paciente ativos e vínculo próprio; anon sem EXECUTE e sem enumeração de tabelas privadas. Não provisiona usuários/grants, não ativa domínios, não muda DNS, não escreve dados. Antes de aplicação futura, confirmar projeto, dependências e ausência/comparar assinatura. Aplicação exige autorização específica.

Revalida host em cada requisição, mas consulta de host e leitura de registros são RPCs separadas. Não promete revogação atômica de domínio no meio da requisição. A leitura revalida separadamente paciente, vínculo e grant no banco.

Testes: runtime/contexto/cliente e fixture PostgreSQL com prova assinada/DNS/ativação local. Grant de Jornada isolado não dá acesso; com apenas hidratação/read, o host da hidratação funciona enquanto o da Jornada é negado. Revogação de chave e inativação do paciente bloqueiam chamadas posteriores. Nenhuma prova, domínio, conta ou grant real foi criado.

HTTP local /api/hydration/context e /api/hydration/records respondeu 403 em localhost, com no-store/private e Vary Authorization/Host. Isso confirma recusa local, não homologação Cloud. Tipos/lint/build e resultados ampliados registrados no fechamento. PWA ainda não usa os registros.

Fechamento: 83 testes/7 arquivos aprovados, TypeScript/lint direcionado/build com saída 0. Hash SHA256 043: d4fff93472c7f07066e116db55ba5cbe4248b18db9eb79e386e974c4adb3062a. Registros/IDs sintéticos somente em PostgreSQL local; sem homologação remota atribuída a este lote.
