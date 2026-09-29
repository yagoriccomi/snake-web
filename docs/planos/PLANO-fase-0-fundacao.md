# PLANO DE EXECUÇÃO — fase-0-fundacao

| Campo | Valor |
|---|---|
| **Tarefa** | `fase-0-fundacao` (itens 0.1, 0.2 e 0.3 do `ROADMAP-web.md`) |
| **Origem** | Descrição livre (roadmap) |
| **Tipo** | Task |
| **Modo de execução** | 🔁 Loop (sem confirmação) |
| **Data** | 2026-09-25 |
| **Branch** | `chore/fundacao` |

---

## 1. Enunciado Canônico

- **Problema:** todo push na `main` publica na Vercel, e nada impede um commit que não compila,
  não passa no lint ou foge do Conventional Commits.
- **Resultado esperado:** `npm run typecheck` existe; o commit roda lint e typecheck antes de
  gravar; a mensagem é validada pelo commitlint; o trabalho entra por branch e PR.
- **Como validar:** um commit com mensagem fora do padrão é recusado; um commit com erro de tipo
  é recusado; o PR abre e a Vercel gera a pré-visualização.

## 2. Escopo

**Vou fazer:**
- 0.1 — script `typecheck` (`tsc --noEmit`).
- 0.2 — Husky: `pre-commit` (lint + typecheck) e `commit-msg` (commitlint), como no `snake-server`.
- 0.3 — branch `chore/fundacao` e PR para a `main`.

**NÃO vou fazer (escopo negativo)** [#8]:
- 0.4 (proteger a `main` no GitHub): é do dono (👤).
- Prettier e lint-staged: o roadmap pede lint e typecheck; a web é pequena, o lint do projeto
  inteiro leva segundos [#7].
- Testes no hook: não existe suíte (Fase 4). Entram no hook quando ela nascer.
- CI (Fase 8, opcional).
- **Mesclar o PR**: mesclar na `main` publica em produção (⚠️), fica com o dono.

## 3. Premissas Assumidas

| # | Premissa | Por quê | Se estiver errada… |
|---|---|---|---|
| P1 | `prepare` = `husky \|\| exit 0` | A Vercel instala sem `.git`; o `\|\| exit 0` (igual ao `snake-thai`) impede que o hook quebre o build de produção [#81] | Build na Vercel falharia; o `\|\| exit 0` já cobre |
| P2 | commitlint com a mesma regra do `snake-server` (`config-conventional`, assunto sem regra de caixa, cabeçalho até 100) | "como nos irmãos" (roadmap 0.2) [#32] | Ajustar o `commitlint.config.mjs` |
| P3 | Abrir o PR, sem mesclar | 0.3 pede branch e PR; a mescla é produção | O dono mescla quando quiser |

## 4. Decisão Visual

- **Tem superfície visual?** Não. Mudança só de ferramentas de desenvolvimento.

## 5. Terreno (o que já existe)

| Arquivo | Papel hoje | O que muda |
|---|---|---|
| `package.json` | scripts `dev`, `build`, `start`, `lint` | + `typecheck`, `prepare`; devDeps `husky`, `@commitlint/cli`, `@commitlint/config-conventional` |
| `.husky/pre-commit` | — | criar: lint + typecheck |
| `.husky/commit-msg` | — | criar: commitlint |
| `commitlint.config.mjs` | — | criar |
| `README.md` | como rodar | + seção curta "Contribuindo" (branch, PR, hooks) [#96] |
| `CLAUDE.md` | regras | § 5: branch e PR, hooks |

**Reaproveitamento** [#6]: hooks e `commitlint.config.js` do `snake-server`.

## 6. Passos Atômicos

| # | Arquivo alvo | O que muda (1 frase) | Prática | Como verificar |
|---|---|---|---|---|
| 1 | `package.json` | Script `typecheck` | [#11] | `npm run typecheck` sai 0 |
| 2 | `package.json`, `.husky/*`, `commitlint.config.mjs` | Husky com pre-commit e commit-msg | [#5][#32] | commit com mensagem "ajustes" recusado |
| 3 | `README.md`, `CLAUDE.md` | Documentar o fluxo de branch, PR e hooks | [#96] | leitura |
| 4 | GitHub | Push da branch e PR | [#35] | PR aberto, pré-visualização da Vercel |

## 7. Impacto em Dados e Contratos

- **Banco / contrato / configuração / LGPD:** nenhum.

## 8. Plano de Testes

| Nível | O que cobre | Caminho de falha coberto |
|---|---|---|
| Manual | hooks | mensagem fora do padrão recusada |

## 9. Riscos e Rollback

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `prepare` quebrar o build da Vercel | Baixa | produção sem deploy novo | `\|\| exit 0`; a pré-visualização do PR prova antes da `main` |

**Rollback** [#84]: reverter o commit.

## 10. Definição de Pronto

- [ ] Passos 1–4 executados
- [ ] `npm run typecheck` e `npm run lint` limpos
- [ ] Hook recusa mensagem fora do padrão
- [ ] PR aberto
- [ ] Roadmap marcado e Registro anotado
