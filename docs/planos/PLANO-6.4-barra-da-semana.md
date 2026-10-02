# PLANO DE EXECUÇÃO — 6.4-barra-da-semana

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.4 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 3 e § 9.2; colunas de `aulas_do_aluno` (§ 12) |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.4-barra-da-semana` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a inicial não mostra a semana do livre (quantas fez e quantas marcou contra a cota) nem a
  meta do à vontade.
- **Resultado esperado:** cartão "Esta semana" na inicial: livre = **feitas + marcadas / cota**, em barra e
  em texto ("cota {n}x", "{f} feitas · {m} marcadas"); à vontade = **Meta: {n}x por semana** com as feitas.
  O fixo não tem o cartão.
- **Como validar:** testes de unidade do resumo e do início da semana; E2E do livre e do fixo.

## 2. Escopo

**Vou fazer:**
- `lib/aulas.ts`: `inicioDaSemana`, `resumoDaSemana` e as colunas `status` e `weekly_target` na leitura.
- `components/ResumoDaSemana.tsx`.
- Inicial: as aulas da semana (seg a dom) por `aulas_do_aluno` e o cartão abaixo da frequência.

**NÃO vou fazer (escopo negativo)** [#8]:
- **Mudar** a meta e a folha da meta: 6.5.
- O cartão na tela Aulas da semana (menu): 6.12.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Feitas = aulas de rotina, não canceladas, com `status = 'present'`; marcadas = as com `declared_status = 'present'` e sem chamada; cota ou meta = `weekly_target` | O contrato não define a barra; é a leitura que o app faz das mesmas colunas (`resumoDaSemana` em `snake-thai/src/utils/aulasDoAluno.ts`, na `main`). As duas interfaces contam igual | Mudar nas duas juntas |
| P2 | À vontade: **Meta: {n}x por semana**, o rótulo da § 3. O app usa "Sua meta: …", da prancheta | O contrato é a fonte dos rótulos (regra 1 da Fase 6) | Trocar o texto |
| P3 | No à vontade, o texto "Faltas não precisam de justificativa: só contam na sua meta." | É o do app e da prancheta `AulasAVontade` (D39: o à vontade não justifica) | — |
| P4 | A barra cresce além da cota quando ele marca mais | Acima da cota não bloqueia (D4); a barra não pode esconder a marcada a mais | — |

## 4. Decisão Visual

- **Mockup:** linha F (`WebInicio`, cartão "Esta semana") e `AulasAVontade` (linha B).
- **`design-de-interface-projeto`** (carregada nesta sessão): barra de 8 px com feitas em `--primary` e
  marcadas em `--info` sobre `--border`; a barra fica escondida do leitor de tela, porque o texto abaixo diz o
  mesmo; o cartão some quando não há o que mostrar (fixo, ou semana sem aula).

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/aulas.ts`, `test/aulas.test.ts` | Leitura de `status` e `weekly_target`; resumo e início da semana |
| `components/ResumoDaSemana.*` | Criar |
| `app/inicio/page.tsx` | Aulas da semana e o cartão |
| `e2e/semana.spec.ts`, `e2e/apoio/banco.ts` | Criar; `marcarExtra` vira `marcarVou` (serve ao livre também) |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/aulas.ts` e testes | Resumo pela leitura do app | [#2][#41] | `npm test` |
| 2 | Componente e inicial | Cartão "Esta semana" | [#13] | Lint, typecheck |
| 3 | E2E | Livre com o cartão; fixo sem | [#43] | `npm run e2e` |
| 4 | `ROADMAP-web.md` | 6.4 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- Nenhum. Mais uma leitura de `aulas_do_aluno` na inicial (G3; produção só no G4).

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Início da semana no fuso da academia; feitas e marcadas | Domingo ainda é a semana anterior; evento e cancelada fora da conta; semana sem aula |
| E2E [#43] | Livre: "cota 1x" e "0 feitas · 1 marcada" | Fixo sem o cartão |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| App e web contarem diferente | Baixa | Números diferentes nas duas | Mesma regra (P1), anotada no Registro |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 4
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (24 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
