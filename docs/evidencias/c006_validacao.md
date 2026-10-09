# Resumo de verificação C006 — 09/10/2026

Registro resumido dos comandos realmente executados pelo Codex na raiz Git local. Não é um log bruto.

| Comando | Saída final | Resultado |
| --- | --- | --- |
| TypeScript `--noEmit` | 0 | Tipos válidos |
| `npm run lint` | 0 | 0 erros / 7 avisos Fast Refresh |
| `npm run test` | 0 | 64 testes / 10 arquivos |
| `npm run build` | 0 | Cliente e servidor compilados |

Ocorrências corrigidas: lint inicial no script auxiliar clean.cjs e formatação do módulo de planos; teste do worker inicialmente usava import.meta.url transformado pelo Vite, corrigido para caminho resolvido a partir da raiz. Reexecução completa final passou.

QA: cliente claro/escuro, médico com mesmas métricas, clínicas A/B com identidades próprias, Super ADM PlugPix, 390×844 e 1440×1000 sem overflow horizontal, 6 gráficos renderizados, filtro quatro/oito medições e tabela com valores correspondentes. Preferência original clara da clínica A restaurada.

Capturas locais fora do repositório: c006-cliente-mobile.jpg, c006-cliente-desktop.jpg e c006-cliente-completo.jpg no diretório de visualizações do Codex. Sem dados pessoais reais.
