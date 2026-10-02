# PLANO DE EXECUÇÃO — 6.9-rotulos

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.9 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 3 (rótulos que app e web compartilham) |
| **Tipo** | Melhoria |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.9-rotulos` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a web usava rótulos próprios ("Aceita", "Recusada", "Em análise" na justificativa) e não
  mostrava a modalidade do aluno.
- **Resultado esperado:** só os rótulos da § 3. Justificativa, frequência, troca, extra e contato já
  vieram nos itens 6.1 a 6.8 (e virão nos 6.12 a 6.15); falta a modalidade: **Horário fixo**, **Horário
  livre** e **À vontade**.
- **Como validar:** busca no código pelos rótulos antigos; teste de unidade da modalidade; E2E em
  `/frequencia`.

## 2. Escopo

**Vou fazer:**
- `lib/frequencia.ts`: `rotuloDaModalidade` (sem plano conta como fixo, T5).
- `/frequencia`: a modalidade no alto do resumo do mês.
- Conferência: "Aceita", "Recusada" e o "Em análise" da justificativa não aparecem mais em lugar nenhum
  (saíram no 6.6).

**NÃO vou fazer (escopo negativo)** [#8]:
- O "Em análise" da **mensalidade** em análise fica: é o rótulo do pagamento, o mesmo do app
  (`snake-thai/src/utils/payments.ts`); os rótulos que saem pela § 3 são os da justificativa.
- Fonte Inter/Syne: continua em "Decisões em aberto".

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A modalidade vem de `frequencia_do_mes.schedule_mode` | É a do mês que a tela mostra | — |
| P2 | Sem a cota ao lado ("{n}x por semana") | A cota pode mudar de semana para semana dentro do mês; ela já aparece na inicial (6.4) | Acrescentar quando a semana for escolhida |

## 4. Decisão Visual

- Rótulo em maiúsculas pequenas, `--text-secondary`, acima do número do mês (como o "overline" dos mockups).

## 5. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/frequencia.ts` e teste | Rótulo da modalidade | [#3][#41] | `npm test` |
| 2 | `/frequencia` | Modalidade no resumo | [#98] | E2E |
| 3 | `ROADMAP-web.md` | 6.9 e Registro | [#96] | Leitura |

## 6. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | Os três rótulos | Sem plano → Horário fixo |
| E2E [#43] | Fixo vê "Horário fixo" em `/frequencia` | — |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 7. Definição de Pronto

- [x] Passos 1 a 3
- [x] `npm test`, typecheck, E2E de `/frequencia`
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
