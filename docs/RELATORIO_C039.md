# C039 — Painel administrativo de reservas

12/10/2026. Codex. Painel em conta autenticada, condicionado ao diretório administrativo e token verificado. Escolha de clínica e ambiente, hostname canônico, recarga e listagem pendente; nenhum link público ou alegação de domínio ativo. Abort/unmount e chave de sessão evitam resultados de sessão anterior. Falha de consulta impede reserva; corpo/retorno passam DTOs e checagem do tenant. Bloqueio de duplo envio por ref.

34 testes de painel/login aprovados, TypeScript/build aprovados; lint inicialmente apontou formatação do teste, corrigida por ESLint do projeto, sem relaxar regras. Design preservado por reutilizar controles/estilos atuais; CSS e assets sem alteração. Migração 006 ainda não aplicada: não alegar reserva remota homologada. Próximo: aplicar/conferir backend e testar sessão real no preview, sem Ask Lovable.
