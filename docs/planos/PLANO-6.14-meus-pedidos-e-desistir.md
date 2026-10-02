# PLANO DE EXECUÇÃO — 6.14-meus-pedidos-e-desistir

| Campo | Valor |
|---|---|
| **Tarefa** | Item 6.14 do `ROADMAP-web.md` (Fase 6, D15) |
| **Origem** | Contrato § 9.4 (`minhas_trocas`, `desistir_da_troca`), § 3, § 10; D16, D57, T36, T50 |
| **Tipo** | História |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-10-02 |
| **Branch** | `feat/6.14-meus-pedidos-e-desistir` → PR para a `fase-6` |

---

## 1. Enunciado Canônico

- **Problema:** depois de pedir a troca (6.13), o aluno não acompanha a decisão nem desiste pela web. A web não
  tem push (§ 10): sem esta tela, o aluno de iPhone não fica sabendo.
- **Resultado esperado:** **Meus pedidos** mostra as trocas (`minhas_trocas()`) com os rótulos da § 3 (pendente,
  aprovada por {nome}, abonada, negada, expirada, você desistiu, cancelada), o tipo, **Reposição**, "Sai: …",
  "Entra: …" e, na permanente, o texto que ele escreveu; **Desistir da troca** com `can_cancel`. Na lista de
  aulas e no menu, **Desistir da troca** com `can_cancel_swap`. Os dois pedem confirmação e chamam
  `desistir_da_troca(p_id)`; as recusas vêm com a frase do banco.
- **Como validar:** testes de unidade das RPCs e dos rótulos; E2E da desistência no menu e em Meus pedidos.

## 2. Escopo

**Vou fazer:**
- `lib/trocas.ts`: `desistirDaTroca`, `buscarMinhasTrocas`, `rotuloDaTroca` e `descricaoDaAulaDaTroca` (a
  mesma leitura do app).
- `lib/aulas.ts`: `swap_id` e `can_cancel_swap`.
- `components/ConfirmarDesistencia.tsx` (textos da folha do app); **Desistir da troca** em `AulaComAcoes` e no
  hook.
- `/pedidos`: seção **Trocas de aula** antes do "Eu estava na aula".

**NÃO vou fazer (escopo negativo)** [#8]:
- **Bloco de contato** na troca negada: 6.15.
- `minhas_trocas_permanentes`: é da exportação de dados (§ 12.1), não de tela.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | **Desistir da troca** aparece só com `can_cancel_swap` (na aula) e `can_cancel` (em Meus pedidos) | É o que o banco decide (T36), e é como o app faz; a tabela da § 12.2 descreve os mesmos casos | — |
| P2 | Confirmação com os textos do app: "Desistir da troca?", "{aula}. Você volta a ter a aula original, e a troca não pode ser retomada.", **Voltar** / **Desistir da troca** | A desistência não tem volta | — |
| P3 | Recado depois de desistir: "Você desistiu da troca.", o rótulo da § 3 | — | — |
| P5 | **Defeito do 6.12 corrigido aqui:** em Aulas da semana, trocar de aba com a primeira leitura no ar deixava a resposta atrasada de "Esta semana" sobrescrever a da próxima. Agora a tela descarta a resposta de uma leitura que já não é a última | O E2E pegou com a máquina carregada; para o aluno com rede lenta, é o mesmo caso | — |
| P4 | Em Meus pedidos entra também o texto da permanente ("Sua justificativa: …") e **Desistir da troca**, que a tela do app não mostra | O roadmap pede os dois (`motivo_texto` e `can_cancel`) | Tirar, se o app for o padrão |

## 4. Decisão Visual

- **`design-de-interface-projeto`** (carregada nesta sessão): **Desistir da troca** como link na coluna da
  direita (como na prancheta "Aluno fixo — o mesmo menu"); a confirmação abre dentro do cartão, com o botão de
  desistir em contorno `--error` (não tem volta); Meus pedidos com selos de contorno para o tipo e a
  reposição, o estado colorido por token e sempre escrito.

## 5. Terreno

| Arquivo | O que muda |
|---|---|
| `lib/trocas.ts`, `test/trocas.test.ts` | Desistência, Meus pedidos e rótulos |
| `lib/aulas.ts` | `swap_id`, `can_cancel_swap` |
| `components/ConfirmarDesistencia.*` | Criar |
| `components/AulaComAcoes.tsx`, `hooks/useAcoesDaAula.ts` | **Desistir da troca** |
| `app/pedidos/*` | Trocas de aula |
| `e2e/desistir.spec.ts` | Criar |

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/trocas.ts` e testes | Desistência e lista | [#2][#41] | `npm test` |
| 2 | Confirmação, cartão e hook | Desistir na aula | [#13][#93] | Lint, typecheck |
| 3 | `/pedidos` | Trocas de aula | [#13] | Build |
| 4 | E2E | Menu e Meus pedidos | [#43] | `npm run e2e` |
| 5 | `ROADMAP-web.md` | 6.14 e Registro | [#96] | Leitura |

## 7. Impacto em Dados e Contratos

- **Banco:** `minhas_trocas` e `desistir_da_troca` (G3; produção só no G4).

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | `desistir_da_troca`, `minhas_trocas`, todos os rótulos | Recusa repassada; aula apagada → "Aula removida"; abonada sem nome (T50) |
| E2E [#43] | Desistir no menu (`cancelled`, `student`); Meus pedidos com Sai / Entra / pendente, e desistir | Depois de desistir, o botão some |

## 9. Riscos e Rollback

**Rollback** [#84]: reverter o merge na `fase-6`.

## 10. Definição de Pronto

- [x] Passos 1 a 5
- [x] `npm test`, lint, typecheck
- [x] `npm run e2e` verde (37 testes)
- [ ] PR para a `fase-6` com o check da Vercel verde, mesclado
