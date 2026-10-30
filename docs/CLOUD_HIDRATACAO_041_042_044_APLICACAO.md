# Aplicação Cloud — hidratação 041, 042 e 044

Codex, 30/10/2026. Autorização humana explícita: “Autorizo main 6a4936b e SQL 041, 042 e 044”. A tentativa anterior de push foi recusada pela revisão automática por considerar “Continue” ambíguo; após essa recusa, nenhuma ação remota foi feita até a autorização explícita.

## Código e preview

Main avançou por fast-forward de 6efc989 para 6a4936b6ab6262a48b7f260770e4f3dc62d6ba7e e foi enviada ao origin. Preview Lovable /staus renderizou 164 entregas, data 30/10/2026, cobertura iniciada 29% e conclusão integral 0%. Não usado Publish nem Ask Lovable. Este relatório e ajuste de situação do catálogo são posteriores à candidata aprovada e seguem somente no desenvolvimento até nova integração autorizada.

## Pré-checagem e execução

SQL Editor do projeto 75200069-2ce5-40c9-a874-f12db50531be carregou. auth.uid, tm_patients e tm_memberships existentes; nenhum objeto hydration presente. Constraint de recursos existente continha cadastro_clinica, prontuario, paciente, agenda, faturamento, journey_goals e journey_events; todos preservados pela 041, que inclui journey_shields/hydration_records sem criar grants.

Arquivos aplicados separadamente, sem alteração, em ordem 041, 042, 044; cada execução retornou Query succeeded. A confirmação do editor para DROP referia-se exclusivamente à substituição da constraint prevista na 041, sem apagar dados.

SHA-256:

- 041: 9d35e45d6a5974690c9a25fa7b0f3bbb6e709a30dcff66eacb741e5cb1cf3f32
- 042: 8f341ecfdf6cc0e6512f319a17ebf5a7633f411fbf2df6c0f87e46f11448d24d
- 044: bf66fc6e09d870476606f6b3a493267ec2c2b6b8b8bdfd09920f426786fab681

## Verificação pós-aplicação

Resultado de catálogo/contagens em evidencias/hidratacao/cloud-041-042-044-verificacao.json:

- Duas tabelas com RLS; anon/authenticated sem SELECT/INSERT/UPDATE/DELETE diretos.
- Helper tm_require_own_hydration_patient privado; serializer tm_hydration_snapshot privado (SQL STABLE invoker).
- Quatro RPCs com EXECUTE somente authenticated, SECURITY DEFINER/search_path vazio; PUBLIC/anon negados. Guardas internas exigem paciente/vínculo/grants ativos.
- Índice tm_hydration_records_own_id_idx presente.
- Registros, recibos, pacientes, memberships e grants: todos zero.
- tm_resolve_patient_hydration_host(text) ausente: 043 não aplicada.

Não houve criação de contas/vínculos, atribuição de grants, fixtures de saúde, DNS, ativação de domínio, infraestrutura ou Publish. Types gerenciados não foram regenerados manualmente; contratos estritos seguem validando as respostas RPC. Não reaplicar estes arquivos por estarem nomeados como propostas locais: a aplicação remota está confirmada neste registro.

## Limites

Verificações de catálogo não equivalem a homologação JWT/gateway/isolamento real com pacientes. Falta a cadeia White Label/043 e provisionamento QA com autorização própria. O preview continua demonstrativo/protegido, sem contornar host ou usar seletor visual como autoridade. Metas diárias, lembretes e observações da IA permanecem pendentes do PRD 8.3.

Verificação adicional de preview: /app/hidratacao renderizou o texto atualizado sobre metas/lembretes e permissão própria, identidade Clínica Viva Saúde e navegação INÍCIO/ÁGUA/ALIMENTAÇÃO. O aviso de endereço verificado permaneceu; nenhum formulário de saúde real foi liberado. Quatro testes de cobertura do catálogo aprovados após o ajuste documental pós-aplicação.
