# Revisão local da migração 022 — revogação de chave de roteamento

Proposta, não autorização remota. Depende de 020 e fundação 001; o conjunto de homologação também usa 017–021. Confirmar projeto, objetos/versões, grants e backup/recuperação antes de qualquer aplicação autorizada. Não reaplicar migrações históricas.

Adiciona três colunas ao registry privado e uma tabela de auditoria com RLS e sem grants comuns. RPC SECURITY DEFINER com search_path vazio e EXECUTE revogado de PUBLIC/anon/authenticated; chamada somente por conexão privada futura revisada. Mantém ator administrativo persistido, revisão esperada e atualização/auditoria atômicas. Não expõe ou gera material privado, não ativa domínios, não provisiona acesso clínico e não modifica DNS.

Revogar impede novas observações e torna recibos inválidos nos leitores existentes, mas não elimina o snapshot histórico. O banco não verifica assinatura por conta própria: a fronteira do worker verificador continua necessária. O provedor deve derivar o ator da sessão validada; não encaminhar actor de navegador. A RPC não oferece reativação. Banco owner permanece confiável e capaz de administração direta; não conceder DML de registry ao worker para contornar o contrato.

Homologação futura: duas chaves/projetos, ator autorizado e comum, revisão antiga, repetição, rollback de auditoria, recibo existente preservado e gravação em curso recusada. Testes locais não comprovam concorrência real. Preferir correções aditivas após uso; restauração ou exclusão de auditoria exige plano e autorização específicos. Nenhuma operação remota realizada nesta revisão.
