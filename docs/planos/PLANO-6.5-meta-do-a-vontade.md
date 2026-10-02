# PLANO DE EXECUÇÃO — 6.5-meta-do-a-vontade

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.5 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 5.3 e § 3 (D36–D38) |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.5-meta-do-a-vontade` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** o aluno à vontade vê a meta na inicial (6.4), mas não consegue mudá-la pela web.
- **Resultado esperado:** **Mudar** ao lado de "Meta: {n}x por semana" abre a folha "Meta da próxima
  semana" (de 1 a 6); salvar chama `definir_meta_semanal(p_meta)` e mostra "Vale a partir de {seg dd/mm}. A
  meta desta semana continua {n}x." (§ 3). A meta desta semana não muda.
- **Como validar:** testes de unidade das RPCs e dos textos; E2E do à vontade (grava a meta da semana que
  vem) e do livre (sem **Mudar**).

## 2. Escopo

**Vou fazer:**
- `lib/meta.ts`: `definirMetaSemanal`, `buscarMetaDaSemana` (`meta_da_semana`, para a folha abrir com a meta
  que já vale na semana que vem), `proximaSegunda` e os textos.
- `components/FolhaDaMeta.tsx`, dentro do cartão "Esta semana".
- `lib/erros.ts`: `fraseDaRecusa` passa a ser exportada (a recusa `23514` de quem não tem plano à vontade).

**NÃO vou fazer (escopo negativo)** [#8]:
- Meta pelo admin (`p_user_id`): é do app.
- Meta na página de frequência: os rótulos **Meta da semana** e **Meta do mês** já vieram no 6.3.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | Folha com os textos e a faixa do app (`MetaSemanalSheet`): "Meta da próxima semana", de 1 a 6, "{n} aulas por semana", a explicação do prazo até domingo às 23:59 e "A meta é só para você acompanhar: não gera alerta de frequência baixa.", com **Fechar** / **Salvar meta** | As duas interfaces dizem o mesmo; a faixa é a da `weekly_goals` (1 a 6) | Ajustar nas duas |
| P2 | A folha abre dentro do cartão, não como janela por cima | Na web, sem a folha de baixo do celular, um bloco no próprio cartão é mais simples e não prende o foco | — |
| P3 | Depois de salvar, o recado usa o `vale_a_partir` que o banco devolve, não a data calculada aqui | A data é do banco (§ 5.3, D37) | — |
| P4 | A recusa do banco aparece com a frase dele; outra falha, "Não foi possível salvar. Verifique a conexão e tente de novo." | Mesmo padrão da C5 | — |

## 4. Decisão Visual

- **Mockup:** `AulasAVontade` (linha B), com o **Mudar** ao lado da meta; a folha segue a do app.
- **`design-de-interface-projeto`** (carregada nesta sessão): **Mudar** como link na cor `--primary-text`;
  seletor com botões − e + de 44 px, com nome para o leitor de tela e desabilitados nos limites; valor em
  região viva; botões **Fechar** / **Salvar meta** lado a lado; recado `role="status"`, erro `role="alert"`.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/meta.ts`, `test/meta.test.ts` | Criar |
| `components/FolhaDaMeta.*` | Criar |
| `components/ResumoDaSemana.tsx` | Aceita a folha embaixo (`children`) |
| `app/inicio/*` | **Mudar**, a folha e os recados |
| `lib/erros.ts` | Exporta `fraseDaRecusa` |
| `e2e/meta.spec.ts`, `e2e/apoio/banco.ts` | Plano à vontade sintético e os testes |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/meta.ts` e testes | RPCs e textos | [#2][#41] | `npm test` |
| 2 | Folha, cartão e inicial | **Mudar** e salvar | [#13][#93] | Lint, typecheck |
| 3 | E2E | À vontade grava; livre sem **Mudar** | [#43] | `npm run e2e` |
| 4 | `ROADMAP-web.md` | 6.5 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** grava em `weekly_goals` pela RPC (G3; produção só no G4).

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `definirMetaSemanal`, `buscarMetaDaSemana`, `proximaSegunda`, textos | Recusa do banco repassada; domingo às 23:30 ainda aponta a segunda seguinte |
| E2E [#43] | À vontade muda a meta: recado da § 3, meta desta semana igual, `weekly_goals` gravada | Livre não vê **Mudar** |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A meta padrão da academia mudar e o teste subir de 6 | Baixa | — | O teste aumenta ou diminui conforme o botão estiver habilitado |

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 4
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (26 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
