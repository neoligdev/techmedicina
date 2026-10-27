# Jornada — homologação autenticada proposta

Codex, 13/10/2026. Lote 008–012 aplicado e conferido no Cloud. Este plano não autoriza criar contas, ativar clínicas, inserir metas ou conceder acesso.

## Pré-requisitos e aprovação concreta

O proprietário informa contas QA de médico e pacientes; confirmar seus IDs e confirmação de e-mail no Auth. Senhas são definidas e usadas pelo proprietário, nunca registradas aqui. Preparar depois uma proposta com IDs reais, clínica/paciente, papel, grants mínimos e finalidade de cada mudança; obter aprovação específica antes de executar.

Preservar a clínica QA administrativa inativa já existente. Não ativá-la automaticamente. Testar isolamento com duas clínicas QA aprovadas, usando somente dados fictícios e contas identificadas como QA. Não converter o Super ADM em médico ou paciente, nem reutilizar sua permissão global para acessar saúde. A marcação médica de teste precisa de decisão explícita do proprietário e não representa verificação de credenciais profissionais para operação real.

Grants candidatos para revisão: paciente `journey_events/create`, `journey_events/read` e `journey_goals/read`, restritos à própria clínica/paciente; médico `journey_goals/read` e `journey_goals/write`. Leitura médica de eventos exige `journey_events/read` específico se esse caso for incluído. Nenhum grant de prontuário, agenda, faturamento ou administração está implícito.

## Matriz mínima de casos

| Caso | Ação | Evidência exigida |
|---|---|---|
| Sessão real | Auth getUser e identidade persistida com o mesmo bearer da chamada | Identidade/tenant conferidos sem registrar tokens; SQL Editor set_config não substitui JWT |
| Participação | Paciente habilita, recarrega e pausa com revisão | Estado confirmado, auditoria com ator correto, conflito 409 em revisão antiga |
| Autorrelato | Meta QA elegível e preferência habilitada | Recibo próprio e um evento; medicação/protocolo continuam bloqueados |
| Reenvio | Mesma chave/horário após resposta perdida | Mesmo ID, nenhum evento duplicado; chave conflitante recusada |
| Cross-tenant | Paciente tenta meta da outra clínica, inclusive conta com dois vínculos | Recusa antes da gravação, histórico sem mudança |
| Médico | Leitura e suspensão autorizadas; repetir com revisão antiga | Clínica explícita, versão e auditoria; conta sem grant ou sem verificação negada |
| Revogação | Participação pausada, paciente/clínica/vínculo inativo ou grant removido | RPC/RLS negam envio/leitura conforme contrato, sem apagar histórico |
| Separação de papéis | Super ADM, ADM da clínica e paciente tentam ação médica | Nenhum acesso por papel global ou seleção visual |

A criação da meta QA deve ter aprovação explícita e versão identificada como fixture de teste, sem publicar regra ou índice. Não usar ID fictício como referência clínica válida. Metas reais, consentimentos, prescrição e cadastro/revisão profissional permanecem requisitos separados.

## Gates que continuam fora da homologação de banco

Registro persistido de hosts ativos, prova de posse/TLS, ingresso/proxy revisado, sessão por origem e instalação PWA exigem homologação própria. Uma chamada com JWT real ao banco não comprova isolamento White Label no navegador. Endpoints Jornada estão desmontados; não ativá-los nem fazer commit/push/deploy sob autorização exclusiva das migrações.

## Registros e encerramento QA

Guardar somente resultados e IDs QA necessários, nunca senha/token/registro clínico real. Registrar configuração antes/depois e autoria. Revogar vínculos/grants temporários e inativar fixtures conforme plano aprovado; não apagar ledger ou auditorias por conveniência. O relatório final distingue catálogo/privilégios, testes locais, JWT/RLS real e testes de host/PWA.

## Consulta inicial de contas

Proprietário indicou contas QA; consulta somente leitura no Auth do projeto não encontrou os dois endereços exatamente informados. Domínio do endereço do paciente precisa de confirmação. Cadastro/confirmação e definição de senha solicitados ao proprietário diretamente na interface; nenhum usuário foi criado e nenhuma identificação alternativa presumida. Proposta de vínculos/grants depende de IDs Auth verificados. Não expor e-mails ou tokens no catálogo público.

## Atualização D125 — implementação local posterior

As partes 1–6 da D125 registraram rotas de contexto próprio, Escudos, metas, histórico, participação e disponibilidade de autorrelato, preservando os guards existentes. Portanto a nota histórica acima sobre endpoints desmontados não descreve mais o código local atual. Isso não significa ativação operacional: resolução White Label, migrações locais posteriores a 013, contas/vínculos/grants e homologação por origem ainda dependem dos gates próprios. A D125 não concedeu acessos nem executou SQL no Cloud. Provas SQL locais e testes de interface constam em docs/D125_PARTE_6_PARTICIPACAO_AUTORRELATO.md.
