# C042 — Contrato estrito de rotas White Label

12/10/2026. Codex. Auditoria encontrou permissão para qualquer caminho sem área reconhecida e classificação por prefixo, inclusive application como paciente. Agora caminhos desconhecidos são negados, área exige segmento exato, saúde exige rota exata, e caminhos com codificação, query, fragmento, barra invertida, segmentos ponto ou dupla barra são recusados. O contrato recebe pathname canônico, não URL inteira. Status temporário restrito a central/demo.

18 testes aprovados, incluindo ambiguidades e matriz de áreas. Resolvedor ainda não acoplado ao SSR: esta entrega não altera URLs atuais, DNS ou infraestrutura. Assets/APIs precisam de política própria antes da integração. Preservados CSS e assets. C041 homologação de timeout no preview continua pendente após nova perda do controle do navegador.
