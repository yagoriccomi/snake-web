# PLANO DE EXECUÇÃO — 6.6-justificativas

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.6 do `ROADMAP-web.md` (Fase 6, D15), **sem o anexo** |
| **Origem** | Contrato § 9.1, § 3 (D13, D16, D39, D42, T17, T38) |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.6-justificativas` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a justificativa vai pelo `upsert` direto, com texto opcional, rótulos antigos ("Em análise",
  "Aceita", "Recusada"), sem a semana do livre, sem "Minhas justificativas" e sem reenvio.
- **Resultado esperado:** envio por `enviar_justificativa` (aula do fixo e semana do livre), texto
  obrigatório, **Minhas justificativas** (`minhas_justificativas`) com os rótulos da § 3, e **Reenviar até
  {dd/mm}** na primeira negada (`reenviar_justificativa`). O anexo fica para o G2.
- **Como validar:** testes de unidade das RPCs e dos rótulos; E2E do envio, da negada pela 1ª vez com reenvio
  e da negada pela 2ª vez.

## 2. Escopo

**Vou fazer:**
- `lib/justificativas.ts`: as três RPCs (cliente injetado), a validação do texto e os rótulos da § 3, com a
  mesma leitura do app (`snake-thai/src/utils/justificativas.ts`).
- `components/FormularioDeJustificativa.tsx`: o texto obrigatório com o contador, usado nas três telas.
- `/aulas`: **Não vou** abre a justificativa só com `can_justify` e sem justificativa na aula (como o app);
  o selo da aula passa aos rótulos da § 3; link para **Minhas justificativas**.
- `/frequencia`: bloco **Justificativas** do livre, por semana (`semanas_do_mes`: `can_justify`,
  `justify_until`, `justifications_left` e as justificativas da semana), com **Justificar mais 1 aula**.
- Página nova `/justificativas`.
- Sai `justificarFalta` (o `upsert`) e os rótulos antigos de `lib/dados.ts` [#12].

**NÃO vou fazer (escopo negativo)** [#8]:
- **Anexo (atestado)**: espera o **G2** (rotas novas do servidor em produção) e, para publicar, o **G5**. Fica
  marcado no roadmap. Quando o G2 abrir: `POST /v1/justifications/sign-upload {justificationId}` →
  Cloudinary com os campos assinados → `anexar_a_justificativa(p_id)`; sem Cloudinary, sem anexo (T25).
- **Bloco de contato** na negada pela 2ª vez: 6.15. A frase da § 3 já aparece.
- Justificar uma aula do fixo que já passou sem ter avisado **Não vou**: o app também só abre pelo **Não
  vou**; a lista da web mostra de hoje em diante.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Na semana do livre, o botão é **Justificar mais 1 aula** e o título do formulário "Justificar 1 aula · semana dd/mm–dd/mm" | Textos da prancheta da web aprovada (linha F, `WebAulas`); o app usa "Justificar semana" | Trocar o texto |
| P2 | O bloco da semana fica em `/frequencia`, junto das semanas do mês | É onde o app o põe, e é onde as semanas já estão | — |
| P3 | Na linha da aula, o selo curto: "Justificativa em análise", "Justificativa aprovada" e "Justificativa negada" | `aulas_do_aluno` só traz a situação, sem o nome de quem aprovou nem a tentativa; o rótulo completo fica em Minhas justificativas | — |
| P4 | Negada pela 1ª vez sem prazo de reenvio: "Justificativa negada" | A § 3 promete a data só enquanto dá para reenviar; é o que o app faz | — |
| P5 | Recados novos: "Justificativa reenviada. A academia vai analisar." e o vazio "Você ainda não enviou nenhuma justificativa." | Sem texto na § 3 para isso; seguem o recado do envio, que já existia | Trocar o texto |
| P6 | O texto vazio é recusado aqui antes da rede, com a frase do banco ("Escreva o motivo da falta.") | Evita uma ida ao banco que sempre falha; a frase é a mesma | — |

## 4. Decisão Visual

- **Mockup:** linha F (`WebAulas`: bloco de justificativas e o formulário) e as telas do app (Minhas
  justificativas, cartão da semana).
- **`design-de-interface-projeto`** (carregada nesta sessão): o formulário com rótulo visível, campo
  obrigatório, contador e erro `role="alert"`; os estados com a cor por token (`--warning`, `--success`,
  `--error`) e sempre com o texto escrito; **Reenviar até {dd/mm}** e **Justificar mais 1 aula** como links
  de 44 px; estados de carregando, erro e vazio na página nova.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/justificativas.ts`, `test/justificativas.test.ts` | Criar |
| `components/FormularioDeJustificativa.*` | Criar |
| `app/justificativas/*` | Criar |
| `app/aulas/*` | Justificativa pela RPC, selo novo, link; saem os estilos do formulário antigo |
| `app/frequencia/*`, `lib/frequencia.ts` | Bloco da semana do livre e as colunas de justificativa de `semanas_do_mes` |
| `lib/aulas.ts` | `can_justify` e `diaEMesDoInstante` |
| `lib/dados.ts` | Sai `justificarFalta` e os rótulos antigos |
| `e2e/*` | Rótulo do campo; `justificativas.spec.ts`; `negarJustificativa` |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/justificativas.ts` e testes | RPCs, validação e rótulos | [#2][#41] | `npm test` |
| 2 | Formulário e `/aulas` | Justificar a aula pela RPC | [#6][#93] | Lint, typecheck |
| 3 | `/frequencia` | Semana do livre | [#13] | Build |
| 4 | `/justificativas` | Lista e reenvio | [#13] | Build |
| 5 | E2E | Envio, reenvio e 2ª negada | [#43] | `npm run e2e` |
| 6 | `ROADMAP-web.md` | 6.6 (sem anexo) e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** RPCs de justificativa (G3; produção só no G4). A tabela é a mesma; a web deixa de escrever nela
  direto.
- **LGPD:** o texto da justificativa pode ter dado de saúde; ele só vai ao banco e volta ao próprio aluno.
  Nada vai para log.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Envio por aula e por semana; reenvio; leitura de `minhas_justificativas` e das semanas; rótulos | Texto vazio e acima de 255 recusados sem rede; recusa do banco repassada; negada sem prazo; 2ª negada |
| E2E [#43] | Não vou → justificativa em análise em Minhas justificativas (`scope = 'class'`); negada → reenvio → em análise | 2ª negada: a frase da § 3 e nenhum **Reenviar** |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A semana do livre não ter E2E | Média | Defeito só visto no aparelho | Testes de unidade da leitura; `can_justify` depende de semana passada com falta e do teto T17, difícil de montar com dados sintéticos sem chamada |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 6
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (28 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
