# D121 — leitura privada de desafios e recibos de roteamento

22/10/2026 · implementação Codex · dev/codex-backend.

## Escopo

Proposta LOCAL 021 reservada após conferir branches backend, develop e frontend.
Não aplicada no Cloud. Depende da proposta 020 e suas dependências.
Novas funções privadas leem desafio atual e recibo histórico. Nenhum EXECUTE foi
concedido a PUBLIC/anon/authenticated. O ator deve ser um Super ADM persistido e
ativo, mesmo quando chamado por conexão privada. Não existe client privilegiado
padrão, endpoint, seed de chave, ativação de domínio ou concessão clínica.

O leitor de desafio cruza reserva, revisão, clínica, hostname, ambiente, prova
DNS consumida/vigente, digest da chave e janela de validade. Desafio consumido,
revogado ou obsoleto não é retornado. O verificador passou a usar o RPC real nos
testes em vez de consulta ad-hoc às tabelas.
O leitor de recibo retorna o snapshot histórico e sinaliza isCurrent/isValid.
Revogação da chave torna a evidência inválida; rotação, troca do digest, revisão ou
prova DNS invalidam a correspondência atual. Não repete DNS/HTTPS, não grava nova
auditoria e não consome novamente a prova. Snapshot histórico não é reescrito com
os dados atuais da clínica.

Adaptadores server-only validam formato/IDs/escopo, recusam identidades comuns
antes de consultar o transporte, sanitizam falhas e recalculam expiração na resposta.
São leitores privados de worker: não conectar diretamente ao browser. Leitura
histórica não é autorização para ativação nem garantia de validade após o retorno;
o consumidor deve reconferir o estado transacionalmente ao executar uma ação.

## Validação

65 testes direcionados em três arquivos aprovados: 27 de assinatura, 27 de
persistência/leitura SQL e 11 de contrato dos leitores. Destes, 20 são novos em
relação à etapa anterior. TypeScript completo e lint direcionado aprovados.
Dados e chaves sintéticos; PGlite em memória, sem servidor remoto ou rede real.
Esta etapa não repete a regressão geral histórica de 1.040/119 da integração D120;
resultados direcionados não são apresentados como nova execução de toda a suíte.

## Próximos passos e limites

Auditar administração/revogação das chaves e definir o provedor/identidade mínima
do worker; homologar ingresso e egress no runtime aprovado. Suspensão/ativação,
SSR, DNS e aplicação SQL permanecem dependências separadas e não autorizadas aqui.
PRD, adendos e UI do Antigravity preservados. Atualização da /staus somente na
integração local. Nenhum push, main, publicação ou aplicação de SQL no Cloud.
