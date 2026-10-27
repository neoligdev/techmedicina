# Revisão local — migração 030 (Blog central)

Não aplicada no Cloud. Fonte: database/migrations/030_central_blog_drafts.sql. Dependência: tm_platform_operators/auth.uid e fundação 001; não depende da cadeia clínica/Jornada/White Label.

Duas tabelas novas com RLS, sem privilégios diretos a PUBLIC/anon/authenticated. Somente RPCs SECURITY DEFINER, search_path vazio e referências qualificadas; EXECUTE autorizado a authenticated, com auth.uid e operador global Super ADM ativo verificados/bloqueados FOR SHARE em cada chamada. Perfis de clínica não obtêm acesso por vínculo ou seleção visual.

Validação SQL independente da aplicação: UUID/revisão, objeto fechado com campos string e limites técnicos. Documento exclusivamente rascunho textual; sem campos de paciente, clínica destinatária, HTML executável, publicação ou grants. Metadados textuais não comprovam neutralidade, ausência de dados pessoais, validade de licença ou revisão clínica; não publicar sem o fluxo futuro aprovado.

Advisory lock transacional por ID serializa criação/reenvio/edição; colisão de hash apenas serializa IDs distintos. Criação repetida com mesma conta, ID, documento e revisão inicial devolve o original sem duplicar snapshot. Atualização exige revisão atual; texto idêntico não cria nova versão. Resposta perdida na atualização requer releitura antes de editar. Snapshot de conteúdo/ator/instante é inserido na mesma transação da alteração. Conta/revisão não são aceitas do corpo como autoridade. Timestamps de atualização não retrocedem em relação ao anterior.

Sem RPC de apagar, publicar ou manipular snapshots. Imutabilidade é aplicada às contas da aplicação via privilégios/RPC; administradores de banco continuam sujeitos à governança de migrações. Não alegar WORM/imutabilidade física. Sem política de retenção inventada.

Pré-implantação: conferir projeto, ausência de objetos/assinaturas 030, dependências/ACL existentes e recuperação; obter aprovação própria. Validar sessão Auth real, revogação, conflitos e auditoria após aplicação autorizada. Nenhuma conta, papel ou registro editorial real criado neste lote.
