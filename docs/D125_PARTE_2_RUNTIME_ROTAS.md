# D125 — Parte 2: runtime, rotas e contexto da galeria

26/10/2026 · Codex · base anterior enviada 56b8f6c.

## Implementação

Três rotas locais registradas em TanStack Start: GET /api/journey/context, GET /api/journey/shields e POST /api/journey/self-report. Reutilizados handlers e repositórios existentes; não há outro backend. Runtime mantém uma única resolução de sessão por requisição e usa a mesma sessão tanto no lookup mínimo de host quanto no RPC clínico, sem cache global. Transporte REST/publishable e Auth getUser existentes são reutilizados; nenhuma service_role, conexão privilegiada ou alteração de tipos gerenciados.

Proposta local 026 resolve somente host próprio de paciente com ativação e provas atuais, vínculo e grants persistidos. Sem ela ou sem host válido, o runtime nega/retorna indisponibilidade: não recorre à primeira clínica, à demo ou à autorização por cabeçalhos de tenant. Rotas registradas localmente não significam autorização para implantar SQL/hosts no Cloud.

Galeria AppShieldsSection agora consulta contexto próprio antes dos Escudos. clinicId e patientId usados no pedido e no render vêm do servidor; Auth user.id e DemoProvider não definem mais o escopo de dados reais. Preservados aparência, galeria, estados, retry, demonstração explicitamente identificada e descarte de respostas após logout/troca de escopo. A home geral e os formulários de hábitos ainda precisam de ligação às metas elegíveis reais; D125 completa continua parcial.

## Evidências direcionadas

43 testes SQL de roteamento/host/runtime aprovados, incluindo quatro novos. Fixture inclui 008/009/012/014 e 017–026. Teste integrado chama RPCs reais locais de lookup, autorrelato e leitura de Escudos; repete mesmo evento sem duplicação, reconfirma bloqueio após revogação de vínculo e não calcula score indevido. Auth e ingresso são simulados; não é sessão Cloud real. 29 testes direcionados de galeria/Auth e dez de runtime/contexto/autorrelato também aprovados.

TypeScript completo, lint direcionado e build de produção aprovados. Rotas geradas pelo framework e preservadas no versionamento. Regressão global desta versão em andamento, a registrar ao término.

## Navegador e HTTP local

http://127.0.0.1:8082/app/escudos recarregado: Perfil demonstrativo identificado, galeria, histórico fictício, detalhe Plenitude e fechamento verificados. Design preservado; VITALIDADE indisponível/não calculada. Evidência em docs/evidencias/d125-runtime/escudos.png. As três rotas responderam 403 e no-store/private sob localhost, como exige a política que separa demonstração de operação clínica. Isso não testa login/consulta clínica real.

## Pendências e continuidade

Metas próprias elegíveis, histórico de autorrelatos, conexão dos formulários, estado clínico de prescrição, paginação e homologação real. Migração 014 e 017–026 continuam locais neste lote; nenhuma aplicada remotamente. Main permanece aa61b4e e o preview Lovable ligado a ela não recebe develop automaticamente. Próxima etapa: leitura própria de metas e eventos para fechar o ciclo de salvar/recarregar sem inventar dados ou prescrições.

## Conferência Cloud somente leitura — 26/10/2026

Painel Database do projeto 75200069-2ce5-40c9-a874-f12db50531be carregou normalmente. Lista visível contém tm_journey_events, tm_journey_goals, tm_journey_goal_drafts, tm_journey_preferences e respectivas auditorias (zero registros mostrados), além da fundação administrativa. tm_memberships, tm_membership_grants e tm_patients exibem zero registros. A lista não contém tm_patient_shield_states/tm_shield_history_events nem tabelas da cadeia de provas/ativações. Isso sustenta a pendência de objetos 014 e White Label; não substitui preflight de definições/ACL no SQL Editor antes de aplicação autorizada. Nenhum SQL executado e nenhum registro aberto ou modificado. Evidência cloud-database.png preservada. Não enviada mensagem ao Ask Lovable, não clicado Publish.

Rodapé do PWA verificado no DOM visível: position=fixed, bottom=720 e viewport=720, preservando fixação no pé da tela.

## Regressão consolidada efetiva

1.175 testes aprovados em 131 arquivos; duração 418,83 segundos. TypeScript completo, lint direcionado, build e git diff --check aprovados. Diff completo preparado sem .env, package-lock, alterações no bun.lock ou tipos gerenciados; nenhum padrão pesquisado de credencial encontrado. CSS global preservado. Isso não conclui homologação clínica/Cloud.
