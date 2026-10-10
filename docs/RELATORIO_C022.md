# C022 — Dependências e divergência do preview

Executor Codex. 10/10/2026.

## Alterações e evidência

O npm instalado apontava quatro alertas moderados na cadeia esbuild-kit/drizzle-kit/esbuild. O esbuild 0.18.20 foi substituído por override 0.28.2, mesma versão corrigida já usada pelo Vite local. O CLI drizzle-kit carregou e o transformador TypeScript de esbuild-kit passou, sem tocar banco ou migrações.

A auditoria do bun.lock rastreado encontrou adicionalmente 14 avisos associados a cinco famílias: brace-expansion, js-yaml, nanoid, shell-quote e source-map-js (severidades moderada/alta/crítica conforme registros). Foram atualizadas apenas essas famílias dentro das faixas existentes: brace-expansion 1.1.21/5.0.12, js-yaml 4.3.2, nanoid 3.3.20, shell-quote 1.12.0, source-map-js 1.2.2. Atualização ampla foi descartada antes do commit; dependencies/devDependencies declarados permanecem equivalentes ao HEAD anterior. Lockfile continua versão 1, sem exigir novo formato no preview.

Bun 1.4.3 executado pelo pacote oficial npm, sem instalação global. bun install --frozen-lockfile --ignore-scripts passou; bun audit --json retornou {} e exit 0. Testes executados sobre essa instalação exata: 234/234, 25 arquivos; TypeScript/build exit 0, lint exit 0 com sete avisos Fast Refresh existentes. Evidências c022_*.txt. Auditoria sem alertas conhecidos não prova ausência de vulnerabilidades nem conformidade do sistema.

O package-lock.json antigo, não rastreado e preexistente, foi preservado. npm audit sem --package-lock=false lê esse arquivo e não deve ser confundido com auditoria do lockfile oficial Bun.

Fontes primárias: https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99 (correção >=0.25.0); https://bun.sh/docs/pm/overrides (override suportado). Avisos transitivos exatos constam do registro antes da atualização.

## Pendência remota prioritária

No Lovable, os commits recentes até 921a02d aparecem Accepted, porém Build unsuccessful / Preview is out of date. Portanto push recebido não comprova preview atualizado. Foi enviado pedido somente leitura para obter logs, comando e versão do runtime. O controle Chrome ficou indisponível antes da leitura da resposta; connector list_messages retornou 404 project_not_found. Causa remota ainda não determinada. Não atribuir a falha a dependências sem evidência.

A aba de login local anterior não existe mais; não houve homologação com sessão real. Próximo passo: recuperar diagnóstico, corrigir causa específica, validar preview e login/JWT/gateway/cadastro/auditoria. Vínculos e demais requisitos do PRD continuam parciais. Sem publicação, novos serviços, permissões ou dados clínicos nesta etapa.
