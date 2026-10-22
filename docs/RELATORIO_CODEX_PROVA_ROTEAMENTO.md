# Prova assinada de roteamento White Label — proposta de entrega após D118

22/10/2026 · executor Codex · dev/codex-backend · base aa61b4e.

## Retomada e responsabilidade

Retomada autorizada pelo proprietário no chat de coordenação: Codex no backend,
Antigravity no frontend. O trabalho pendente em domain-routing-proof.server.ts,
seu teste e a exportação do schema de recibo DNS foram preservados e revisados.
Não houve alteração da worktree Antigravity, integração em develop ou mudança de main.
O identificador oficial da entrega será atribuído durante integração coordenada,
pois catálogo, catalog.ts e Markdown de status são arquivos compartilhados.

## Requisito e escopo entregue

PRD seção 2 e adendo de URLs White Label, seção 9: não confundir resposta HTTPS
com prova de que o hostname pertence ao projeto e à clínica corretos.

O módulo server-only emite desafios aleatórios vinculados a domínio, clínica,
ambiente, revisão, projeto, chave, prova DNS e prazo. A validade não ultrapassa a
prova DNS vigente. A assinatura Ed25519 inclui esses campos, identificador,
nonce, datas e instante da resposta em uma representação canônica versionada.

O assinador recebe host e projeto de configuração confiável do ingresso; não deve
ser conectado a um Host/Forwarded/JSON enviado pelo cliente sem validação.
A chave privada é somente do ingresso. O verificador usa chave pública ativa,
compatível com projeto/identificador, algoritmo e janela de validade do desafio.
Não existe chave padrão, keystore configurado, rota pública ou ativação automática.
As chaves dos testes são efêmeras e geradas em memória.

A composição com a sonda D118 mantém IP público fixado, HTTPS e limites de corpo.
O escopo e a autorização são verificados antes da rede; a chave é consultada após
a observação para recusar revogação durante a consulta. A prova é revalidada com o
relógio após a rede. Erros do provedor de chave não expõem diagnóstico interno.
O resultado é candidato a recibo, sem nonce, chave ou assinatura bruta.

## Correções na retomada

- KeyObject passou de importação apenas de tipo para importação de valor,
  necessária para validar a instância em tempo de execução.
- O teste de adulteração de clinicId usava o mesmo valor original. Agora realmente
  troca a clínica e verifica explicitamente que o campo adulterado é diferente.
- Acrescentados testes de mudança da reserva antes da rede, recusa de usuário não
  administrativo, falha de lookup e chave ausente/incompatível.

## Evidências locais

- 31 testes direcionados de prova assinada e recibo DNS aprovados.
- TypeScript sem emissão e lint dos três arquivos de backend/testes aprovados.
- Build local aprovado. Aviso existente de vite-tsconfig-paths não foi corrigido
  por estar fora do escopo. Build não representa implantação nem teste de domínio.
- Resultado da regressão completa registrado abaixo após sua conclusão.

## Limites e próximo incremento

Prova de assinatura não ativa domínio nem concede autorização clínica. Falta
persistir o desafio de roteamento e consumir o candidato em uma transação que
reconfira domínio/revisão, prova DNS vigente, desafio atual, validade e revogação.
A transação deve impedir replay e auditar o resultado. Não passar diretamente o
candidato retornado ao frontend como um status verificado/ativo.

O ingresso real deve receber apenas desafios persistidos atuais; o verificador
não cria nem publica um endpoint por conta própria. Antes de conexão real,
homologar suporte do runtime a node:crypto, transporte TLS e egress autorizado.
SQL 014–019 continua sujeito a seus gates próprios; nenhum SQL foi aplicado.
DNS, certificados reais, permissões clínicas, agenda operacional, produção,
Ask Lovable e Publish não foram utilizados nesta retomada.

PRD e adendos foram mantidos intactos. Arquivos de status compartilhados aguardam
integração coordenada. Nenhuma conclusão de requisito operacional é reivindicada.

## Resultado consolidado da retomada

Regressão completa: 1.008 testes aprovados em 117 arquivos, em 472,97 segundos.
São 27 casos novos em relação à referência D118 (981 testes/116 arquivos).
TypeScript, lint direcionado e build local aprovados. Os 31 testes direcionados
incluem quatro testes existentes do recibo DNS e 27 da prova assinada.
Não houve nova homologação em navegador, domínio real, rede externa ou Cloud.
O build regravou o arquivo de rotas geradas sem diferença de conteúdo; essa
igualdade foi conferida contra HEAD. O indicador de Git pode refletir finais de
linha/metadados locais; não incluir esse arquivo na entrega sem revisar.
Alterações permanecem locais e não comitadas na branch de backend, sem push.
Próximo incremento: desenho e implementação local da persistência transacional
do desafio e recibo de roteamento, após reservar o número da proposta SQL e
conferir as alterações mais recentes de develop; aplicação Cloud separada.
