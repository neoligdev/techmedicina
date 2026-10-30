# Hidratação — avisos visuais na tela aberta

Codex, 30/10/2026. Entrega local, sem envio externo nem alteração Cloud/main.

O primeiro canal implementado é um aviso dentro da própria tela de hidratação, após carregar preferências confirmadas e habilitadas. O minuto civil atual é calculado no fuso escolhido (Bahia, São Paulo ou UTC), sem confiar no fuso padrão do computador. A checagem ocorre ao ativar a tela, em intervalo de 15 segundos e ao mudar visibilidade. Não há garantia de pontualidade: suspensão do navegador pode impedir a execução.

Apenas um aviso por chave clínica/paciente/data civil/hora na mesma montagem do componente. Revisão de preferência não permite repetir o mesmo horário. Repetição de hora no término do horário de verão usa a mesma chave; troca de fuso não duplica um horário civil já visto. Mudança do relógio para trás é suspensa até alcançar o instante anterior. Limite técnico de 10 mil chaves por montagem falha fechado em uma aba excepcionalmente duradoura, sem expulsar chaves e voltar a repetir avisos.

A aba precisa estar visível. Horário perdido não é repassado posteriormente. Editar preferências, aguardar confirmação, trocar a conta ou desmontar a tela suspende os avisos. Texto genérico convida a revisar registros, sem dizer que a pessoa esqueceu de beber, sem recomendar volume, sem contabilizar ingestão ou marcar adesão ao fechar o aviso.

## Limites explícitos

- Não usa Notification API, push, service worker, SMS, e-mail, fornecedor ou permissão do navegador.
- Não funciona em segundo plano, tela fechada ou outras páginas do aplicativo. Não há telemetria ou comprovante externo de entrega/leitura.
- Deduplicação somente em memória na montagem atual. Reabrir/recarregar ou abrir outra aba pode gerar novo aviso no mesmo minuto; não apresentar isso como deduplicação durável ou notificação de produção.
- Preferências remotas continuam dependentes de 045 autorizada; domínio/043 e vínculos QA operacionais também pendentes. Nenhuma dessas barreiras foi contornada.
- Dados já carregados não são uma verificação contínua de grants entre dispositivos. Sessão e acesso são verificados nos fluxos protegidos existentes; não anunciar revogação instantânea distribuída.

## Próxima etapa para segundo plano

Definir canal e capacidades de execução do PWA, consentimento/permissão de destino, vínculo protegido da inscrição, credenciais em ambiente próprio e autorização da infraestrutura. Planejador/worker deverá usar guarda atual de clínica/paciente/preferência/consentimento antes de enviar, reivindicação durável de chave e recibos que distingam planejado, reivindicado, enviado, aceito pelo provedor, incerto e entregue quando houver evidência. Não presumir que HTTP aceito equivale a entrega nem repetir resultados incertos com nova chave. Revisar fuso/DST, revogação, frequência técnica e política de horários perdidos antes da operação.

Observações da IA são outra pendência: ausência de registro não demonstra falta de consumo. Não foi usado modelo/provedor nem criada inferência clínica nesta entrega.

## Validação

104 testes aprovados em 14 arquivos na regressão ampliada de hidratação/status, incluindo seis testes de slots/componente e integração com preferências confirmadas. TypeScript, lint dos arquivos alterados e compilação aprovados. Não somar estes resultados às suítes anteriores. /staus local conferido com 166 entregas; o componente autenticado foi testado com preferências e sessões fictícias, sem homologação Cloud de pacientes. Nenhum SQL remoto, main, permissões de navegador, serviço ou credencial foi alterado.
