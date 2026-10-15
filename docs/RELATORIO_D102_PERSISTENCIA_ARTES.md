# D102 — falhas de salvamento da biblioteca

Codex, 15/10/2026. Escopo local/demonstrativo no checkpoint.

Antes, persistCatalog atualizava memória e ignorava falhas de localStorage; os chamadores anunciavam sucesso e o modal fechava. Agora a gravação do navegador precisa terminar antes da troca do fallback em memória. Falha de quota ou de acesso retorna erro nas quatro operações (edição, publicação demonstrativa, rollback e reset). A leitura também captura erro no acesso à propriedade localStorage.

O callback de salvamento do modal informa sucesso ou falha. Na falha, SVG e prévia permanecem disponíveis e o usuário recebe uma mensagem para tentar novamente; a edição só é limpa e fechada quando salva com sucesso.

Validação: cinco testes novos de armazenamento cobrem as quatro operações sob quota excedida e acesso negado; um teste novo do modal verifica conservação da edição e nova tentativa. Quarenta testes de armazenamento/contratos/artes/rollback e três de modal/prévias passaram. TypeScript, lint dos arquivos alterados e quatro testes do status passaram.

Nenhuma versão foi publicada no Cloud, nenhuma migração foi aplicada e não há garantia de persistência remota. O perfil administrativo utilizado pela demonstração continua sem estabelecer autorização de servidor.

## D103 — identidade das versões

Versões agora são normalizadas antes de salvar e não podem reutilizar identificadores do histórico, inclusive após rollback. Componentes numéricos com zeros iniciais são recusados. Histórico legado com versões duplicadas permanece legível, mas rollback ambíguo é negado sem gravar. Não foi definida política comercial de incremento maior/menor. Cinco testes novos passaram; conjunto de versões/persistência/artes/rollback totalizou 39 testes aprovados. TypeScript e quatro testes de status aprovados.
