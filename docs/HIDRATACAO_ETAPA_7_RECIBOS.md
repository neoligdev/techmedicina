# Hidratação — etapa 7: contrato de confirmação de recibos

Codex, 30/10/2026.

O contrato local valida a resposta contra o comando original, clínica e paciente esperados. Um recibo aceito precisa ter revisão esperada + 1 e conteúdo correspondente; IDs de solicitação e registro não podem ser substituídos. Instantes equivalentes com offsets diferentes são aceitos, preservando a precisão fracionária completa. Divergências de microssegundos são rejeitadas.

Recibo histórico confirma somente o comando original. O registro atual posterior é preservado; não há rollback visual para a versão do recibo. Anulação é terminal. Resposta sem recibo retorna `unconfirmed`, inclusive se houver registro atual: uma escrita em voo pode concluir depois dessa leitura. Nenhum retry automático foi implementado.

Validação: nove testes direcionados cobrem escopos aninhados, substituição de payload/solicitação/revisão, correção, anulação, precisão temporal, ausência e imutabilidade dos dados de entrada.

Próximo passo: RPC local de consulta exata e endpoint autenticado; depois escrita limitada e confirmação explícita no PWA. Não há novo SQL, rota HTTP ou integração com Cloud nesta entrega. Metas, lembretes e leitura médica permanecem pendentes.

A integração anteriormente autorizada de `6efc989` na main foi concluída e conferida no preview Lovable: 159 entregas, data 30/10/2026 e cobertura iniciada de 29%. Esta etapa posterior permanece nas ramificações de desenvolvimento até autorização específica de nova integração.
