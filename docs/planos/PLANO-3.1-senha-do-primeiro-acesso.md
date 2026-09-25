# PLANO DE EXECUÇÃO — 3.1-senha-do-primeiro-acesso

| Campo | Valor |
|---|---|
| **Tarefa** | Itens 3.1 e 4.2 do `ROADMAP-web.md` |
| **Origem** | Descrição livre (roadmap; achado 2.4 do `ROADMAP-thai.md`) |
| **Tipo** | Bug |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-09-25 |
| **Branch** | `fix/primeiro-acesso-senha` (sobre `chore/fundacao`) |

---

## 1. Enunciado Canônico

- **Problema:** `/primeiro-acesso` grava o perfil já com `is_first_login: false` e só depois troca
  a senha. Se a troca falhar, a pessoa nunca mais volta à tela e a senha que a academia conhece
  continua valendo.
- **Resultado esperado:** qualquer falha deixa `is_first_login = true`; a flag só vira `false`
  depois que a senha mudou.
- **Como validar:** teste de unidade do caminho de falha e, no banco local, uma senha recusada
  mantém a flag `true`.

## 2. Escopo

**Vou fazer:**
- `lib/primeiroAcesso.ts`: dados sem a flag → `auth.updateUser` → `is_first_login = false`.
- Segunda tentativa depois de uma troca parcial: o Supabase responde `same_password`, que aqui
  significa "a senha já é a nova"; segue para a marcação.
- Vitest (primeira suíte da web) com o caminho de falha (4.2), e os testes no `pre-commit`.

**NÃO vou fazer (escopo negativo)** [#8]:
- O app (item 2.4 do `ROADMAP-thai.md`): é do chat do `snake-thai`. A regra fica anotada no
  Registro para ele seguir.
- Mensagem específica para senha recusada pelo Supabase: continua a mensagem genérica de hoje.
- 4.1 (testes de `lib/validacao.ts`): item próprio.
- Os avisos de `window.location.href`: o guarda do 6.0 cuida.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | A regra é a primeira "direção" do achado 2.4 (ordem no cliente), não um gatilho no banco | É a primeira listada; o gatilho mudaria o esquema, que é do `snake-thai` e do contrato [#7] | Se o app escolher o gatilho, a web só apaga o 3º passo |
| P2 | A troca de senha não derruba a sessão atual | Conferido no banco local: o 3º passo grava depois do `updateUser` | — |

## 4. Decisão Visual

- **Tem superfície visual?** Não. A tela, os textos e os estados continuam iguais.

## 5. Terreno

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `app/primeiro-acesso/page.tsx` | valida e grava | a gravação passa a chamar `concluirPrimeiroAcesso` |
| `lib/primeiroAcesso.ts` | — | criar, com o cliente injetado [#20][#21] |
| `test/primeiroAcesso.test.ts`, `vitest.config.mts` | — | criar |
| `package.json` | — | `test`, `vitest`, `@types/node` ^22 (o Vitest 5 pede 22+) |
| `.husky/pre-commit` | lint + typecheck | + testes [#49] |

**Regra do banco conferida:** `enforce_profile_update_rules()` deixa o aluno mudar `name`, `phone`,
`dob` e `is_first_login`, e definir o CPF uma vez (nulo → valor). Separar a flag dos dados não
esbarra nela.

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `lib/primeiroAcesso.ts`, página | Três passos, flag por último | [#2][#9] | teste |
| 2 | `test/`, `vitest.config.mts`, `package.json` | Vitest com o caminho de falha | [#41][#46] | `npm test` |
| 3 | `.husky/pre-commit` | Testes no gate | [#49] | commit roda os testes |

## 7. Impacto em Dados e Contratos

- **Banco / contrato:** nenhum. **Configuração:** nenhuma. **LGPD:** nenhum dado em log.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Unidade [#41] | ordem dos passos; flag nunca junto dos dados | senha recusada; dados recusados; marcação recusada; `same_password` |
| Integração, à mão [#42] | banco local (GoTrue + RLS + gatilho), 3 contas sintéticas apagadas no fim | `weak_password` real mantém a flag `true`; `same_password` real conclui |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| 3º passo falhar depois da senha trocada | Baixa | a pessoa volta à tela | `same_password` tratado: ela conclui na hora |

**Rollback** [#84]: reverter o commit.

## 10. Definição de Pronto

- [x] Passos 1–3
- [x] `npm test`, `npm run lint` (0 erros) e `npm run typecheck`
- [x] Conferido no banco local
- [x] Roadmap marcado e Registro anotado
- [ ] PR mesclado (👤: mesclar publica)
