# Revisão das propostas de dispositivos 037–039

Codex, 29/10/2026. Somente preparação local; não autoriza aplicação remota.

## Escopo

037 depende de 001: duas tabelas de rascunhos/versionamento e RPCs get/save. 038 depende de 037: listagem paginada de metadados. 039 depende de 037: consulta de uma revisão imutável. Não dependem de migrations clínicas/Jornada/contratos 014–036. Metadados declarados não identificam hardware autenticado. integrationAuthorized=false é literal exigido em todas as respostas. Não cria inventário físico disponível, expedição, paciente vinculado, telemetria ou liberação.

## Antes de qualquer execução remota futura

Confirmar projeto/backend Techmedicina, tm_platform_operators, auth.uid e roles anon/authenticated. Conferir existência dos objetos tm_device_registration_drafts, tm_device_registration_draft_versions e assinaturas get/save/list/version. Se existirem, comparar definições e histórico; não reaplicar ou remover dados. Verificar primeiro dependências, depois executar arquivos integrais na ordem 037, 038, 039, somente mediante autorização específica. Não incluir outros lotes por inferência.

Hashes SHA256 dos arquivos revisados:

- 037: dd5476a93dc2758ab72031b71ca6a168d3f1383daad32c1276a32c082fe7b90e
- 038: 407e7b5498ade8375141f5670dfd3c5f4f3b9a0d880edf0c930a59a1fc4d72eb
- 039: e10bd07afcec68d35b75b9e9e37d6d20d1c36415be6b5e3d8c3ad88ac1bfaa58

## Proteções e limites

RLS e nenhuma permissão direta de tabela para PUBLIC/anon/authenticated. Funções SECURITY DEFINER, search_path vazio, operador ativo revalidado e bloqueado FOR SHARE. EXECUTE somente authenticated, sem dispensar a guarda. UUID serializado na escrita, expectedRevision impede sobrescrita silenciosa e repetição idêntica não multiplica snapshots. Não há update/delete de versões pelas contas da aplicação, embora isso não seja WORM contra administrador do banco.

Identificador/firmware são texto declarado e podem repetir; não utilizá-los como credencial nem validar identidade física por eles. Cursor da busca pertence ao filtro literal e pode ser invalidado por alterações de metadados; reiniciar listagem nesses casos. Snapshot não libera a integração nem restaura registro.

## Homologação e recuperação

Testes PostgreSQL locais exercitam guarda, concorrência/revisão, idempotência, snapshots, cursor e revisão histórica. Clientes/HTTP validam DTO e token; UI preserva edição e recusa respostas antigas. Homologação Cloud futura precisa sessão real de Super ADM e fixtures explicitamente fictícias, sem permissões clínicas. Conferir RLS/ACL/search_path/assinaturas, ausência de grants adicionais e estado das tabelas antes/depois. DDL transacional reverte falhas do próprio arquivo; após aplicação confirmada, não executar rollback destrutivo. Eventual suspensão de RPC exige ação própria revisada.

Main está em 5b4ff09 e não contém dispositivos. 034–035 de contratos já aplicadas, separadas deste lote. Sem SQL remoto, main, Publish, DNS, infraestrutura, credenciais ou grants nesta revisão.
