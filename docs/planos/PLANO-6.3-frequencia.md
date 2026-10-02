# PLANO DE EXECUÇÃO — 6.3-frequencia

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.3 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 11.6 e § 3 (`origin/main` do `snake-thai`, v4); T10 e T30 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.3-frequencia` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** a inicial lê a RPC legada `frequencia_mensal`, mostra um número só e copia a régua de 70%
  (`FREQUENCIA_MINIMA`), uma regra de negócio dentro da web. Não há página de semanas.
- **Resultado esperado:** a inicial mostra **Semana · {p}%** e **Mês · {p}%** com "{a} de {e}"
  (`frequencia_semanal` e `frequencia_do_mes`), **—** com esperado zero e, no à vontade, **Meta da semana** e
  **Meta do mês**. O cartão leva a `/frequencia`, com as semanas do mês (`semanas_do_mes`), a **Semana extra**
  e o "Fecha em {dd/mm}…" só pela regra da § 3. A régua de 70% sai.
- **Como validar:** testes de unidade da leitura e da formatação; E2E da inicial e da página.

## 2. Escopo

**Vou fazer:**
- `lib/frequencia.ts`: as três RPCs (cliente injetado), formatação e rótulos da § 3, e a regra do aviso de
  mês aberto.
- `components/CartaoDeFrequencia.tsx`: o `freqCard` da linha F, como link para `/frequencia`.
- `app/frequencia`: página nova, com navegação de mês (até o atual) e a tabela das semanas.
- Sai `buscarFrequencia` (`frequencia_mensal`) e a régua de 70% [#12].

**NÃO vou fazer (escopo negativo)** [#8]:
- Barra da semana (6.4) e meta do à vontade com **Mudar** (6.5).
- **Justificar mais 1 aula** e as justificativas da semana (6.6): `semanas_do_mes` traz as colunas, mas o
  fluxo é do 6.6.
- O percentual acumulado do mês em cada semana (a prancheta mostra "3 de 8 · 37,5%"): o banco não devolve
  esse percentual por semana, e calculá-lo aqui seria conta na web. Fica só "{a} de {e}".
- Os textos explicativos da prancheta ("Como a semana extra se divide", a dica da conta): são do caso de
  exemplo e não estão na § 3.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | **O alerta de frequência baixa sai da web**, sem substituto | A T10 é regra do banco (ritmo, esperado até agora ≥ 4, último mês fechado), e o aluno não recebe coluna de risco; refazer a conta aqui repetiria o erro da régua copiada (regra 2 da Fase 6). Fica em "Decisões em aberto" | Se o dono quiser o alerta, o app expõe a coluna e a web só mostra |
| P2 | `/frequencia` mostra o mês atual e deixa voltar aos anteriores, nunca avançar além do atual | Um mês futuro não tem o que mostrar; o mês anterior é onde a semana extra e o "Fecha em" aparecem | — |
| P3 | O rótulo de modalidade vem de `schedule_mode` da RPC do mês (ou da semana, se o mês não vier) | É a modalidade que o banco usou na conta | — |
| P4 | Mockups: a mesma cópia da versão 8 usada no 6.1 (P1 de lá) | — | — |

## 4. Decisão Visual

- **Mockup:** linha F (`WebInicio`, o `freqCard`) e a prancheta "Frequência — semanas e semana extra".
- **`design-de-interface-projeto`** (carregada nesta sessão, no 6.1): dois blocos com o número em 22 px
  tabular e o rótulo em `--text-secondary`; o cartão inteiro é um link, com nome para o leitor de tela
  ("Ver as semanas do mês") e a seta escondida dele; a página usa uma `<table>` de verdade (cabeçalhos de
  coluna e de linha, legenda escondida) no lugar da grade de `div` do mockup; navegação de mês com botões de
  44 px e o nome do mês em região viva. Estados: "Carregando…", erro com "Tentar de novo" e o vazio com o
  texto que a inicial já usava.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/frequencia.ts`, `test/frequencia.test.ts` | Criar |
| `components/CartaoDeFrequencia.*` | Criar |
| `app/frequencia/*` | Criar |
| `app/inicio/*` | Cartão novo; sai a régua de 70% e os estilos sem uso |
| `lib/dados.ts` | Sai `buscarFrequencia` e o tipo `Frequencia` |
| `e2e/frequencia.spec.ts` | Criar |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/frequencia.ts` e testes | Leitura das RPCs e rótulos | [#2][#41] | `npm test` |
| 2 | Cartão e inicial | Semana e Mês; sai a régua | [#6][#12] | Lint, typecheck |
| 3 | `app/frequencia` | Semanas do mês | [#13] | Build e E2E |
| 4 | `e2e/frequencia.spec.ts` | Inicial e página | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.3, Registro e a decisão aberta (P1) | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** nenhum; usa `frequencia_semanal`, `frequencia_do_mes` e `semanas_do_mes` (G3), que não existem em
  produção antes do G4.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | As três leituras; percentual, "{a} de {e}", rótulos por modalidade, datas e meses; aviso de mês aberto | Percentual nulo → "—"; sem linha; erro do banco repassado; último dia do mês no fuso da academia; mês fechado sem aviso |
| E2E [#43] | Inicial com Semana e Mês, link para a página; página com o mês e as semanas; mês anterior | A régua de 70% nunca aparece; "Próximo mês" desabilitado no mês atual |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| O dono sentir falta do alerta de frequência baixa | Média | Decisão de produto | Registrado em "Decisões em aberto" (P1) |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test` (104), lint, typecheck
- [x] `npm run e2e` verde (22 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
