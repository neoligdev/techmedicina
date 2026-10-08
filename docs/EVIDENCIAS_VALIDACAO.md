# Evidências da validação local — 08/10/2026

- Repositório: https://github.com/neoligdev/techmedicina.git, branch main.
- Compilação: npm run build, aprovada na validação inicial.
- Rodada final: npm.cmd run test, 8 testes em 3 arquivos, exit 0; npx.cmd tsc --noEmit, exit 0; npm.cmd run lint, exit 0, 0 erros e 7 avisos de Fast Refresh.
- Sandbox local: primeira tentativa dos testes falhou por EPERM ao renomear cache Vite, sem executar testes. Repetição fora do sandbox passou. Não é falha do fluxo de personalização.
- Testes exercitam formulário/contexto reais: nome, ambas as cores, tema, salvar, A-B-A, remontagem com localStorage, restauração da clínica atual, falha de armazenamento sem falso sucesso e busca pela função filterClinics real. Um teste de formulário usa timeout local de 15 segundos devido à lentidão observada; asserções preservadas.
- Navegador: nome/tema, salvar/recarregar e alternância entre clínicas com preferências independentes; Super ADM mantém PlugPix. Verificação visual parcial em 375×667 e 1440×900.
- Pendente: confirmar alteração de cores pelo seletor nativo do navegador. Teste automatizado do formulário não substitui essa confirmação.
- Logs detalhados estão locais em docs/evidencias/*.log, ignorados pela regra existente *.log; este resumo é versionado. Log inicial de timeout foi sobrescrito pelo executor; histórico observado foi registrado, sem recuperação fictícia.
- Nenhum backend, autenticação real, integração ou novo módulo foi implementado. Separação visual no navegador não comprova isolamento de dados de produção.
- Cópia do PRD corresponde byte a byte ao original: SHA256 02C9182511E7BBC14EBB4A034B31A9A69937438AB0BD9D41FC25A5CBF941C035.
