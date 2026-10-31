# Pendências operacionais — retomada 31/10/2026

Este registro complementa o plano mestre e o catálogo /staus; não altera o PRD nem transforma propostas em decisões aprovadas. Codex mantém execução direta e preserva o design e autorias históricas.

## Próximos incrementos locais

1. Cliente de prontuário com deadline, leitura por ID original e comparação de comando em resposta incerta. Não armazenar texto clínico em localStorage/IndexedDB/cache/outbox.
2. Workspace médico reutilizando os componentes visuais; distinguir edição em memória de evolução definitiva imutável. Não apresentar assinatura como concluída enquanto o fluxo não estiver definido.
3. Resolvedor request-bound de Auth/host/paciente e identidade profissional validada; operações devem usar mesma identidade e revalidar acesso. Não usar seletor demo ou CRM como senha.
4. Autorização corrente de inscrição/canal para lembretes e desenho da identidade do worker; fila/planejador local não autoriza envio.
5. Prosseguir nos demais itens do plano mestre quando independentes das escolhas abaixo; não inventar fornecedores, hardware, fórmula de VITALIDADE ou condições comerciais.

## Dependências externas e autorizações

- Main atualmente 6a4936b. Develop mais recente não atualiza automaticamente o preview conectado à main; cada candidata requer autorização específica conforme AGENTS.md. A proposta pendente anterior de 735c235 só abrange aquele commit, não incorpora etapas posteriores por inferência.
- SQL 041/042/044 foi autorizado e aplicado. 045–047 revisadas localmente e aguardam aprovação; 048–049 também são propostas locais, sem autorização/aplicação remota. Não misturar autorização de um lote com os demais.
- Cadeia White Label/043, DNS/TLS/ingresso e identidade do worker ainda não ativos; domínio informado é techmedicina.com.br no Registro.br. Não modificar DNS ou infraestrutura sem revisão/autorização própria.
- Contas Auth QA informadas existem historicamente; SQL Editor nesta retomada confirma zero pacientes/vínculos/grants. Aprovar contas, clínicas e permissões específicas antes de criar qualquer acesso clínico; não tratar existência de conta como autorização.
- Confirmação de identidade profissional/CRM/UF, cadastro confiável de autoria, KMS/rotação/backup/recuperação, auditoria operacional e fluxo de assinatura precisam de definição e homologação. Chaves efêmeras de teste não são infraestrutura de produção.
- Canal de notificação ainda não definido pelo proprietário; não registrar consentimento, solicitar permissão do navegador, cadastrar destinatário ou ligar provedor por suposição.
- Protocolos/API/SDK do dispositivo H59/H59MAX e da balança, modelos homologados e acesso físico/documentação não fornecidos. Dados demonstrativos não são telemetria real.
- Catálogos/quantidades comerciais, repasses, custos, regras pendentes de contratos/planos, meios de pagamento e fornecedores precisam de decisões rastreáveis antes de cobrança/benefícios reais.
- IA clínica, cálculos VITALIDADE e regras clínicas dependem de validação formal, parâmetros e fonte de dados; não criar fórmula ou orientação clínica automática para marcar requisito concluído.

## Evidência desta retomada

Prontuário core 048 e histórico 049 possuem testes locais com texto fictício, AES-GCM e PostgreSQL embarcado. A fronteira HTTP é factory sem rota/instância de produção. Testes não comprovam operação real, assinatura, integração de hardware ou homologação com pacientes. SQL Editor foi acessado somente para leitura de ACL/RLS/contagens, com evidência JSON versionada em docs/evidencias/prontuario. Status /staus local foi conferido pela tela e atualizado por etapa.
