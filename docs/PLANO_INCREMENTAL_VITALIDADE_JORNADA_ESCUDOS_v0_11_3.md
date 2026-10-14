# Análise e plano incremental — VITALIDADE, JORNADA e ESCUDOS v0.11.3

12/10/2026 · Codex · **Somente documentação e inspeção de arquivos em leitura.** Repositório local: techmedicina/techmedicina, main, origin neoligdev/techmedicina. Código observado: f7a0acd (C048). Nenhum código, migração, banco, infraestrutura, DNS ou deploy alterado por esta revisão. Não foi gerado Prompt Zero. Implementação futura exige autorização expressa.

## Decisão vigente e preservação

A seção 11 do adendo substitui logicamente as seções 4 e 10 do próprio adendo nos conflitos. Não substitui Segurança, Integração e Critérios de aceite das seções 4/10/11 do PRD principal. A seção 10 do adendo foi incorporada como histórico; a seção 11 integral como decisão vigente, ambas abaixo de 8.10. Fonte integral e cópia do PRD anterior preservadas em docs/referencias. Mantidos 34 capítulos e 67 subitens, multi-tenant com UUID imutável, URLs White Label, módulo médico, PWA, contratos, componentes e design existentes.

- **DEFINIDO:** nomes VITALIDADE/JORNADA/ESCUDOS; cinco Escudos Origem, Ritmo, Avanço, Equilíbrio, Plenitude; conceitos separados; equidade sem bônus por hardware; metas pertinentes/prescritas; pausa não punitiva; histórico preservado após regressão; artes e regras centrais; clínica não substitui arte oficial ou critério; IA não credita pontos nem altera prescrição autonomamente.
- **RECOMENDADO para homologação:** normalização diária por pesos elegíveis, tratamento de cumprimento parcial, janela de sete dias avaliáveis, estabilidade/limiares e configuração de regressão após três avaliações válidas. A seção 11.8 exige testar essa configuração; isso não torna definitivos os parâmetros que 11.9 mantém recomendados. Guardar como versão candidata até aprovação de operação, mínimo de histórico, pausas e desempate.
- **PENDENTE:** metodologia/validade/fórmula VITALIDADE, população e finalidade, pesos e instrumentos/licenças, classificação regulatória por especialistas, parâmetros finais JORNADA, proteção médica/técnica detalhada, fontes reais homologadas e retenção. Hipótese 30/20/20/20/10, pesos de missões e cortes 0–29/30–54/55–74/75–89/90–100 não são configuração publicada.

## Conflitos e divergências documentados

| Registro anterior | Decisão vigente / efeito futuro |
|---|---|
| Índice VIVA provisório, confundido em §4 com engajamento | VITALIDADE substitui o nome; índice clínico/bem-estar separado, sem número real até validação |
| Jornada dos Horizontes e nomes de níveis pendentes em §10 | JORNADA; cinco nomes de Escudos definidos; artes, limiares finais e método continuam com seus respectivos gates |
| Sincronização como evento candidato para pontos em §10 | §11 proíbe bônus por hardware ou simples sincronização; evidência só confirma meta elegível, sem dupla contagem |
| Progressão temática/cumulativa anterior | Pontuação diária e Escudo recente, com regressão controlada e conquistas históricas preservadas |
| Marca do score livremente parametrizada pela clínica em §4 | Clínica aplica tema/identidade; não muda lógica, critérios ou arte oficial de Escudos. Renomeações não são presumidas |
| §34 ainda dizia nome do score pendente | Texto antigo preservado com aviso histórico; nomes definidos em §11, metodologia e parâmetros continuam pendentes |
| Adendo indica documento-base v0.10 | Incorporação sobre v0.11.1 vigente; sem retrocesso, perda de White Label ou contratos |
| README/roadmap têm registros históricos de demo/C023 e pendências antigas | Não são evidência de implementação da v0.11.3; este inventário registra situação atual. Histórico não foi apagado |
| Catálogo /staus e banner atuais referem-se à matriz anterior | Não alterados por serem código/JSON da aplicação. Atualização de requisitos e nomenclatura depende de autorização; este plano é o registro documental corrente |

## Inventário factual e mapa dos requisitos

Existente significa base reutilizável demonstrada em arquivos; parcial não equivale a operação clínica homologada. As entregas passadas têm testes/evidências próprios, não reexecutados nesta revisão documental.

| Requisito / seção do adendo | Estado | Evidência local e limite |
|---|---|---|
| Identidade, vínculo e isolamento | Existente parcial | src/lib/auth/core.ts, persisted-identity.ts, supabase-adapter.server.ts; SQL 001–007. Auth/administrativo reais e RLS, mas vínculos médicos/pacientes e gamificação ponta a ponta não homologados |
| URLs White Label e separação por origem (§9, §11.7) | Parcial | host-resolver.ts, host-auth-context.server.ts; reservas/auditoria; sugestões de hosts. Resolvedor ainda não acoplado ao SSR/APIs; DNS/TLS/posse não ativados |
| Tema por clínica e design atual | Existente parcial | personalization-page.tsx, demo/theme.ts, tm_clinic_branding. Salvar/recarregar marca QA homologado; identidade de PWA produtiva por host ainda falta |
| PWA e tela inicial | Existente parcial | public/manifest.webmanifest, app-sw.js, patient-home.tsx, patient-bottom-nav.tsx. Manifesto global /app e modo demo, sem instalações distintas por tenant homologadas |
| Fontes manuais (§11.2) | Parcial demo | patient-home.tsx: humor/sono/água em armazenamento demonstrativo por ID de clínica. Não são eventos por patient_id nem trilha auditada; notas temporárias não constituem prontuário persistido |
| Fontes automáticas (§11.2) | Ausente real | demo/health-data.ts e health-dashboard.tsx compartilham dados estáticos médico/paciente. Nenhuma homologação H59MAX/HRV/BLE/balança/anel comprovada |
| Cadastro de metas elegíveis e prescrição (§11.4) | Ausente produtivo | Meta de água 2500 ml fixa na demo; menus/metadados de protocolos/adesão não são cadastro de metas personalizadas ou prescrição verificada |
| JORNADA diária/motor/ledger (§11.4) | Ausente | Score 785 e parcelas 150/180/200/255 são literais em patient-home.tsx; não há normalização diária, versões, eventos idempotentes ou cálculo de elegibilidade |
| VITALIDADE/cobertura/método (§11.1–3) | Ausente; definição pendente | Não localizado módulo de cálculo/metodologia validada. Nenhum valor real pode ser derivado da pontuação demonstrativa |
| Média/promoção/regressão (§11.5) | Ausente | Não localizado motor de Escudos, janela de dias avaliáveis, estabilidade ou regressão auditada |
| Histórico Meus Escudos (§11.5/7) | Ausente | Não localizada tela, ledger de conquistas ou snapshots de VITALIDADE |
| Biblioteca central de artes (§11.1/7) | Ausente | Existem logos/texturas e upload raster para marca, não catálogo oficial de Escudos, publicação/versionamento/rollback ou sanitizador de SVG |
| Cuidado adaptado/pausa (§11.6) | Ausente produtivo | Interações demo não implementam revisão clínica de metas, aprovação profissional ou estado protegido |
| Painel médico autorizado (§11.7) | Parcial demo | Gráficos/tabelas reutilizáveis; sem metas/adesão/escudos reais e consulta clínica ponta a ponta autorizada |
| IA e WhatsApp (§10.3/§11.4/7) | Ausente produtivo | Não há motor determinístico de missões, provedor oficial/opt-in/ingestão idempotente/memória de saúde homologados |
| Contratos/entitlements e equidade (§11.2) | Parcial demo | Catálogos/rascunhos de planos; sem assinatura/entitlement produtivo completo. Não usar estado financeiro demo como concessão clínica ou denominador livre |
| Segurança, auditoria e criptografia | Parcial reutilizável | Guardas/DTOs/RLS e auditoria administrativas; clinical-crypto.server.ts é unidade com KeyProvider injetado, sem keystore/persistência clínica produtiva |

### Divergências do código que exigem correção após autorização

1. Cartão/modal “Meu score” exibem 785 pontos e componentes fixos, sem escala diária 0–100, período, método ou origem. Não representam JORNADA nem VITALIDADE.
2. O modal atribui parcela a “Sinais e bioimpedância / Aferições e sincronização ativa”; a nova regra não permite bônus automático por dispositivo/sincronização.
3. A parcela “Adesão medicamentosa” é demonstrativa, sem prova de prescrição/metas elegíveis. Não reutilizar como confirmação clínica.
4. Humor/sono/água persistem por clínica demonstrativa, sem ID de paciente, data clínica, versão de regra, consentimento ou evento único; precisam de fluxo servidor e segregação antes de alimentar pontuação real.
5. O recurso “jornadas” no catálogo clínico refere-se a implantação/relacionamento/protocolos; não renomear ou substituir esse mecanismo pelo jogo JORNADA. Reutilizar metas/eventos quando apropriado, mantendo conceitos distintos.

## Plano incremental proposto — sem execução autorizada

| Etapa | Entrega futura | Dependências / gate | Testes e prova de aceite |
|---|---|---|---|
| VJE-0 | Esta incorporação, mapa e decisões | Concluída documentalmente; fonte/estado anterior preservados | Preservação de linhas anteriores, capítulos/subitens e conteúdo integral §§10–11 |
| VJE-1 | Contratos de dados, RBAC e elegibilidade; desenho único de eventos/metas integrado a Protocolos | Autorização de código; definir finalidades, profissionais/contas QA e política de acesso. Preservar RLS/host/UUID | Negação por padrão, paciente próprio, médico autorizado, cross-tenant, sem acesso clínico pelo Super ADM |
| VJE-2 | Registro persistido de metas aplicáveis, frequência, origem, consentimento e eventos idempotentes | Prescrição/protocolo verificáveis e fonte manual mínima; revisão de migração aditiva antes do Cloud | Replicação/reenvio/conflito sem duplicar, descanso semanal, medicação ausente excluída, metas não editáveis livremente pelo paciente |
| VJE-3 | Motor determinístico JORNADA como versão candidata, diariamente reproduzível | Aprovar pesos, parcialidade, fuso/períodos, tolerância, mínima evidência e zero metas elegíveis | Sem denominador: dia não avaliável; plano sem hardware atinge 100; duplicatas/manual+automático não somam duas vezes; reconciliação tardia auditada |
| VJE-4 | Biblioteca oficial de Escudos, upload seguro, aprovação/publicação/versionamento/rollback | Artes/limites/política aprovados, armazenamento e permissões centrais; raster inicial proposto, SVG só com sanitização aprovada | Tipo real, tamanho/decode, rejeição de conteúdo ativo/SVG inseguro, publicação exclusiva, preservação de versão antiga, clínica sem poder editar arte/lógica |
| VJE-5 | Escudo ativo, janela candidata, regressão e ledger histórico | VJE-3/4; aprovar janela, três avaliações, histórico mínimo, estabilidade, pausas e desempates antes de publicar regras | Dias ausentes não viram zero; uma avaliação ruim não regride; três válidas conforme versão; conquista/reconquista idempotentes e histórico preservado |
| VJE-6 | PWA: cartões separados, missões e Meus Escudos, sem alterar design recente | VJE-1–5; contexto White Label confiável e papel próprio; tema/manifesto por origem para homologação produtiva | Datas UTC/fuso local, navegação/rodapé fixo, claro/escuro/mobile, snapshot ausente explícito, não mostrar nota VITALIDADE sem método aprovado |
| VJE-7 | Revisão de metas, estado protegido e painel médico de adesão/contexto | Política clínica/retencional aprovada, profissionais autorizados, prontuário definitivo preservado | Pausa médica/técnica não causa regressão automática; médico revisa, paciente entende/contesta; IA não muda prescrição ou limiar ocultamente |
| VJE-8 | Adaptadores de IA/WhatsApp/dispositivos e dados reais pertinentes | Provedores/opt-in/protocolos/dispositivos homologados; custos e integração aprovados separadamente | Fontes/qualidade/unidades, sem HRV presumida, eventos cross-canal idempotentes, horários e privacidade; falha de rede não vira falta automática |
| VJE-9 | VITALIDADE metodológica e validação específica antes de número real | Estudo/validação clínica e regulatória, licenças e finalidade/população; pesos candidatos não publicados | Confiabilidade, missingness, validade/equidade/explicabilidade por perfil, cobertura, método versionado; desativação segura sem dado mínimo |
| VJE-10 | Piloto A/B, instalação e regressão completa | Gates de White Label/hosts QA aprovados, contas e concessões específicas, métricas de piloto | Todos os nove aceites §11.8; autenticação, médico, telemedicina, prontuário, contratos/pagamentos e PWA preservados; rollback ensaiado |

VJE-4 pode avançar com artes/metadados sem esperar o índice clínico; VJE-6 pode mostrar VITALIDADE indisponível enquanto VJE-9 está pendente. Não acelerar implantação ao transformar ausência de método em número demo com aparência real. Reutilizar AppShell, PatientHome, navegação, tokens, painel de gráficos, Auth e transporte request-bound; manter rotas atuais e acrescentar conteúdo sem reconstrução. Migrações, contas, concessões, Storage, DNS e publicação têm revisão/autorização próprias no momento aplicável.

## Modelo mínimo proposto — nenhuma tabela criada

Nomes são candidatos; confirmar o modelo após inventariar serviços existentes na etapa autorizada.

| Estrutura candidata | Finalidade e invariantes |
|---|---|
| Templates de metas / metas do paciente | Templates centrais e metas individualizadas, vínculo composto clínica/paciente, prescrição/protocolo referenciado, elegibilidade/frequência/versionamento aprovados |
| Eventos de participação | ID estável da origem e chave idempotente por tenant/paciente; evidência e consentimento referenciados, sem replicar texto clínico no ledger |
| Versões de regras JORNADA / resultados diários | Versão imutável, pesos elegíveis/estado avaliável, limites, proveniência e trilha de correção; configuração publicada somente por autorização central |
| Catálogo e versões de artes Escudos | Metadados centrais, hash/MIME/tamanho, armazenamento seguro e versões de publicação; distinguir arte pública aprovada de mídia em revisão |
| Eventos de Escudos | Conquista/promoção/regressão/reaquisição/correção append-only, UTC, regra/arte/versionamento, valor JORNADA e referência opcional a snapshot VITALIDADE |
| Métodos/resultados VITALIDADE futuros | Versão metodológica aprovada, cobertura/confiança/limitações, fonte autorizada; dados clínicos com controles próprios, sem expô-los ao administrador de artes |
| Preferências/estados protegidos | Gamificação pausada, comunicação/canal/horário, motivo mínimo e acesso apropriado; regras de retenção/correção previamente definidas |

Antes de criar estruturas, reconciliar com Protocolos/metas/consentimento/ingestão e evitar duplicidade. Estender permissões de modo explícito: os recursos atuais em core.ts não incluem biblioteca de Escudos ou pontuação. Não usar um grant genérico de cadastro da clínica para publicar regras globais ou ler dados do paciente. Preservar tm_clinics/tm_patients e seus UUIDs; guardar versões e referências, não copiar prontuário para um novo backend de jogo.

## Riscos e mitigação

| Risco | Mitigação / dependência |
|---|---|
| Score clínico fictício, pesos de pesquisa tratados como regra final | VITALIDADE sem número até validação; versões candidatas separadas das publicadas |
| Desvantagem por plano/hardware ou deficiência/doença | Denominador só de metas aplicáveis; alternativas acessíveis; ensaios de equidade e revisão profissional |
| Dupla contagem / replay entre manual, WhatsApp e dispositivo | ID de evento, domínio de evidência e unicidade transacional; testes de concorrência e reconciliação |
| Regressão injusta por pausa/dado ausente/horário | Dias avaliáveis explícitos, fuso e tolerância; estado protegido; não completar lacunas com zero |
| IA alterando metas clínicas ou prescrição sem autoridade | Escopo determinístico/role no servidor; propostas separadas de aprovação; auditoria de revisão |
| SVG/upload ativo ou arte substituída retroativamente | Sanitização/decodificação/limites, Storage e publicação seguros; referência histórica a versão imutável |
| Vazamento entre tenants / cargo global lendo saúde | RLS e guardas por paciente/host; separar catálogo global de arte de resultados clínicos; testes negativos |
| Confusão com jornadas de Protocolos/contratos | Conceitos e serviços integrados com campos explícitos; não renomear planos ou alterar assinatura adquirida |
| Privacidade versus histórico permanente | História não apagada por regressão; retenção/direitos/correções definidos com responsáveis antes da operação |
| DNS/Host/CORS e instalação PWA ainda incompletos | Manter plano White Label e gates de posse/TLS/ingresso; nenhuma mudança externa por esta revisão |

## Casos de teste mínimos e rastreabilidade §11.8

1. Aceite 1: paciente só com app/autorrelato chega a JORNADA 100 por metas elegíveis; VITALIDADE parcial/insuficiente sem nota inventada.
2. Aceite 2: mesmo comportamento manual e automático não soma duas vezes; posse/sync de hardware não concede bônus; campo HRV indisponível no dispositivo não fabricado.
3. Aceite 3: sem prescrição não há missão medicamentosa no denominador; frequência semanal e dias de descanso respeitados; não incentivar aferição excessiva.
4. Aceite 4: valores/labels/finalidades separados; metodologia não aprovada bloqueia score VITALIDADE real em API/UI/snapshot.
5. Aceite 5: janela de sete dias avaliáveis e três avaliações válidas testadas na versão candidata, incluindo insuficiência/pausas; limites e estabilidade precisam de aprovação final.
6. Aceite 6: promoção→regressão→reaquisição mantém conquistas antigas, UTC e fuso local, regras/arte antigas; snapshot VITALIDADE ausente explícito.
7. Aceite 7: publicação/rollback só pelo papel central aprovado, upload inseguro recusado; clínica não altera parâmetros/arte e Super ADM não passa a ler histórico clínico.
8. Aceite 8: doença/tratamento geram revisão contextual auditada, não mudança oculta de limiar; aprovação profissional em mudanças clínicas e explicação ao paciente.
9. Aceite 9: tokens/IDs/hosts manipulados, múltiplos vínculos, clínicas A/B, papéis médico/paciente/ADM; preservação de auth, prontuário, telemedicina, contratos/pagamentos e PWA. Testar implementados e registrar os fluxos produtivos ainda ausentes, sem declarar sua regressão comprovada.
10. Rede/concorrência: retries, eventos fora de ordem, timezone/DST, cancelamento, troca de sessão/clínica, regras publicadas simultaneamente, operação idempotente e erro sem falsa confirmação.
11. Acessibilidade/design: foco, leitor de tela, contraste, ícones com texto, preferência de pausa, mobile/tablet/desktop, textura e rodapé fixo existentes.

## Rollback e decisões antes da implementação

Entregar uma etapa pequena por vez em branch/commit normal, com testes e catálogo de status atualizados quando autorizados. Desativar publicação de versão candidata por feature gate controlado; manter artes/regras históricas e eventos de correção, sem reescrever conquistas. Migração aditiva exige plano de reversão que não apague dados; erro metodológico desativa cálculo/nota e preserva referência auditável. Não reverter commits publicados por force/amend, não excluir prontuário definitivo e não duplicar banco por clínica.

Decisões prioritárias: autorizar primeira etapa de código; pesos/parcialidade/janela mínima/tolerância/fusos e política protegida; artes/formatos/tamanho/Storage; papéis e contas QA com concessões específicas; prescrição/protocolos e consentimentos; metodologia/validação VITALIDADE; hardware/API/canais e condições comerciais já pendentes. Nomes dos cinco Escudos não voltam a ser tratados como pendentes. Pesos e limiares permanecem candidatos, mesmo quando constam de um caso de teste do adendo.

**Limite de execução vigente:** documentação entregue localmente; fonte do sistema, banco, DNS e infraestrutura preservados. /staus não alterado e nenhuma publicação/commit/push nesta etapa. C048 já havia sido enviada antes desta solicitação; sua homologação de auditoria no preview ficou pendente quando o usuário direcionou a etapa documental.

## Atualização posterior: VJE-1 local autorizada e concluída

12/10/2026: o proprietário autorizou somente contratos locais, permissões e testes de isolamento. Implementação Codex documentada em [RELATORIO_VJE1_LOCAL.md](RELATORIO_VJE1_LOCAL.md), com 397 testes de regressão e tipos/lint/build aprovados. Esta autorização posterior substitui o limite documental apenas para VJE-1; não libera VJE-2, Cloud, DNS, infraestrutura, commit/push/deploy ou VITALIDADE numérica. Estado e catálogo atualizados apenas localmente.

## Continuidade local posterior (12–13/10/2026)

As solicitações humanas posteriores de continuidade foram atendidas com a fundação parcial VJE-2, preferências auditadas e ligação local UI/HTTP/RPC/SQL. Relatórios RELATORIO_VJE2_PERSISTENCIA_LOCAL.md, RELATORIO_VJE2_PREFERENCIAS_LOCAL.md e RELATORIO_VJE2_INTERFACE_LOCAL.md registram limites e evidências. Migrações 008/009 somente em banco isolado; sem Cloud, DNS, infraestrutura, commit/push/deploy ou VITALIDADE numérica. Registros anteriores de autorização permanecem históricos. Próximo ponto: metas configuradas e revisadas por profissional com origem/consentimento verificáveis; ativação real depende dos gates de host, backend e QA. Regressão atual: 451 testes/51 arquivos, tipos/lint/build aprovados. Não representa conclusão de VJE-2 produtiva nem do PRD.

## Continuidade local: metas médicas e composição de acesso

Codex concluiu localmente a suspensão versionada/auditada (010), consulta médica mínima vinculada à clínica (011), cartão conectado com confirmação/recarga e consulta sem ação de suspensão por padrão. Composição de host/sessão para PWA e médico e adaptador RPC permanecem desmontados do runtime. Relatórios de suspensão e host/sessão registram testes direcionados, tipos e lint. Build posterior aprovado em vje2_build_atual.txt; regressão completa posterior ainda em execução, resultado não comprovado. As migrações 008–011 não foram aplicadas no Cloud.

Próxima etapa funcional: criação/revisão de metas por profissional, referenciando origem clínica e consentimento verificáveis. Não usar metas fictícias como autorização ou referências inventadas; medicação/protocolo permanecem bloqueados sem fluxo próprio validado. Posse/TLS e fonte persistida de hosts ativos, transporte Auth request-bound e QA com vínculos reais continuam gates para operação. Não há liberação de Cloud, DNS, commit/push/deploy ou cálculo VITALIDADE. Esta seção atualiza o estado de continuidade sem reescrever as autorizações históricas acima.

Revisão de continuidade do catálogo: resumos 8.10/34 e próximos passos D49–D52 reconciliados com D55/D56, preservando autorias e resultados históricos no texto Feito. Regressão 516/62 é anterior a 012; 32/7 e sequência completa SQL são posteriores e separados. Autorização para migrações Cloud está pendente; não inferir aprovação a partir de uma continuação automática.
