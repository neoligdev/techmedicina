# Contrato da clínica — etapa 2: editor administrativo

Executor Codex, 28/10/2026. PRD 13.1 continua parcial.

Tela /super-admin/planos mantém o catálogo, políticas e design anteriores, acrescentando um cartão de rascunhos de contrato. Sessão verificada, editor por usuário, remoção no logout e descarte de resultado inicial Auth antigo. Clínicas vêm do cadastro protegido do servidor, com paginação de 100; não usa o seletor demonstrativo para autorização. A RPC revalida cada operação.

O formulário mantém moeda BRL, valores em reais com até duas casas e conversão textual para centavos inteiros, sem multiplicar decimais monetários. Vazio permanece null; 0 é valor explícito, não inferido. Escolhas de mensalidade e vidas têm estado não definido. Não calcula total nem infere modalidade comercial. Dados contraditórios/incompletos podem permanecer em rascunho e não aprovam condições finais.

Enquanto há edição suja ou resposta incerta, não troca de clínica nem cria outro rascunho. Só confirma salvamento por resposta estrita de clínica, ID, revisão e conteúdo. Falha exige releitura; nenhuma repetição automática de PUT. Descarte local exige confirmação explícita e não apaga servidor/snapshots nem desfaz escrita que tenha chegado. Identificador fica disponível para reabrir até existir biblioteca. Nada é gravado no localStorage.

Testes de UI cobrem clínica real, branco versus zero, centavos, entradas inválidas preservadas, perda de recibo/releitura, descarte e sessão. Clientes verificam escopo do recibo, conflito, token fresco, cache, limites e paginação do cadastro. TypeScript, lint direcionado e build aprovados.

Próxima etapa imediata: biblioteca paginada de rascunhos por clínica e abertura por item. Dependência remota: 034 ainda proposta local. Nenhuma aprovação de cobrança, fatura, assinatura, benefícios, Cloud, main, Publish, DNS ou infraestrutura incluída.
