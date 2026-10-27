# D125 — Parte 4: leitura própria de metas

Executor: Codex. Escopo local, preservando o frontend existente.

- GET `/api/journey/own-goals` deriva clínica e paciente do host e sessão verificados, reutilizando o bearer da requisição.
- Cliente e DTO estritos limitam a página a 100 metas; cursor UUID crescente pertence ao paciente e à clínica. Identificadores de paciente/clínica não são aceitos na query.
- Retorna somente ID, tipo, cadência, estado persistido, versão e vigência. Não retorna identidade do ator, política interna, prescrição ou diagnóstico.
- Metas pausadas, não aplicáveis, medicamentos e protocolos são snapshots de leitura: nenhuma autorização de autorrelato é inferida. A escrita mantém todas as verificações de participação e elegibilidade existentes.
- Revogação de grant, usuário anônimo, administrador sem vínculo e cursor de outro paciente são negados.

Validação: 61 testes direcionados em quatro arquivos, incluindo SQL real local (PGlite), runtime, clientes e endpoints. O cenário composto agora consulta contexto/metas, salva, reenvia sem duplicação e relê o histórico. TypeScript, lint direcionado e build verificados separadamente. Não corresponde a nova execução da suíte global histórica de 1.175 testes.

Próximo passo: ligar os formulários de hábitos e histórico a estas leituras sem cache clínico no navegador, mantendo consentimento, estados de falha e identidade por sessão. D125 e PRD permanecem parciais. Migração 028 não aplicada no Cloud; main/preview continuam na versão autorizada 1ec288b.
