# Hidratação — controle local de tentativa de entrega

Codex, 31/10/2026. Núcleo de referência server-only e testes; nenhum envio, serviço, fila ou migração Cloud ativados.

## Comportamento implementado

O executor lê um job estrito, valida identidade e janela, reivindica por revisão/tentativa e exige persistir dispatching antes de chamar o provedor. A cópia dos dados entregue aos adaptadores não pode alterar silenciosamente o snapshot usado para validar a transição. Jobs antes do horário aguardam; expirados não enviam. Nesta referência, a janela é um minuto UTC exato a partir do horário civil escolhido, sem recuperação de horários perdidos. É proposta técnica local, não política de produto aprovada para segundo plano.

Depois da reivindicação, o adaptador de autorização deverá recarregar acesso atual da clínica/paciente, preferências confirmadas, consentimento e inscrição ativa. O worker valida escopos, revisão exata da preferência, horário habilitado, destino ativo e consentimento. Um destino de outra clínica/paciente ou URL arbitrária em vez de inscrição estruturada é recusado. Alterar preferências cancela o job antigo conservadoramente, mesmo se a alteração for somente a meta.

O adaptador de envio recebe apenas inscrição opaca, chave idempotente do job, vencimento e mensagem genérica: “Lembrete do aplicativo / Abra o aplicativo para revisar seus lembretes”. Não recebe volume, meta, nome, clínica ou paciente no corpo. A requisição tem prazo máximo. O vencimento precisa ser respeitado pelo futuro adaptador/TTL do provedor; iniciar antes dele não garante entrega antes dele.

## Estados e incerteza

- queued: ainda sem tentativa, revisão inicial 1.
- claimed: tentativa reivindicada por CAS, sem prova de envio.
- dispatching: persistiu a barreira de envio; pode ou não ter chamado o provedor. Nunca presumir que esse estado comprova envio.
- accepted: provedor aceitou e devolveu referência opaca; NÃO significa entregue/lido.
- rejected: adaptador confirma rejeição definitiva, sem aceitação.
- uncertain: resposta perdida, timeout ou resposta do provedor inválida; não reenviar automaticamente.
- cancelled/expired: acesso/preferência/consentimento não autorizados, verificação indisponível ou janela vencida; nenhuma chamada ao provedor de envio realizada nessa execução.

Não há estado delivered aceito por este worker. Um retorno “delivered” sem evidência verificada é inválido e fica incerto. Se a confirmação local falha depois da aceitação, o job fica potencialmente dispatching: nova execução não reenvia. Não há lease que libere automaticamente tentativas incertas, nem criação de nova chave para tentar novamente. Reconciliação futura exige evidência do provedor e fluxo específico.

## Contratos que AINDA precisam de implementação real

1. Armazenamento durável com chave única por ocorrência clínica/paciente/data/hora e criação idempotente. O worker impede dois reclamantes do MESMO job com CAS válido; não resolve jobs distintos criados para o mesmo slot. A chave idempotente externa é o UUID do job, portanto a unicidade de ocorrência no armazenamento é obrigatória.
2. Operações claim/transition atômicas por revisão e tentativa, com estados legais e metadados imutáveis. Testes usam CAS em memória; não comprovam contenção, recuperação ou durabilidade PostgreSQL reais.
3. Autorização corrente implementada por origem confiável no servidor. O contrato authorize é dependência obrigatória, NÃO uma nova consulta de grants implementada. Não aceitar esses dados de navegador ou JSON de caller. Revalidação antes do envio não promete revogação atômica distribuída.
4. Canal e inscrição/destino protegidos, consentimento e permissões adequados. Não existe adaptador, URL de provedor, segredo, service role, scheduler, rota HTTP ou configuração padrão nesta entrega. Não expor este executor como endpoint sem autenticação e privilégio próprios.
5. Provedor com semântica documentada de aceitação/rejeição, chave idempotente e TTL, além de verificação de assinatura/recibos quando houver prova de entrega. Um erro HTTP genérico não deve ser convertido em rejeição definitiva sem prova de não aceitação.
6. Operação e observabilidade sem vazar saúde/credenciais; política de cancelamento/reconciliação/retentativa deve ser aprovada antes da ativação. Nenhuma dessas integrações foi presumida.

## Testes

14 testes direcionados locais cobrem duas execuções concorrentes, início antecipado/expiração, latência da autorização, acesso revogado, destino estrangeiro, consentimento retirado, preferência desativada/revisionada, persistência incerta antes/depois do envio, crash com barreira persistida, perda de resposta do provedor, entrega sem prova, rejeição definitiva e metadata adulterada. Provedor e fila são fictícios; nenhuma chamada de rede foi feita.

PRD 8.3 continua parcial: registros/metas/avisos locais não concluem entrega em segundo plano nem observações da IA. Main, Cloud, DNS, vínculos e serviços continuam nos respectivos escopos de autorização próprios.

Resultado consolidado: 118 testes aprovados em 15 arquivos de hidratação/status; TypeScript, lint dos arquivos alterados e compilação aprovados. Não foi executada nova suíte global de todo o projeto. Quatro testes do catálogo também passaram após sua atualização para 31/10/2026 e 167 entregas.
