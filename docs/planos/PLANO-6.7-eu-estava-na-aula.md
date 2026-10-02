# PLANO DE EXECUÇÃO — 6.7-eu-estava-na-aula

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.7 do `ROADMAP-web.md` (Fase 6, D15), **sem os anexos** |
| **Origem** | Contrato § 9.3, § 8 (`criar_motivo`), § 12 (`can_contest`); D40, T19, T38 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.7-eu-estava-na-aula` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** o aluno que foi à aula e saiu da chamada sem presença não tem como pedir a retificação pela
  web.
- **Resultado esperado:** **Eu estava na aula** nas aulas com `can_contest` (hoje, na lista, e as de até 7
  dias atrás, numa seção **Para conferir**): `criar_motivo('request_evidence', aula, texto)` →
  `abrir_solicitacao('student_was_present', aula, motivoId)`. **Meus pedidos** (`minhas_solicitacoes`) mostra o
  andamento. Vale também para o à vontade (D40). Os anexos esperam o G2.
- **Como validar:** testes de unidade das RPCs e dos rótulos; E2E com uma aula de dois dias atrás com chamada
  concluída.

## 2. Escopo

**Vou fazer:**
- `lib/solicitacoes.ts`: o pedido (motivo e solicitação, nesta ordem), Meus pedidos e os rótulos.
- `components/FormularioDeMotivo.tsx` (antes `FormularioDeJustificativa`, do 6.6): rótulo, dica, limite e
  botão de fechar por parâmetro, para servir à justificativa e ao pedido.
- `/aulas`: **Eu estava na aula** na coluna da direita; seção **Para conferir** com as aulas de antes de hoje
  que ainda têm `can_contest`; atalho **Meus pedidos**.
- Página nova `/pedidos` (**Meus pedidos**).

**NÃO vou fazer (escopo negativo)** [#8]:
- **Anexos do pedido** (`POST /v1/motivos/sign-upload` → Cloudinary → `anexar_ao_motivo`): esperam o **G2**.
- **Bloco de contato** no pedido negado: 6.15.
- As trocas em **Meus pedidos**: 6.14.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Textos do app (`PedidoSheet`, Meus pedidos): título "Eu estava na aula", "{aula} · {dia dd/mm hh:mm}. Se o professor aprovar, a sua presença entra na chamada.", dica "Conte o que aconteceu.", **Voltar** / **Enviar pedido**, "Pedido enviado. Acompanhe a resposta em Meus pedidos.", "Pedido em análise", "Pedido aprovado por {nome}", "Pedido negado" | A § 3 não traz esses rótulos; app e web dizem o mesmo | Ajustar nas duas |
| P2 | Rótulo do campo: "O que aconteceu"; limite 500, com a frase do banco para o vazio | O motivo (`action_reasons.body`) vai de 1 a 500 | — |
| P3 | **Para conferir** busca de 8 dias atrás até 00:00 de hoje e mostra só as aulas com `can_contest` | O prazo é de 7 dias depois da aula (T19); o banco decide quais ainda valem | — |
| P4 | A seção usa o título "Para conferir", da prancheta `AulasAVontade` | Texto do mockup aprovado | — |
| P5 | Meus pedidos mostra só o `student_was_present` | É o único pedido que o aluno abre (§ 9.3) | — |
| P6 | Vazio de Meus pedidos: "Você ainda não fez nenhum pedido." | Sem texto na § 3 | Trocar o texto |
| P7 | A limpeza do E2E apaga a aula com chamada por conexão direta ao Postgres local, numa transação que desliga e religa a trava (P9 do plano do 4.3) | Descoberto na primeira rodada: a API recusa apagar aula com chamada, e a rodada deixava dados sintéticos no banco (C6) | — |

## 4. Decisão Visual

- **Mockup:** `AulasAVontade` (linha B: "Para conferir" + **Eu estava na aula**) e as telas do app.
- **`design-de-interface-projeto`** (carregada nesta sessão): **Eu estava na aula** como link de 44 px na
  coluna da direita do cartão; o formulário abre embaixo, como o da justificativa; **Para conferir** com o
  título de seção e um rótulo por dia; Meus pedidos com o estado colorido por token e sempre escrito.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/solicitacoes.ts`, `test/solicitacoes.test.ts` | Criar |
| `components/FormularioDeMotivo.*` | Renomeado e com parâmetros |
| `lib/aulas.ts` | `can_contest` |
| `app/aulas/*` | Botão, seção Para conferir, atalhos, um `cartao()` só para as duas listas |
| `app/frequencia/page.tsx`, `app/justificativas/page.tsx` | Nome novo do formulário |
| `app/pedidos/*` | Criar |
| `e2e/pedidos.spec.ts`, `e2e/apoio/banco.ts` | Aula com chamada concluída e os testes |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/solicitacoes.ts` e testes | Pedido e Meus pedidos | [#2][#41] | `npm test` |
| 2 | Formulário | Parâmetros para o pedido | [#6] | Typecheck |
| 3 | `/aulas` e `/pedidos` | Botão, Para conferir e a página | [#13][#93] | Lint, build |
| 4 | E2E | Pedido numa aula com chamada; sem chamada, nada | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.7 (sem anexos) e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `criar_motivo`, `abrir_solicitacao` e `minhas_solicitacoes` (G3; produção só no G4).
- **LGPD:** o texto do pedido só vai ao banco; nada vai para log.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Ordem motivo → pedido; Meus pedidos; rótulos | Motivo vazio ou acima de 500 sem rede; recusa do pedido repassada; motivo que falha não abre o pedido |
| E2E [#43] | Aula de dois dias atrás com chamada: Para conferir → pedido → some da lista → Meus pedidos em análise; linha em `roll_call_requests` | Aula sem chamada não entra em Para conferir |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O motivo fica criado se o pedido for recusado | Baixa | Um motivo órfão, sem uso | É o fluxo do contrato e do app; o banco recusa antes nos casos comuns (`can_contest`) |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (30 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
