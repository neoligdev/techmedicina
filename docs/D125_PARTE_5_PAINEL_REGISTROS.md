# D125 — Parte 5: painel autenticado de leitura

Executor: Codex. Implementação local em continuidade à consulta de metas (parte 4).

Painel de metas/autorrelatos montado em `/app/escudos` exclusivamente após contexto próprio e leitura de Escudos autorizados. Usa componentes Card/Button e tokens visuais existentes; não altera textura, identidade clínica, navegação ou artes anteriores. A demonstração não recebe este painel nem passa a consumir registros reais.

- Metas exibem tipo, estado persistido e cadência; medicamentos/protocolos mantêm orientação clínica, sem botão de autorrelato.
- Histórico mostra apenas registros confirmados e suas datas; nenhuma pontuação ou VITALIDADE é calculada.
- Paginação separada, carregamento, vazio, erro e retry sem armazenamento clínico em localStorage.
- Painel reiniciado ao mudar clínica/paciente; respostas de ciclos anteriores são ignoradas. O proprietário existente da sessão controla montagem/desmontagem no logout/troca de conta.

Verificação: conjunto consolidado de 27 testes de interface/autenticação em cinco arquivos; TypeScript, lint direcionado e build aprovados. Navegador local conferiu a galeria demonstrativa e a navegação após reload/hidratação; imagem em docs/evidencias/d125-records/demo-preservada.png. Esta imagem não homologa dados reais: a cadeia SQL, host e vínculos reais ainda precisam de aplicação/homologação autorizada. Não foi realizada nova regressão global de 1.175 testes.

Próximo passo: conectar os formulários de hábitos a autorização de participação e metas elegíveis, mantendo IDs estáveis para retry e histórico atualizado após confirmação. D125 permanece parcial. Nenhuma migração Cloud, grant, domínio, DNS ou Publish executado. Main/preview continuam na versão especificamente autorizada 1ec288b.
