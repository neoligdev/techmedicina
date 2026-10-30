# Revisão local — migração 044: confirmação de hidratação

Codex, 30/10/2026. Proposta local, não aplicada no Cloud.

## Objetivo e dependências

`044_own_hydration_receipt.sql` depende de 001 e 041. Acrescenta somente a RPC `tm_get_own_hydration_receipt(clinic,record,source_request)`; não modifica dados, tabelas, grants de pacientes ou permissões clínicas. A permissão EXECUTE de authenticated está sujeita à guarda própria/read existente. Não substitui a resolução de domínio/autenticação do futuro endpoint.

A clínica é argumento obrigatório da RPC, mas acesso deriva de auth.uid(), paciente ativo, associação ativa e grant de leitura. O endpoint futuro deve derivar clínica/paciente do host e sessão, nunca aceitar escopo fornecido como autoridade pelo navegador. Anon e PUBLIC não podem executar. SECURITY DEFINER usa search_path vazio e nomes qualificados.

## Contrato e consistência

Uma única instrução SELECT lê o registro e seu recibo por chave única de registro/solicitação. Evita retornar recibo aceito junto de revisão atual anterior por leituras separadas. A resposta contém escopo, registro atual e snapshot do recibo, sem actor_user_id. Registro ausente ou de outro paciente resulta em record/receipt nulos. Solicitação desconhecida de registro próprio retorna registro atual e receipt nulo.

Ausência não prova que escrita em voo falhou. Nenhuma escrita ou retry ocorre nesta consulta. Recibo histórico não reverte registro atual. UUID nulo é rejeitado. Revogação de acesso é reavaliada pela guarda a cada chamada; não se promete serialização atômica com revogação concorrente após a guarda.

## Testes e limites

21 testes direcionados de persistência e contrato aprovados. PostgreSQL embarcado exercita criação com resposta perdida, correção posterior, recibo original, identificador desconhecido, outro paciente, outra clínica, anon, Super ADM sem vínculo e read revogado. Dados exclusivamente fictícios, sem Cloud. Corrigido erro de atribuição composta encontrado na primeira execução local; suíte final aprovada.

Sem teste de contenção em múltiplas conexões e sem homologação gateway/Auth/RLS remotos. O endpoint HTTP e cliente ainda não existem nesta entrega. A aplicação remota exige revisão do estado/dependências e autorização específica; não executar por este documento.

SHA-256 do arquivo SQL revisado: bf66fc6e09d870476606f6b3a493267ec2c2b6b8b8bdfd09920f426786fab681. TypeScript e lint do teste também aprovados; quatro testes de cobertura do status aprovados.
