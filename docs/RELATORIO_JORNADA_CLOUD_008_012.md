# Jornada — aplicação Cloud 008–012

Codex, 13/10/2026. Proprietário autorizou especificamente o lote revisado após preflight; exclusões continuam: contas/grants clínicos, DNS, endpoints, commit/push/deploy. Aplicação pelo SQL Editor do projeto 75200069-2ce5-40c9-a874-f12db50531be, sem Ask Lovable.

Preflight confirmou quatro tabelas da fundação, auth.uid, UNIQUE(id,clinic_id,user_id) e constraint de recursos anterior; Jornada ausente. Cada fonte foi carregada e comparada com texto visível, normalizando quebras e linhas vazias adicionais do editor. 008/009/010 exigiram confirmação de DROP/ALTER. O resultado anterior permaneceu visível durante confirmação de 009; ela só foi confirmada como aplicada após execução e catálogo remoto. Nenhuma reaplicação foi feita.

Verificação remota em docs/evidencias/vje2_cloud_verificacao.txt e consulta .sql: cinco tabelas com RLS e sem escrita direta authenticated/SELECT anon; sete funções security definer, search_path vazio, EXECUTE anon negado. MD5 de prosrc normalizado apenas para linhas vazias correspondeu aos sete corpos fonte; assinaturas conferidas. RPC antiga sem clínica sem EXECUTE authenticated; nova for_clinic permitida sob regras internas. Constraint preserva os cinco recursos anteriores e acrescenta dois Jornada.

Metas/preferências/eventos/auditorias vazios; pacientes, memberships e grants permanecem zero. Nenhum Auth user, vínculo ou concessão foi criado. Captura vje2_cloud_verificacao.png. Hashes de fontes em vje2_migracoes_hashes.json. Não inserir migrações novamente nem presumir registro em ledger gerenciado: SQL aplicado diretamente e rastreado neste relatório.

Limites: conferência de catálogo/privilégios não substitui teste JWT/RLS com contas clínicas reais, concorrência real, metas aprovadas, consentimentos ou prescrição. Fonte de hosts ativos/TLS/posse ainda pendente e endpoints Journey não montados. Não calcular pontos, Escudos ou VITALIDADE. Em falha posterior desativar runtime e corrigir aditivamente, preservando ledger/histórico.

Próxima homologação detalhada em PLANO_QA_JORNADA_AUTENTICADA.md. Contas QA solicitadas ao proprietário; nenhum vínculo/concessão/fixture será criado sem proposta com IDs e autorização específica. A autorização do lote de migrações não amplia automaticamente o escopo.
