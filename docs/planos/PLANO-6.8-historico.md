# PLANO DE EXECUÇÃO — 6.8-historico

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.8 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 12 (`historico_de_aulas_do_aluno`), § 3; D20, T14 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.8-historico` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** o aluno não vê, na web, o que a chamada registrou em cada aula do mês.
- **Resultado esperado:** em `/frequencia`, a seção **Histórico de aulas** do mês escolhido
  (`historico_de_aulas_do_aluno`): data e hora, aula, a marca **Editada** e "Feita {x} dia(s) depois" (T14),
  e a situação; a aula que ele trocou mostra "Trocou para {dia dd/mm hh:mm}" no lugar de "Falta". Nunca quem
  editou nem o valor anterior (D20).
- **Como validar:** testes de unidade da leitura e das situações; E2E com presença e falta editada.

## 2. Escopo

**Vou fazer:**
- `lib/historico.ts`: leitura (cliente injetado), situação com a mesma leitura do app
  (`rotuloDaAulaDoAluno`, em `snake-thai/src/utils/pessoas.ts`), atraso da chamada e o tom.
- Seção em `/frequencia`, do mês escolhido, da mais recente para a mais antiga.

**NÃO vou fazer (escopo negativo)** [#8]:
- Página própria de histórico: o mês já é escolhido em `/frequencia`, e o histórico é o detalhe dele.
- "Eu estava na aula" a partir do histórico: fica em `/aulas` (6.7), onde o banco já entrega `can_contest`.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Situações do app: "Cancelada", "Trocou para…", "Presente", "Falta justificada", "Falta" e "Sem registro" | A § 3 só traz o "Trocou para" e as marcas; o app já escolheu os outros, e as duas interfaces devem dizer o mesmo | Ajustar nas duas |
| P2 | As colunas só do admin (`edited_at`, `previous_status`, `edited_by_name`) não são lidas | D20: vêm nulas para o aluno, e não ler é a garantia de que nunca aparecem | — |
| P3 | O histórico fica dentro de `/frequencia`, no mês escolhido | Mesmo período da conta do mês; o app também o mostra na tela de frequência | — |

## 4. Decisão Visual

- **`design-de-interface-projeto`** (carregada nesta sessão): lista com a data em números tabulares à
  esquerda, a aula no meio com as marcas de contorno (Editada, atraso) em `--warning`, e a situação à direita
  com a cor por token (`--success`, `--error`, `--text-secondary`) e sempre escrita; `<time dateTime>`; a
  seção só aparece quando há aula no mês.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/historico.ts`, `test/historico.test.ts` | Criar |
| `lib/frequencia.ts` | Exporta `ultimoDiaDoMes` |
| `app/frequencia/*` | Seção Histórico de aulas |
| `e2e/historico.spec.ts`, `e2e/apoio/banco.ts` | `registrarChamada` e o teste |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/historico.ts` e testes | Leitura e situações | [#2][#41] | `npm test` |
| 2 | `/frequencia` | Seção do mês | [#13] | Lint, typecheck |
| 3 | E2E | Presente, Falta e Editada | [#43] | `npm run e2e` |
| 4 | `ROADMAP-web.md` | 6.8 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `historico_de_aulas_do_aluno` (G3; produção só no G4).
- **LGPD:** quem editou nunca chega à tela (D20).

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Leitura e ordem; situações; atraso | Erro do banco repassado; quem editou não entra no modelo; aula trocada nunca é Falta |
| E2E [#43] | Presente e Falta com Editada, no mês da aula | Virada do mês: o teste volta ao mês anterior quando precisa |

## 9. Riscos e Rollback

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 4
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (31 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
