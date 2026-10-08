# Matriz de requisitos e dependências — PRD v0.10

Referência: PRD_Techmedicina.md, preservado integralmente. Esta matriz organiza etapas; não declara implementação nem substitui detalhes e pendências do PRD.

Decisão do usuário: definir infraestrutura depois e concluir apenas etapas independentes. A validação atual não autoriza novos módulos. Propostas anteriores de prontuário, gamificação ou vidas simuladas foram retiradas pelo coordenador: não comprovam segurança ou processamento reais.

| Seção PRD | Escopo | Dependência e situação |
| --- | --- | --- |
| 1 | Processo e decisões | Pedido atual autoriza coordenação; frase antiga de adiar comandos é divergência registrada. |
| 2 | Arquitetura funcional | Quatro áreas demonstrativas existentes; arquitetura produtiva depende de infraestrutura. |
| 3 | Médico | Autorização, prontuário definitivo, dados, documentos, agenda e comunicação dependem de servidor e regras pendentes. |
| 4 | Segurança | Isolamento, criptografia e autorização reais pendentes; recomendações não são decisões fechadas. |
| 5 | Compartilhamento na clínica | Exige vínculos e autorização no servidor; seleção demonstrativa não comprova acesso. |
| 6 | Dispositivo e contexto | Dependente de protocolo, integração e decisões do dispositivo. |
| 7 | Aceite Médico | Critérios propostos para futuro teste real; não atendidos pela demonstração. |
| 8 | Paciente | Subitens 8.1–8.10 definidos com detalhes pendentes; dados, IA, lembretes e regras de saúde não implementados. |
| 9 | Loja | Catálogos definidos; operação comercial 9.3 pendente. |
| 10 | Integração e notificações | Recomendado; requer eventos, permissões e canais aprovados. |
| 11 | Aceite app e loja | Testes de aceitação futuros com serviços reais. |
| 12 | Super ADM | Gestão e vidas definidas; persistência e fechamento pendentes. Vidas habilitadas não equivalem a uso mensal. |
| 13 | Planos | Contratos/catálogos definidos; camadas recomendadas e condições pendentes. |
| 14 | Aceite ADM e planos | Futuro: contratos, vínculos, cobrança e isolamento reais. |
| 15 | Blog | Escopo definido; conteúdo e publicação pendentes, sem publicação nesta etapa. |
| 16 | Academy | Escopo definido; conteúdo e acesso dependem de implantação. |
| 17 | Indique e Ganhe | Configuração definida; critérios/recompensas pendentes. |
| 18 | Dependentes/família | Escopo definido; representação, permissões e condições pendentes. |
| 19 | Financeiro/plano ativo | Um plano ativo definido; inadimplência, upgrade e cobrança dependem de decisões. |
| 20 | Planos e Produtos clínica | Configuração definida; depende do catálogo e regras comerciais. |
| 21 | CRM/IA de vendas | Funis definidos; integrações e comportamento de IA pendentes. |
| 22 | Integrações por clínica | Escopo definido; fornecedores, credenciais e contratos pendentes. |
| 23 | Vendas/comissões | Hierarquia e alcance definidos; cálculo/estados exigem regras aprovadas. |
| 24 | Aceite conteúdo/comercial | Futuro: verificar permissões, atribuições e operação real. |
| 25 | Pulseira | Gestão definida; firmware, autorização, estoque e telemetria dependentes. |
| 26 | Aceite pulseira | Exige dispositivo e ciclo operacional reais. |
| 27 | Bioimpedância | Escopo parcialmente definido; modelo, compartilhamento, integração e cobrança pendentes. |
| 28 | Aceite bioimpedância | Exige balança, identificação e integração reais. |
| 29 | Inovações Super ADM | Simulador, central operacional, implantação guiada e laboratório IA aprovados; premissas/detalhes pendentes. |
| 30 | Inovações clínica/equipe | Jornadas, fila, resumo de consulta e retenção aprovados; dependem de dados e permissões. |
| 31 | Inovações paciente | Meu dia, preparação, linha do tempo, metas e privacidade aprovados; dependem de dados e regras. |
| 32 | Protocolos | Composição/aptidão/encaminhamento definidos em escopo; estados, validação clínica, cobrança e relação com plano ativo pendentes. |
| 33 | Aceite inovações | Critérios propostos; 13 inovações incluídas, sem cumprimento presumido. |
| 34 | Prioridades/pendências | Sequência sugerida, não cronograma; decisões detalhadas permanecem abertas. |

## Etapas por dependência

1. Base existente: verificar compilação, tipos, lint, testes e interface; separar evidência executada de lacunas. Realizada com ressalva do seletor nativo de cores.
2. Continuidade e requisitos: cópia fiel do PRD, controle de ida e volta do executor, matriz e registros de retomada. Concluída nesta sessão.
3. Fundação de produção: escolher infraestrutura, definir contratos de identidade/vínculos, autorização no servidor, persistência e proteção dos dados. Adiada pelo usuário.
4. Dados clínicos e demais módulos: implementar somente após fundação e decisões específicas, usando critérios das seções 7, 11, 14, 24, 26, 28, 32.6 e 33. Não iniciada.
5. Serviços/dispositivos/comercial: depende de fornecedores, protocolos e regras aprovadas. Não iniciada.

Não há decisão automática sobre custos, fornecedores, regras clínicas ou comerciais. Próxima ação local possível: finalizar verificação manual do seletor nativo de cores; próxima etapa estrutural depende da decisão de infraestrutura adiada.

## Infraestrutura informada pelo usuário — 08/10/2026

O usuário informou que o projeto usa Lovable Cloud, conectado ao projeto via GitHub. Isso substitui a pendência de escolher um provedor. A configuração efetiva do ambiente, banco, autenticação, permissões e sincronização ainda não foi verificada pelo coordenador. Não presumir que a conexão com GitHub comprova serviços ativos ou isolamento de dados.

Próxima etapa: verificar a configuração existente do Lovable Cloud e o vínculo com este repositório antes de propor implementação de persistência/autenticação. Esta informação não autoriza commit, push, publicação ou alterações de produção; manter as restrições vigentes.
