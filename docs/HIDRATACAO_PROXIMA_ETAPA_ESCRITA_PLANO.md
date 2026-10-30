# Próxima etapa — escrita de hidratação e recuperação

Codex, 30/10/2026. Plano local de continuidade após consulta no PWA; não implementado por este documento.

1. Contrato de resposta: recibo/registro atuais estritos no mesmo escopo/UUID, revisão coerente, conteúdo compatível com comando e comparação temporal sem perder microssegundos. Recibo antigo não substitui revisão posterior.
2. Endpoint de escrita limitado por bytes, JSON estrito, sem clinicId/patientId/actor fornecidos como autoridade. Resolver host e Auth da mesma requisição; read mais create/write explícito conforme comando. Reutilizar o mesmo bearer na RPC 041; sem service role.
3. Propor RPC somente leitura de recibo exato por registro/solicitação, usando a chave única de 041 e guarda própria/read. Nenhum reenvio/escrita durante consulta de confirmação. Não expor ator interno.
4. Cliente distingue conflito (409), falha de acesso e recibo incerto. Sem retry automático de escrita; se solicitado pelo usuário, repetir exatamente comando/ID original. Confirmar com read antes de nova edição. Ausência em consulta feita enquanto uma escrita ainda está em voo não prova falha definitiva.
5. Formulário apresenta consumo registrado e horário, sem meta sugerida. Correção/anulação versionadas e sem exclusão física. UI bloqueia comandos concorrentes e troca de contexto durante confirmação. Remover dados ao sair/trocar sessão e ignorar respostas atrasadas.
6. Identificadores pendentes ficam em memória; não persistir saúde no navegador. Recarregar/fechar perde essa correlação e não autoriza inventar uma nova solicitação equivalente. Política de recuperação após reload permanece limitação explícita a resolver, sem outbox clínica por inferência.
7. Testes: repetição sem duplicação, conflito, timeout com commit realizado, recibo histórico com registro atual, autorização revogada, host trocado, outra clínica/paciente, body excessivo e logout durante escrita. PostgreSQL local comprova atomicidade; contenção real entre conexões e homologação Cloud permanecem separadas.

Continuam pendentes convenções/unidades de produção, metas/restrições profissionais, lembretes/canais, IA e leitura médica. SQL remoto, grants QA, domínio/DNS e main exigem seus próprios escopos autorizados; nenhum deles é autorizado por este plano.
